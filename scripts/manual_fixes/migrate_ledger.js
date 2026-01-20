const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway',
    ssl: { rejectUnauthorized: false },
});

async function migrateLedger() {
    const client = await pool.connect();
    try {
        console.log('Starting Migration: Creating Inventory Ledger...');

        await client.query('BEGIN');

        // 1. Create Table
        await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_ledgers (
        id SERIAL PRIMARY KEY,
        company_id VARCHAR(50),
        sku_id INTEGER REFERENCES skus(id),
        transaction_date TIMESTAMP,
        transaction_type VARCHAR(20), -- 'OPENING', 'IN', 'OUT'
        reference_number VARCHAR(100),
        source_destination VARCHAR(255),
        created_by_name VARCHAR(255),
        quantity_change INTEGER,
        net_balance INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Add indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ledger_sku ON inventory_ledgers(sku_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_ledger_date ON inventory_ledgers(transaction_date);`);

        // Clean existing data for full regeneration
        await client.query('TRUNCATE TABLE inventory_ledgers');

        // 2. Fetch all SKUs
        console.log('Fetching SKUs...');
        const skusRes = await client.query('SELECT id, company_id, current_stock, opening_stock, created_at FROM skus');
        const skus = skusRes.rows;

        for (const sku of skus) {
            console.log(`Processing SKU ID: ${sku.id}`);

            const transactions = [];

            // A. Opening Stock
            // If opening_stock > 0, treat it as the first transaction
            // Use SKU created_at as date
            const opening = sku.opening_stock || 0;
            if (opening !== 0) { // Or always show opening 0? User showed "OPENING +78".
                transactions.push({
                    date: sku.created_at,
                    type: 'OPENING',
                    ref: 'OPENING',
                    source: 'Initial Stock / Adjustment',
                    created_by: '-', // Unknown or System
                    qty: opening,
                    original_date: sku.created_at
                });
            } else {
                // User wants to see "OPENING" even if 0?
                // The screenshot shows "OPENING +78". If 0, maybe "OPENING +0".
                // I'll add it if it's the requested format.
                transactions.push({
                    date: sku.created_at,
                    type: 'OPENING',
                    ref: 'OPENING',
                    source: 'Initial Stock / Adjustment',
                    created_by: '-',
                    qty: 0,
                    original_date: sku.created_at
                });
            }

            // B. Incoming
            // Join users to get name if possible, else 'Unknown'
            const inRes = await client.query(`
        SELECT 
            ii.receiving_date as date, 
            ii.invoice_number as ref, 
            v.name as vendor_name, 
            t.name as team_name,
            iii.total_quantity as qty,
            iii.rejected,
            ii.created_at
        FROM incoming_inventory_items iii
        JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id
        LEFT JOIN vendors v ON ii.vendor_id = v.id
        LEFT JOIN teams t ON ii.received_by = t.id
        WHERE iii.sku_id = $1 AND ii.status = 'completed' AND ii.is_active = true
      `, [sku.id]);

            inRes.rows.forEach(row => {
                transactions.push({
                    date: row.date || row.created_at,
                    type: 'IN',
                    ref: `IN / ${row.ref || 'N/A'}`,
                    source: `Vendor: ${row.vendor_name || 'Unknown'}`,
                    created_by: row.team_name || 'System',
                    qty: parseInt(row.qty),
                    original_date: row.created_at
                });

                if (row.rejected > 0) {
                    transactions.push({
                        date: row.date || row.created_at,
                        type: 'REJ',
                        ref: `REJ / ${row.ref || 'N/A'}`,
                        source: `Vendor: ${row.vendor_name || 'Unknown'}`,
                        created_by: row.team_name || 'System',
                        qty: -parseInt(row.rejected),
                        original_date: row.created_at
                    });
                }
            });

            // C. Outgoing
            // Need complex join for destination
            const outRes = await client.query(`
        SELECT 
            oi.invoice_challan_date as date, 
            COALESCE(oi.invoice_challan_number, oi.docket_number) as ref, 
            oi.destination_type,
            c.customer_name, 
            v.name as vendor_name,
            t.name as team_name,
            oii.outgoing_quantity as qty,
            oi.created_at
        FROM outgoing_inventory_items oii
        JOIN outgoing_inventory oi ON oii.outgoing_inventory_id = oi.id
        LEFT JOIN customers c ON oi.destination_id = c.id AND oi.destination_type = 'customer'
        LEFT JOIN vendors v ON oi.destination_id = v.id AND oi.destination_type = 'vendor'
        LEFT JOIN teams t ON oi.dispatched_by = t.id
        WHERE oii.sku_id = $1 AND oi.status = 'completed' AND oi.is_active = true
      `, [sku.id]);

            outRes.rows.forEach(row => {
                let dest = 'Unknown';
                if (row.destination_type === 'customer') dest = `Destination: ${row.customer_name}`;
                else if (row.destination_type === 'vendor') dest = `Vendor: ${row.vendor_name}`;
                else if (row.destination_type === 'store_to_factory') dest = 'Store to Factory';

                transactions.push({
                    date: row.date || row.created_at,
                    type: 'OUT',
                    ref: `OUT / ${row.ref || 'N/A'}`,
                    source: dest,
                    created_by: row.team_name || 'System',
                    qty: -parseInt(row.qty), // Negative for Outgoing
                    original_date: row.created_at
                });
            });

            // 3. Sort and Calculate Balance
            // Sort by Date ASC, then CreatedAt ASC
            transactions.sort((a, b) => {
                const d1 = new Date(a.date).getTime();
                const d2 = new Date(b.date).getTime();
                if (d1 !== d2) return d1 - d2;
                return new Date(a.original_date).getTime() - new Date(b.original_date).getTime();
            });

            let runningBalance = 0;
            for (const tx of transactions) {
                runningBalance += tx.qty;

                // Insert Rec
                await client.query(`
            INSERT INTO inventory_ledgers 
            (company_id, sku_id, transaction_date, transaction_type, reference_number, source_destination, created_by_name, quantity_change, net_balance)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
                    sku.company_id,
                    sku.id,
                    tx.date,
                    tx.type,
                    tx.ref,
                    tx.source,
                    tx.created_by,
                    tx.qty,
                    runningBalance
                ]);
            }
        }

        await client.query('COMMIT');
        console.log('Migration Completed Successfully!');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration Failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrateLedger();
