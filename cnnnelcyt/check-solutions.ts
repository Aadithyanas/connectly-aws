import pool from './src/db/index';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkSolutions() {
  try {
    const r = await pool.query('SELECT count(*) FROM challenge_solutions');
    console.log('Solutions count:', r.rows[0].count);
    const r2 = await pool.query('SELECT * FROM challenge_solutions LIMIT 5');
    console.log('Sample solutions:', JSON.stringify(r2.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

checkSolutions();
