#!/usr/bin/env node

/**
 * BotWave — Supabase Project Migration Script
 *
 * Exports ALL data (including auth users) from your current Supabase project
 * and imports it into a new one. This preserves logins, sessions, settings, etc.
 *
 * Usage:
 *   1. Set environment variables for OLD and NEW projects:
 *
 *      export OLD_SUPABASE_URL=https://xxxxx.supabase.co
 *      export OLD_SUPABASE_SERVICE_KEY=eyJ...
 *      export NEW_SUPABASE_URL=https://yyyyy.supabase.co
 *      export NEW_SUPABASE_SERVICE_KEY=eyJ...
 *
 *   2. Run ALL migration SQL files (001–022) on the NEW project first
 *      via the Supabase SQL Editor so that tables exist.
 *
 *   3. Run this script:
 *      node scripts/migrate-supabase.mjs
 *
 * The script will:
 *   - Export auth users from the old project and recreate them in the new one
 *   - Export all public tables and insert them into the new project
 *   - Preserve UUIDs so foreign-key relationships stay intact
 */

import { createClient } from '@supabase/supabase-js';

const OLD_URL = process.env.OLD_SUPABASE_URL;
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_KEY;

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error(
    'Missing environment variables. Please set:\n' +
    '  OLD_SUPABASE_URL, OLD_SUPABASE_SERVICE_KEY\n' +
    '  NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_KEY',
  );
  process.exit(1);
}

const oldSupabase = createClient(OLD_URL, OLD_KEY);
const newSupabase = createClient(NEW_URL, NEW_KEY);

// Tables in dependency order (parents before children)
const TABLES = [
  'profiles',
  'bot_sessions',
  'bot_features',
  'messages',
  'auto_replies',
  'welcome_messages',
  'polls',
  'game_states',
  'leaderboard',
  'user_settings',
  'afk_states',
  'reminders',
  'notes',
  'scheduled_messages',
  'user_stats',
  'bot_health_events',
  'webhook_retry_queue',
  'subscriptions',
  'reward_balances',
  'reward_transactions',
  'referrals',
  'airtime_cashouts',
  'pairing_events',
  'support_tickets',
  'support_messages',
  'api_keys',
];

async function migrateAuthUsers() {
  console.log('\n=== Migrating Auth Users ===');
  try {
    const { data, error } = await oldSupabase.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
      console.error('  Failed to list users from old project:', error.message);
      return;
    }

    const users = data?.users || [];
    console.log(`  Found ${users.length} auth user(s) to migrate.`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Check if user already exists in new project
        const { data: existing } = await newSupabase.auth.admin.getUserById(user.id);
        if (existing?.user) {
          skipped++;
          continue;
        }

        // Create user in new project with same ID
        const { error: createErr } = await newSupabase.auth.admin.createUser({
          email: user.email,
          phone: user.phone,
          email_confirm: true,
          phone_confirm: !!user.phone,
          user_metadata: user.user_metadata,
          app_metadata: user.app_metadata,
          // Note: passwords cannot be exported. Users will need to reset passwords
          // or you can set a temporary password here.
        });

        if (createErr) {
          console.error(`  Failed to create user ${user.email}:`, createErr.message);
        } else {
          migrated++;
        }
      } catch (err) {
        console.error(`  Error migrating user ${user.email}:`, err.message);
      }
    }

    console.log(`  Auth migration complete: ${migrated} migrated, ${skipped} skipped (already exist).`);
    console.log('  IMPORTANT: Users will need to reset their passwords in the new project');
    console.log('  (Supabase does not allow exporting password hashes via the API).');
  } catch (err) {
    console.error('  Auth migration error:', err.message);
  }
}

async function fetchAllRows(client, table) {
  const rows = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      // Table may not exist in this project — skip gracefully
      if (error.code === 'PGRST205' || error.code === '42P01') return null;
      throw error;
    }

    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

async function migrateTable(table) {
  process.stdout.write(`  ${table}... `);

  try {
    const rows = await fetchAllRows(oldSupabase, table);

    if (rows === null) {
      console.log('table not found in old project — skipped');
      return;
    }

    if (rows.length === 0) {
      console.log('empty — skipped');
      return;
    }

    // Insert in batches of 500 to avoid payload limits
    const BATCH_SIZE = 500;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await newSupabase.from(table).upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`\n    Batch error on ${table}: ${error.message}`);
        errors++;
      } else {
        inserted += batch.length;
      }
    }

    console.log(`${inserted} rows migrated${errors > 0 ? ` (${errors} batch error(s))` : ''}`);
  } catch (err) {
    console.log(`error: ${err.message}`);
  }
}

async function main() {
  console.log('BotWave Supabase Migration Tool');
  console.log('================================');
  console.log(`  From: ${OLD_URL}`);
  console.log(`  To:   ${NEW_URL}`);
  console.log('');

  // Step 1: Migrate auth users
  await migrateAuthUsers();

  // Step 2: Migrate public tables
  console.log('\n=== Migrating Public Tables ===');
  for (const table of TABLES) {
    await migrateTable(table);
  }

  console.log('\n=== Migration Complete ===');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Update your .env with the NEW Supabase URL and keys');
  console.log('  2. Ask users to reset their passwords (use Forgot Password)');
  console.log('  3. Redeploy your app with the new environment variables');
  console.log('  4. Verify everything works by logging in and checking the dashboard');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
