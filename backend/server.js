
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 5000;

const storageDir = path.join(__dirname, "storage", "documents");

// =====================================
// ENVIRONMENT CHECK
// =====================================

if (!process.env.JWT_SECRET || !process.env.DB_NAME) {
    console.error("Missing JWT_SECRET or database settings in .env");
    process.exit(1);
}

// =====================================
// DATABASE CONNECTION POOL
// =====================================

const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// =====================================
// MIDDLEWARE
// =====================================

app.use(helmet());

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174"
    ]
}));

app.use(express.json({ limit: "1mb" }));

// =====================================
// ASYNC ERROR HANDLER
// =====================================

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

// =====================================
// AUDIT LOG FUNCTIONS
// =====================================

async function audit(userId, documentId, action, details, req) {
    await pool.execute(
        `INSERT INTO audit_logs
         (user_id, document_id, action, details, ip_address)
         VALUES (?, ?, ?, ?, ?)`,
        [
            userId || null,
            documentId || null,
            action,
            details || null,
            req.ip || null
        ]
    );
}

async function recordDenied(req, documentId, reason) {
    try {
        await audit(
            req.user ? req.user.userId : null,
            Number(documentId) || null,
            "ACCESS_DENIED",
            reason,
            req
        );
    } catch (err) {
        console.error("Could not write denied audit log:", err.message);
    }
}

// =====================================
// AUTHENTICATION
// =====================================

async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Always get the current role from the database.
        // This prevents an old JWT from retaining a changed role.

        const [users] = await pool.execute(
            `SELECT id, name, email, role
             FROM users
             WHERE id = ?`,
            [decoded.userId]
        );

        if (!users.length) {
            return res.status(401).json({
                success: false,
                message: "User account not found"
            });
        }

        req.user = {
            userId: users[0].id,
            name: users[0].name,
            email: users[0].email,
            role: users[0].role
        };

        next();

    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
}

// =====================================
// ROLE AUTHORIZATION
// =====================================

function allowRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to perform this action"
            });
        }

        next();
    };
}

// =====================================
// DOCUMENT ACCESS CHECK
// =====================================

async function getDocumentAccess(documentId, user) {
    if (
        !Number.isSafeInteger(documentId) ||
        documentId <= 0
    ) {
        return null;
    }

    const [rows] = await pool.execute(
        `SELECT
            d.id,
            d.owner_id,
            d.file_name,
            d.file_path,
            d.category,
            d.uploaded_at,
            p.permission
         FROM documents d
         LEFT JOIN document_permissions p
            ON p.document_id = d.id
            AND p.user_id = ?
         WHERE d.id = ?`,
        [user.userId, documentId]
    );

    if (!rows.length) {
        return null;
    }

    const doc = rows[0];

    if (user.role === "Administrator") {
        doc.access_level = "admin";
        return doc;
    }

    if (doc.owner_id === user.userId) {
        doc.access_level = "owner";
        return doc;
    }

    if (doc.permission === "read" || doc.permission === "edit") {
        doc.access_level = doc.permission;
        return doc;
    }

    return null;
}

async function requireDocumentAccess(req, res, documentId, requiredPermission) {
    const doc = await getDocumentAccess(documentId, req.user);

    if (!doc) {
        await recordDenied(
            req,
            documentId,
            "Document access denied or document not found"
        );

        res.status(403).json({
            success: false,
            message: "You do not have access to this document"
        });

        return null;
    }

    const allowed =
        doc.access_level === "owner" ||
        doc.access_level === "admin" ||
        doc.access_level === "edit" ||
        (
            requiredPermission === "read" &&
            doc.access_level === "read"
        );

    if (!allowed) {
        await recordDenied(
            req,
            documentId,
            `Required permission: ${requiredPermission}`
        );

        res.status(403).json({
            success: false,
            message: "Insufficient document permission"
        });

        return null;
    }

    return doc;
}

// =====================================
// FILE UPLOAD SETTINGS
// =====================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        const allowedExtensions = [".pdf", ".doc", ".docx"];

        if (!allowedExtensions.includes(ext)) {
            return cb(new Error("Only PDF, DOC and DOCX files are allowed"));
        }

        cb(null, true);
    }
});

// =====================================
// HOME AND HEALTH
// =====================================

app.get("/", (req, res) => {
    res.send("TrustVault API is running");
});

app.get("/api/health", asyncRoute(async (req, res) => {
    await pool.query("SELECT 1");

    res.json({
        success: true,
        message: "TrustVault API and database are working"
    });
}));

// =====================================
// REGISTER
// =====================================

