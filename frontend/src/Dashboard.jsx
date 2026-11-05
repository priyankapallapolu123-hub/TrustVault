
import React, { useEffect, useState } from "react";
import "./Dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Dashboard({ onLogout }) {
  const [documents, setDocuments] = useState([]);
  const [activePage, setActivePage] = useState("Overview");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedDocument, setSelectedDocument] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [permissionType, setPermissionType] = useState("read");
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const token = sessionStorage.getItem("trustvaultToken");

  let user = {};
  try {
    user = JSON.parse(
      sessionStorage.getItem("trustvaultUser") || "{}"
    );
  } catch {
    user = {};
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // =====================================
  // LOAD DOCUMENTS
  // =====================================

  async function loadDocuments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load documents");
      }

      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // UPLOAD DOCUMENTS
  // =====================================

  async function handleUpload(event) {
    const files = Array.from(event.target.files);

    if (!files.length) return;

    setMessage("");
    setError("");

    const allowedExtensions = [".pdf", ".doc", ".docx"];

    try {
      setLoading(true);

      for (const file of files) {
        const extension = file.name
          .substring(file.name.lastIndexOf("."))
          .toLowerCase();

        if (!allowedExtensions.includes(extension)) {
          throw new Error(
            `${file.name}: Only PDF, DOC and DOCX files are allowed.`
          );
        }

        const formData = new FormData();
        formData.append("document", file);
        formData.append("category", category);

        const response = await fetch(
          `${API_URL}/api/documents/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || `Upload failed: ${file.name}`);
        }
      }

      setMessage("Document upload completed successfully!");
      setCategory("");
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  // =====================================
  // LOAD PERMISSIONS
  // =====================================

  async function loadPermissions(documentId) {
    if (!documentId) {
      setPermissions([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/documents/${documentId}/permissions`,
        { headers }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load permissions");
      }

      setPermissions(data.permissions || []);
    } catch (err) {
      setError(err.message);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // GRANT ACCESS
  // =====================================

  async function handleGrantAccess(event) {
    event.preventDefault();

    if (!selectedDocument) {
      setError("Please select a document");
      return;
    }

    if (!recipientEmail.trim()) {
      setError("Enter the viewer email address");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/documents/${selectedDocument}/permissions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: recipientEmail.trim(),
            permission: permissionType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not grant access");
      }

      setMessage(data.message);
      setRecipientEmail("");

      await loadPermissions(selectedDocument);
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // REVOKE ACCESS
  // =====================================

  async function handleRevokeAccess(userId) {
    if (!selectedDocument) return;

    const confirmed = window.confirm(
      "Are you sure you want to revoke this user's access?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/documents/${selectedDocument}/permissions/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not revoke access");
      }

      setMessage("Access revoked successfully!");

      await loadPermissions(selectedDocument);
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // LOAD AUDIT LOGS
  // =====================================

  async function loadAuditLogs() {
    try {
      setLoading(true);
      setError("");

      const endpoint =
        user.role === "Administrator"
          ? "/api/admin/audit-logs"
          : "/api/audit-logs";

      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Could not load audit logs");
      }

      setAuditLogs(data.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // DOWNLOAD DOCUMENT
  // =====================================

  async function handleDownload(documentId, fileName) {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/api/documents/${documentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Download failed");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setMessage("Document downloaded successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // SEARCH DOCUMENTS
  // =====================================

  async function handleSearch(event) {
    const value = event.target.value;
    setSearchTerm(value);

    try {
      const response = await fetch(
        `${API_URL}/api/documents/search?q=${encodeURIComponent(value)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setDocuments(data.documents || []);
      }
    } catch {
      setError("Document search failed");
    }
  }

  // =====================================
  // PAGE LOAD
  // =====================================

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (activePage === "Access Control") {
      const ownedDocuments = documents.filter(
        (doc) => doc.my_permission === "owner"
      );

      if (ownedDocuments.length > 0) {
        const selectedExists = ownedDocuments.some(
          (doc) => String(doc.id) === String(selectedDocument)
        );

        if (!selectedExists) {
          setSelectedDocument(String(ownedDocuments[0].id));
          loadPermissions(ownedDocuments[0].id);
        }
      } else {
        setSelectedDocument("");
        setPermissions([]);
      }
    }

    if (activePage === "Audit Logs") {
      loadAuditLogs();
    }
  }, [activePage, documents]);

  function formatDate(dateValue) {
    if (!dateValue) return "-";
    return new Date(dateValue).toLocaleString();
  }

  const ownedDocuments = documents.filter(
    (doc) => doc.my_permission === "owner"
  );

  const sharedDocuments = documents.filter(
    (doc) =>
      doc.my_permission !== "owner" &&
      doc.my_permission !== "admin"
  );

  // =====================================
  // UI
  // =====================================

  return (
    <div className="dashboard">

      <aside className="sidebar">
        <h2>🔐 TrustVault</h2>

        <p className="user-info">
          {user.name || "User"}
          <br />
          <small>{user.role || "Account"}</small>
        </p>

        <nav>
          {[
            "Overview",
            "My Documents",
            "Upload Document",
            "Access Control",
            "Audit Logs",
          ].map((item) => (
            <p
              key={item}
              onClick={() => {
                setActivePage(item);
                setMessage("");
                setError("");
              }}
              className={activePage === item ? "active" : ""}
            >
              {item}
            </p>
          ))}
        </nav>

        <button onClick={onLogout}>Logout</button>
      </aside>

      <main className="main-content">

        <h1>{activePage}</h1>
        <p>Welcome, {user.name || "User"}.</p>

        {message && (
          <p style={{ color: "green" }}>{message}</p>
        )}

        {error && (
          <p style={{ color: "red" }}>{error}</p>
        )}

        {loading && <p>Loading... Please wait.</p>}

        {/* OVERVIEW */}

        {activePage === "Overview" && (
          <>
            <div className="stats">

              <div className="stat-card">
                <h3>Total Documents</h3>
                <h1>{documents.length}</h1>
              </div>

              <div className="stat-card">
                <h3>Shared Documents</h3>
                <h1>{sharedDocuments.length}</h1>
              </div>

              <div className="stat-card">
                <h3>My Documents</h3>
                <h1>{ownedDocuments.length}</h1>
              </div>

            </div>

            <section className="documents">
              <h2>Recent Documents</h2>
              <p>
                {documents.length} documents available to your account.
              </p>
            </section>
          </>
        )}

        {/* UPLOAD */}

        {activePage === "Upload Document" && (
          <section className="documents">
            <h2>Upload New Document</h2>

            {user.role !== "Document Owner" ? (
              <p>Only Document Owners can upload documents.</p>
            ) : (
              <>
                <p>
                  Select PDF, DOC or DOCX files.
                  Maximum size: 5 MB per file.
                </p>

                <div className="permission-form">
                  <label>Document Category</label>

                  <input
                    type="text"
                    placeholder="Example: Contracts, Reports, Personal"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />

                  <label>Select Documents</label>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    multiple
                    onChange={handleUpload}
                    disabled={loading}
                  />
                </div>
              </>
            )}
          </section>
        )}

        {/* MY DOCUMENTS */}

        {activePage === "My Documents" && (
          <section className="documents">
            <h2>Documents Available to Me</h2>

            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={handleSearch}
            />

            <button
              onClick={loadDocuments}
              disabled={loading}
            >
              Refresh Documents
            </button>

            {documents.length === 0 ? (
              <p>No documents available.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Document Name</th>
                      <th>Category</th>
                      <th>Upload Date</th>
                      <th>My Access</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>📄 {doc.file_name}</td>
                        <td>{doc.category || "-"}</td>
                        <td>{formatDate(doc.uploaded_at)}</td>
                        <td>{doc.my_permission}</td>
                        <td>
                          <button
                            onClick={() =>
                              handleDownload(doc.id, doc.file_name)
                            }
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ACCESS CONTROL */}

        {activePage === "Access Control" && (
          <section className="documents">
            <h2>Manage Document Permissions</h2>

            {user.role !== "Document Owner" ? (
              <p>
                Only Document Owners can grant or revoke document access.
              </p>
            ) : ownedDocuments.length === 0 ? (
              <p>Upload a document first to manage its permissions.</p>
            ) : (
              <>
                <label>Select Your Document</label>

                <select
                  value={selectedDocument}
                  onChange={(e) => {
                    setSelectedDocument(e.target.value);
                    loadPermissions(e.target.value);
                  }}
                >
                  {ownedDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.file_name}
                    </option>
                  ))}
                </select>

                <form
                  className="permission-form"
                  onSubmit={handleGrantAccess}
                >
                  <h3>Grant Access</h3>

                  <label>Viewer Email Address</label>

                  <input
                    type="email"
                    placeholder="Enter registered user email"
                    value={recipientEmail}
                    onChange={(e) =>
                      setRecipientEmail(e.target.value)
                    }
                    required
                  />

                  <label>Permission Type</label>

                  <select
                    value={permissionType}
                    onChange={(e) =>
                      setPermissionType(e.target.value)
                    }
                  >
                    <option value="read">Read Only</option>
                    <option value="edit">Read and Edit</option>
                  </select>

                  <button type="submit" disabled={loading}>
                    Grant Access
                  </button>
                </form>

                <h3>Users With Access</h3>

                {permissions.length === 0 ? (
                  <p>No permissions granted yet.</p>
                ) : (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Permission</th>
                          <th>Granted Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {permissions.map((item) => (
                          <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.email}</td>
                            <td>{item.permission}</td>
                            <td>{formatDate(item.granted_at)}</td>
                            <td>
                              <button
                                onClick={() =>
                                  handleRevokeAccess(item.user_id)
                                }
                                disabled={loading}
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* AUDIT LOGS */}

        {activePage === "Audit Logs" && (
          <section className="documents">
            <h2>Document Activity History</h2>

            <button
              onClick={loadAuditLogs}
              disabled={loading}
            >
              Refresh Logs
            </button>

            {auditLogs.length === 0 ? (
              <p>No activity logs available.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Document ID</th>
                      <th>Action</th>
                      <th>Details</th>
                      <th>IP Address</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          {log.user_name || log.user_email || "Unknown"}
                        </td>
                        <td>{log.document_id || "-"}</td>
                        <td>{log.action}</td>
                        <td>{log.details || "-"}</td>
                        <td>{log.ip_address || "-"}</td>
                        <td>{formatDate(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}

export default Dashboard;
