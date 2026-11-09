# Admin Panel Source Code (Reference & Review)

This folder contains the source code for the FirstPay Play Admin Panel.

## Architecture Note
The Admin Panel is NOT a separate application. It is embedded directly inside the frontend website (`apps/web`) and secured by the backend API (`apps/api`).

- **Frontend Page:** `frontend-admin-page/page.tsx`
  - URL route: `/admin`
  - Requires the user to have the `ADMIN` role in their session.
  - Allows reviewing player accounts, approving/rejecting withdrawal requests, and inspecting audit logs.

- **Backend API:** `backend-admin-api/admin.ts`
  - API routes: `/admin/users`, `/admin/withdrawals`, `/admin/withdrawals/:id/approve`, `/admin/withdrawals/:id/reject`, `/admin/audit-logs`.
  - Verifies admin role directly against the database on every request and returns `403 Forbidden` to non-admin users.
