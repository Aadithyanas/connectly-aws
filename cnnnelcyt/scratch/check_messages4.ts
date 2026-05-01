import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'cnnnelcyt/.env' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const res = await pool.query("SELECT id, content, chat_id, created_at, is_deleted_everyone, deleted_for FROM messages WHERE chat_id = '474d4333-a6fb-42f7-a790-f66fed45621c' ORDER BY created_at DESC LIMIT 10");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
