-- Migration: 075_add_search_blob_to_skus
-- Description: Add pre-computed search_blob column with BEFORE INSERT/UPDATE trigger and GIN trigram index
--              Enables fast full-text style search against a single indexed column instead of runtime blob concatenation.

-- 1. Add column
ALTER TABLE skus ADD COLUMN IF NOT EXISTS search_blob TEXT;

-- 2. Trigger function: builds normalized blob from SKU fields + joined table names
CREATE OR REPLACE FUNCTION update_sku_search_blob()
RETURNS TRIGGER AS $$
DECLARE
  brand_name    TEXT;
  prod_cat_name TEXT;
  item_cat_name TEXT;
  sub_cat_name  TEXT;
  vendor_name   TEXT;
BEGIN
  brand_name    := COALESCE((SELECT name FROM brands             WHERE id = NEW.brand_id),             '');
  prod_cat_name := COALESCE((SELECT name FROM product_categories WHERE id = NEW.product_category_id), '');
  item_cat_name := COALESCE((SELECT name FROM item_categories    WHERE id = NEW.item_category_id),    '');
  sub_cat_name  := COALESCE((SELECT name FROM sub_categories     WHERE id = NEW.sub_category_id),     '');
  vendor_name   := COALESCE((SELECT name FROM vendors            WHERE id = NEW.vendor_id),            '');

  NEW.search_blob := LOWER(REPLACE(REPLACE(
      COALESCE(NEW.item_name, '')        || ' ' ||
      COALESCE(NEW.sku_id, '')           || ' ' ||
      COALESCE(NEW.model, '')            || ' ' ||
      COALESCE(NEW.hsn_sac_code, '')     || ' ' ||
      COALESCE(NEW.series, '')           || ' ' ||
      COALESCE(NEW.unit, '')             || ' ' ||
      COALESCE(NEW.material, '')         || ' ' ||
      COALESCE(NEW.color, '')            || ' ' ||
      COALESCE(NEW.vendor_item_code, '') || ' ' ||
      COALESCE(NEW.rating_size, '')      || ' ' ||
      brand_name                         || ' ' ||
      prod_cat_name                      || ' ' ||
      item_cat_name                      || ' ' ||
      sub_cat_name                       || ' ' ||
      vendor_name
  , ' ', ''), '_', ''));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach trigger (drop first to be idempotent)
DROP TRIGGER IF EXISTS trg_sku_search_blob ON skus;
CREATE TRIGGER trg_sku_search_blob
  BEFORE INSERT OR UPDATE ON skus
  FOR EACH ROW
  EXECUTE FUNCTION update_sku_search_blob();

-- 4. Backfill existing rows (correlated subqueries handle nullable FKs)
UPDATE skus
SET search_blob = LOWER(REPLACE(REPLACE(
      COALESCE(item_name, '')        || ' ' ||
      COALESCE(sku_id, '')           || ' ' ||
      COALESCE(model, '')            || ' ' ||
      COALESCE(hsn_sac_code, '')     || ' ' ||
      COALESCE(series, '')           || ' ' ||
      COALESCE(unit, '')             || ' ' ||
      COALESCE(material, '')         || ' ' ||
      COALESCE(color, '')            || ' ' ||
      COALESCE(vendor_item_code, '') || ' ' ||
      COALESCE(rating_size, '')      || ' ' ||
      COALESCE((SELECT name FROM brands             WHERE id = skus.brand_id),             '') || ' ' ||
      COALESCE((SELECT name FROM product_categories WHERE id = skus.product_category_id), '') || ' ' ||
      COALESCE((SELECT name FROM item_categories    WHERE id = skus.item_category_id),    '') || ' ' ||
      COALESCE((SELECT name FROM sub_categories     WHERE id = skus.sub_category_id),     '') || ' ' ||
      COALESCE((SELECT name FROM vendors            WHERE id = skus.vendor_id),            '')
, ' ', ''), '_', ''));

-- 5. GIN trigram index on the new blob column
CREATE INDEX IF NOT EXISTS idx_skus_search_blob_trgm
  ON skus USING GIN (search_blob gin_trgm_ops);
