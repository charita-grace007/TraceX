import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let isDbAvailable = false;

if (databaseUrl) {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5000, // 5 second timeout
    });

    // Handle unexpected idle client errors
    pool.on('error', (err) => {
      console.error('[TRACE-X DB] Unexpected error on idle SQL client:', err);
    });
  } catch (err) {
    console.error('[TRACE-X DB] Failed to initialize pg Pool:', err);
  }
} else {
  console.log('[TRACE-X DB] DATABASE_URL is not set. Falling back to in-memory mode.');
}

// Check database availability and run migration schema safely on startup
export async function initializeDatabase(): Promise<boolean> {
  if (!pool) {
    isDbAvailable = false;
    return false;
  }

  try {
    // Eagerly probe connectivity ONLY inside the startup initializeDatabase call
    const client = await pool.connect();
    console.log('[TRACE-X DB] Connected to PostgreSQL database successfully.');
    
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id VARCHAR(128) PRIMARY KEY,
        case_number VARCHAR(128) NOT NULL UNIQUE,
        created_at VARCHAR(128) NOT NULL,
        title TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        sender_address VARCHAR(256) NOT NULL,
        recipient_address VARCHAR(256) NOT NULL,
        subject TEXT NOT NULL,
        data JSONB NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id VARCHAR(128) PRIMARY KEY,
        name VARCHAR(256) NOT NULL,
        data JSONB NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ledger_blocks (
        index INTEGER PRIMARY KEY,
        case_id VARCHAR(128) NOT NULL,
        timestamp VARCHAR(128) NOT NULL,
        action VARCHAR(128) NOT NULL,
        artifact_hash VARCHAR(64) NOT NULL,
        evidence_root_hash VARCHAR(64) NOT NULL,
        previous_block_hash VARCHAR(64) NOT NULL,
        block_hash VARCHAR(64) NOT NULL UNIQUE,
        verified BOOLEAN NOT NULL DEFAULT TRUE,
        data JSONB NOT NULL
      );
    `);

    client.release();
    isDbAvailable = true;
    console.log('[TRACE-X DB] PostgreSQL database schema verified and migrated.');
    return true;
  } catch (err) {
    console.error('[TRACE-X DB] Database connection/migration failed. Entering in-memory fallback mode.', err);
    isDbAvailable = false;
    return false;
  }
}

export function isDatabaseAvailable(): boolean {
  return isDbAvailable;
}

export function getPool(): pg.Pool | null {
  return isDbAvailable ? pool : null;
}

// -----------------------------------------------------------------
// DATABASE DATA ACCESS HELPERS (WITH BUILT-IN FALLBACKS)
// -----------------------------------------------------------------

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (!isDbAvailable || !pool) {
    throw new Error('Database is offline');
  }
  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err) {
    console.error('[TRACE-X DB] Query execution failed:', err);
    throw new Error('Database query execution error', { cause: err });
  }
}
