
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read environment variables manually if needed or assume they are in process.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setup() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.');
    console.log('You can run this script as:');
    console.log('NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/setup-db.mjs');
    process.exit(1);
  }

  console.log('Connecting to Supabase at:', supabaseUrl);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Checking for required tables...');
  const tables = [
    'profiles', 'bot_sessions', 'bot_features', 'messages', 
    'auto_replies', 'welcome_messages', 'polls', 'game_states', 
    'leaderboard', 'rate_limit_settings'
  ];

  const missing = [];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && error.code === 'PGRST205') {
      missing.push(table);
      console.log(`- ${table}: MISSING`);
    } else {
      console.log(`- ${table}: OK`);
    }
  }

  if (missing.length === 0) {
    console.log('\nAll tables are already present. No action needed.');
    return;
  }

  console.log('\nMissing tables detected:', missing.join(', '));
  console.log('Since arbitrary SQL cannot be executed directly via the Supabase JS client,');
  console.log('please run the migrations found in the supabase/migrations folder');
  console.log('using the Supabase Dashboard SQL Editor:');
  console.log('https://supabase.com/dashboard/project/_/sql');
  
  const migrationFiles = [
    '../supabase/migrations/001_initial_schema.sql',
    '../supabase/migrations/002_rate_limit_settings.sql'
  ];

  console.log('\nSQL Migrations are located at:');
  migrationFiles.forEach(f => console.log(`- ${path.resolve(__dirname, f)}`));
}

setup().catch(console.error);
