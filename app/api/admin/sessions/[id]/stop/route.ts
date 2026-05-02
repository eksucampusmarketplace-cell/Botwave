import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';

// UUID format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin token
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Validate UUID format to prevent arbitrary strings being passed to Supabase
    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const supabase = await createAdminClient();

    // Update session state in DB
    const { error } = await supabase
      .from('bot_sessions')
      .update({ state: 'inactive' })
      .eq('id', id);

    if (error) {
      console.error('Error stopping session:', error);
      return NextResponse.json({ error: 'Failed to stop session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Session ${id} terminated`
    });
  } catch (error) {
    console.error('Admin stop session error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}