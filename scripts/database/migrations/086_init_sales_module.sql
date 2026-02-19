BEGIN;

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Update Customers Table
-- Add new columns to support the Sales module requirements
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS anniversary DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS loyalty_tier TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS preferred_categories TEXT;

-- Create index for the new assigned_to column
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);

-- 2. Create Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(6) NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
    assigned_to INTEGER NOT NULL REFERENCES users(id),
    customer_id INTEGER REFERENCES customers(id), -- Nullable
    
    customer_name TEXT, -- Denormalized
    customer_phone TEXT, -- Denormalized
    
    type TEXT CHECK (type IN ('purchase', 'cold')),
    status TEXT CHECK (status IN ('open', 'follow_up', 'negotiation', 'closed_won', 'closed_lost')),
    source TEXT, -- walk_in, whatsapp, instagram, etc.
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    
    estimated_value NUMERIC(15, 2),
    notes TEXT,
    closed_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create Lead Items Table
CREATE TABLE IF NOT EXISTS lead_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sku_code TEXT, -- Nullable, allows free text if no SKU match
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    estimated_value NUMERIC(15, 2)
);

-- 4. Create Lead Follow-ups Table
CREATE TABLE IF NOT EXISTS lead_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    follow_up_date DATE NOT NULL,
    follow_up_time TIME NOT NULL,
    note TEXT,
    is_done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_customer ON leads(customer_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_lead ON lead_follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_date ON lead_follow_ups(follow_up_date);

-- Trigger for updated_at on leads table
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_leads_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_leads_updated_at
      BEFORE UPDATE ON leads
      FOR EACH ROW
      EXECUTE FUNCTION update_leads_updated_at();
  END IF;
END $$;

COMMIT;
