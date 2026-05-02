import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminToken = request.cookies.get('admin_token');
    if (adminToken?.value !== 'botwave_admin_secret_token') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const supabase = await createClient();

    // Update session state in DB
    const { error } = await supabase
      .from('bot_sessions')
      .update({ state: 'inactive' })
      .eq('id', id);

    // In a real app, you would also call the BotManager to stop the actual process
    // For this mock, we just return success

    return NextResponse.json({
      success: true,
      message: `Session ${id} terminated`
    });
  } catch (error) {
    console.error('Admin stop session error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
