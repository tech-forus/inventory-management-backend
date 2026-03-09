
const pool = require('./src/models/database');
const CompanyModel = require('./src/models/customerCompanyModel');

async function test() {
    try {
        const res = await pool.query("SELECT company_id, company_name FROM companies WHERE company_name IS NOT NULL AND company_name <> '' LIMIT 1");
        if (res.rows.length === 0) { console.log('No valid tenant found'); process.exit(0); }
        const tenantId = res.rows[0].company_id;
        console.log('Testing with tenant:', res.rows[0].company_name, '(', tenantId, ')');

        // 1. Create Tesla with 3 units
        console.log('Creating Tesla with 3 units...');
        await CompanyModel.create(tenantId, { name: 'Tesla', customerType: 'Industry' }, [], [
            { unitName: 'Tesla - Unit 1', gstNumber: 'HQ-GST' },
            { unitName: 'Tesla - Unit 2', gstNumber: 'U2-GST' },
            { unitName: 'Tesla - Unit 3', gstNumber: 'U3-GST' }
        ]);

        // 2. Fetch list
        const list = await CompanyModel.getAll(tenantId);
        console.log('\n--- CUSTOMER LIST (UNITS ONLY) ---');
        list.forEach(r => {
            console.log(`${r.customer_code.padEnd(15)} | ${r.name.padEnd(20)} | Parent: ${r.company_name}`);
        });

        // 3. Verify company has no code
        const compRows = await pool.query('SELECT name, customer_code FROM customer_companies WHERE name = $1', ['Tesla']);
        console.log('\n--- PARENT COMPANY RECORD ---');
        console.log('Name:', compRows.rows[0].name);
        console.log('Code (should be NULL):', compRows.rows[0].customer_code);

        process.exit(0);
    } catch (e) {
        console.error('Test failed:', e);
        process.exit(1);
    }
}
test();
