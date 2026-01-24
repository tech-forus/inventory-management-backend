const { Pool } = require('pg');
const path = require('path');
const dbConfig = require('../src/config/database');

const pool = new Pool(dbConfig);

async function migrate() {
    console.log('Using dbConfig:', JSON.stringify({ ...dbConfig, password: '****' }, null, 2));
    const client = await pool.connect();
    try {
        console.log('Starting migration: Adding is_non_movable column to skus table...');

        // Check if column already exists
        const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'skus' AND column_name = 'is_non_movable';
    `;
        const res = await client.query(checkColumnQuery);

        if (res.rows.length === 0) {
            const addColumnQuery = `
        ALTER TABLE skus 
        ADD COLUMN is_non_movable BOOLEAN DEFAULT FALSE;
      `;
            await client.query(addColumnQuery);
            console.log('Successfully added is_non_movable column.');
        } else {
            console.log('Column is_non_movable already exists.');
        }

    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
