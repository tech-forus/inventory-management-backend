# Incoming Inventory System - Changes Log

## Date: Today

This document outlines all the changes made to the incoming inventory/record system today.

---

## 📋 Table of Contents
1. [Database Schema Changes](#database-schema-changes)
2. [New Features](#new-features)
3. [API Endpoints](#api-endpoints)
4. [Stock Management Updates](#stock-management-updates)
5. [Frontend Changes](#frontend-changes)
6. [Migration Files](#migration-files)

---

## 🗄️ Database Schema Changes

### Migration 016: Update Incoming Inventory Schema

**File:** `BACKEND/database/migrations/016_update_incoming_inventory_schema.sql`

#### Changes Made:

1. **Added Warranty Fields to `incoming_inventory` table:**
   - `warranty` (INTEGER) - Warranty period value
   - `warranty_unit` (VARCHAR(10)) - Unit of warranty: 'months' or 'year'
   - Default values: `warranty = 0`, `warranty_unit = 'months'`

2. **Updated `incoming_inventory_items` table:**
   - **Renamed fields:** Changed from `accepted`/`rejected` to `received`/`short`/`rejected`
   - **Added `received_boxes`** (INTEGER) - Number of boxes received
   - **Data migration:** Existing `accepted` values migrated to `received`
   - **Removed:** `accepted` and old `rejected` columns (later re-added in migration 017)

3. **Changed `received_by` Foreign Key:**
   - **Before:** Foreign key to `vendors` table
   - **After:** Foreign key to `teams` table
   - **Impact:** Now tracks which team/person received the inventory instead of vendor

### Migration 017: Add Rejected Field and Challan Tracking

**File:** `BACKEND/database/migrations/017_add_rejected_field.sql`

#### Changes Made:

1. **Re-added `rejected` field to `incoming_inventory_items`:**
   - `rejected` (INTEGER) - Quantity rejected (moved from short or received)
   - Default value: `0`

2. **Added Challan Tracking Fields:**
   - `challan_number` (VARCHAR(255)) - Challan number for the item
   - `challan_date` (DATE) - Challan date for the item
   - These fields allow tracking of delivery challans for each item

---

## ✨ New Features

### 1. Warranty Tracking
- **Purpose:** Track warranty period for incoming inventory
- **Fields:**
  - `warranty`: Numeric value (e.g., 12)
  - `warranty_unit`: 'months' or 'year'
- **Usage:** Set during incoming inventory creation

### 2. Received Boxes Tracking
- **Purpose:** Track number of boxes received for each item
- **Field:** `received_boxes` in `incoming_inventory_items`
- **Usage:** Helps in physical inventory management

### 3. Move Received to Rejected
- **Purpose:** Mark received items as defective/rejected
- **Functionality:**
  - Moves quantity from `received` to `rejected`
  - Automatically reduces stock (rejected items are not in stock)
  - Can move partial or full quantity
- **API Endpoint:** `POST /inventory/incoming/:id/move-received-to-rejected`
- **Request Body:**
  ```json
  {
    "itemId": 123,
    "quantity": 5  // Optional, defaults to all received
  }
  ```

### 4. Move Short to Rejected
- **Purpose:** Mark short items as rejected (e.g., damaged during transit)
- **Functionality:**
  - Moves quantity from `short` to `rejected`
  - Automatically reduces stock
  - Can move partial or full quantity
- **API Endpoint:** `POST /inventory/incoming/:id/move-to-rejected`
- **Request Body:**
  ```json
  {
    "itemId": 123,
    "quantity": 3  // Optional, defaults to all short
  }
  ```

### 5. Update Short Item
- **Purpose:** Edit received, short quantities, and challan information
- **Functionality:**
  - Update `received` and `short` quantities
  - Auto-calculates one field if the other is provided
  - Updates challan number and date
  - Automatically adjusts stock based on received quantity changes
  - Validates: `received + short + rejected = total_quantity`
- **API Endpoint:** `PUT /inventory/incoming/:id/update-short-item`
- **Request Body:**
  ```json
  {
    "itemId": 123,
    "received": 95,  // Optional
    "short": 5,      // Optional
    "challanNumber": "CH-2024-001",  // Optional
    "challanDate": "2024-12-15"      // Optional
  }
  ```

### 6. Challan Tracking
- **Purpose:** Track delivery challans for each item
- **Fields:**
  - `challan_number`: Challan reference number
  - `challan_date`: Date of challan
- **Usage:** Can be set during item creation or updated later

### 7. Teams Integration for Received By
- **Purpose:** Better tracking of who received the inventory
- **Change:** `received_by` now references `teams` table instead of `vendors`
- **Benefit:** More accurate tracking of receiving personnel/teams

---

## 🔌 API Endpoints

### New Endpoints Added:

1. **Move Received to Rejected**
   ```
   POST /api/inventory/incoming/:id/move-received-to-rejected
   ```
   - Moves received quantity to rejected
   - Reduces stock automatically

2. **Move Short to Rejected**
   ```
   POST /api/inventory/incoming/:id/move-to-rejected
   ```
   - Moves short quantity to rejected
   - Reduces stock automatically

3. **Update Short Item**
   ```
   PUT /api/inventory/incoming/:id/update-short-item
   ```
   - Updates received, short, challan number, and challan date
   - Auto-adjusts stock

### Updated Endpoints:

1. **Create Incoming Inventory**
   ```
   POST /api/inventory/incoming
   ```
   - Now accepts `warranty` and `warrantyUnit` fields
   - Now accepts `receivedBy` (team ID instead of vendor ID)
   - Now accepts `receivedBoxes` for each item

2. **Get Incoming Inventory Items**
   ```
   GET /api/inventory/incoming/:id/items
   ```
   - Returns `received`, `short`, `rejected` instead of `accepted`/`rejected`
   - Returns `challan_number` and `challan_date`
   - Returns `received_boxes`

---

## 📊 Stock Management Updates

### Critical Change: Stock Based on Received Quantity Only

**Important:** Stock is now updated based on **received quantity only**, not total quantity.

#### Before:
- Stock was updated with total quantity when status changed to 'completed'

#### After:
- Stock is updated with **received quantity only** when:
  - Status changes from 'draft' to 'completed'
  - Items are moved from received to rejected (stock decreases)
  - Items are moved from short to rejected (stock decreases)
  - Short items are updated (stock adjusts based on received changes)

#### Stock Update Scenarios:

1. **Status: Draft → Completed**
   - Stock increases by `received` quantity (not total quantity)
   - Short items do not add to stock

2. **Status: Completed → Draft**
   - Stock decreases by `received` quantity (reversal)

3. **Move Received to Rejected**
   - Stock decreases by moved quantity
   - Example: Move 5 from received to rejected → stock decreases by 5

4. **Move Short to Rejected**
   - Stock decreases by moved quantity
   - Note: Short items were never in stock, but moving to rejected ensures they're tracked

5. **Update Short Item**
   - Stock adjusts based on change in `received` quantity
   - Example: Increase received from 90 to 95 → stock increases by 5

6. **Delete Incoming Inventory**
   - If status is 'completed', stock decreases by `received` quantity

---

## 🎨 Frontend Changes

### IncomingInventoryPage.tsx Updates:

1. **Warranty Fields Added:**
   - Warranty input field (numeric)
   - Warranty unit dropdown (months/year)

2. **Received By Field:**
   - Changed from vendor dropdown to team dropdown
   - Fetches teams instead of vendors for this field

3. **Item Fields:**
   - `received` and `short` fields (replacing `accepted`)
   - `receivedBoxes` field for box tracking
   - `challanNumber` and `challanDate` fields

4. **New Actions:**
   - "Move to Rejected" button for received items
   - "Move to Rejected" button for short items
   - Edit functionality for short items (received, short, challan)

5. **History Tab:**
   - Shows received, short, and rejected quantities
   - Displays challan information
   - Filter by date, vendor, and SKU

---

## 📁 Migration Files

### Migration 016: `016_update_incoming_inventory_schema.sql`
- Adds warranty fields
- Migrates accepted → received
- Adds received_boxes
- Changes received_by foreign key to teams

### Migration 017: `017_add_rejected_field.sql`
- Re-adds rejected field
- Adds challan_number and challan_date fields

### Running Migrations:
```bash
cd BACKEND
npm run migrate
```

---

## 🔄 Data Flow

### Creating Incoming Inventory:
1. User creates incoming inventory with items
2. Each item has: `totalQuantity`, `received`, `short`, `receivedBoxes`
3. Validation: `received + short = totalQuantity` (initially, rejected = 0)
4. When status changes to 'completed', stock increases by `received` only

### Managing Short Items:
1. User can edit received/short quantities
2. System auto-calculates: `received + short + rejected = totalQuantity`
3. Stock adjusts based on received quantity changes

### Moving to Rejected:
1. User can move received → rejected (defective items)
2. User can move short → rejected (damaged in transit)
3. Stock decreases by moved quantity
4. Rejected items are tracked but not in stock

---

## ⚠️ Important Notes

1. **Stock Calculation:**
   - Only `received` items are added to stock
   - `short` items are never in stock
   - `rejected` items are never in stock
   - When moving to rejected, stock decreases

2. **Validation Rules:**
   - `received + short + rejected = totalQuantity` (always)
   - Quantities cannot be negative
   - Cannot move more than available quantity

3. **Team vs Vendor:**
   - `received_by` now references teams, not vendors
   - Ensure teams are set up before using this feature

4. **Backward Compatibility:**
   - Migration 016 migrates existing `accepted` data to `received`
   - Existing records with `received_by` pointing to vendors are set to NULL
   - Update existing records manually if needed

---

## 🧪 Testing

### Test Files:
- `BACKEND/test_incoming_inventory_new_features.js` - Tests new features
- `BACKEND/test_incoming_inventory_unit.js` - Unit tests
- `BACKEND/test_incoming_display.js` - Display tests

### Test Scenarios:
1. Create incoming inventory with warranty
2. Move received to rejected
3. Move short to rejected
4. Update short item with challan
5. Verify stock updates correctly
6. Verify validation rules

---

## 📝 Summary

Today's changes significantly enhance the incoming inventory system with:
- ✅ Warranty tracking
- ✅ Better quantity management (received/short/rejected)
- ✅ Challan tracking
- ✅ Teams integration for received_by
- ✅ Stock management based on received quantity only
- ✅ Move to rejected functionality
- ✅ Edit short items with auto-calculation

All changes are backward compatible through database migrations.

---

## 🔗 Related Files

- **Controller:** `BACKEND/controllers/incomingInventoryController.js`
- **Model:** `BACKEND/models/incomingInventoryModel.js`
- **Routes:** `BACKEND/routes/inventory.js`
- **Frontend:** `FRONTEND/src/pages/IncomingInventoryPage.tsx`
- **Service:** `FRONTEND/src/services/inventoryService.ts`

---

*Last Updated: Today*

