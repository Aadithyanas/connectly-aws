
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

async function checkSchema() {
  try {
    console.log('Checking database connection...');
    const now = await pool.query('SELECT NOW()');
    console.log('Connection successful:', now.rows[0]);

    console.log('Checking for auth.users table...');
    const authUsers = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'auth'
        AND    table_name   = 'users'
      );
    `);
    console.log('auth.users exists:', authUsers.rows[0].exists);

    console.log('Checking for public.profiles table...');
    const publicProfiles = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE  table_schema = 'public'
        AND    table_name   = 'profiles'
      );
    `);
    console.log('public.profiles exists:', publicProfiles.rows[0].exists);

  } catch (err) {
    console.error('Check failed:', err);
  } finally {
    await pool.end();
  }
}

checkSchema();
