import { query } from '../db';

async function checkSolutionsSchema() {
  try {
    const result = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'challenge_solutions'");
    console.table(result.rows);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkSolutionsSchema();
