-- Migration: 064_add_dashboard_performance_indexes
-- Description: Adds indexes to improve dashboard performance for stock levels and inventory history queries
-- Created: 2025-01-24
-- Purpose: Optimize dashboard data loading performance

BEGIN;

-- Index for stock level queries (low stock alerts calculation)
-- Used by dashboard to find SKUs where current_stock < min_stock_level
CREATE INDEX IF NOT EXISTS idx_skus_stock_levels 
ON skus(current_stock, min_stock_level, is_active) 
WHERE is_active = true;

-- Index for incoming inventory history queries
-- Used by dashboard to fetch 30-day incoming history for movement data
CREATE INDEX IF NOT EXISTS idx_incoming_receiving_date 
ON incoming_inventory(receiving_date, company_id, is_active, status)
WHERE is_active = true AND status = 'completed';

-- Index for outgoing inventory history queries  
-- Used by dashboard to fetch 30-day outgoing history for movement data
CREATE INDEX IF NOT EXISTS idx_outgoing_date_status 
ON outgoing_inventory(invoice_challan_date, company_id, is_active, status)
WHERE is_active = true AND status = 'completed';

-- Index for top-selling SKU analytics
-- Used by analytics endpoint to calculate most selling items
CREATE INDEX IF NOT EXISTS idx_outgoing_items_analytics
ON outgoing_inventory_items(sku_id, outgoing_quantity, total_value);

-- Index for SKU company queries (used in all dashboard SKU operations)
CREATE INDEX IF NOT EXISTS idx_skus_company_active
ON skus(company_id, is_active, current_stock)
WHERE is_active = true;

-- Index for non-movable SKUs (is_non_movable flag queries)
CREATE INDEX IF NOT EXISTS idx_skus_non_movable
ON skus(company_id, is_non_movable, current_stock, is_active)
WHERE is_active = true AND is_non_movable = true;

-- Add comments for documentation
COMMENT ON INDEX idx_skus_stock_levels IS 
'Optimizes dashboard low stock alerts calculation by indexing stock comparison fields';

COMMENT ON INDEX idx_incoming_receiving_date IS 
'Optimizes dashboard incoming history queries by date range for movement calculations';

COMMENT ON INDEX idx_outgoing_date_status IS 
'Optimizes dashboard outgoing history queries by date range for movement calculations';

COMMENT ON INDEX idx_outgoing_items_analytics IS 
'Optimizes top-selling SKU analytics by indexing quantity and value fields';

COMMENT ON INDEX idx_skus_company_active IS 
'Optimizes general SKU queries by company with active status filter';

COMMENT ON INDEX idx_skus_non_movable IS 
'Optimizes non-movable SKU analytics queries';

COMMIT;