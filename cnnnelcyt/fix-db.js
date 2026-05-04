const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Aadithyanmerin@database-1.c3wmkkigaztb.eu-north-1.rds.amazonaws.com:5432/postgres' });

async function fixDb() {
  try {
    await client.connect();
    const res = await client.query("UPDATE chat_members SET status = 'joined' WHERE status IS NULL");
    console.log(`Updated ${res.rowCount} rows`);
  } catch(e) {
    console.error(e);
  } finally {
    client.end();
  }
}
fixDb();
