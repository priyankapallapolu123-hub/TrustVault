# TrustVault – Secure Document Management System

## Project Overview
TrustVault is a secure document management platform designed to protect confidential documents. It ensures that only authorized users can access documents and records document activities through audit logs.

## Live Application
- Frontend: https://trustvault-1qb.pages.dev/
- Backend API: https://trustvault-2yk4.onrender.com
- Health Check: https://trustvault-2yk4.onrender.com/api/health

## User Roles

### 1. Administrator
- View documents across the platform.
- View users and document activity.
- Monitor audit logs.

### 2. Document Owner
- Upload and manage documents.
- Grant document access.
- Revoke document access.

### 3. Viewer
- View documents shared with them.
- Access only authorized documents.

## Key Features
- User registration and login.
- Role-based access control.
- Secure document upload and management.
- Document permissions.
- Access grant and revocation.
- Audit logging.
- Document search.
- Unauthorized access protection.

## Technology Stack
- Frontend: React, Vite
- Backend: Node.js, Express.js
- Database: TiDB Cloud (MySQL compatible)
- Deployment: Cloudflare Pages and Render

## Security
- Server-side authorization.
- Role-based permissions.
- Document-level access control.
- Access revocation.
- Audit logs.

## Running Locally

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm start
```

Configure the required database and environment variables before running the backend.

## Project Repository
https://github.com/priyankapallapolu123-hub/TrustVault
