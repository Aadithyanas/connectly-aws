const { Client } = require('pg');
const client = new Client({ 
  connectionString: 'postgresql://postgres:Aadithyanmerin@database-1.c3wmkkigaztb.eu-north-1.rds.amazonaws.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function createIndexes() {
  try {
    await client.connect();
    console.log('Connected with SSL, creating indexes...');
    
    await client.query("CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_messages_chat_sender_status ON messages(chat_id, sender_id, status)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_chat_members_chat_user ON chat_members(chat_id, user_id)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id)");
    await client.query("CREATE INDEX IF NOT EXISTS idx_messages_status_sent ON messages(status) WHERE status = 'sent'");
    
    console.log('Indexes created successfully!');
  } catch(e) {
    console.error('Index creation failed:', e);
  } finally {
    client.end();
  }
}
createIndexes();
