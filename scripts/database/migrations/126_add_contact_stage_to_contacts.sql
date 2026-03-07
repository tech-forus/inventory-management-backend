-- Add contact_stage to customer_contacts
ALTER TABLE customer_contacts
ADD COLUMN IF NOT EXISTS contact_stage VARCHAR(20) DEFAULT 'potential';