app.post("/api/register", asyncRoute(async (req, res) => {
    const { name, email, password, role } = req.body || {};

    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof role !== "string"
    ) {
        return res.status(400).json({
            success: false,
            message: "All fields are required"
        });
    }

    if (!name.trim() || name.trim().length > 100) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid name"
        });
    }

    if (!["Document Owner", "Viewer"].includes(role)) {
        return res.status(400).json({
            success: false,
            message: "Invalid registration role"
        });
    }

    if (
        password.length < 8 ||
        Buffer.byteLength(password, "utf8") > 72
    ) {
        return res.status(400).json({
            success: false,
            message: "Password must be 8 to 72 characters"
        });
    }

    const emailValue = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
        return res.status(400).json({
            success: false,
            message: "Enter a valid email address"
        });
    }

    const hash = await bcrypt.hash(password, 12);

    try {
        const [result] = await pool.execute(
            `INSERT INTO users (name, email, password, role)
             VALUES (?, ?, ?, ?)`,
            [name.trim(), emailValue, hash, role]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            userId: result.insertId
        });

    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        throw err;
    }
}));

// =====================================
// LOGIN
// =====================================

app.post("/api/login", asyncRoute(async (req, res) => {
    const { email, password } = req.body || {};

    if (
        typeof email !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required"
        });
    }

    const [rows] = await pool.execute(
        `SELECT id, name, email, password, role
         FROM users
         WHERE email = ?`,
        [email.trim().toLowerCase()]
    );

    if (
        !rows.length ||
        !(await bcrypt.compare(password, rows[0].password))
    ) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const user = rows[0];

    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
    );

    res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
}));

// =====================================
// PROFILE
// =====================================

app.get("/api/profile", authenticateToken, asyncRoute(async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
}));

// =====================================
// ROLE ROUTES
// =====================================

app.get(
    "/api/admin",
    authenticateToken,
    allowRoles("Administrator"),
    (req, res) => {
        res.json({
            success: true,
            message: "Administrator access granted"
        });
    }
);

app.get(
    "/api/owner",
    authenticateToken,
    allowRoles("Document Owner"),
    (req, res) => {
        res.json({
            success: true,
            message: "Document Owner access granted"
        });
    }
);

app.get(
    "/api/viewer",
    authenticateToken,
    allowRoles("Viewer"),
    (req, res) => {
        res.json({
            success: true,
            message: "Viewer access granted"
        });
    }
);

// =====================================
// UPLOAD DOCUMENT
// =====================================

app.post(
    "/api/documents/upload",
    authenticateToken,
    allowRoles("Document Owner"),

    (req, res, next) => {
        upload.single("document")(req, res, err => {
            if (err) {
                return res.status(
                    err.code === "LIMIT_FILE_SIZE" ? 413 : 400
                ).json({
                    success: false,
                    message: err.message
                });
            }

            next();
        });
    },

    asyncRoute(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Select a document"
            });
        }

        const ext = path.extname(
            req.file.originalname
        ).toLowerCase();

        const buf = req.file.buffer;

        let valid = false;

        if (ext === ".pdf") {
            valid = buf.subarray(0, 5).toString("ascii") === "%PDF-";
        }

        if (ext === ".doc") {
            valid = buf.subarray(0, 8).equals(
                Buffer.from("D0CF11E0A1B11AE1", "hex")
            );
        }

        if (ext === ".docx") {
            valid = buf.subarray(0, 4).equals(
                Buffer.from("504B0304", "hex")
            );
        }

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: "Invalid document file content"
            });
        }

        const category =
            typeof req.body.category === "string"
                ? req.body.category.trim()
                : "";

        if (category.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Category is too long"
            });
        }

        const originalName = path.basename(
            req.file.originalname
        ).replace(/[\r\n\0]/g, "").slice(0, 255);

        const storedName = crypto.randomUUID() + ext;

        const absolutePath = path.join(storageDir, storedName);

        const relativePath = path.join(
            "storage",
            "documents",
            storedName
        );

        await fs.promises.mkdir(storageDir, { recursive: true });

        await fs.promises.writeFile(
            absolutePath,
            buf,
            { flag: "wx" }
        );

        let documentId;

        try {
            const [result] = await pool.execute(
                `INSERT INTO documents
                 (owner_id, file_name, file_path, category)
                 VALUES (?, ?, ?, ?)`,
                [
                    req.user.userId,
                    originalName,
                    relativePath,
                    category || null
                ]
            );

            documentId = result.insertId;

            await audit(
                req.user.userId,
                documentId,
                "UPLOAD",
                `Uploaded ${originalName}`,
                req
            );

        } catch (err) {
            if (documentId) {
                await pool.execute(
                    "DELETE FROM documents WHERE id = ?",
                    [documentId]
                ).catch(() => {});
            }

            await fs.promises.unlink(absolutePath).catch(() => {});

            throw err;
        }

        res.status(201).json({
            success: true,
            message: "Document uploaded successfully",
            document: {
                id: documentId,
                fileName: originalName,
                category,
                ownerId: req.user.userId
            }
        });
    })
);

