# Backend Changelog

## Recent Changes (January 2025)

### Critical Fixes

#### 1. Fixed Item ID Missing in getById Query
**File:** `src/models/incomingInventoryModel.js` (Line 410-434)
- **Issue:** Items fetched via `getById` were missing `item_id` field, causing "Item ID not found" errors when marking items as rejected
- **Root Cause:** Query used `SELECT iii.*` which returned `id` instead of `item_id`, but transformer expected `item_id`
- **Fix:** Changed query to explicitly select `iii.id as item_id` to match transformer expectations
- **Impact:** Items now correctly include `item_id` which gets transformed to `itemId` for the frontend
- **Commit:** `9f198a1`

#### 2. Fixed Data Transformation in getIncomingInventoryById
**File:** `src/controllers/incomingInventoryController.js` (Line 147-171)
- **Issue:** API endpoint was returning raw snake_case data instead of transformed camelCase, causing "N/A" display in modals
- **Fix:** Added transformation using `transformIncomingInventory()` and `transformItem()` functions before sending response
- **Impact:** Frontend now receives properly formatted data with all fields in camelCase
- **Commit:** `55f2ede`

#### 3. Fixed Transporter Name Spelling Mismatch
**File:** `src/models/incomingInventoryModel.js` (Line 51)
- **Issue:** Frontend sends `transporterName` (correct spelling) but backend expected `transportorName` (misspelling)
- **Fix:** Updated to accept both `transporterName` and `transportorName` for backward compatibility
- **Impact:** Transporter name now displays correctly in modals
- **Commit:** `2c794f0`

### Database Schema Changes

#### Migration 057: Add Warranty to Items
**File:** `scripts/database/migrations/057_add_warranty_to_incoming_inventory_items.sql`
- Added `warranty INTEGER DEFAULT 0` to `incoming_inventory_items` table
- Warranty is stored per item (in months)
- **Script:** `scripts/run-migration-057-direct.js`

#### Migration 058: Add Freight and Boxes to Inventory
**File:** `scripts/database/migrations/058_add_freight_boxes_to_incoming_inventory.sql`
- Added `freight_amount DECIMAL(15, 2) DEFAULT 0` to `incoming_inventory` table
- Added `number_of_boxes INTEGER DEFAULT 0` to `incoming_inventory` table
- Added `received_boxes INTEGER DEFAULT 0` to `incoming_inventory` table
- These fields are stored per invoice (not per item)
- **Script:** `scripts/run-migration-058-direct.js`

### API Improvements

#### Enhanced getItemsByInventoryId Query
**File:** `src/models/incomingInventoryModel.js` (Line 355-379)
- Added missing fields: `warranty`, `gst_percentage`, `gst_amount`, `total_value_excl_gst`, `total_value_incl_gst`
- Ensures all item data is available for frontend display
- **Commit:** `aae6db4`

### Model Updates

#### Incoming Inventory Model
- Updated `create` method to use frontend-calculated GST values
- Added `warranty` to item INSERT query
- Added `freight_amount`, `number_of_boxes`, `received_boxes` to inventory INSERT query
- Removed `numberOfBoxes` and `receivedBoxes` from items (moved to invoice level)

### Controller Updates

#### Incoming Inventory Controller
- Updated `transformIncomingInventory` to include `freightAmount`, `numberOfBoxes`, `receivedBoxes`
- Updated `transformItem` to include all GST fields and `warranty`
- Fixed `getIncomingInventoryById` to transform data before sending

---

## Files Modified

- `src/models/incomingInventoryModel.js`
- `src/controllers/incomingInventoryController.js`
- `scripts/database/migrations/057_add_warranty_to_incoming_inventory_items.sql`
- `scripts/database/migrations/058_add_freight_boxes_to_incoming_inventory.sql`
- `scripts/run-migration-057-direct.js`
- `scripts/run-migration-058-direct.js`
- `tests/test_item_id_fix.js` (new)

---

## Testing

### Test File Created
**File:** `tests/test_item_id_fix.js`
- Created test to verify `getById` returns items with `item_id` field
- Helps ensure the fix is working correctly

---

## Summary

All changes focus on:
1. ✅ Fixing data transformation issues (snake_case → camelCase)
2. ✅ Ensuring all required fields are included in API responses
3. ✅ Fixing spelling mismatches between frontend and backend
4. ✅ Adding support for new fields (warranty, freight, boxes)
5. ✅ Improving data consistency across API endpoints

---

**Last Updated:** January 2025
