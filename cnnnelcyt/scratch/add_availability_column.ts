import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function addColumn() {
  try {
    console.log('Adding availability_status column to profiles table...');
    await pool.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS availability_status BOOLEAN DEFAULT true;
    `);
    console.log('Column added successfully!');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await pool.end();
  }
}

addColumn();
