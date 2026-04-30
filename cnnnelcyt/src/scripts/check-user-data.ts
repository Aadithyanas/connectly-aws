import { query } from '../db';

async function checkUserData() {
  const userId = 'fd4873d5-786f-4782-8401-aadbc6ac8214';
  try {
    const result = await query(
      "SELECT name, avatar_url, cover_url FROM profiles WHERE id = $1",
      [userId]
    );
    console.table(result.rows);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkUserData();
