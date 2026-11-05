# TrustVault – AI Usage Documentation

## AI Tool Used
ChatGPT was used as an AI assistant during the development of TrustVault.

## 1. Project Planning – 2026-11-03
**Prompt:** Help me plan a secure document management system with Administrator, Document Owner, and Viewer roles.

**AI Output:** Suggested project architecture, roles, and core features.

**Problem:** The initial plan needed clearer security boundaries.

**My Alternative:** Defined role responsibilities and document-level permissions.

## 2. Authentication – 2026-11-03
**Prompt:** Help implement user registration and login with role-based authentication.

**AI Output:** Suggested authentication and backend implementation.

**Problem:** Public registration must not allow users to become Administrators.

**My Alternative:** Restricted public registration to Document Owner and Viewer roles.

## 3. Document Permissions – 2026-11-04
**Prompt:** Implement document sharing between named users.

**AI Output:** Suggested document-level permission management.

**Problem:** Users must not access documents without permission.

**My Alternative:** Tested access using separate user accounts and verified unauthorized users could not see private documents.

## 4. Permission Revocation – 2026-11-04
**Prompt:** Implement a way for document owners to revoke access.

**AI Output:** Suggested permission revocation functionality.

**Problem:** Previously shared documents should no longer be accessible after revocation.

**My Alternative:** Tested revocation using a Viewer account and verified the document was no longer visible.

## 5. Production Deployment – 2026-11-04
**Prompt:** Help connect the React frontend to the deployed backend API.

**AI Output:** Suggested production API configuration.

**Problem:** The frontend was using a localhost API URL.

**My Alternative:** Configured the production API URL using the VITE_API_URL environment variable.

## 6. Security Review – 2026-11-05
**Prompt:** Help identify threats in a confidential document management system.

**AI Output:** Suggested server-side authorization, document access checks, and audit logging.

**Problem:** Security must be checked on the backend, not only in the frontend.

**My Alternative:** Documented threats and security testing requirements in THREATS.md.

## Note
AI-generated suggestions were reviewed, tested, and adapted during development. Not every suggestion was accepted directly.