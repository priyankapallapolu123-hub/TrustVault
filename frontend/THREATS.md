# TrustVault – Threat Model

## 1. Overview
TrustVault is a secure document management application. Its main goal is to ensure that only authorized users can access confidential documents.

## 2. Assets to Protect
- User account information
- Passwords
- Confidential documents
- Document permissions
- Audit logs
- Authentication tokens

## 3. Threats and Mitigations

| Threat | Mitigation |
|---|---|
| Unauthorized document access | Server-side authentication and authorization |
| Viewer accessing private documents | Document-level permission checks |
| User downloading without permission | Verify access before download |
| Unauthorized document editing | Check edit permission on the server |
| Access after revocation | Check current permissions for every request |
| Unauthorized admin access | Restrict admin APIs to Administrator role |
| Invalid file uploads | Validate uploaded files |
| Unauthorized permission changes | Only document owners can grant or revoke access |
| Audit log manipulation | Restrict audit log access to authorized users |
| Repeated failed access attempts | Record refused access attempts in audit logs |

## 4. Role-Based Access Control

- **Administrator:** Can monitor users, documents, and audit activity.
- **Document Owner:** Can upload documents and manage document permissions.
- **Viewer:** Can access only documents shared with them.

## 5. Accepted Risks
- Service availability may be affected by hosting provider downtime.
- Stolen user credentials may allow account misuse.
- External infrastructure failures may temporarily affect document access.

## 6. Security Testing
The application should be tested to verify:
- Users cannot access documents without permission.
- Viewers cannot edit documents.
- Revoked users cannot access previously shared documents.
- Only administrators can access admin APIs.
- Unauthorized requests are recorded in audit logs.

## 7. Conclusion
TrustVault uses server-side authorization, role-based access control, document permissions, and audit logging to protect confidential documents.