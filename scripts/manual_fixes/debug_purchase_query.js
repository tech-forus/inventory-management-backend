const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway';

async function testQuery() {
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to DB');

        // List companies and SKU counts
        const companies = await client.query(`
      SELECT c.company_id, COUNT(s.id) as sku_count 
      FROM companies c 
      LEFT JOIN skus s ON c.company_id = s.company_id 
      GROUP BY c.company_id
    `);
        console.table(companies.rows);

        // Force Company ID
        const activeCompany = 'JDDITS';
        console.log(`Using Company ID: ${activeCompany}`);

        // Check summary of data existence
        const stats = await client.query(`
      SELECT 
        COUNT(*) as total_skus,
        COUNT(vendor_id) as skus_with_vendor,
        (SELECT COUNT(*) FROM incoming_inventory WHERE company_id = $1) as total_incoming_orders,
        (SELECT COUNT(*) FROM incoming_inventory_items iii JOIN incoming_inventory ii ON iii.incoming_inventory_id = ii.id WHERE ii.company_id = $1) as total_incoming_items
      FROM skus 
      WHERE company_id = $1
    `, [activeCompany]);
        console.table(stats.rows);

        // Try to find one SKU with data
        const query = `
      SELECT 
        s.id,
        s.sku_id,
        s.item_name,
        v.name as vendor,
        s.vendor_id,
        latest_incoming.unit_price as last_purchase_price,
        TO_CHAR(latest_incoming.receiving_date, 'YYYY-MM-DD') as receiving_date
      FROM skus s
      LEFT JOIN vendors v ON s.vendor_id = v.id
      LEFT JOIN LATERAL (
        SELECT ii.receiving_date, iii.unit_price
        FROM incoming_inventory ii
        INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
        WHERE iii.sku_id = s.id 
          AND ii.company_id = $1 
          AND ii.is_active = true 
          AND ii.status = 'completed'
        ORDER BY ii.receiving_date DESC, ii.id DESC
        LIMIT 1
      ) latest_incoming ON true
      WHERE s.company_id = $1 AND s.is_active = true
      AND (s.vendor_id IS NOT NULL OR latest_incoming.unit_price IS NOT NULL)
      LIMIT 10
    `;

        const res = await client.query(query, [activeCompany]);
        console.log('Query Results (SKUs with data):');
        if (res.rows.length === 0) {
            console.log('No SKUs found with Vendor or Last PP data.');
        } else {
            res.rows.forEach(r => {
                console.log(`SKU: ${r.sku_id}, Vendor: ${r.vendor} (ID: ${r.vendor_id}), LastPP: ${r.last_purchase_price}, Date: ${r.receiving_date}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

testQuery();
