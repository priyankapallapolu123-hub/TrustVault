
# TrustVault - Threat Model

## 1. Project Overview
TrustVault is a secure document management system.
It protects confidential documents using authentication,
role-based access control and document-level permissions.

## 2. User Roles
- Administrator: Manages users, documents and audit logs.
- Document Owner: Uploads documents and grants or revokes access.
- Viewer: Accesses documents only when permission is granted.

## 3. Security Threats and Mitigations

### Threat 1: Unauthorized Login
Risk: An attacker may try to access the application.
Mitigation: Password hashing using bcrypt and JWT authentication.

### Threat 2: Unauthorized Document Access
Risk: A user may access another owner's private document.
Mitigation: Server-side authorization checks on every document request.

### Threat 3: Permission Abuse
Risk: A viewer may try to edit a read-only document.
Mitigation: Verify document-level permissions before editing.

### Threat 4: Access After Revocation
Risk: A user may continue accessing a document after permission is revoked.
Mitigation: Check current database permissions on every request.

### Threat 5: Malicious File Upload
Risk: An attacker may upload unsafe files.
Mitigation: Validate uploaded files and enforce file size limits.

### Threat 6: Audit Log Tampering
Risk: A user may try to modify or delete activity records.
Mitigation: Restrict audit log access and prevent ordinary users from modifying logs.

### Threat 7: Unauthorized API Requests
Risk: An attacker may call backend APIs directly.
Mitigation: Authenticate and authorize requests on the server.

## 4. Accepted Risks
- A compromised user password may allow account misuse.
- Database or server administrators may have privileged access.
- Previously downloaded files cannot be remotely deleted from a user's device.

## 5. Security Testing
- Unauthenticated API access tests.
- Incorrect password tests.
- Cross-user document access tests.
- Read and edit permission tests.
- Permission revocation tests.
- Unauthorized download tests.
- Audit log access tests.

## 6. Security Principle
TrustVault follows the principle of least privilege.
Users receive only the minimum document permissions required.
