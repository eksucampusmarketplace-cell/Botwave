import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);

    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('feature_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          data: [],
          total: 0,
          message: 'feature_requests table not found. Run migration 047.',
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('[Admin] Feature requests fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature requests' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);

    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, action } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Missing id or action' },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();

    if (action === 'reprocess') {
      const { processFeatureRequest } = await import('@/lib/feature-requests');

      const { data: req } = await supabase
        .from('feature_requests')
        .select('description')
        .eq('id', id)
        .single();

      if (!req) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      await supabase
        .from('feature_requests')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', id);

      const aiResponse = await processFeatureRequest(req.description);
      const newStatus = aiResponse ? 'completed' : 'failed';

      await supabase
        .from('feature_requests')
        .update({
          ai_response: aiResponse,
          status: newStatus,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({ success: true, status: newStatus });
    }

    if (action === 'delete') {
      await supabase.from('feature_requests').delete().eq('id', id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Admin] Feature request action error:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 },
    );
  }
}
