import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'cnnnelcyt/.env' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const res = await pool.query("SELECT id, content, created_at, chat_id FROM messages WHERE content LIKE '%bro%' OR content LIKE '%notjing%' ORDER BY created_at DESC LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
