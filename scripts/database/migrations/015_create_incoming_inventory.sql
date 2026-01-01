-- Migration: 015_create_incoming_inventory
-- Description: Creates incoming_inventory and incoming_inventory_items tables for incoming inventory management
-- Created: 2024-12-XX

BEGIN;

-- Create incoming_inventory table (main header table)
CREATE TABLE IF NOT EXISTS incoming_inventory (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  invoice_date DATE NOT NULL,
  invoice_number VARCHAR(255) NOT NULL,
  docket_number VARCHAR(255),
  transportor_name VARCHAR(255),
  vendor_id INTEGER NOT NULL,
  brand_id INTEGER NOT NULL,
  receiving_date DATE NOT NULL,
  received_by INTEGER, -- Vendor ID who received
  reason VARCHAR(255) NOT NULL, -- purchase, replacement, from_factory, others, etc.
  remarks TEXT,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  total_value DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_incoming_inventory_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_incoming_inventory_vendor 
    FOREIGN KEY (vendor_id) 
    REFERENCES vendors(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_incoming_inventory_brand 
    FOREIGN KEY (brand_id) 
    REFERENCES brands(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_incoming_inventory_received_by 
    FOREIGN KEY (received_by) 
    REFERENCES vendors(id) 
    ON DELETE SET NULL
);

-- Create incoming_inventory_items table (line items)
CREATE TABLE IF NOT EXISTS incoming_inventory_items (
  id SERIAL PRIMARY KEY,
  incoming_inventory_id INTEGER NOT NULL,
  sku_id INTEGER NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 0,
  rejected INTEGER NOT NULL DEFAULT 0,
  short INTEGER NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  number_of_boxes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_incoming_items_inventory 
    FOREIGN KEY (incoming_inventory_id) 
    REFERENCES incoming_inventory(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_incoming_items_sku 
    FOREIGN KEY (sku_id) 
    REFERENCES skus(id) 
    ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_company_id ON incoming_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_vendor_id ON incoming_inventory(vendor_id);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_brand_id ON incoming_inventory(brand_id);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_invoice_date ON incoming_inventory(invoice_date);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_receiving_date ON incoming_inventory(receiving_date);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_status ON incoming_inventory(status);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_invoice_number ON incoming_inventory(invoice_number);
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_created_at ON incoming_inventory(created_at);

CREATE INDEX IF NOT EXISTS idx_incoming_items_inventory_id ON incoming_inventory_items(incoming_inventory_id);
CREATE INDEX IF NOT EXISTS idx_incoming_items_sku_id ON incoming_inventory_items(sku_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_incoming_inventory_updated_at 
  BEFORE UPDATE ON incoming_inventory 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incoming_inventory_items_updated_at 
  BEFORE UPDATE ON incoming_inventory_items 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE incoming_inventory IS 'Main table for incoming inventory transactions';
COMMENT ON TABLE incoming_inventory_items IS 'Line items for incoming inventory transactions';
COMMENT ON COLUMN incoming_inventory.reason IS 'Reason for receipt: purchase, replacement, from_factory, others, etc.';
COMMENT ON COLUMN incoming_inventory.status IS 'Status: draft, completed, cancelled';
COMMENT ON COLUMN incoming_inventory.received_by IS 'Vendor ID of the person/entity who received the inventory';

COMMIT;


