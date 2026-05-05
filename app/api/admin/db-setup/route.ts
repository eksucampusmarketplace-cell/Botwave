import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { REQUIRED_TABLES, SCHEMA_SQL } from '@/lib/db-setup';
import { verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();
    const results: Record<string, boolean> = {};
    const columnChecks: Record<string, boolean> = {};

    for (const table of REQUIRED_TABLES) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(1);
      
      // PGRST205 is "table not found"
      if (error && error.code === 'PGRST205') {
        results[table] = false;
      } else {
        results[table] = true;
      }
    }

    // Check for auth_state column in bot_sessions
    if (results['bot_sessions']) {
      const { data, error } = await supabase.rpc('check_column_exists', { 
        t_name: 'bot_sessions', 
        c_name: 'auth_state' 
      });
      // If RPC doesn't exist, we'll try a different way or just assume it's missing if we can't check
      if (!error) {
        columnChecks['bot_sessions.auth_state'] = !!data;
      }
    }

    const missingTables = Object.entries(results)
      .filter(([_, exists]) => !exists)
      .map(([table]) => table);

    return NextResponse.json({
      success: true,
      data: {
        tables: results,
        columnChecks,
        missingTables,
        allFound: missingTables.length === 0 && (!results['bot_sessions'] || columnChecks['bot_sessions.auth_state'] !== false),
        schemaSql: SCHEMA_SQL
      }
    });
  } catch (error) {
    console.error('Database setup check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}