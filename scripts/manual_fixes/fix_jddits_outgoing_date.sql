-- Manual database fix: Update outgoing inventory date for JDDITS company
-- Date: 2026-01-15
-- Description: Changing date from 01/12/2026 (January 12) to 12/01/2026 (December 1)

-- First, let's find the record with JDDITS and date 2026-01-12
-- Assuming JDDITS is in the destination (customer or vendor name)

-- Display current records matching the criteria (for verification)
SELECT 
    oi.id,
    oi.invoice_challan_number,
    oi.invoice_challan_date,
    oi.destination_type,
    oi.destination_id,
    CASE 
        WHEN oi.destination_type = 'customer' THEN c.name
        WHEN oi.destination_type = 'vendor' THEN v.name
        ELSE 'N/A'
    END as destination_name,
    oi.document_type,
    oi.created_at
FROM outgoing_inventory oi
LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'  
WHERE 
    (
        (oi.destination_type = 'customer' AND c.name ILIKE '%JDDITS%') OR
        (oi.destination_type = 'vendor' AND v.name ILIKE '%JDDITS%')
    )
    AND oi.invoice_challan_date = '2026-01-12'
ORDER BY oi.created_at DESC;

-- UPDATE QUERY: Change date from 2026-01-12 to 2026-12-01
UPDATE outgoing_inventory oi
SET invoice_challan_date = '2026-12-01'
FROM customers c, vendors v
WHERE 
    (
        (oi.destination_id = c.id AND oi.destination_type = 'customer' AND c.name ILIKE '%JDDITS%') OR
        (oi.destination_id = v.id AND oi.destination_type = 'vendor' AND v.name ILIKE '%JDDITS%')
    )
    AND oi.invoice_challan_date = '2026-01-12';

-- Verify the update
SELECT 
    oi.id,
    oi.invoice_challan_number,
    oi.invoice_challan_date,
    oi.destination_type,
    CASE 
        WHEN oi.destination_type = 'customer' THEN c.name
        WHEN oi.destination_type = 'vendor' THEN v.name
        ELSE 'N/A'
    END as destination_name,
    oi.updated_at
FROM outgoing_inventory oi
LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'  
WHERE 
    (
        (oi.destination_type = 'customer' AND c.name ILIKE '%JDDITS%') OR
        (oi.destination_type = 'vendor' AND v.name ILIKE '%JDDITS%')
    )
    AND oi.invoice_challan_date = '2026-12-01'
ORDER BY oi.updated_at DESC;
