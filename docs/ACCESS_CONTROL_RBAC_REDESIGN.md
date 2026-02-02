# Access Control & RBAC Redesign

A comprehensive guide for removing the current access control system and implementing Role-Based Access Control (RBAC).

---

## Table of Contents

1. [Current Access Control Overview](#1-current-access-control-overview)
2. [What to Delete](#2-what-to-delete)
3. [RBAC Redesign](#3-rbac-redesign)
4. [Migration Plan](#4-migration-plan)
5. [What Gets Recreated](#5-what-gets-recreated)

---

## 1. Current Access Control Overview

### How It Works Now

#### Authentication (Backend)
- **JWT-based** in `auth.js` middleware
- Verifies Bearer token and attaches `req.user` with: `userId`, `companyId`, `email`, `role`, `categoryAccess`
- **No permission checks** — only authentication

#### User Roles
- **`users` table**: `role` column (`admin`, `user`, `sales`, `super_admin`)
- **`admins` table**: For `admin` / `super_admin` — stores `permissions`, `module_access`, `category_access` (JSONB)
- **`users_data` table**: For `user` / `sales` — same structure

#### Permission Storage
- **`module_access`** (JSONB): `{ "sku": { view: true, create: false, edit: false, delete: false }, ... }`
- **`category_access`** (JSONB): Array of objects with `productCategoryIds`, `itemCategoryIds`, `subCategoryIds` and per-category permissions
- **`permissions`** (JSONB): Legacy, rarely used

#### Login Flow
- `authController.js` fetches `module_access` and `category_access` from `admins` or `users_data`
- JWT payload: `userId`, `companyId`, `email`, `role`, `categoryAccess` (only)
- Response body: `permissions`, `moduleAccess`, `categoryAccess` — frontend stores in localStorage/sessionStorage

#### Frontend Access Control
- **`AuthGate`** component wraps routes and checks:
  1. Token present → redirect to login if not
  2. `super_admin` / `admin` → always allowed
  3. Otherwise: `user.permissions` (flat array) or `user.moduleAccess[module][action]`
  4. Temporary workaround: `user` / `sales` always get `sku.view`
- **`hasPermission(user, permission)`** used for nav items and UI checks

#### Backend Access Control
- **No route-level permission middleware** — only `authenticate`
- Permission checks scattered inside controllers:
  - **Library**: `filterCategoriesByUserAccess`, `hasCategoryAccess` for `sales`/`user`; `admin`/`super_admin` bypass
  - **SKU**: `user.role` checks (e.g., `createdByName`)
  - **Rejected items report**: `user.role` checks

#### Roles API
- `roleController.js` returns **hardcoded** roles (Admin, User)
- Create/Update/Delete are **stubs** — no DB persistence

---

## 2. What to Delete

### Frontend

| Location | What to Remove |
|----------|----------------|
| `frontend/src/components/auth/AuthGate.tsx` | Entire file (permission checks, `hasPermission`, AuthGate component) |
| `frontend/src/App.tsx` | All `AuthGate` wrappers around routes (lines 136–337); keep only auth (token check) or a simple "logged in" guard |
| `frontend/src/components/navigation/HorizontalNavigation.tsx` | `hasPermission` import and usage; `permission` / `roles` on menu items; `visibleItems` filtering by permission |
| `frontend/src/pages/SKUManagementPage.tsx` | `userRole`, `categoryAccess` state and all logic that filters by role/categoryAccess |
| `frontend/src/pages/AccessControlPage.tsx` | `moduleAccess`, `categoryAccess` in invite form; module-access UI; category-access UI; role form `permissions` object |
| `frontend/src/pages/InviteUserPage.tsx` | Same as AccessControlPage: `moduleAccess`, `categoryAccess`, permission UI |
| `frontend/src/pages/LoginPage.tsx` | Fetch of full user details for `categoryAccess` (if only used for access control) |
| `frontend/src/pages/HelpSupportPage.tsx` | FAQ answer about role/permission-based menu visibility |
| `frontend/src/pages/NotAuthorizedPage.tsx` | Keep for "no permission" redirect target; optionally update copy |

### Backend

| Location | What to Remove |
|----------|----------------|
| `src/routes/auth.js` | `/me` handler that returns `moduleAccess`, `categoryAccess`, `permissions` from `admins`/`users_data` |
| `src/controllers/authController.js` | Logic that fetches `module_access`, `category_access`, `permissions` from `admins`/`users_data` and returns in login response |
| `src/controllers/userController.js` | `getMe` returning `permissions`, `moduleAccess`, `categoryAccess`; `inviteUser` inserting into `module_access`, `category_access`, `permissions` in `admins`/`users_data` |
| `src/controllers/libraryController.js` | `getUserCategoryAccess`, `filterCategoriesByUserAccess`, `hasCategoryAccess`; all `user.role` / `categoryAccess` checks in library endpoints |
| `src/controllers/roleController.js` | Hardcoded roles with embedded `permissions`; create/update/delete stubs |
| `src/routes/roles.js` | Entire file (or replace with RBAC roles API) |
| `src/routes/skus.js` | `user.role` checks (e.g., `createdByName`) |
| `src/controllers/rejectedItemReportController.js` | `user.role` checks |
| `src/middlewares/auth.js` | `categoryAccess` in `req.user` (if present) |

### Database (Schema Changes)

| Table | Columns to Remove / Deprecate |
|-------|-------------------------------|
| `admins` | `permissions`, `module_access`, `category_access` (JSONB) |
| `users_data` | `permissions`, `module_access`, `category_access` (JSONB) |

**Note:** Drop these columns when RBAC is in place. Existing access data is not preserved.

---

## 3. RBAC Redesign

### RBAC Model

```
User ──(many-to-many)──> Role ──(many-to-many)──> Permission
```

- **User**: Identity (id, company, email, etc.)
- **Role**: Named set of permissions (e.g., Admin, Sales, Warehouse)
- **Permission**: Granular action (e.g., `sku.view`, `inventory.create`)

### New Database Schema

```sql
-- Roles (per company)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, name)
);

-- Permissions (global, seeded once)
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  UNIQUE(module, action)
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- User-Role assignment
CREATE TABLE user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id, company_id)
);

-- Optional: Category-level access per role
CREATE TABLE role_category_access (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  product_category_ids INTEGER[] DEFAULT '{}',
  item_category_ids INTEGER[] DEFAULT '{}',
  sub_category_ids INTEGER[] DEFAULT '{}',
  view BOOLEAN DEFAULT true,
  create BOOLEAN DEFAULT false,
  edit BOOLEAN DEFAULT false,
  delete BOOLEAN DEFAULT false
);
```

### Permission List (Seed Data)

| Module | Actions |
|--------|---------|
| dashboard | view |
| sku | view, create, edit, delete |
| inventory | view, create, edit, delete |
| library | view, create, edit, delete |
| reports | view |
| accessControl | view, create, edit, delete |
| finance | view |
| warranty | view, create, edit, delete |
| manufacturing | view, create, edit, delete |

Format: `{module}.{action}` (e.g., `sku.view`, `inventory.create`)

### Default Roles (Seed)

| Role | Permissions |
|------|-------------|
| **Super Admin** | All permissions (or `*`) |
| **Admin** | All except super-admin-only actions |
| **User / Sales** | `dashboard.view`, `sku.view`, `inventory.view`, `inventory.create`, `reports.view`, limited library |
| **Warehouse** | `inventory.view`, `inventory.create`, `inventory.edit`, `library.view` |

### Backend Implementation

#### 1. Login Flow
- Authenticate user
- Resolve user → roles → permissions (via `user_roles` → `role_permissions` → `permissions`)
- Return `permissions: ["sku.view", "inventory.create", ...]` in response
- JWT: `userId`, `companyId`, optionally `roleIds` or `permissionIds` (or keep permissions in response only, not JWT)

#### 2. `requirePermission(module, action)` Middleware
- Runs after `authenticate`
- Load user's permissions (from `req.user` or DB/cache)
- If `super_admin` or role has `*`: allow
- Else: check `module.action` in permissions; return 403 if missing

#### 3. Route Wiring
- Example: `router.post('/skus', authenticate, requirePermission('sku', 'create'), createSku)`
- Apply to all protected routes

#### 4. Role CRUD
- Create/read/update/delete roles
- Assign permissions to roles via `role_permissions`
- Assign roles to users via `user_roles`

#### 5. Invite User
- Invite with `roleIds` instead of `moduleAccess` / `categoryAccess`
- On first login/set-password, create `user_roles` rows

### Frontend Implementation

#### 1. Auth Guard
- Replace `AuthGate` with `RequireAuth` (token check only) or `RequirePermission` (checks `module.action` against RBAC permissions)

#### 2. Route Protection
- Option A: `RequirePermission` component that fetches permissions and checks before rendering
- Option B: Rely on backend 403; show all routes to logged-in users, let API reject

#### 3. Navigation
- Load user permissions from login response or `/me`
- Filter menu items by `permissions.includes(item.permission)`
- Remove role-based branching (`isUserOrSales` vs admin); use permissions instead

#### 4. Access Control Page
- List roles with their permissions
- Create/edit roles and assign permissions
- Invite users by selecting role(s) — no `moduleAccess` / `categoryAccess` UI

---

## 4. Migration Plan

### Approach: Clean Slate (No Preservation)

**Existing user access will be deleted.** No migration of current permissions. After RBAC is implemented:

- All users (except those manually assigned roles) will have **no access** until an admin assigns them a role
- Admins must re-assign roles to all users via the new Access Control UI
- Old `module_access`, `category_access`, `permissions` data is **discarded**

| Order | Action |
|-------|--------|
| 1 | Create RBAC tables + seed roles/permissions |
| 2 | Implement RBAC backend + frontend |
| 3 | Delete old access control (frontend, backend, columns) |
| 4 | Admins assign roles to users as needed |

---

### Phase 1: Database
1. Create `roles`, `permissions`, `role_permissions`, `user_roles` tables
2. Seed `permissions` with fixed list
3. Seed default `roles` and `role_permissions`

### Phase 2: Backend
1. Implement `requirePermission` middleware
2. Implement role CRUD (persist to DB)
3. Update login to resolve permissions from RBAC
4. Update invite to use `roleIds`

### Phase 3: Frontend
1. Remove old access control (delete list above)
2. Create `RequireAuth` / `RequirePermission` components
3. Update navigation to filter by RBAC permissions
4. Redesign AccessControlPage and InviteUserPage

### Phase 4: Cleanup
1. Drop `module_access`, `category_access`, `permissions` from `admins` and `users_data`

---

## 5. What Gets Recreated

| Component | Recreate "as is"? | What Happens Instead |
|-----------|-------------------|------------------------|
| **AuthGate.tsx** | No | Replaced by `RequireAuth` + `RequirePermission` that checks RBAC permissions. Same purpose (protect routes, redirect), different implementation. |
| **App.tsx** | No | Route protection uses new RBAC guard. Same routes protected, different check. |
| **HorizontalNavigation.tsx** | Partially | Nav filtering remains (hide items user can't access) but uses RBAC permissions from API. |
| **SKUManagementPage.tsx** | Partially | Category filtering remains but driven by RBAC `role_category_access` instead of per-user `categoryAccess`. |
| **AccessControlPage.tsx** | No | Redesigned. Role management (create/edit roles, assign permissions to roles, assign roles to users). No per-user module-access matrix. |
| **InviteUserPage.tsx** | No | Redesigned. Invite by selecting role(s) instead of configuring `moduleAccess`/`categoryAccess` per user. |
| **LoginPage.tsx** | Partially | Login flow stays. Remove extra fetch for `categoryAccess`; permissions come from RBAC in login/me response. |
| **HelpSupportPage.tsx** | Partially | Same FAQ concept; wording updated for RBAC. |
| **NotAuthorizedPage.tsx** | Yes | Keep as redirect target when user lacks permission; optionally update copy. |

### Summary
- **Same behavior:** Route protection, nav filtering, category filtering, login flow, "not authorized" page
- **Different implementation:** RBAC permissions instead of `moduleAccess`/`categoryAccess`
- **Redesigned:** Access Control and Invite User UIs — role-based assignment instead of per-user permission matrices

---

## Quick Reference

| Current | RBAC Target |
|---------|-------------|
| `users.role` + `admins`/`users_data` | `user_roles` → `roles` |
| `module_access` JSONB per user | `role_permissions` → `permissions` |
| `category_access` JSONB per user | `role_category_access` (optional) |
| `AuthGate` + `hasPermission` | `RequirePermission` + RBAC check |
| Hardcoded roles | `roles` table, company-scoped |
| No backend permission middleware | `requirePermission(module, action)` |

---

*Document version: 1.0*  
*Last updated: February 2025*
