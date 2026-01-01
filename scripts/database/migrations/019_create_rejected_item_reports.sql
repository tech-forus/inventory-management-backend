-- Migration: 019_create_rejected_item_reports
-- Description: Creates rejected_item_reports table for tracking rejected items from incoming inventory
-- Created: 2024-12-XX

BEGIN;

-- Create rejected_item_reports table
CREATE TABLE IF NOT EXISTS rejected_item_reports (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(6) NOT NULL,
  report_number VARCHAR(255) NOT NULL,
  original_invoice_number VARCHAR(255) NOT NULL,
  incoming_inventory_id INTEGER NOT NULL,
  incoming_inventory_item_id INTEGER NOT NULL,
  sku_id INTEGER NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  inspection_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_rejected_reports_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_rejected_reports_incoming_inventory 
    FOREIGN KEY (incoming_inventory_id) 
    REFERENCES incoming_inventory(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_rejected_reports_incoming_inventory_item 
    FOREIGN KEY (incoming_inventory_item_id) 
    REFERENCES incoming_inventory_items(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_rejected_reports_sku 
    FOREIGN KEY (sku_id) 
    REFERENCES skus(id) 
    ON DELETE RESTRICT,
  
  -- Unique constraint: prevent duplicate reports for same invoice/item combination
  CONSTRAINT unique_rejected_report 
    UNIQUE (company_id, report_number)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_rejected_reports_company_id ON rejected_item_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_rejected_reports_invoice_number ON rejected_item_reports(original_invoice_number);
CREATE INDEX IF NOT EXISTS idx_rejected_reports_report_number ON rejected_item_reports(report_number);
CREATE INDEX IF NOT EXISTS idx_rejected_reports_incoming_inventory_id ON rejected_item_reports(incoming_inventory_id);
CREATE INDEX IF NOT EXISTS idx_rejected_reports_incoming_inventory_item_id ON rejected_item_reports(incoming_inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_rejected_reports_sku_id ON rejected_item_reports(sku_id);
CREATE INDEX IF NOT EXISTS idx_rejected_reports_inspection_date ON rejected_item_reports(inspection_date);
CREATE INDEX IF NOT EXISTS idx_rejected_reports_is_active ON rejected_item_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_rejected_reports_created_at ON rejected_item_reports(created_at);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_rejected_reports_updated_at
    BEFORE UPDATE ON rejected_item_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE rejected_item_reports IS 'Reports for rejected items from incoming inventory inspections';
COMMENT ON COLUMN rejected_item_reports.report_number IS 'Unique report number in format: REJ/<InvoiceNumber>/<sequence>';
COMMENT ON COLUMN rejected_item_reports.original_invoice_number IS 'Invoice number from the incoming inventory';
COMMENT ON COLUMN rejected_item_reports.incoming_inventory_id IS 'Reference to the incoming inventory record';
COMMENT ON COLUMN rejected_item_reports.incoming_inventory_item_id IS 'Reference to the specific line item in incoming inventory';
COMMENT ON COLUMN rejected_item_reports.quantity IS 'Quantity of rejected items';

COMMIT;
