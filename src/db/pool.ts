import { Pool } from 'pg';
import dotenv from 'dotenv';

// Charger .env avant d'utiliser les variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
});

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

export async function initDB() {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Neon PostgreSQL');
  } catch (error) {
    console.error('❌ DB connection failed:', error);
    process.exit(1);
  }
}
