import { query } from '../db';

async function checkChallenges() {
  try {
    const result = await query("SELECT id, leetcode_id, title, difficulty FROM challenges LIMIT 5");
    console.table(result.rows);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkChallenges();
