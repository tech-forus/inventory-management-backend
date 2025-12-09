-- Migration: 021_add_tracking_fields_to_rejected_item_reports
-- Description: Adds tracking fields (sent_to_vendor, received_back, scrapped, net_rejected) to rejected_item_reports table
-- Created: 2024-12-XX

BEGIN;

-- Add sent_to_vendor column
ALTER TABLE rejected_item_reports 
ADD COLUMN IF NOT EXISTS sent_to_vendor INTEGER DEFAULT 0;

-- Add received_back column
ALTER TABLE rejected_item_reports 
ADD COLUMN IF NOT EXISTS received_back INTEGER DEFAULT 0;

-- Add scrapped column
ALTER TABLE rejected_item_reports 
ADD COLUMN IF NOT EXISTS scrapped INTEGER DEFAULT 0;

-- Add net_rejected column (calculated field, can be updated or computed)
ALTER TABLE rejected_item_reports 
ADD COLUMN IF NOT EXISTS net_rejected INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN rejected_item_reports.sent_to_vendor IS 'Quantity sent to vendor for replacement/repair';
COMMENT ON COLUMN rejected_item_reports.received_back IS 'Quantity received back from vendor';
COMMENT ON COLUMN rejected_item_reports.scrapped IS 'Quantity scrapped/disposed';
COMMENT ON COLUMN rejected_item_reports.net_rejected IS 'Net rejected quantity (quantity - sent_to_vendor - received_back - scrapped)';

-- Update existing records to calculate net_rejected
UPDATE rejected_item_reports 
SET net_rejected = GREATEST(0, quantity - COALESCE(sent_to_vendor, 0) - COALESCE(received_back, 0) - COALESCE(scrapped, 0))
WHERE net_rejected = 0 OR net_rejected IS NULL;

COMMIT;

