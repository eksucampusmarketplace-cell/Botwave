import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface CheckResult {
  name: string;
  status: 'ok' | 'fail' | 'missing';
  detail: string;
}

export async function GET() {
  const checks: CheckResult[] = [];
  const startTime = Date.now();

  // 1. Environment variables
  const envVars = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Key' },
    { key: 'SQUAD_SECRET_KEY', label: 'Squad Secret Key' },
    { key: 'SQUAD_PUBLIC_KEY', label: 'Squad Public Key' },
    { key: 'INLOMAX_API_KEY', label: 'Inlomax API Key' },
  ];

  for (const env of envVars) {
    const value = process.env[env.key];
    const status = value ? 'ok' : 'missing';
    const detail = value
      ? `Set (${value.substring(0, 8)}...)`
      : 'NOT SET — feature will not work';
    checks.push({ name: env.label, status, detail });
    console.log(`[STARTUP] ${env.label}: ${status === 'ok' ? 'CONFIGURED' : 'MISSING'}`);
  }

  // 2. Supabase connection + tables
  const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Check critical tables
      const tables = [
        'subscriptions',
        'payments',
        'reward_balances',
        'reward_transactions',
        'sessions',
        'messages',
        'profiles',
        'message_templates',
        'custom_commands',
        'chatbot_flows',
        'products',
        'referrals',
        'referral_history',
        'qr_alert_preferences',
      ];

      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).select('id').limit(1);
          if (error) {
            checks.push({ name: `Table: ${table}`, status: 'fail', detail: error.message });
            console.log(`[STARTUP] Table ${table}: FAIL — ${error.message}`);
          } else {
            checks.push({ name: `Table: ${table}`, status: 'ok', detail: 'Accessible' });
            console.log(`[STARTUP] Table ${table}: OK`);
          }
        } catch (err) {
          checks.push({ name: `Table: ${table}`, status: 'fail', detail: String(err) });
          console.log(`[STARTUP] Table ${table}: ERROR — ${err}`);
        }
      }
    } catch (err) {
      checks.push({ name: 'Supabase Connection', status: 'fail', detail: String(err) });
      console.error('[STARTUP] Supabase connection FAILED:', err);
    }
  } else {
    checks.push({ name: 'Supabase Connection', status: 'missing', detail: 'URL or key not set' });
    console.error('[STARTUP] Supabase: MISSING credentials');
  }

  // 3. Squad payment gateway
  const squadKey = process.env.SQUAD_SECRET_KEY;
  if (squadKey) {
    try {
      const res = await fetch('https://api-d.squadco.com/merchant/balance', {
        headers: { Authorization: `Bearer ${squadKey}` },
      });
      const status = res.ok ? 'ok' : 'fail';
      const detail = res.ok ? `Connected (HTTP ${res.status})` : `HTTP ${res.status} — check key`;
      checks.push({ name: 'Squad Payment Gateway', status, detail });
      console.log(`[STARTUP] Squad API: ${status === 'ok' ? 'CONNECTED' : `FAIL (${res.status})`}`);
    } catch (err) {
      checks.push({ name: 'Squad Payment Gateway', status: 'fail', detail: `Network error: ${err}` });
      console.error('[STARTUP] Squad API: NETWORK ERROR —', err);
    }
  } else {
    checks.push({ name: 'Squad Payment Gateway', status: 'missing', detail: 'SQUAD_SECRET_KEY not set' });
    console.warn('[STARTUP] Squad API: MISSING key');
  }

  // 4. Inlomax airtime API
  const inlomaxKey = process.env.INLOMAX_API_KEY;
  if (inlomaxKey) {
    try {
      const res = await fetch('https://inlomax.com/api/balance', {
        headers: { Authorization: `Bearer ${inlomaxKey}` },
      });
      const status = res.ok ? 'ok' : 'fail';
      const detail = res.ok ? `Connected (HTTP ${res.status})` : `HTTP ${res.status} — check key`;
      checks.push({ name: 'Inlomax Airtime API', status, detail });
      console.log(`[STARTUP] Inlomax API: ${status === 'ok' ? 'CONNECTED' : `FAIL (${res.status})`}`);
    } catch (err) {
      checks.push({ name: 'Inlomax Airtime API', status: 'fail', detail: `Network error: ${err}` });
      console.error('[STARTUP] Inlomax API: NETWORK ERROR —', err);
    }
  } else {
    checks.push({ name: 'Inlomax Airtime API', status: 'missing', detail: 'INLOMAX_API_KEY not set' });
    console.warn('[STARTUP] Inlomax API: MISSING key');
  }

  // Summary
  const ok = checks.filter((c) => c.status === 'ok').length;
  const fail = checks.filter((c) => c.status === 'fail').length;
  const missing = checks.filter((c) => c.status === 'missing').length;
  const elapsed = Date.now() - startTime;

  console.log(`[STARTUP] === DIAGNOSTICS COMPLETE === ${ok} ok, ${fail} fail, ${missing} missing (${elapsed}ms)`);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    elapsed: `${elapsed}ms`,
    summary: { ok, fail, missing, total: checks.length },
    checks,
  });
}
