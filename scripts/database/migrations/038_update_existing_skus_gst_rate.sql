-- Migration: 038_update_existing_skus_gst_rate
-- Description: Updates all existing SKUs to have GST rates (18% or 5%)
-- Created: 2024-12-20

BEGIN;

-- Update all existing SKUs to have a default GST rate of 0%
UPDATE skus 
SET gst_rate = 0.00
WHERE gst_rate IS NULL;

-- If you need to set specific SKUs to 5% GST rate (e.g., essential goods, food items, etc.),
-- you can uncomment and modify the following query based on your business rules:
-- Examples:
-- 
-- By Product Category:
-- UPDATE skus 
-- SET gst_rate = 5.00
-- WHERE gst_rate = 18.00 
--   AND product_category_id IN (
--     SELECT id FROM product_categories 
--     WHERE name ILIKE '%food%' OR name ILIKE '%essential%'
--   );
--
-- By HSN Code prefix (common for 5% GST items):
-- UPDATE skus 
-- SET gst_rate = 5.00
-- WHERE gst_rate = 18.00 
--   AND hsn_sac_code LIKE '1%'  -- Example: HSN codes starting with 1
--
-- By specific SKU IDs:
-- UPDATE skus 
-- SET gst_rate = 5.00
-- WHERE gst_rate = 18.00 
--   AND id IN (1, 2, 3, 4, 5);  -- Replace with actual SKU IDs

COMMIT;

