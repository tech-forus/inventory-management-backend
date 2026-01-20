-- Migration: 062_create_manufacturing_tables
-- Description: Creates tables for manufacturing/production management
-- Created: 2025-01-20

BEGIN;

-- 1. Bill of Materials (BOM) Materials
CREATE TABLE IF NOT EXISTS bom_materials (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(10) NOT NULL,
  finished_good_sku_id INTEGER NOT NULL,
  raw_material_sku_id INTEGER NOT NULL,
  quantity_required DECIMAL(15, 4) NOT NULL,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_bom_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_bom_finished_good 
    FOREIGN KEY (finished_good_sku_id) 
    REFERENCES skus(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_bom_raw_material 
    FOREIGN KEY (raw_material_sku_id) 
    REFERENCES skus(id) 
    ON DELETE CASCADE,

  -- Unique constraint: A finished good and raw material combination should be unique per company
  CONSTRAINT unique_bom_item 
    UNIQUE (company_id, finished_good_sku_id, raw_material_sku_id)
);

-- 2. Manufacturing Records
CREATE TABLE IF NOT EXISTS manufacturing_records (
  id SERIAL PRIMARY KEY,
  company_id VARCHAR(10) NOT NULL,
  finished_good_sku_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  manufacture_date DATE NOT NULL,
  batch_number VARCHAR(100),
  production_location VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  incoming_inventory_id INTEGER, -- Link to the incoming record created for finished goods
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_mfg_company 
    FOREIGN KEY (company_id) 
    REFERENCES companies(company_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_mfg_finished_good 
    FOREIGN KEY (finished_good_sku_id) 
    REFERENCES skus(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_mfg_incoming 
    FOREIGN KEY (incoming_inventory_id) 
    REFERENCES incoming_inventory(id) 
    ON DELETE SET NULL
);

-- 3. Manufacturing Components (Detailed usage for each run)
CREATE TABLE IF NOT EXISTS manufacturing_components (
  id SERIAL PRIMARY KEY,
  manufacturing_id INTEGER NOT NULL,
  raw_material_sku_id INTEGER NOT NULL,
  quantity_used DECIMAL(15, 4) NOT NULL,
  outgoing_inventory_id INTEGER, -- Link to the outgoing record created for raw materials
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  CONSTRAINT fk_mfg_comp_parent 
    FOREIGN KEY (manufacturing_id) 
    REFERENCES manufacturing_records(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT fk_mfg_comp_sku 
    FOREIGN KEY (raw_material_sku_id) 
    REFERENCES skus(id) 
    ON DELETE RESTRICT,
  
  CONSTRAINT fk_mfg_comp_outgoing 
    FOREIGN KEY (outgoing_inventory_id) 
    REFERENCES outgoing_inventory(id) 
    ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bom_company_id ON bom_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_bom_finished_good_id ON bom_materials(finished_good_sku_id);
CREATE INDEX IF NOT EXISTS idx_mfg_company_id ON manufacturing_records(company_id);
CREATE INDEX IF NOT EXISTS idx_mfg_finished_good_id ON manufacturing_records(finished_good_sku_id);
CREATE INDEX IF NOT EXISTS idx_mfg_date ON manufacturing_records(manufacture_date);
CREATE INDEX IF NOT EXISTS idx_mfg_batch ON manufacturing_records(batch_number);
CREATE INDEX IF NOT EXISTS idx_mfg_comp_parent_id ON manufacturing_components(manufacturing_id);

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_bom_materials_updated_at'
  ) THEN
    CREATE TRIGGER update_bom_materials_updated_at
      BEFORE UPDATE ON bom_materials
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_manufacturing_records_updated_at'
  ) THEN
    CREATE TRIGGER update_manufacturing_records_updated_at
      BEFORE UPDATE ON manufacturing_records
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE bom_materials IS 'Bill of Materials (BOM) configurations for finished goods';
COMMENT ON TABLE manufacturing_records IS 'Records of manufacturing/production runs';
COMMENT ON TABLE manufacturing_components IS 'Traceability table for actual materials consumed in production';

COMMIT;
