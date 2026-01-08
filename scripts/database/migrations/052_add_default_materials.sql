-- Migration: 052_add_default_materials
-- Description: Adds default materials (Gold, Silver, Copper, etc.) for all existing companies
-- Created: 2026-01-07

BEGIN;

-- Insert default materials for all existing companies
INSERT INTO materials (company_id, name, is_active, created_at, updated_at)
SELECT 
  c.company_id,
  material_name,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM companies c
CROSS JOIN (
  VALUES 
    ('Gold'),
    ('Silver'),
    ('Copper'),
    ('Aluminum'),
    ('Zinc'),
    ('Nickel'),
    ('Iron'),
    ('Plastic'),
    ('Polycon')
) AS default_materials(material_name)
WHERE NOT EXISTS (
  SELECT 1 
  FROM materials m 
  WHERE m.company_id = c.company_id 
  AND LOWER(m.name) = LOWER(default_materials.material_name)
)
ON CONFLICT (company_id, name) DO NOTHING;

COMMIT;



