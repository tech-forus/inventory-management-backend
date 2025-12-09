-- Migration: 020_add_status_to_rejected_item_reports
-- Description: Adds status field to rejected_item_reports table
-- Created: 2024-12-XX

BEGIN;

-- Add status column to rejected_item_reports table
ALTER TABLE rejected_item_reports 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';

-- Create index for status field
CREATE INDEX IF NOT EXISTS idx_rejected_reports_status ON rejected_item_reports(status);

-- Add comment
COMMENT ON COLUMN rejected_item_reports.status IS 'Status of the rejected item report (Pending, Resolved, Under Review, etc.)';

COMMIT;


