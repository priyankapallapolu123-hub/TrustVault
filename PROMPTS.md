
# TrustVault - AI Usage Documentation

## Entry 1 - 2026-11-03
Prompt: Help me plan a secure document management system.
AI Output: Suggested roles, document management and security features.
Problem: Initial design was too generic.
My Alternative: Designed document-level permissions and separate owner access.

## Entry 2 - 2026-11-03
Prompt: How can I implement authentication using Node.js?
AI Output: Suggested JWT authentication and bcrypt password hashing.
Problem: Basic authentication alone does not protect documents.
My Alternative: Added server-side authorization middleware.

## Entry 3 - 2026-11-04
Prompt: How can I prevent unauthorized users from accessing documents?
AI Output: Suggested checking ownership and document permissions.
Problem: UI restrictions alone are not secure.
My Alternative: Added backend permission checks for document routes.

## Entry 4 - 2026-11-04
Prompt: How can I implement permission revocation?
AI Output: Suggested deleting the document permission record.
Problem: Previously granted access must stop immediately.
My Alternative: Check current permissions from the database on each request.

## Entry 5 - 2026-11-04
Prompt: How can I test unauthorized API requests?
AI Output: Suggested Jest and Supertest.
Problem: Initial tests covered only basic authentication.
My Alternative: Added tests for unauthenticated document, download and permission APIs.

## Note
AI was used as a development assistant.
All generated suggestions were reviewed, tested and adapted.
AI-generated code was not accepted without verification.

## Commit Links
Add the actual GitHub commit links after pushing the corresponding changes.
