"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Create a new PostgreSQL connection pool
// For now, we will use mock or standard config if not provided
const pool = new pg_1.Pool({
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
const query = async (text, params) => {
    try {
        return await pool.query(text, params);
    }
    catch (err) {
        console.error(`[DATABASE ERROR] Query: ${text}`, err.message);
        throw err;
    }
};
exports.query = query;
exports.default = pool;
