/**
 * Run all Supabase migrations in order against the database.
 * Usage: SUPABASE_DB_URL=postgresql://... node scripts/run-migrations.js
 */
const { Client } = require('pg');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

// Force IPv4 resolution (IPv6 may be unreachable)
dns.setDefaultResultOrder('ipv4first');

let DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error('SUPABASE_DB_URL environment variable is required');
  process.exit(1);
}

// If direct connection (port 5432) fails on IPv6-only hosts, try the pooler
const parsed = new URL(DB_URL);
const REGIONS = [
  'us-east-1', 'us-west-1', 'us-east-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-south-1', 'ap-northeast-1',
];
let usePooler = false;
let projectRef = '';
if (parsed.hostname.startsWith('db.') && parsed.hostname.endsWith('.supabase.co') && parsed.port === '5432') {
  projectRef = parsed.hostname.replace('db.', '').replace('.supabase.co', '');
  usePooler = true;
}

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

async function tryConnect(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  return client;
}

async function run() {
  let client;

  if (usePooler) {
    // Try each region until one works
    for (const region of REGIONS) {
      const poolerUrl = new URL(DB_URL);
      poolerUrl.hostname = `aws-0-${region}.pooler.supabase.com`;
      poolerUrl.port = '6543';
      poolerUrl.username = `postgres.${projectRef}`;
      const url = poolerUrl.toString();
      try {
        console.log(`Trying pooler in ${region}...`);
        client = await tryConnect(url);
        console.log(`Connected via ${region} pooler`);
        break;
      } catch (err) {
        console.log(`  ${region}: ${err.message}`);
      }
    }
    if (!client) {
      // Fall back to direct connection
      try {
        client = await tryConnect(DB_URL);
      } catch (err) {
        console.error('Could not connect to database:', err.message);
        process.exit(1);
      }
    }
  } else {
    client = await tryConnect(DB_URL);
  }

  console.log('Connected to database');

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`Running migration: ${file}`);
    try {
      await client.query(sql);
      console.log(`  ✓ ${file} applied`);
    } catch (err) {
      // Ignore "already exists" errors for idempotent migrations
      if (err.message.includes('already exists')) {
        console.log(`  ⚠ ${file} skipped (already exists)`);
      } else {
        console.error(`  ✗ ${file} failed:`, err.message);
      }
    }
  }

  await client.end();
  console.log('Done');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
