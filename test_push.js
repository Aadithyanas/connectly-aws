require('dotenv').config({ path: './cnnnelcyt/.env' });
const webpush = require('./cnnnelcyt/node_modules/web-push');
const { query } = require('./cnnnelcyt/dist/db');

async function testPush() {
  const userId = 'fd4873d5-786f-4782-8401-aadbc6ac8214';
  
  // Set VAPID details
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  console.log('VAPID Public Key:', process.env.VAPID_PUBLIC_KEY?.substring(0, 20) + '...');
  
  const result = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
  
  if (!result.rows.length) {
    console.log('❌ No subscriptions found for user:', userId);
    process.exit(1);
  }

  const sub = result.rows[0];
  console.log('📱 Found subscription, endpoint:', sub.endpoint.substring(0, 60) + '...');

  const pushSubscription = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.p256dh,
      auth: sub.auth
    }
  };

  const payload = JSON.stringify({
    title: '📞 Test Call from Connectly',
    body: 'If you see this, push notifications are WORKING!',
    type: 'call',
    caller: { name: 'Test User' },
    url: '/chat'
  });

  try {
    const response = await webpush.sendNotification(pushSubscription, payload);
    console.log('✅ SUCCESS! Push sent! Status:', response.statusCode);
    console.log('   Check your phone — you should see the notification NOW!');
  } catch (err) {
    console.log('❌ FAILED! Status:', err.statusCode);
    console.log('   Body:', err.body);
    console.log('   Endpoint:', err.endpoint?.substring(0, 60));
    
    if (err.body?.includes('VAPID')) {
      console.log('\n🔑 VAPID KEY MISMATCH! The subscription was created with a different key.');
      console.log('   The user needs to clear browser data and re-enable notifications.');
    }
  }

  process.exit(0);
}

testPush();
