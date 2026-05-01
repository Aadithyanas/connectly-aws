
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set (ends with ' + process.env.GOOGLE_CLIENT_ID.slice(-5) + ')' : 'Not Set');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not Set');
