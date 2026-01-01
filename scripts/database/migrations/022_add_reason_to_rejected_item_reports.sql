-- Migration: 022_add_reason_to_rejected_item_reports
-- Description: Adds reason field to rejected_item_reports table
-- Created: 2024-12-XX

BEGIN;

-- Add reason column to rejected_item_reports table
ALTER TABLE rejected_item_reports 
ADD COLUMN IF NOT EXISTS reason VARCHAR(30);

-- Create index for reason field
CREATE INDEX IF NOT EXISTS idx_rejected_reports_reason ON rejected_item_reports(reason);

-- Add comment
COMMENT ON COLUMN rejected_item_reports.reason IS 'Reason for rejection (max 30 characters)';

COMMIT;


