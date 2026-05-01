import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'cnnnelcyt/.env' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function run() {
  try {
    const chatId = '474d4333-a6fb-42f7-a790-f66fed45621c';
    const total = await pool.query("SELECT count(*) FROM messages WHERE chat_id = $1", [chatId]);
    const joined = await pool.query("SELECT count(*) FROM messages m JOIN profiles p ON m.sender_id = p.id WHERE m.chat_id = $1", [chatId]);
    console.log(`Total messages: ${total.rows[0].count}`);
    console.log(`Joined messages: ${joined.rows[0].count}`);
    
    if (total.rows[0].count !== joined.rows[0].count) {
      console.log("Found messages with missing sender profiles!");
      const missing = await pool.query("SELECT m.id, m.sender_id FROM messages m LEFT JOIN profiles p ON m.sender_id = p.id WHERE m.chat_id = $1 AND p.id IS NULL", [chatId]);
      console.log(missing.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
