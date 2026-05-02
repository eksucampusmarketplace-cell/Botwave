import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRateLimiterConfig } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    if (adminToken?.value !== 'botwave_admin_secret_token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('rate_limit_settings')
      .select('*')
      .order('setting_key');

    if (error) {
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
    const adminToken = request.cookies.get('admin_token');
    if (adminToken?.value !== 'botwave_admin_secret_token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'Settings must be an array' }, { status: 400 });
    }

    const supabase = await createClient();

    for (const setting of settings) {
      const { error } = await supabase
        .from('rate_limit_settings')
        .update({
          window_ms: setting.window_ms,
          max_requests: setting.max_requests,
          enabled: setting.enabled,
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
