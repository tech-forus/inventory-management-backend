# Warranty and Serial Number Implementation

## Overview
This document describes the implementation of the Warranty and Serial Number feature for inventory management.

## Database Changes

### Migrations Created
1. **066_add_warranty_to_skus.sql** - Adds `warranty` column to `skus` table
2. **067_add_serial_number_to_incoming_inventory_items.sql** - Adds `serial_number` column to `incoming_inventory_items` table
3. **068_add_warranty_serial_to_outgoing_inventory_items.sql** - Adds `warranty` and `serial_number` columns to `outgoing_inventory_items` table

### Running Migrations
```bash
# Option 1: Run migration script
node scripts/run-warranty-serial-migrations.js

# Option 2: Run migrations manually using psql or your database client
psql -d your_database -f scripts/database/migrations/066_add_warranty_to_skus.sql
psql -d your_database -f scripts/database/migrations/067_add_serial_number_to_incoming_inventory_items.sql
psql -d your_database -f scripts/database/migrations/068_add_warranty_serial_to_outgoing_inventory_items.sql
```

## Backend Changes

### Models Updated
1. **SKUModel** (`src/models/skuModel.js`)
   - Added `warranty` field to `create()` method
   - Added `warranty` field to `update()` method
   - `getById()` and `getAll()` automatically include warranty (using `s.*`)

2. **IncomingInventoryModel** (`src/models/incomingInventoryModel.js`)
   - Updated `create()` to accept `serialNumber` in items
   - Updated `getItemsByInventoryId()` to return `serial_number`
   - Added `getItemsByInvoiceNumber()` - Get all items for an invoice
   - Added `updateWarrantyAndSerial()` - Update warranty and serial for a single item
   - Added `bulkUpdateWarrantyAndSerial()` - Update multiple items at once

### Controllers Updated
1. **IncomingInventoryController** (`src/controllers/incomingInventoryController.js`)
   - Added `getItemsByInvoiceNumber()` - Returns items with warranty and serial data
   - Added `updateWarrantyAndSerial()` - Updates single item
   - Added `bulkUpdateWarrantyAndSerial()` - Updates multiple items
   - Added `searchInvoices()` - Search invoices for autocomplete
   - Updated `transformItem()` to include `serialNumber`

### Routes Added
1. `GET /api/inventory/incoming/by-invoice/:invoiceNumber` - Get items by invoice number
2. `GET /api/inventory/incoming/search-invoices?q=query` - Search invoices
3. `PUT /api/inventory/incoming-items/:itemId` - Update warranty and serial for single item
4. `PUT /api/inventory/incoming-items/bulk-update` - Bulk update warranty and serial

## Frontend Changes

### New Pages
1. **WarrantyAndServicesPage** (`src/pages/WarrantyAndServicesPage.tsx`)
   - Main page with tabs for Incoming and Outgoing entries
   - Default shows Incoming Entries

### New Components
1. **IncomingWarrantySerialTable** (`src/components/inventory/warrantySerial/IncomingWarrantySerialTable.tsx`)
   - Invoice search with autocomplete
   - Table displaying items with warranty and serial number inputs
   - Save individual items or all items at once

2. **OutgoingWarrantySerialTable** (`src/components/inventory/warrantySerial/OutgoingWarrantySerialTable.tsx`)
   - Placeholder for future outgoing entries feature

### Services Updated
1. **inventoryService** (`src/services/inventoryService.ts`)
   - Added `searchInvoices()` - Search invoices
   - Added `getItemsByInvoiceNumber()` - Get items for invoice
   - Added `updateWarrantyAndSerial()` - Update single item
   - Added `bulkUpdateWarrantyAndSerial()` - Bulk update

### Routes Added
- `/app/warranty-services` - Warranty and Services page

## Features

### Warranty Management
- **SKU Level**: Default warranty set when SKU is created (stored in `skus.warranty`)
- **Invoice Level**: Custom warranty per invoice item (stored in `incoming_inventory_items.warranty`)
- **Auto-fill**: When loading items, warranty auto-fills from SKU default, but can be edited per invoice
- **Warranty Valid Till**: Auto-calculated as Invoice Date + Warranty (months)

### Serial Number Management
- **Storage**: Serial numbers stored as comma-separated string in `serial_number` column
- **Input**: One input field per unit (based on received quantity)
- **Validation**: Optional field, can be left empty

### User Flow
1. User navigates to Warranty and Services page
2. User searches/selects invoice number
3. System loads all items from that invoice
4. Items display with:
   - Invoice number and date (read-only)
   - Item name, SKU ID, Quantity (read-only)
   - Warranty input (editable, auto-filled from SKU default)
   - Warranty Valid Till (auto-calculated, read-only)
   - Serial number inputs (one per unit, editable)
   - Actions button (save individual item)
5. User edits warranty and/or enters serial numbers
6. User clicks "Save" per item or "Save All Changes" to save all items

## API Endpoints

### Get Items by Invoice Number
```
GET /api/inventory/incoming/by-invoice/:invoiceNumber
Response: {
  success: true,
  data: {
    invoiceNumber: "INV-2024-001",
    invoiceDate: "2024-01-15",
    items: [
      {
        id: 123,
        itemId: 123,
        skuId: 456,
        skuCode: "QVSTARYUMBP",
        itemName: "MCB 20A",
        received: 5,
        warranty: 12,
        skuDefaultWarranty: 12,
        serialNumber: "",
        warrantyValidTill: "2025-01-15"
      }
    ]
  }
}
```

### Update Warranty and Serial
```
PUT /api/inventory/incoming-items/:itemId
Request: {
  warranty: 24,
  serialNumber: "SN001,SN002,SN003,SN004,SN005"
}
Response: {
  success: true,
  data: {
    id: 123,
    warranty: 24,
    serialNumber: "SN001,SN002,SN003,SN004,SN005"
  }
}
```

### Bulk Update
```
PUT /api/inventory/incoming-items/bulk-update
Request: {
  updates: [
    { itemId: 123, warranty: 24, serialNumber: "SN001,SN002,..." },
    { itemId: 124, warranty: 12, serialNumber: "SN101,SN102" }
  ]
}
Response: {
  success: true,
  data: [
    { id: 123, warranty: 24, serialNumber: "SN001,SN002,..." },
    { id: 124, warranty: 12, serialNumber: "SN101,SN102" }
  ]
}
```

### Search Invoices
```
GET /api/inventory/incoming/search-invoices?q=INV
Response: {
  success: true,
  data: [
    {
      invoiceNumber: "INV-2024-001",
      invoiceDate: "2024-01-15",
      supplierName: "ABC Suppliers"
    }
  ]
}
```

## Testing Checklist

- [ ] Run database migrations
- [ ] Verify columns exist in database
- [ ] Test SKU creation with warranty
- [ ] Test SKU update with warranty
- [ ] Test invoice search API
- [ ] Test get items by invoice number API
- [ ] Test update warranty and serial API
- [ ] Test bulk update API
- [ ] Test frontend page loads
- [ ] Test invoice search in frontend
- [ ] Test loading items by invoice
- [ ] Test editing warranty
- [ ] Test entering serial numbers
- [ ] Test saving individual item
- [ ] Test saving all items
- [ ] Test warranty valid till calculation

## Notes

- Warranty is stored in months (integer)
- Serial numbers are stored as comma-separated strings
- Warranty Valid Till is calculated on frontend (Invoice Date + Warranty months)
- Outgoing inventory support is prepared but not yet implemented (migration created, model/controller pending)
