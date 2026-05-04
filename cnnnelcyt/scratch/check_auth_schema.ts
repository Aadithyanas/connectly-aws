import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'cnnnelcyt/.env' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const res = await pool.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'auth'");
    console.log('Auth schema exists:', res.rows.length > 0);
    
    if (res.rows.length > 0) {
      const tableRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users'");
      console.log('Auth.users table exists:', tableRes.rows.length > 0);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
