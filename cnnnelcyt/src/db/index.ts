import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a new PostgreSQL connection pool
// For now, we will use mock or standard config if not provided
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/connectly',
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
