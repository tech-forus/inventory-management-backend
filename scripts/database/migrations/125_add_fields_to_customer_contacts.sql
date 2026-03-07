-- Add new fields to customer_contacts based on user request
ALTER TABLE customer_contacts
ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(50),
ADD COLUMN IF NOT EXISTS interests JSONB,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT;
