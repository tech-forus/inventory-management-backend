-- Migration: Create outgoing_inventory and outgoing_inventory_items tables
-- Description: Tables for tracking outgoing inventory transactions (sales, deliveries, transfers)

-- Create outgoing_inventory table
CREATE TABLE IF NOT EXISTS outgoing_inventory (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(10) NOT NULL,
  document_type VARCHAR(50) NOT NULL, -- 'sales_invoice', 'delivery_challan', 'transfer_note'
  document_sub_type VARCHAR(50), -- For Sales Invoice: 'to_customer', 'to_vendor', For Delivery Challan: 'sample', 'replacement'
  vendor_sub_type VARCHAR(50), -- For Sales Invoice > To Vendor: 'replacement', 'rejected'
  delivery_challan_sub_type VARCHAR(50), -- For Delivery Challan > Replacement: 'to_customer', 'to_vendor'
  invoice_challan_date DATE NOT NULL,
  invoice_challan_number VARCHAR(100),
  docket_number VARCHAR(100),
  transportor_name VARCHAR(255),
  destination_type VARCHAR(50) NOT NULL, -- 'customer', 'vendor', 'store_to_factory'
  destination_id INTEGER, -- Customer ID, Vendor ID, or NULL for store_to_factory
  dispatched_by INTEGER, -- Team ID
  remarks TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'completed'
  total_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_outgoing_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_outgoing_dispatched_by 
    FOREIGN KEY (dispatched_by) 
    REFERENCES teams(id) 
    ON DELETE SET NULL
);

-- Create outgoing_inventory_items table (line items)
CREATE TABLE IF NOT EXISTS outgoing_inventory_items (
  id SERIAL PRIMARY KEY,
  outgoing_inventory_id INTEGER NOT NULL,
  sku_id INTEGER NOT NULL,
  outgoing_quantity INTEGER NOT NULL DEFAULT 0,
  rejected_quantity INTEGER NOT NULL DEFAULT 0, -- For rejected items returned to vendor
  unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_outgoing_items_inventory 
    FOREIGN KEY (outgoing_inventory_id) 
    REFERENCES outgoing_inventory(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_outgoing_items_sku 
    FOREIGN KEY (sku_id) 
    REFERENCES skus(id) 
    ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_company_id ON outgoing_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_destination_type ON outgoing_inventory(destination_type);
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_destination_id ON outgoing_inventory(destination_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_document_type ON outgoing_inventory(document_type);
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_invoice_date ON outgoing_inventory(invoice_challan_date);
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_status ON outgoing_inventory(status);
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_invoice_number ON outgoing_inventory(invoice_challan_number);
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_created_at ON outgoing_inventory(created_at);

CREATE INDEX IF NOT EXISTS idx_outgoing_items_inventory_id ON outgoing_inventory_items(outgoing_inventory_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_items_sku_id ON outgoing_inventory_items(sku_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_outgoing_inventory_updated_at 
  BEFORE UPDATE ON outgoing_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outgoing_items_updated_at 
  BEFORE UPDATE ON outgoing_inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();














