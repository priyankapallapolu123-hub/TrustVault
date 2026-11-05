# TrustVault – API Documentation

## 1. Project Overview

TrustVault is a secure document management system that allows users to upload, manage, share, and access confidential documents based on assigned permissions.

The system uses role-based access control and document-level authorization to prevent unauthorized access.

## 2. Base URLs

**Production Backend:**
https://trustvault-2yk4.onrender.com

**Local Backend:**
http://localhost:5000

## 3. User Roles

TrustVault supports three user roles:

### Administrator
- View registered users.
- View all uploaded documents.
- View audit logs.
- Monitor document activities.

### Document Owner
- Upload documents.
- View and manage owned documents.
- Search documents.
- Grant read or edit permissions.
- Revoke document permissions.
- Update and delete owned documents.

### Viewer
- View documents shared with them.
- Download documents when read permission is granted.
- Cannot access documents without permission.
- Cannot upload or delete documents.

## 4. Authentication

Protected API endpoints require a valid JWT token.

Include the token in the request header:

`Authorization: Bearer <JWT_TOKEN>`

The backend uses authentication middleware to verify the token and role-based middleware to restrict access.

## 5. API Endpoints

### Authentication APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/register | Register a user |
| POST | /api/login | Login |
| GET | /api/profile | Get user profile |

### Role-Based APIs

| Method | Endpoint | Access |
|---|---|---|
| GET | /api/admin | Administrator |
| GET | /api/owner | Document Owner |
| GET | /api/viewer | Viewer |

### Document APIs

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/documents/upload | Upload a document |
| GET | /api/documents | List accessible documents |
| GET | /api/documents/search | Search documents |
| GET | /api/documents/:id | Get document details |
| GET | /api/documents/:id/download | Download a document |
| PATCH | /api/documents/:id | Update document |
| DELETE | /api/documents/:id | Delete document |

### Permission APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/documents/:id/permissions | View document permissions |
| POST | /api/documents/:id/permissions | Grant document permission |
| DELETE | /api/documents/:id/permissions/:userId | Revoke document permission |

### Audit APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/audit-logs | View permitted audit logs |
| GET | /api/admin/users | Administrator views users |
| GET | /api/admin/documents | Administrator views documents |
| GET | /api/admin/audit-logs | Administrator views audit logs |

### Public APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | / | API information |
| GET | /api/health | Backend and database health check |

## 6. Document Access Control

TrustVault implements document-level access control.

- Document owners can access their own documents.
- Administrators can access document records.
- Users with read permission can view and download shared documents.
- Users with edit permission can view and edit shared documents.
- Users without permission are denied access.
- Unauthorized requests receive an HTTP 403 response where access is denied.

## 7. Permission Management

Document owners can grant permissions to specific registered users.

Supported permissions:

- **Read:** Allows viewing and downloading.
- **Edit:** Allows viewing and editing.

Owners can revoke permissions. After revocation, the user must no longer be able to access the document through the application.

## 8. Audit Logging

TrustVault maintains audit records for document-related activities.

Audit information includes:
- User ID
- Document ID
- Action
- Details
- IP address, when available
- Timestamp

Unauthorized access attempts are also recorded where supported by the backend.

## 9. Security Measures

- JWT-based authentication.
- Role-based authorization.
- Document-level permission checks.
- Server-side access validation.
- Restricted administrator endpoints.
- Permission revocation.
- Unauthorized access rejection.
- Audit logging of document activities and refused attempts.

## 10. Error Responses

Common HTTP status codes:

| Status Code | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Resource created |
| 400 | Invalid request |
| 401 | Authentication required or invalid |
| 403 | Access denied |
| 404 | Resource not found |
| 500 | Internal server error |

## 11. Technology Stack

- Frontend: React, Vite
- Backend: Node.js, Express.js
- Database: TiDB Cloud (MySQL compatible)
- Authentication: JSON Web Token (JWT)
- Deployment: Cloudflare Pages and Render

## 12. Health Check

Use the following endpoint to check backend and database connectivity:

https://trustvault-2yk4.onrender.com/api/health

