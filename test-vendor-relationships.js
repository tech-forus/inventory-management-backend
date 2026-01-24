/**
 * Test script to verify vendor relationships are being saved and loaded correctly
 * Run: node test-vendor-relationships.js
 */

const pool = require('./src/models/database');

async function testVendorRelationships() {
  const client = await pool.connect();
  try {
    console.log('Testing vendor relationships...\n');
    
    // Test 1: Check if junction tables exist
    console.log('1. Checking junction tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'vendor_product_categories',
        'vendor_item_categories', 
        'vendor_sub_categories',
        'vendor_brands'
      )
      ORDER BY table_name
    `);
    console.log('   Found tables:', tables.rows.map(r => r.table_name));
    
    // Test 2: Check if any vendors have relationships
    console.log('\n2. Checking vendors with relationships...');
    const vendorsWithRelations = await client.query(`
      SELECT 
        v.id,
        v.name,
        (SELECT COUNT(*) FROM vendor_product_categories WHERE vendor_id = v.id) as product_cat_count,
        (SELECT COUNT(*) FROM vendor_item_categories WHERE vendor_id = v.id) as item_cat_count,
        (SELECT COUNT(*) FROM vendor_sub_categories WHERE vendor_id = v.id) as sub_cat_count,
        (SELECT COUNT(*) FROM vendor_brands WHERE vendor_id = v.id) as brand_count
      FROM vendors v
      WHERE v.is_active = true
      LIMIT 5
    `);
    
    console.log('   Vendors with relationships:');
    vendorsWithRelations.rows.forEach(v => {
      console.log(`   - ${v.name} (ID: ${v.id}):`, {
        productCategories: v.product_cat_count,
        itemCategories: v.item_cat_count,
        subCategories: v.sub_cat_count,
        brands: v.brand_count
      });
    });
    
    // Test 3: Test the getAll query format
    console.log('\n3. Testing getAll query format...');
    const testVendor = vendorsWithRelations.rows[0];
    if (testVendor) {
      const result = await client.query(`
        SELECT 
          v.*,
          COALESCE(
            (SELECT json_agg(product_category_id) 
             FROM vendor_product_categories 
             WHERE vendor_id = v.id), 
            '[]'::json
          ) as product_category_ids,
          COALESCE(
            (SELECT json_agg(brand_id) 
             FROM vendor_brands 
             WHERE vendor_id = v.id), 
            '[]'::json
          ) as brand_ids
        FROM vendors v 
        WHERE v.id = $1
      `, [testVendor.id]);
      
      if (result.rows[0]) {
        const vendor = result.rows[0];
        console.log(`   Vendor: ${vendor.name}`);
        console.log(`   product_category_ids:`, vendor.product_category_ids, `(type: ${typeof vendor.product_category_ids})`);
        console.log(`   brand_ids:`, vendor.brand_ids, `(type: ${typeof vendor.brand_ids})`);
        console.log(`   Is array? product_category_ids: ${Array.isArray(vendor.product_category_ids)}, brand_ids: ${Array.isArray(vendor.brand_ids)}`);
      }
    }
    
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

testVendorRelationships();
