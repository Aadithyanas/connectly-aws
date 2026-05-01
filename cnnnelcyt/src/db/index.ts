import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:Aadithyanmerin@database-1.c3wmkkigaztb.eu-north-1.rds.amazonaws.com:5432/postgres';

if (!process.env.DATABASE_URL) {
  console.warn('[DB] WARNING: DATABASE_URL env var not set — using hardcoded RDS fallback!');
}
console.log('[DB] Connecting to:', DATABASE_URL.replace(/:([^:@]+)@/, ':***@')); // log URL with masked password

// Create a new PostgreSQL connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for AWS RDS
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Wait 5 seconds for a connection
  keepAlive: true, // Keep connections alive
});

pool.on('error', (err) => {
  console.error('[DATABASE] Unexpected error on idle client:', err);
});

// Helper to query the database
export const query = async (text: string, params?: any[]) => {
  try {
    return await pool.query(text, params);
  } catch (err: any) {
    console.error(`[DATABASE ERROR] Query: ${text}`, err.message);
    throw err;
  }
};

export default pool;
