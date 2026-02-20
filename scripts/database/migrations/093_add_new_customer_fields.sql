-- Migration to add new customer fields based on UI updates
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'Open Credit',
ADD COLUMN IF NOT EXISTS consignee_address TEXT,
ADD COLUMN IF NOT EXISTS is_consignee_same_as_billing BOOLEAN DEFAULT FALSE;
