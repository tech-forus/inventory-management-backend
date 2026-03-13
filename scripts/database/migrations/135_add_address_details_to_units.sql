-- Migration: 135_add_address_details_to_units
-- Description: Adds separate billing/shipping pincode, city, state, and GST fields to customer_units
-- Created: 2026-03-13

-- 1. Add billing detail columns
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS billing_pincode VARCHAR(6);
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100);
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS billing_state VARCHAR(100);
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS billing_gst_number VARCHAR(15);

-- 2. Add shipping detail columns
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(6);
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100);
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100);
ALTER TABLE customer_units ADD COLUMN IF NOT EXISTS shipping_gst_number VARCHAR(15);

-- 3. Migrate existing gst_number data into billing_gst_number (one-time data migration)
UPDATE customer_units
SET billing_gst_number = gst_number
WHERE gst_number IS NOT NULL AND billing_gst_number IS NULL;

-- 4. Comment on deprecated column
COMMENT ON COLUMN customer_units.gst_number IS 'Deprecated: Use billing_gst_number and shipping_gst_number instead';
