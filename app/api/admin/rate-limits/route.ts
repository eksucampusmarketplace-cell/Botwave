import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { applyRateLimiterConfig } from '@/lib/utils';
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
    const { data, error } = await supabase
      .from('rate_limit_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching rate limit settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin token
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Settings must be an array' }, { status: 400 });
    }

    const supabase = await createAdminClient();

    for (const setting of settings) {
      // Validate setting fields with proper type coercion
      const windowMs = Number(setting.window_ms) || 60000;
      const maxRequests = Number(setting.max_requests) || 100;
      const enabled = Boolean(setting.enabled);
      
      // Only update if setting_key is present
      if (!setting.setting_key) {
        continue;
      }

      const { error } = await supabase
        .from('rate_limit_settings')
        .update({
          window_ms: windowMs,
          max_requests: maxRequests,
          enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', setting.setting_key);

      if (error) {
        console.error(`Error updating ${setting.setting_key}:`, error);
      }
    }

    const { data } = await supabase
      .from('rate_limit_settings')
      .select('*')
      .order('setting_key');

    applyRateLimiterConfig(data || []);

    return NextResponse.json({
      success: true,
      message: 'Rate limit settings updated',
      data,
    });
  } catch (error) {
    console.error('Error updating rate limit settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}