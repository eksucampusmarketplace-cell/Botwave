import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPlanLimits } from '@/lib/planGating';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUser(request: NextRequest) {
  const { createServerClient } = await import('@supabase/ssr');
  const authClient = createServerClient(
    (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return request.cookies.get(name)?.value; }, set() {}, remove() {} } },
  );
  const { data: { user } } = await authClient.auth.getUser();
  return user;
}

// GET: Check QR alert status and session connection status
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const limits = getPlanLimits(sub?.plan || 'free');

    // Get user's sessions and their connection status
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name, status, updated_at')
      .eq('user_id', user.id);

    const disconnected = (sessions || []).filter(
      (s: Record<string, string>) => s.status === 'disconnected' || s.status === 'close'
    );

    // Get alert preferences
    const { data: prefs } = await supabase
      .from('qr_alert_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions || [],
        disconnected,
        alertsEnabled: !!prefs?.enabled,
        emailAlerts: limits.hasQrAlertEmail,
        whatsappAlerts: limits.hasQrAlertWhatsApp,
        preferences: prefs || { enabled: false, email: true, whatsapp: false, backup_number: '' },
      },
    });
  } catch (err) {
    console.error('[QR-ALERTS] GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Update alert preferences
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json() as {
      enabled?: boolean;
      email?: boolean;
      whatsapp?: boolean;
      backup_number?: string;
    };

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const limits = getPlanLimits(sub?.plan || 'free');

    if (body.email && !limits.hasQrAlertEmail) {
      return NextResponse.json({ error: 'Email alerts require Lite plan or above' }, { status: 403 });
    }
    if (body.whatsapp && !limits.hasQrAlertWhatsApp) {
      return NextResponse.json({ error: 'WhatsApp alerts require Standard plan or above' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('qr_alert_preferences')
      .upsert({
        user_id: user.id,
        enabled: body.enabled ?? true,
        email: body.email ?? true,
        whatsapp: body.whatsapp ?? false,
        backup_number: body.backup_number || '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('[QR-ALERTS] Upsert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[QR-ALERTS] Preferences updated: user=${user.id} enabled=${body.enabled}`);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[QR-ALERTS] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
