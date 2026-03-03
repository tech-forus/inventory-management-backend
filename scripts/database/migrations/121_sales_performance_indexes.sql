-- Add composite indexes for Sales module performance
-- These optimize the 'Counts' cards in the Sales/Library sections

BEGIN;

-- 1. Quotations: Optimize counting by status within a company
CREATE INDEX IF NOT EXISTS idx_quotations_company_status 
ON quotations (company_id, status);

-- 2. Leads: Optimize counting by status within a company
CREATE INDEX IF NOT EXISTS idx_leads_company_status 
ON leads (company_id, status);

-- 3. Customers: Optimize counting by stage within a company
CREATE INDEX IF NOT EXISTS idx_customers_company_stage 
ON customers (company_id, customer_stage);

-- Lead Items: Optimize counting items for a lead
CREATE INDEX IF NOT EXISTS idx_lead_items_lead_id 
ON lead_items (lead_id);

COMMIT;
