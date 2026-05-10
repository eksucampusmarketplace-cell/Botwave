import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface AlertConfig {
  id: string;
  type: string;
  enabled: boolean;
  threshold: number;
  whatsappNotify: boolean;
  notifyJid: string;
  notifySessionId: string;
}

interface AlertEvent {
  id: string;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  resolved: boolean;
}

const alertConfigs: AlertConfig[] = [];
const alertEvents: AlertEvent[] = [];

function getDefaultConfigs(): AlertConfig[] {
  return [
    { id: 'bot-offline', type: 'Bot Offline', enabled: true, threshold: 0, whatsappNotify: false, notifyJid: '', notifySessionId: '' },
    { id: 'high-cpu', type: 'High CPU Usage', enabled: true, threshold: 80, whatsappNotify: false, notifyJid: '', notifySessionId: '' },
    { id: 'high-memory', type: 'High Memory Usage', enabled: true, threshold: 85, whatsappNotify: false, notifyJid: '', notifySessionId: '' },
    { id: 'deploy-failed', type: 'Failed Deployment', enabled: true, threshold: 0, whatsappNotify: false, notifyJid: '', notifySessionId: '' },
    { id: 'suspicious-activity', type: 'Suspicious Activity', enabled: true, threshold: 50, whatsappNotify: false, notifyJid: '', notifySessionId: '' },
    { id: 'session-disconnect', type: 'Session Disconnect', enabled: true, threshold: 0, whatsappNotify: false, notifyJid: '', notifySessionId: '' },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = alertConfigs.length > 0 ? alertConfigs : getDefaultConfigs();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: healthEvents } = await supabase
      .from('bot_health_events')
      .select('*')
      .gte('created_at', since24h)
      .order('created_at', { ascending: false })
      .limit(50);

    const recentAlerts: AlertEvent[] = [
      ...alertEvents.slice(-50),
      ...(healthEvents || []).map((e: any) => ({
        id: e.id,
        type: e.event_type === 'disconnect' ? 'Session Disconnect' : e.event_type,
        message: e.details || `Session ${e.session_id}: ${e.event_type}`,
        severity: (e.event_type === 'disconnect' || e.event_type === 'error' ? 'critical' : 'info') as 'info' | 'warning' | 'critical',
        timestamp: e.created_at,
        resolved: e.event_type === 'reconnect',
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);

    const { data: sessions } = await supabase
      .from('bot_sessions')
      .select('id, session_name, phone_number, state')
      .eq('state', 'active');

    return NextResponse.json({
      success: true,
      data: {
        configs,
        recentAlerts,
        activeSessions: sessions || [],
      },
    });
  } catch (error) {
    console.error('[ALERTS] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { configs: newConfigs } = await request.json();

    if (!Array.isArray(newConfigs)) {
      return NextResponse.json({ error: 'Invalid config format' }, { status: 400 });
    }

    alertConfigs.length = 0;
    alertConfigs.push(...newConfigs);

    return NextResponse.json({ success: true, message: 'Alert configs updated' });
  } catch (error) {
    console.error('[ALERTS] PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
