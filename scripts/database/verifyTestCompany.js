const { Client } = require('pg');
const dbConfig = require('./config');

async function verifyTestCompany() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get test company
    const result = await client.query(
      `SELECT 
        id, company_id, company_name, gst_number, business_type,
        address, city, state, pin, phone, website,
        admin_full_name, admin_email, admin_phone,
        created_at
      FROM companies 
      WHERE company_id = 'TEST01' OR admin_email = 'admin@testelectronics.com'`
    );

    if (result.rows.length === 0) {
      console.log('❌ Test company not found');
      return;
    }

    const company = result.rows[0];

    console.log('📋 Test Company Registration Data:');
    console.log('═'.repeat(80));
    console.log(`\n🏢 Company Information:`);
    console.log(`   ID: ${company.id}`);
    console.log(`   Company ID (SKU): ${company.company_id}`);
    console.log(`   Company Name: ${company.company_name}`);
    console.log(`   GST Number: ${company.gst_number}`);
    console.log(`   Business Type: ${company.business_type}`);
    console.log(`   Address: ${company.address}`);
    console.log(`   City: ${company.city}`);
    console.log(`   State: ${company.state}`);
    console.log(`   PIN: ${company.pin}`);
    console.log(`   Phone: ${company.phone}`);
    console.log(`   Website: ${company.website || 'N/A'}`);

    console.log(`\n👤 Super Admin Details:`);
    console.log(`   Full Name: ${company.admin_full_name}`);
    console.log(`   Email: ${company.admin_email}`);
    console.log(`   Phone: ${company.admin_phone}`);
    console.log(`   Password: [Hashed - Test@1234]`);

    console.log(`\n📅 Timestamps:`);
    console.log(`   Created At: ${company.created_at}`);
    console.log('\n' + '═'.repeat(80));
    console.log('\n✅ Test registration verified successfully!');
    console.log('\n💡 Login Credentials:');
    console.log(`   Email: ${company.admin_email}`);
    console.log(`   Password: Test@1234`);

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTestCompany();

