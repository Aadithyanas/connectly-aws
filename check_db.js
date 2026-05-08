require('dotenv').config({ path: './cnnnelcyt/.env' });
const { query } = require('./cnnnelcyt/dist/db');

async function clearAndVerify() {
  try {
    // Clear all stale subscriptions (they were created with wrong VAPID key)
    await query('DELETE FROM push_subscriptions');
    console.log('✅ Cleared all stale push subscriptions');
    
    // Verify the table is empty
    const result = await query('SELECT count(*) FROM push_subscriptions');
    console.log(`📊 Subscriptions remaining: ${result.rows[0].count}`);
    
    console.log('\n🔑 Users must re-enable notifications in Settings to register with the correct VAPID key.');
    console.log('   The app will also auto-subscribe returning users who previously granted permission.\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

clearAndVerify();
