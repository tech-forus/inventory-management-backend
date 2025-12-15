-- Migration: 016_update_incoming_inventory_schema
-- Description: Updates incoming_inventory schema to match new requirements:
--   - Add warranty and warranty_unit to incoming_inventory
--   - Change accepted/rejected to received in incoming_inventory_items
--   - Add received_boxes to incoming_inventory_items
--   - Change received_by foreign key from vendors to teams
-- Created: 2024-12-XX

BEGIN;

-- Step 1: Add warranty columns to incoming_inventory table
ALTER TABLE incoming_inventory 
  ADD COLUMN IF NOT EXISTS warranty INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warranty_unit VARCHAR(10) DEFAULT 'months' CHECK (warranty_unit IN ('months', 'year'));

-- Step 2: Add received_boxes column to incoming_inventory_items
ALTER TABLE incoming_inventory_items 
  ADD COLUMN IF NOT EXISTS received_boxes INTEGER DEFAULT 0;

-- Step 3: Add received column to incoming_inventory_items (if it doesn't exist)
-- First check if accepted column exists, if so migrate data
DO $$
BEGIN
  -- Check if accepted column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incoming_inventory_items' 
    AND column_name = 'accepted'
  ) THEN
    -- Add received column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'incoming_inventory_items' 
      AND column_name = 'received'
    ) THEN
      ALTER TABLE incoming_inventory_items ADD COLUMN received INTEGER DEFAULT 0;
      
      -- Migrate data: received = accepted
      UPDATE incoming_inventory_items 
      SET received = COALESCE(accepted, 0)
      WHERE received = 0;
    END IF;
    
    -- Drop accepted and rejected columns
    ALTER TABLE incoming_inventory_items DROP COLUMN IF EXISTS accepted;
    ALTER TABLE incoming_inventory_items DROP COLUMN IF EXISTS rejected;
  END IF;
END $$;

-- Step 4: Update received_by foreign key from vendors to teams
-- First, set received_by to NULL for existing records (since we can't map vendors to teams)
DO $$
BEGIN
  -- Set received_by to NULL for all existing records
  UPDATE incoming_inventory SET received_by = NULL WHERE received_by IS NOT NULL;
END $$;

-- Drop the old foreign key constraint
DO $$
BEGIN
  -- Drop old foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_incoming_inventory_received_by'
    AND table_name = 'incoming_inventory'
  ) THEN
    ALTER TABLE incoming_inventory DROP CONSTRAINT fk_incoming_inventory_received_by;
  END IF;
END $$;

-- Add new foreign key constraint to teams table
ALTER TABLE incoming_inventory
  ADD CONSTRAINT fk_incoming_inventory_received_by_team
  FOREIGN KEY (received_by) 
  REFERENCES teams(id) 
  ON DELETE SET NULL;

-- Update comments
COMMENT ON COLUMN incoming_inventory.warranty IS 'Warranty period value';
COMMENT ON COLUMN incoming_inventory.warranty_unit IS 'Warranty unit: months or year';
COMMENT ON COLUMN incoming_inventory.received_by IS 'Team ID of the person/entity who received the inventory';
COMMENT ON COLUMN incoming_inventory_items.received IS 'Quantity received (replaces accepted)';
COMMENT ON COLUMN incoming_inventory_items.received_boxes IS 'Number of boxes received';

COMMIT;

