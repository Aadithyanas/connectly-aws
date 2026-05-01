
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function checkColumns() {
  try {
    console.log('Checking columns for auth.users...');
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'auth' 
      AND table_name = 'users';
    `);
    console.log('Columns for auth.users:');
    res.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));

    console.log('\nChecking columns for public.profiles...');
    const res2 = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles';
    `);
    console.log('Columns for public.profiles:');
    res2.rows.forEach(row => console.log(`- ${row.column_name} (${row.data_type})`));

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await pool.end();
  }
}

checkColumns();
