-- ============================================================================
-- DELETE ALL JDDITS COMPANY DATA
-- ============================================================================
-- This script permanently deletes ALL data for company_id = 'JDDITS':
--   - All SKU products
--   - All incoming inventory records
--   - All outgoing inventory records
--   - All inventory ledger transactions
--   - All related data (manufacturing, price history, rejected reports, BOM)
--
-- WARNING: This action is PERMANENT and CANNOT be undone!
-- ============================================================================

BEGIN;

-- Set the company ID
\set company_id 'JDDITS'

-- Display counts before deletion
DO $$
DECLARE
    v_skus_count INTEGER;
    v_incoming_count INTEGER;
    v_outgoing_count INTEGER;
    v_ledger_count INTEGER;
    v_manufacturing_count INTEGER;
    v_price_history_count INTEGER;
    v_rejected_reports_count INTEGER;
    v_bom_count INTEGER;
BEGIN
    -- Count records to be deleted
    SELECT COUNT(*) INTO v_skus_count FROM skus WHERE company_id = :'company_id';
    SELECT COUNT(*) INTO v_incoming_count FROM incoming_inventory WHERE company_id = :'company_id';
    SELECT COUNT(*) INTO v_outgoing_count FROM outgoing_inventory WHERE company_id = :'company_id';
    SELECT COUNT(*) INTO v_ledger_count FROM inventory_ledgers WHERE company_id = :'company_id';
    SELECT COUNT(*) INTO v_manufacturing_count FROM manufacturing_records WHERE company_id = :'company_id';
    SELECT COUNT(*) INTO v_price_history_count FROM price_history WHERE company_id = :'company_id';
    SELECT COUNT(*) INTO v_rejected_reports_count FROM rejected_item_reports WHERE company_id = :'company_id';
    SELECT COUNT(*) INTO v_bom_count FROM bom_materials WHERE company_id = :'company_id';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELETION SUMMARY FOR COMPANY: %', :'company_id';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SKUs: %', v_skus_count;
    RAISE NOTICE 'Incoming Inventory Records: %', v_incoming_count;
    RAISE NOTICE 'Outgoing Inventory Records: %', v_outgoing_count;
    RAISE NOTICE 'Inventory Ledger Transactions: %', v_ledger_count;
    RAISE NOTICE 'Manufacturing Records: %', v_manufacturing_count;
    RAISE NOTICE 'Price History Records: %', v_price_history_count;
    RAISE NOTICE 'Rejected Item Reports: %', v_rejected_reports_count;
    RAISE NOTICE 'BOM Materials: %', v_bom_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- STEP 1: Delete Inventory Ledgers (transaction history)
-- ============================================================================
DELETE FROM inventory_ledgers 
WHERE company_id = 'JDDITS';

-- ============================================================================
-- STEP 2: Delete Rejected Item Reports (references incoming_inventory_items)
-- ============================================================================
DELETE FROM rejected_item_reports 
WHERE company_id = 'JDDITS';

-- ============================================================================
-- STEP 3: Delete Price History (references skus and incoming_inventory)
-- ============================================================================
DELETE FROM price_history 
WHERE company_id = 'JDDITS';

-- ============================================================================
-- STEP 4: Delete Manufacturing Components (references manufacturing_records and skus)
-- ============================================================================
DELETE FROM manufacturing_components 
WHERE manufacturing_id IN (
    SELECT id FROM manufacturing_records WHERE company_id = 'JDDITS'
);

-- ============================================================================
-- STEP 5: Delete Manufacturing Records (references skus and incoming_inventory)
-- ============================================================================
DELETE FROM manufacturing_records 
WHERE company_id = 'JDDITS';

-- ============================================================================
-- STEP 6: Delete BOM Materials (references skus)
-- ============================================================================
DELETE FROM bom_materials 
WHERE company_id = 'JDDITS';

-- ============================================================================
-- STEP 7: Delete Incoming Inventory Items (references incoming_inventory and skus)
-- ============================================================================
DELETE FROM incoming_inventory_items 
WHERE incoming_inventory_id IN (
    SELECT id FROM incoming_inventory WHERE company_id = 'JDDITS'
);

-- ============================================================================
-- STEP 8: Delete Incoming Inventory (references company)
-- ============================================================================
DELETE FROM incoming_inventory 
WHERE company_id = 'JDDITS';

-- ============================================================================
-- STEP 9: Delete Outgoing Inventory Items (references outgoing_inventory and skus)
-- ============================================================================
DELETE FROM outgoing_inventory_items 
WHERE outgoing_inventory_id IN (
    SELECT id FROM outgoing_inventory WHERE company_id = 'JDDITS'
);

-- ============================================================================
-- STEP 10: Delete Outgoing Inventory (references company)
-- ============================================================================
DELETE FROM outgoing_inventory 
WHERE company_id = 'JDDITS';

-- ============================================================================
-- STEP 11: Delete SKUs (references company) - LAST STEP
-- ============================================================================
DELETE FROM skus 
WHERE company_id = 'JDDITS';

-- Display final counts
DO $$
DECLARE
    v_skus_remaining INTEGER;
    v_incoming_remaining INTEGER;
    v_outgoing_remaining INTEGER;
    v_ledger_remaining INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_skus_remaining FROM skus WHERE company_id = 'JDDITS';
    SELECT COUNT(*) INTO v_incoming_remaining FROM incoming_inventory WHERE company_id = 'JDDITS';
    SELECT COUNT(*) INTO v_outgoing_remaining FROM outgoing_inventory WHERE company_id = 'JDDITS';
    SELECT COUNT(*) INTO v_ledger_remaining FROM inventory_ledgers WHERE company_id = 'JDDITS';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELETION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining SKUs: %', v_skus_remaining;
    RAISE NOTICE 'Remaining Incoming Records: %', v_incoming_remaining;
    RAISE NOTICE 'Remaining Outgoing Records: %', v_outgoing_remaining;
    RAISE NOTICE 'Remaining Ledger Transactions: %', v_ledger_remaining;
    RAISE NOTICE '========================================';
    
    IF v_skus_remaining = 0 AND v_incoming_remaining = 0 AND v_outgoing_remaining = 0 AND v_ledger_remaining = 0 THEN
        RAISE NOTICE 'SUCCESS: All JDDITS data has been deleted.';
    ELSE
        RAISE WARNING 'WARNING: Some records may still exist. Please verify manually.';
    END IF;
END $$;

-- Commit the transaction
COMMIT;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
