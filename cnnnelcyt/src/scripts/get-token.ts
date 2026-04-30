import jwt from 'jsonwebtoken';
import pool from '../db/index';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_me';
const email = process.argv[2];

async function run() {
  if (!email) {
    console.log('❌ Please provide your email address.');
    console.log('Usage: npx ts-node src/scripts/get-token.ts your-email@gmail.com');
    process.exit(1);
  }

  try {
    const result = await pool.query('SELECT id, name FROM public.profiles WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      console.log(`❌ No user found with email: ${email}`);
      console.log('Make sure you have logged into the app with this Google account at least once.');
      process.exit(1);
    }
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '365d' }); // Valid for 1 year
    
    console.log('\n✅ Token generated successfully!');
    console.log('----------------------------------------------------');
    console.log(`Name : ${user.name}`);
    console.log(`Email: ${email}`);
    console.log(`ID   : ${user.id}`);
    console.log('----------------------------------------------------');
    console.log('\nCopy the token below and use it in Postman (Bearer Token):\n');
    console.log(token);
    console.log('\n----------------------------------------------------\n');
    
  } catch (err) {
    console.error('Error generating token:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
