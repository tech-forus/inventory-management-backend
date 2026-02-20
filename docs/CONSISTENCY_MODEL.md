# Customer Management Consistency Model

This document outlines the consistency and performance model implemented for the Customer Modal and List.

## 1. Architectural Principles

### 1.1 Authoritative Backend
The backend API is the single source of truth. Every successful `POST` or `PUT` request returns the **canonical customer object** (fully calculated and transformed by the server). The frontend MUST use this returned object to update its local state.

### 1.2 Optimistic UI with Graceful Rollback
To provide a "9.5/10" user experience, the frontend performs optimistic updates:
- **Deletions**: The item is immediately removed from the UI. If the API fails, the item is restored.
- **Creations/Updates**: The item is immediately added or updated in the list using the form state. Once the API returns the canonical object, the local state is refined with the server's data.

### 1.3 Eventual Consistency via Background Refresh
After an optimistic update, the system triggers a background fetch of the current page. This ensures that:
- Server-side calculations (e.g., total counts, related data) are synced.
- Other users' changes are eventually visible.
- The UI remains responsive without full-page reloads.

## 2. Performance Strategies

### 2.1 Server-Side Pagination
The "Get All" pattern has been replaced with mandatory pagination:
- **Endpoint**: `GET /library/customers?page=1&limit=25`
- **Metadata**: Responses include `pagination: { total, page, limit, totalPages }`.
- **Scaling**: This prevents the "growing list lag" where fetching thousands of records slows down the entire UI.

### 2.2 Database Optimization
Database indexes are used to support paginated queries and common filters:
- `idx_customers_created_at_desc`: For sorting by newest.
- `idx_customers_company_active`: For filtering by status.
- `GIN` indexes (planned) for high-performance full-text search.

### 2.3 Reliable Transactions
The `withTx` helper ensures that multi-step operations (like bulk uploads) are atomic:
- Automatic `BEGIN`, `COMMIT`, and `ROLLBACK`.
- Performance logging (`measure` utility) for every transaction.
- Standardized error handling to prevent connection leaks.

## 3. Implementation Details

### 3.1 Frontend (`CustomersTab.tsx`)
Managed by local state with `useCallback` for fetching. Background refreshes are triggered after every mutation.

### 3.2 Backend (`libraryController.js`)
Uses `withTx` for all mutations. Returns the `transformCustomer(customer)` result for single updates.

### 3.3 Services (`libraryService.ts`)
Standardized to return `{ success, customer }` for mutations and `{ success, data, pagination }` for queries.
