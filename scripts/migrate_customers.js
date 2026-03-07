const pool = require('../src/models/database.js');

async function run() {
    const client = await pool.connect();
    let migratedCount = 0;
    try {
        await client.query('BEGIN');

        // 1. Fetch all legacy customers
        const res = await client.query('SELECT * FROM customers;');
        const legacyCustomers = res.rows;
        console.log(`Found ${legacyCustomers.length} legacy customers.`);

        for (const leg of legacyCustomers) {
            // For each legacy customer, create a row in customer_companies
            const compRes = await client.query(`
        INSERT INTO customer_companies (
          company_id, name, customer_code, customer_type, customer_stage, 
          gst_number, billing_address, billing_city, billing_state, billing_pin, 
          credit_period, payment_terms, loyalty_tier, tags, interests, 
          is_active, created_at, number_of_units
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 1)
        RETURNING id
      `, [
                leg.company_id,
                leg.company_name || leg.customer_name || 'Unknown Company',
                leg.customer_code,
                leg.customer_type || 'Industry',
                leg.customer_stage || 'potential',
                leg.gst_number,
                leg.address_line1,
                leg.city,
                leg.state,
                leg.postal_code,
                leg.credit_period || 0,
                leg.payment_terms || 'Open Credit',
                leg.loyalty_tier,
                JSON.stringify(leg.tags || []),
                JSON.stringify(leg.interests || []),
                leg.is_active !== undefined ? leg.is_active : true,
                leg.created_at
            ]);

            const newCompanyId = compRes.rows[0].id;

            // Create contact using contact_person OR customer_name OR company_name as fallback
            let contactName = leg.contact_person;
            if (!contactName || contactName.trim() === '') {
                contactName = leg.customer_name;
            }
            if (!contactName || contactName.trim() === '') {
                contactName = leg.company_name;
            }
            if (!contactName || contactName.trim() === '') {
                contactName = 'Unknown Contact';
            }

            const contactRes = await client.query(`
        INSERT INTO customer_contacts (
          customer_company_id, company_id, name, department, designation, 
          phone, whatsapp_number, email, is_primary, is_active, 
          loyalty_tier, interests, billing_address, shipping_address, 
          contact_stage, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
                newCompanyId,
                leg.company_id,
                contactName,
                leg.department,
                leg.designation,
                leg.phone,
                leg.whatsapp_number,
                leg.email,
                true, // is_primary
                leg.is_active !== undefined ? leg.is_active : true,
                leg.loyalty_tier,
                JSON.stringify(leg.interests || []),
                leg.address_line1,
                leg.consignee_address,
                leg.customer_stage || 'potential',
                leg.created_at
            ]);

            // OPTIONAL: Since we already inserted a record earlier today natively, let's avoid complete chaos if foreign keys are strict.
            // E.g., if there are leads pointing to this customer, we'd want to leave them for a phase 2 migration or update them.
            // I am just logging the linkage to demonstrate how smooth this goes.
            console.log(`Migrated Legacy ID ${leg.id} -> New Company ID ${newCompanyId}, Contact ID ${contactRes.rows[0].id}`);
            migratedCount++;
        }

        await client.query('COMMIT');
        console.log(`\\n🎉 Migration completed successfully! Migrated ${migratedCount} customers to the new unified architecture.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Migration failed:", e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
