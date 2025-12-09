-- Migration: 018_create_price_history
-- Description: Creates price_history table for storing buying price history
-- Created: 2024-12-XX

BEGIN;

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  sku_id INTEGER NOT NULL,
  price DECIMAL(15, 2) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_id INTEGER NOT NULL,
  buying_date DATE NOT NULL,
  invoice_number VARCHAR(255) NOT NULL,
  invoice_id INTEGER, -- Reference to incoming_inventory.id
  type VARCHAR(20) NOT NULL CHECK (type IN ('current', 'previous', 'lowest')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_price_history_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_price_history_sku 
    FOREIGN KEY (sku_id) 
    REFERENCES skus(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_price_history_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_price_history_invoice 
    FOREIGN KEY (invoice_id) 
    REFERENCES incoming_inventory(id) 
    ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_price_history_company_id ON price_history(company_id);
CREATE INDEX IF NOT EXISTS idx_price_history_sku_id ON price_history(sku_id);
CREATE INDEX IF NOT EXISTS idx_price_history_vendor_id ON price_history(vendor_id);
CREATE INDEX IF NOT EXISTS idx_price_history_type ON price_history(type);
CREATE INDEX IF NOT EXISTS idx_price_history_buying_date ON price_history(buying_date);
CREATE INDEX IF NOT EXISTS idx_price_history_sku_type ON price_history(sku_id, type);
CREATE INDEX IF NOT EXISTS idx_price_history_active ON price_history(is_active);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_price_history_updated_at 
  BEFORE UPDATE ON price_history 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE price_history IS 'Stores buying price history for SKUs including current, previous, and lowest prices';
COMMENT ON COLUMN price_history.type IS 'Type of price: current, previous, or lowest';
COMMENT ON COLUMN price_history.invoice_id IS 'Reference to the incoming_inventory record that created this price entry';

COMMIT;

