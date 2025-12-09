-- Migration: 024_update_incoming_inventory_document_fields
-- Description: Adds document type fields and removes reason field from incoming_inventory table
-- Created: 2024-12-XX

BEGIN;

-- Add new document type fields
ALTER TABLE incoming_inventory
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(50) DEFAULT 'bill' CHECK (document_type IN ('bill', 'delivery_challan', 'transfer_note')),
  ADD COLUMN IF NOT EXISTS document_sub_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS vendor_sub_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS delivery_challan_sub_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS destination_type VARCHAR(50) CHECK (destination_type IN ('vendor', 'customer')),
  ADD COLUMN IF NOT EXISTS destination_id INTEGER;

-- Add foreign key constraint for destination_id (can be vendor or customer)
-- Note: We'll handle this in application logic since it can reference either vendors or customers

-- Remove reason field (make it nullable first, then drop)
ALTER TABLE incoming_inventory
  ALTER COLUMN reason DROP NOT NULL;

-- Update existing records: set default document_type if null
UPDATE incoming_inventory
SET document_type = 'bill'
WHERE document_type IS NULL;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_document_type ON incoming_inventory(document_type);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_destination_type ON incoming_inventory(destination_type);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_destination_id ON incoming_inventory(destination_id);

-- Add comments
COMMENT ON COLUMN incoming_inventory.document_type IS 'Type of document: bill, delivery_challan, transfer_note';
COMMENT ON COLUMN incoming_inventory.document_sub_type IS 'Sub type based on document type (e.g., from_vendor, from_customer, sample, replace)';
COMMENT ON COLUMN incoming_inventory.vendor_sub_type IS 'Vendor sub type for bill > from_vendor (replacement, rejected)';
COMMENT ON COLUMN incoming_inventory.delivery_challan_sub_type IS 'Delivery challan sub type for sample (vendor, customer)';
COMMENT ON COLUMN incoming_inventory.destination_type IS 'Destination type: vendor or customer';
COMMENT ON COLUMN incoming_inventory.destination_id IS 'ID of destination (vendor or customer based on destination_type)';

-- Note: We keep the reason column for backward compatibility but it's no longer required
-- It can be dropped in a future migration after data migration if needed

COMMIT;