// =====================================
// LIST MY AND SHARED DOCUMENTS
// =====================================

app.get(
    "/api/documents",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const [rows] = await pool.execute(
            `SELECT DISTINCT
                d.id,
                d.file_name,
                d.category,
                d.uploaded_at,
                d.owner_id,
                CASE
                    WHEN d.owner_id = ? THEN 'owner'
                    WHEN ? = 'Administrator' THEN 'admin'
                    ELSE p.permission
                END AS my_permission
             FROM documents d
             LEFT JOIN document_permissions p
                ON p.document_id = d.id
                AND p.user_id = ?
             WHERE d.owner_id = ?
                OR p.user_id = ?
                OR ? = 'Administrator'
             ORDER BY d.uploaded_at DESC`,
            [
                req.user.userId,
                req.user.role,
                req.user.userId,
                req.user.userId,
                req.user.userId,
                req.user.role
            ]
        );

        res.json({
            success: true,
            count: rows.length,
            documents: rows
        });
    })
);

// =====================================
// SEARCH DOCUMENTS
// =====================================

app.get(
    "/api/documents/search",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const term =
            typeof req.query.q === "string"
                ? `%${req.query.q.trim()}%`
                : "%";

        const category =
            typeof req.query.category === "string" &&
            req.query.category
                ? req.query.category
                : null;

        const [rows] = await pool.execute(
            `SELECT DISTINCT
                d.id,
                d.file_name,
                d.category,
                d.uploaded_at,
                d.owner_id,
                CASE
                    WHEN d.owner_id = ? THEN 'owner'
                    WHEN ? = 'Administrator' THEN 'admin'
                    ELSE p.permission
                END AS my_permission
             FROM documents d
             LEFT JOIN document_permissions p
                ON p.document_id = d.id
                AND p.user_id = ?
             WHERE (
                    d.owner_id = ?
                    OR p.user_id = ?
                    OR ? = 'Administrator'
               )
               AND (
                    d.file_name LIKE ?
                    OR COALESCE(d.category, '') LIKE ?
               )
               AND (? IS NULL OR d.category = ?)
             ORDER BY d.uploaded_at DESC`,
            [
                req.user.userId,
                req.user.role,
                req.user.userId,
                req.user.userId,
                req.user.userId,
                req.user.role,
                term,
                term,
                category,
                category
            ]
        );

        res.json({
            success: true,
            count: rows.length,
            documents: rows
        });
    })
);

// =====================================
// DOCUMENT DETAILS
// =====================================

app.get(
    "/api/documents/:id",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const doc = await requireDocumentAccess(
            req,
            res,
            Number(req.params.id),
            "read"
        );

        if (!doc) return;

        res.json({
            success: true,
            document: {
                id: doc.id,
                file_name: doc.file_name,
                category: doc.category,
                uploaded_at: doc.uploaded_at,
                owner_id: doc.owner_id,
                my_permission: doc.access_level
            }
        });
    })
);

// =====================================
// DOWNLOAD DOCUMENT
// =====================================

app.get(
    "/api/documents/:id/download",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const doc = await requireDocumentAccess(
            req,
            res,
            Number(req.params.id),
            "read"
        );

        if (!doc) return;

        const absolutePath = path.resolve(__dirname, doc.file_path);
        const safeRoot = path.resolve(storageDir) + path.sep;

        if (!absolutePath.startsWith(safeRoot)) {
            await recordDenied(req, doc.id, "Invalid stored file path");

            return res.status(500).json({
                success: false,
                message: "Invalid document storage path"
            });
        }

        try {
            await fs.promises.access(absolutePath, fs.constants.R_OK);
        } catch {
            return res.status(404).json({
                success: false,
                message: "Stored file is missing"
            });
        }

        await audit(
            req.user.userId,
            doc.id,
            "DOWNLOAD",
            `Downloaded ${doc.file_name}`,
            req
        );

        res.download(absolutePath, doc.file_name);
    })
);

// =====================================
// EDIT DOCUMENT CATEGORY
// =====================================

