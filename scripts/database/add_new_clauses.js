require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
        ? { rejectUnauthorized: false }
        : false
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Adding new clauses...');
        await client.query('BEGIN');

        // Check max order to append at the end
        const maxOrderRes = await client.query('SELECT MAX(term_order) as max_order FROM terms_conditions');
        let currentOrder = parseInt(maxOrderRes.rows[0].max_order || 0);

        // Term 1: Delivery Period
        // Check if it exists first to reuse order if updating
        const checkDelivery = await client.query("SELECT term_order FROM terms_conditions WHERE term_key = 'DELIVERY_PERIOD'");
        let deliveryOrder = checkDelivery.rows.length > 0 ? checkDelivery.rows[0].term_order : ++currentOrder;

        const deliveryTerm = {
            key: 'DELIVERY_PERIOD',
            title: 'Delivery Period',
            value: 'Delivery Period shall be within [DELIVERY_PERIOD] days from the date of PO acceptance.',
            order: deliveryOrder,
            mandatory: true
        };

        // Term 2: Freight Cost
        const checkFreight = await client.query("SELECT term_order FROM terms_conditions WHERE term_key = 'FREIGHT_COST'");
        let freightOrder = checkFreight.rows.length > 0 ? checkFreight.rows[0].term_order : ++currentOrder;

        const freightTerm = {
            key: 'FREIGHT_COST',
            title: 'Freight Cost',
            value: 'Freight Charges: [FREIGHT_COST]',
            order: freightOrder,
            mandatory: true
        };

        const insertSql = `
            INSERT INTO terms_conditions (term_key, term_title, term_value, term_order, is_mandatory, is_system_default, category)
            VALUES ($1, $2, $3, $4, $5, true, 'general')
            ON CONFLICT (term_key) DO UPDATE SET 
                term_title = EXCLUDED.term_title,
                term_value = EXCLUDED.term_value,
                is_mandatory = EXCLUDED.is_mandatory,
                term_order = EXCLUDED.term_order;
        `;

        await client.query(insertSql, [deliveryTerm.key, deliveryTerm.title, deliveryTerm.value, deliveryTerm.order, deliveryTerm.mandatory]);
        console.log(`✅ Included/Updated: ${deliveryTerm.title}`);

        await client.query(insertSql, [freightTerm.key, freightTerm.title, freightTerm.value, freightTerm.order, freightTerm.mandatory]);
        console.log(`✅ Included/Updated: ${freightTerm.title}`);

        await client.query('COMMIT');
        console.log('🎉 Validation successful! New clauses are ready.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error adding clauses:', e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
