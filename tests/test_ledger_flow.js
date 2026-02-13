const path = require('path');
const { URL } = require('url');
const { Pool } = require('pg');

// Load .env from backend root (one level up from tests/)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Use a fixed company ID for testing
const TEST_COMPANY_ID = 'YZEKCR';

const LedgerService = require('../src/services/ledgerService');
const ItemHistoryModel = require('../src/models/itemHistoryModel');

async function runTest() {
    if (!process.env.DATABASE_URL) {
        console.error('ERROR: DATABASE_URL not found in .env');
        return;
    }

    // Create explicit pool with SSL (Bypassing src/models/database.js to ensure connection)
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Railway
    });

    console.log('--- STARTING BASELINE VALIDATION ---');
    const dbHost = process.env.DATABASE_URL.split('@')[1] ? process.env.DATABASE_URL.split('@')[1].split(':')[0] : 'RemoteDB';
    console.log(`Target DB: ${dbHost}`);

    let client;
    try {
        client = await pool.connect();
        console.log('Connected to DB successfully.');
        console.log(`Using Company ID: ${TEST_COMPANY_ID}`);

        // START TRANSACTION
        await client.query('BEGIN');

        // 0. Fetch Valid Categories, Brand, and Vendor
        console.log('\n0. Fetching valid Categories/Brand/Vendor...');

        const pcRes = await client.query('SELECT id FROM product_categories WHERE company_id = $1 LIMIT 1', [TEST_COMPANY_ID]);
        const icRes = await client.query('SELECT id FROM item_categories WHERE company_id = $1 LIMIT 1', [TEST_COMPANY_ID]);
        const brandRes = await client.query('SELECT id FROM brands WHERE company_id = $1 LIMIT 1', [TEST_COMPANY_ID]);
        const vendorRes = await client.query('SELECT id FROM vendors WHERE company_id = $1 LIMIT 1', [TEST_COMPANY_ID]);

        if (pcRes.rows.length === 0 || icRes.rows.length === 0 || brandRes.rows.length === 0) {
            throw new Error('Could not find valid Product Category, Item Category, or Brand for this company. Cannot run test.');
        }

        const productCategoryId = pcRes.rows[0].id;
        const itemCategoryId = icRes.rows[0].id;
        const brandId = brandRes.rows[0].id;
        const vendorId = vendorRes.rows.length > 0 ? vendorRes.rows[0].id : null;

        // Fallback if no vendor found (should probably fail, but let's try strict mode)
        if (!vendorId) {
            console.warn('WARNING: No vendor found. Test might fail if vendor_id is required.');
        }

        console.log(`   Using: PC_ID=${productCategoryId}, IC_ID=${itemCategoryId}, Brand_ID=${brandId}, Vendor_ID=${vendorId}`);

        // 1. Create Test SKU
        console.log('\n1. Creating Test SKU...');
        // Shorten SKU ID to avoid length constraints: TSKU + last 6 digits of timestamp
        const skuId = `TSKU${Date.now().toString().slice(-6)}`;

        // Note: Inserting more required fields based on schema constraints
        const skuRes = await client.query(`
      INSERT INTO skus (
        company_id, sku_id, item_name, is_active, current_stock,
        product_category_id, item_category_id, brand_id, unit
      )
      VALUES ($1, $2, $3, true, 0, $4, $5, $6, 'pcs')
      RETURNING id, sku_id, item_name
    `, [TEST_COMPANY_ID, skuId, 'Test Item for Ledger', productCategoryId, itemCategoryId, brandId]);

        const sku = skuRes.rows[0];
        createdSkuId = sku.id;
        console.log(`   SKU Created: ID ${sku.id} (${sku.sku_id})`);

        // 2. Create Incoming Inventory (Simulate Model Logic to trigger Ledger)
        console.log('\n2. Creating Incoming Inventory Transaction...');
        // Shorten Invoice Number: INV- + last 4 digits of timestamp
        const shortTs = Date.now().toString().slice(-4);
        const invoiceNum = `INV-${shortTs}`;

        // A. Insert Invoice Header - now with brand_id, vendor_id, invoice_date
        const invRes = await client.query(`
      INSERT INTO incoming_inventory (
        company_id, invoice_number, status, receiving_date, invoice_date, is_active, brand_id, vendor_id,
        total_value
      )
      VALUES ($1, $2, 'completed', CURRENT_DATE, CURRENT_DATE, true, $3, $4, 1000) 
      RETURNING id
    `, [TEST_COMPANY_ID, invoiceNum, brandId, vendorId]);

        const createdInventoryId = invRes.rows[0].id;
        console.log(`   Invoice Created: ID ${createdInventoryId} (#${invoiceNum})`);

        // B. Insert Invoice Item
        await client.query(`
      INSERT INTO incoming_inventory_items (incoming_inventory_id, sku_id, received, total_quantity, unit_price, total_value)
      VALUES ($1, $2, 10, 10, 100, 1000)
    `, [createdInventoryId, sku.id]);

        // C. Call LedgerService (This is what we want to test)
        console.log('   Calling LedgerService.addTransaction...');

        // LedgerService uses client, so it should work fine
        const ledgerEntry = await LedgerService.addTransaction(client, {
            skuId: sku.id,
            transactionDate: new Date(),
            transactionType: 'IN',
            referenceNumber: `IN / ${invoiceNum}`, // Current fragile format
            sourceDestination: 'Test Vendor',
            createdBy: null,
            createdByName: 'Test Script',
            quantityChange: 10,
            companyId: TEST_COMPANY_ID
        });
        console.log(`   Ledger Entry Created: ID ${ledgerEntry.id}`);

        // 3. Verify Ledger Data
        console.log('\n3. Verifying Ledger Data...');
        const ledgerCheck = await client.query('SELECT * FROM inventory_ledgers WHERE id = $1', [ledgerEntry.id]);
        const row = ledgerCheck.rows[0];

        if (row.source_id === undefined) {
            console.log('   [INFO] Column "source_id" does NOT exist yet (Expected).');
        } else {
            console.log(`   [INFO] Column "source_id" exists. Value: ${row.source_id}`);
        }

        // 4. Verify History Retrieval (The "String Parsing" Test)
        console.log('\n4. Testing Item History Retrieval (String Parsing)...');

        // Using manual query since ItemHistoryModel uses internal pool
        const historyQuery = `
        SELECT transaction_id, reference_number, 
          CASE 
            WHEN transaction_type = 'IN' THEN REPLACE(reference_number, 'IN / ', '')
            ELSE reference_number
          END as extracted_invoice_number
        FROM (
             SELECT 
              il.id as transaction_id,
              il.reference_number,
              il.transaction_type
            FROM inventory_ledgers il
            JOIN skus s ON il.sku_id = s.id
            WHERE s.sku_id = $1 AND il.company_id = $2
        ) as sub
        WHERE transaction_id = $3
    `;

        const historyRes = await client.query(historyQuery, [sku.sku_id, TEST_COMPANY_ID, ledgerEntry.id]);
        const historyItem = historyRes.rows[0];

        if (historyItem) {
            console.log('   [SUCCESS] Manual History Query (Simulated) matched record.');
            console.log(`   Extracted Invoice Number: "${historyItem.extracted_invoice_number}"`);
            if (historyItem.extracted_invoice_number === invoiceNum) {
                console.log('   [PASS] String parsing logic is working correctly (for now).');
            } else {
                console.log('   [FAIL] String parsing mismatch!');
            }
        } else {
            console.log('   [FAIL] History record NOT found with simulated query.');
        }

    } catch (error) {
        console.error('TEST FAILED:', error);
    } finally {
        console.log('\n--- ROLLBACK TRANSACTION (No data persisted) ---');
        if (client) {
            await client.query('ROLLBACK');
            client.release();
        }
        await pool.end();
    }
}

runTest();
