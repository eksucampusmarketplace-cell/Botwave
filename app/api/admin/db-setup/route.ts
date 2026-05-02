import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { REQUIRED_TABLES, SCHEMA_SQL } from '@/lib/db-setup';
import { verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();
    const results: Record<string, boolean> = {};

    for (const table of REQUIRED_TABLES) {
      const { error } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(1);
      
      // PGRST205 is "table not found"
      if (error && error.code === 'PGRST205') {
        results[table] = false;
      } else {
        results[table] = true;
      }
    }

    const missingTables = Object.entries(results)
      .filter(([_, exists]) => !exists)
      .map(([table]) => table);

    return NextResponse.json({
      success: true,
      data: {
        tables: results,
        missingTables,
        allFound: missingTables.length === 0,
        schemaSql: SCHEMA_SQL
      }
    });
  } catch (error) {
    console.error('Database setup check error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}