app.patch(
    "/api/documents/:id",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const doc = await requireDocumentAccess(
            req,
            res,
            Number(req.params.id),
            "edit"
        );

        if (!doc) return;

        const category =
            typeof req.body.category === "string"
                ? req.body.category.trim()
                : null;

        if (category === null || category.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Provide a category up to 100 characters"
            });
        }

        await pool.execute(
            "UPDATE documents SET category = ? WHERE id = ?",
            [category || null, doc.id]
        );

        await audit(
            req.user.userId,
            doc.id,
            "UPDATE",
            `Changed category to ${category}`,
            req
        );

        res.json({
            success: true,
            message: "Document updated"
        });
    })
);

// =====================================
// DELETE DOCUMENT
// =====================================

app.delete(
    "/api/documents/:id",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const doc = await getDocumentAccess(
            Number(req.params.id),
            req.user
        );

        if (!doc) {
            await recordDenied(
                req,
                req.params.id,
                "Delete attempted for missing or inaccessible document"
            );

            return res.status(404).json({
                success: false,
                message: "Document not found"
            });
        }

        if (
            doc.access_level !== "owner" &&
            doc.access_level !== "admin"
        ) {
            await recordDenied(
                req,
                doc.id,
                "Delete attempted without ownership"
            );

            return res.status(403).json({
                success: false,
                message: "Only the document owner or administrator can delete it"
            });
        }

        const absolutePath = path.resolve(__dirname, doc.file_path);
        const safeRoot = path.resolve(storageDir) + path.sep;

        await audit(
            req.user.userId,
            doc.id,
            "DELETE",
            `Deleted document ${doc.id}: ${doc.file_name}`,
            req
        );

        await pool.execute(
            "DELETE FROM document_permissions WHERE document_id = ?",
            [doc.id]
        );

        await pool.execute(
            "UPDATE audit_logs SET document_id = NULL WHERE document_id = ?",
            [doc.id]
        );

        await pool.execute(
            "DELETE FROM documents WHERE id = ?",
            [doc.id]
        );

        if (absolutePath.startsWith(safeRoot)) {
            await fs.promises.unlink(absolutePath).catch(() => {});
        }

        res.json({
            success: true,
            message: "Document deleted"
        });
    })
);

// =====================================
// VIEW DOCUMENT PERMISSIONS
// =====================================

app.get(
    "/api/documents/:id/permissions",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const doc = await getDocumentAccess(
            Number(req.params.id),
            req.user
        );

        if (
            !doc ||
            (
                doc.access_level !== "owner" &&
                doc.access_level !== "admin"
            )
        ) {
            await recordDenied(
                req,
                req.params.id,
                "Permission list access denied"
            );

            return res.status(403).json({
                success: false,
                message: "Only the document owner or administrator can view permissions"
            });
        }

        const [rows] = await pool.execute(
            `SELECT
                p.id,
                p.user_id,
                u.name,
                u.email,
                p.permission,
                p.granted_at
             FROM document_permissions p
             JOIN users u ON u.id = p.user_id
             WHERE p.document_id = ?
             ORDER BY p.granted_at DESC`,
            [doc.id]
        );

        res.json({
            success: true,
            permissions: rows
        });
    })
);

// =====================================
// GRANT DOCUMENT PERMISSION
// =====================================

app.post(
    "/api/documents/:id/permissions",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const doc = await getDocumentAccess(
            Number(req.params.id),
            req.user
        );

        if (!doc || doc.access_level !== "owner") {
            await recordDenied(
                req,
                req.params.id,
                "Permission grant attempted by non-owner"
            );

            return res.status(403).json({
                success: false,
                message: "Only the document owner can grant access"
            });
        }

        const { email, permission } = req.body || {};

        if (
            typeof email !== "string" ||
            !["read", "edit"].includes(permission)
        ) {
            return res.status(400).json({
                success: false,
                message: "Provide recipient email and read/edit permission"
            });
        }

        const emailValue = email.trim().toLowerCase();

        const [users] = await pool.execute(
            "SELECT id, role FROM users WHERE email = ?",
            [emailValue]
        );

        if (!users.length) {
            return res.status(404).json({
                success: false,
                message: "User not found; ask them to register first"
            });
        }

        const recipient = users[0];

        if (recipient.id === req.user.userId) {
            return res.status(400).json({
                success: false,
                message: "You already own this document"
            });
        }

        if (recipient.role === "Administrator") {
            return res.status(400).json({
                success: false,
                message: "Administrator accounts do not need document grants"
            });
        }

        await pool.execute(
            `INSERT INTO document_permissions
                (document_id, user_id, permission)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE
                permission = VALUES(permission),
                granted_at = CURRENT_TIMESTAMP`,
            [
                doc.id,
                recipient.id,
                permission
            ]
        );

        await audit(
            req.user.userId,
            doc.id,
            "PERMISSION_GRANTED",
            `Granted ${permission} access to user ${recipient.id} (${emailValue})`,
            req
        );

        res.status(201).json({
            success: true,
            message: `${permission} access granted`
        });
    })
);

