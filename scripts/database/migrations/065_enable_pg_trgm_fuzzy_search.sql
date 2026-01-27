-- Migration: 065_enable_pg_trgm_fuzzy_search
-- Description: Enable pg_trgm extension and create GIN indexes for fuzzy search on SKUs and related tables
-- Date: 2024-01-XX

-- Enable pg_trgm extension for fuzzy text search
-- This extension provides similarity() function and trigram-based indexing
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN (Generalized Inverted Index) indexes for trigram similarity search
-- GIN indexes are optimized for similarity searches and provide fast fuzzy matching

-- Index on skus.item_name (most common search field)
CREATE INDEX IF NOT EXISTS idx_skus_item_name_trgm 
ON skus USING GIN (item_name gin_trgm_ops);

-- Index on skus.sku_id for SKU code searches
CREATE INDEX IF NOT EXISTS idx_skus_sku_id_trgm 
ON skus USING GIN (sku_id gin_trgm_ops);

-- Index on skus.model for model searches
CREATE INDEX IF NOT EXISTS idx_skus_model_trgm 
ON skus USING GIN (model gin_trgm_ops);

-- Index on brands.name for brand searches
CREATE INDEX IF NOT EXISTS idx_brands_name_trgm 
ON brands USING GIN (name gin_trgm_ops);

-- Index on vendors.name for vendor searches
CREATE INDEX IF NOT EXISTS idx_vendors_name_trgm 
ON vendors USING GIN (name gin_trgm_ops);

-- Index on sub_categories.name for category searches
CREATE INDEX IF NOT EXISTS idx_sub_categories_name_trgm 
ON sub_categories USING GIN (name gin_trgm_ops);

-- Index on item_categories.name
CREATE INDEX IF NOT EXISTS idx_item_categories_name_trgm 
ON item_categories USING GIN (name gin_trgm_ops);

-- Index on product_categories.name
CREATE INDEX IF NOT EXISTS idx_product_categories_name_trgm 
ON product_categories USING GIN (name gin_trgm_ops);

-- Index on customers.name for customer searches
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm 
ON customers USING GIN (customer_name gin_trgm_ops);

-- Index on teams.name for team member searches
CREATE INDEX IF NOT EXISTS idx_teams_name_trgm 
ON teams USING GIN (name gin_trgm_ops);

-- Index on incoming_inventory.invoice_number
CREATE INDEX IF NOT EXISTS idx_incoming_inventory_invoice_number_trgm 
ON incoming_inventory USING GIN (invoice_number gin_trgm_ops);

-- Index on outgoing_inventory.invoice_challan_number
CREATE INDEX IF NOT EXISTS idx_outgoing_inventory_invoice_challan_number_trgm 
ON outgoing_inventory USING GIN (invoice_challan_number gin_trgm_ops);

-- Performance note: GIN indexes are larger than B-tree indexes but provide
-- excellent performance for similarity searches. They are updated automatically
-- when data changes, so there's minimal maintenance overhead.

-- Verify extension is enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
    ) THEN
        RAISE EXCEPTION 'pg_trgm extension could not be enabled';
    END IF;
END $$;
