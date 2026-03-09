-- 131_update_units_with_details.sql

-- 1. Update customer_units table with address and GST fields
ALTER TABLE customer_units 
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS is_shipping_same_as_billing BOOLEAN DEFAULT FALSE;

-- 2. Optional: Add a comment to contact address columns (not dropping yet to safely transition)
COMMENT ON COLUMN customer_contacts.billing_address IS 'Deprecated: Shifted to customer_units';
COMMENT ON COLUMN customer_contacts.shipping_address IS 'Deprecated: Shifted to customer_units';

-- 3. Ensure unit_id is indexed for performance
CREATE INDEX IF NOT EXISTS idx_customer_contacts_unit_id ON customer_contacts(unit_id);
