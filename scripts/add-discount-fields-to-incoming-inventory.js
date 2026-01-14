const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:lWKfNKluCcjlvvCBpNItDEjMhdqUQMth@centerbeam.proxy.rlwy.net:22395/railway'
});

async function addDiscountFields() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Adding discount fields to incoming inventory tables...\n');
    
    await client.query('BEGIN');
    
    // Check if columns already exist in incoming_inventory
    console.log('📋 Checking incoming_inventory table...');
    const incomingInventoryCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'incoming_inventory' 
      AND column_name IN ('invoice_level_discount', 'invoice_level_discount_type')
    `);
    
    const existingIncomingColumns = incomingInventoryCheck.rows.map(row => row.column_name);
    
    // Add invoice_level_discount to incoming_inventory
    if (!existingIncomingColumns.includes('invoice_level_discount')) {
      console.log('  ➕ Adding invoice_level_discount column...');
      await client.query(`
        ALTER TABLE incoming_inventory
        ADD COLUMN invoice_level_discount DECIMAL(15, 2) DEFAULT 0
      `);
      await client.query(`
        COMMENT ON COLUMN incoming_inventory.invoice_level_discount IS 'Invoice-level discount amount (applied after SKU discounts)'
      `);
      console.log('  ✅ Added invoice_level_discount column');
    } else {
      console.log('  ⏭️  invoice_level_discount column already exists');
    }
    
    // Add invoice_level_discount_type to incoming_inventory
    if (!existingIncomingColumns.includes('invoice_level_discount_type')) {
      console.log('  ➕ Adding invoice_level_discount_type column...');
      await client.query(`
        ALTER TABLE incoming_inventory
        ADD COLUMN invoice_level_discount_type VARCHAR(20) DEFAULT 'percentage'
      `);
      await client.query(`
        COMMENT ON COLUMN incoming_inventory.invoice_level_discount_type IS 'Invoice-level discount type: percentage or flat'
      `);
      console.log('  ✅ Added invoice_level_discount_type column');
    } else {
      console.log('  ⏭️  invoice_level_discount_type column already exists');
    }
    
    // Check if columns already exist in incoming_inventory_items
    console.log('\n📋 Checking incoming_inventory_items table...');
    const itemsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'incoming_inventory_items' 
      AND column_name IN (
        'sku_discount', 
        'sku_discount_amount', 
        'amount_after_sku_discount', 
        'invoice_discount_share', 
        'final_taxable_amount'
      )
    `);
    
    const existingItemsColumns = itemsCheck.rows.map(row => row.column_name);
    
    // Add sku_discount to incoming_inventory_items
    if (!existingItemsColumns.includes('sku_discount')) {
      console.log('  ➕ Adding sku_discount column...');
      await client.query(`
        ALTER TABLE incoming_inventory_items
        ADD COLUMN sku_discount DECIMAL(5, 2) DEFAULT 0
      `);
      await client.query(`
        COMMENT ON COLUMN incoming_inventory_items.sku_discount IS 'SKU-level discount percentage (0-100)'
      `);
      console.log('  ✅ Added sku_discount column');
    } else {
      console.log('  ⏭️  sku_discount column already exists');
    }
    
    // Add sku_discount_amount to incoming_inventory_items
    if (!existingItemsColumns.includes('sku_discount_amount')) {
      console.log('  ➕ Adding sku_discount_amount column...');
      await client.query(`
        ALTER TABLE incoming_inventory_items
        ADD COLUMN sku_discount_amount DECIMAL(15, 2) DEFAULT 0
      `);
      await client.query(`
        COMMENT ON COLUMN incoming_inventory_items.sku_discount_amount IS 'Calculated SKU discount amount (baseAmount × sku_discount/100)'
      `);
      console.log('  ✅ Added sku_discount_amount column');
    } else {
      console.log('  ⏭️  sku_discount_amount column already exists');
    }
    
    // Add amount_after_sku_discount to incoming_inventory_items
    if (!existingItemsColumns.includes('amount_after_sku_discount')) {
      console.log('  ➕ Adding amount_after_sku_discount column...');
      await client.query(`
        ALTER TABLE incoming_inventory_items
        ADD COLUMN amount_after_sku_discount DECIMAL(15, 2) DEFAULT 0
      `);
      await client.query(`
        COMMENT ON COLUMN incoming_inventory_items.amount_after_sku_discount IS 'Amount after SKU discount (baseAmount - sku_discount_amount)'
      `);
      console.log('  ✅ Added amount_after_sku_discount column');
    } else {
      console.log('  ⏭️  amount_after_sku_discount column already exists');
    }
    
    // Add invoice_discount_share to incoming_inventory_items
    if (!existingItemsColumns.includes('invoice_discount_share')) {
      console.log('  ➕ Adding invoice_discount_share column...');
      await client.query(`
        ALTER TABLE incoming_inventory_items
        ADD COLUMN invoice_discount_share DECIMAL(15, 2) DEFAULT 0
      `);
      await client.query(`
        COMMENT ON COLUMN incoming_inventory_items.invoice_discount_share IS 'Proportionally allocated invoice-level discount for this item'
      `);
      console.log('  ✅ Added invoice_discount_share column');
    } else {
      console.log('  ⏭️  invoice_discount_share column already exists');
    }
    
    // Add final_taxable_amount to incoming_inventory_items
    if (!existingItemsColumns.includes('final_taxable_amount')) {
      console.log('  ➕ Adding final_taxable_amount column...');
      await client.query(`
        ALTER TABLE incoming_inventory_items
        ADD COLUMN final_taxable_amount DECIMAL(15, 2) DEFAULT 0
      `);
      await client.query(`
        COMMENT ON COLUMN incoming_inventory_items.final_taxable_amount IS 'Final taxable amount after all discounts (amount_after_sku_discount - invoice_discount_share)'
      `);
      console.log('  ✅ Added final_taxable_amount column');
    } else {
      console.log('  ⏭️  final_taxable_amount column already exists');
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - incoming_inventory: Added invoice_level_discount, invoice_level_discount_type');
    console.log('  - incoming_inventory_items: Added sku_discount, sku_discount_amount, amount_after_sku_discount, invoice_discount_share, final_taxable_amount');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error during migration:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
addDiscountFields()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
