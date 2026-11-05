CREATE DATABASE IF NOT EXISTS trustvault_db;
USE trustvault_db;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Administrator', 'Document Owner', 'Viewer') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY email (email)
);

-- 2. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
    id INT NOT NULL AUTO_INCREMENT,
    owner_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    category VARCHAR(100) DEFAULT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY fk_1 (owner_id),
    CONSTRAINT fk_documents_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- 3. DOCUMENT PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS document_permissions (
    id INT NOT NULL AUTO_INCREMENT,
    document_id INT NOT NULL,
    user_id INT NOT NULL,
    permission ENUM('read', 'edit') NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY document_user (document_id, user_id),
    KEY fk_2 (user_id),
    CONSTRAINT fk_permissions_document
        FOREIGN KEY (document_id) REFERENCES documents(id),
    CONSTRAINT fk_permissions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT DEFAULT NULL,
    document_id INT DEFAULT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY fk_1 (user_id),
    KEY fk_2 (document_id),
    CONSTRAINT fk_audit_user
        FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_audit_document
        FOREIGN KEY (document_id) REFERENCES documents(id)
);