require('dotenv').config({ path: './cnnnelcyt/.env' });
const { query } = require('./cnnnelcyt/dist/db');

async function check() {
  try {
    const res = await query("SELECT user_id, count(*) FROM push_subscriptions GROUP BY user_id");
    console.log('Subscriptions by user:', JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  }
}

check();
