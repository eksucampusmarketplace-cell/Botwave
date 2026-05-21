import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCachedFeatures, cacheFeatures, invalidateFeatures } from '@/lib/redisApiCache';

export const dynamic = 'force-dynamic';

const updateFeatureSchema = z.object({
  sessionId: z.string().uuid(),
  featureName: z.string().min(1),
  enabled: z.boolean(),
  config: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    const cached = await getCachedFeatures(user.id, sessionId || undefined);
    if (cached) return NextResponse.json({ success: true, data: cached });

    let query = supabase
      .from('bot_features')
      .select('id, user_id, session_id, feature_name, enabled, config, updated_at')
      .eq('user_id', user.id);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data: features, error } = await query;

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('bot_features table not found, using empty array');
        return NextResponse.json({
          success: true,
          data: [],
        });
      }
      throw error;
    }

    const result = features || [];
    await cacheFeatures(user.id, result, sessionId || undefined);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get features error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = updateFeatureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, featureName, enabled, config } = validation.data;

    const { data: feature, error } = await supabase
      .from('bot_features')
      .upsert(
        {
          user_id: user.id,
          session_id: sessionId,
          feature_name: featureName,
          enabled,
          config: config || {},
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,session_id,feature_name',
        }
      )
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205') {
        return NextResponse.json(
          { 
            error: 'Feature update failed: bot_features table not found',
            message: 'Please run the initial schema migrations in your Supabase SQL Editor.',
            action: 'Visit /admin/dashboard and go to System Health to get the SQL.'
          },
          { status: 503 }
        );
      }
      throw error;
    }

    await invalidateFeatures(user.id);
    return NextResponse.json({
      success: true,
      data: feature,
      message: 'Feature updated successfully',
    });
  } catch (error) {
    console.error('Update feature error:', error);
    return NextResponse.json(
      { error: 'Failed to update feature' },
      { status: 500 }
    );
  }
}
