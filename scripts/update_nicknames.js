require('dotenv').config();
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const companyId = 'YZEKCR';
        const selectQuery = `
            SELECT id, item_name, model, series
            FROM skus
            WHERE company_id = $1 AND is_active = true;
        `;
        const res = await pool.query(selectQuery, [companyId]);
        
        console.log(`Processing ${res.rows.length} SKUs for company ${companyId}...`);

        for (const row of res.rows) {
            let nickname = '';
            
            // Logic to generate nickname:
            // 1. If item_name has a specific format like "Driver_XXXX", use XXXX
            // 2. Otherwise use a combination of Item Name and Model
            if (row.item_name && row.item_name.includes('_')) {
                nickname = row.item_name.split('_').pop();
            } else if (row.item_name && row.model) {
                // Keep it short
                const shortName = row.item_name.split(' ')[0];
                nickname = `${shortName}-${row.model}`;
            } else {
                nickname = row.item_name || row.model || row.id.toString();
            }

            // Cleanup nickname (limit length, remove special chars if needed)
            nickname = nickname.substring(0, 50).trim();

            console.log(`Updating ID ${row.id}: "${row.item_name}" -> Nickname: "${nickname}"`);

            await pool.query(
                'UPDATE skus SET item_nickname = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [nickname, row.id]
            );
        }

        console.log('Update complete!');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

run();
