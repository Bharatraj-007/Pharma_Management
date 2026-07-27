# TODO - Inventory Stock Access (Role-Based)

- [x] Step 1: Update frontend role/permission constants
  - [x] frontend/src/permissions.js: stock access is now limited to required roles only.
  - [x] Fixed role naming mismatch by enforcing stored roles as "CEO"/"Admin"/"Manager".

- [x] Step 2: Ensure route-level protection matches required roles
  - [x] frontend/src/App.js: /stock is guarded by permission="stock".
  - [x] frontend/src/components/ProtectedRoute.js: additional guard blocks any non CEO/Admin/Manager.

- [x] Step 3: Enforce backend API protection for ALL stock endpoints
  - [x] backend/server.js: foil/cylinder CRUD + stock-logs/audit-logs restricted.
  - [x] backend/server.js: also restricted /foils/barcode/:barcode.

- [x] Step 4: Update Inventory page frontend gating text + allowedRoles list
  - [x] frontend/src/pages/Inventory.js: UI actions restricted to "CEO"/"Admin"/"Manager" only.


- [ ] Step 5: Test cases checklist
  - [ ] Login as CEO/Admin/Manager: sidebar shows Inventory and route loads + tabs + QR/barcode generation + CRUD works.
  - [ ] Login as Supervisor/Worker: sidebar does not show Inventory and navigating to /stock redirects to /dashboard or Access Denied.
  - [ ] Verify backend returns 403 for unauthorized stock API requests.

