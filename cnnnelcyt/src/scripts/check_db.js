const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Aadithyanmerin@database-1.c3wmkkigaztb.eu-north-1.rds.amazonaws.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    await client.connect();
    const schemas = await client.query("SELECT schema_name FROM information_schema.schemata");
    console.log('Schemas:', schemas.rows.map(r => r.schema_name));
    
    const tables = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users' OR table_name = 'profiles'");
    console.log('Tables:', tables.rows);
    
    await client.end();
  } catch (err) {
    console.error(err);
  }
}

check();
