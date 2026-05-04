const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:Aadithyanmerin@database-1.c3wmkkigaztb.eu-north-1.rds.amazonaws.com:5432/postgres' });
client.connect()
  .then(() => client.query("SELECT id, name, is_public, is_group FROM chats WHERE name = 'SEO'"))
  .then(res => {
    console.log(res.rows);
    return client.query("SELECT * FROM chat_members WHERE chat_id = $1", [res.rows[0].id]);
  })
  .then(res => console.log('members:', res.rows))
  .catch(console.error)
  .finally(() => client.end());