// =====================================
// REVOKE DOCUMENT PERMISSION
// =====================================

app.delete(
    "/api/documents/:id/permissions/:userId",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const doc = await getDocumentAccess(
            Number(req.params.id),
            req.user
        );

        if (!doc || doc.access_level !== "owner") {
            await recordDenied(
                req,
                req.params.id,
                "Permission revoke attempted by non-owner"
            );

            return res.status(403).json({
                success: false,
                message: "Only the document owner can revoke access"
            });
        }

        const targetId = Number(req.params.userId);

        if (!Number.isSafeInteger(targetId) || targetId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const [result] = await pool.execute(
            `DELETE FROM document_permissions
             WHERE document_id = ? AND user_id = ?`,
            [doc.id, targetId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                success: false,
                message: "Permission grant not found"
            });
        }

        await audit(
            req.user.userId,
            doc.id,
            "PERMISSION_REVOKED",
            `Revoked access from user ${targetId}`,
            req
        );

        res.json({
            success: true,
            message: "Access revoked immediately"
        });
    })
);

// =====================================
// USER AUDIT LOGS
// =====================================

app.get(
    "/api/audit-logs",
    authenticateToken,
    asyncRoute(async (req, res) => {
        const [rows] = await pool.execute(
            `SELECT
                a.id,
                a.document_id,
                a.action,
                a.details,
                a.ip_address,
                a.created_at,
                u.name AS user_name,
                u.email AS user_email
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.user_id
             WHERE a.user_id = ?
                OR a.document_id IN (
                    SELECT id FROM documents WHERE owner_id = ?
                )
             ORDER BY a.created_at DESC
             LIMIT 300`,
            [
                req.user.userId,
                req.user.userId
            ]
        );

        res.json({
            success: true,
            logs: rows
        });
    })
);

// =====================================
// ADMIN: ALL USERS
// =====================================

app.get(
    "/api/admin/users",
    authenticateToken,
    allowRoles("Administrator"),
    asyncRoute(async (req, res) => {
        const [rows] = await pool.execute(
            `SELECT id, name, email, role, created_at
             FROM users
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            users: rows
        });
    })
);

// =====================================
// ADMIN: ALL DOCUMENTS
// =====================================

app.get(
    "/api/admin/documents",
    authenticateToken,
    allowRoles("Administrator"),
    asyncRoute(async (req, res) => {
        const [rows] = await pool.execute(
            `SELECT
                d.id,
                d.file_name,
                d.category,
                d.uploaded_at,
                u.name AS owner_name,
                u.email AS owner_email
             FROM documents d
             JOIN users u ON u.id = d.owner_id
             ORDER BY d.uploaded_at DESC`
        );

        res.json({
            success: true,
            documents: rows
        });
    })
);

// =====================================
// ADMIN: ALL AUDIT LOGS
// =====================================

app.get(
    "/api/admin/audit-logs",
    authenticateToken,
    allowRoles("Administrator"),
    asyncRoute(async (req, res) => {
        const [rows] = await pool.execute(
            `SELECT
                a.id,
                a.user_id,
                a.document_id,
                a.action,
                a.details,
                a.ip_address,
                a.created_at,
                u.name AS user_name,
                u.email AS user_email
             FROM audit_logs a
             LEFT JOIN users u ON u.id = a.user_id
             ORDER BY a.created_at DESC
             LIMIT 1000`
        );

        res.json({
            success: true,
            logs: rows
        });
    })
);

// =====================================
// ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
    console.error("API error:", err.message);

    if (res.headersSent) {
        return next(err);
    }

    res.status(500).json({
        success: false,
        message: "Server error. Check backend terminal for details."
    });
});

// =====================================
// START SERVER
// =====================================

async function startServer() {
    try {
        await pool.query("SELECT 1");

        console.log("TrustVault MySQL Database Connected Successfully!");

        await fs.promises.mkdir(storageDir, { recursive: true });

        app.listen(PORT, () => {
            console.log(
                `TrustVault server running at http://localhost:${PORT}`
            );
        });

    } catch (err) {
        console.error("Could not start TrustVault:", err.message);
        process.exit(1);
    }
}

// Start only when server.js is run directly.
// During Jest tests, export the app without starting a server.

if (require.main === module) {
    startServer();
}

module.exports = { app, pool };