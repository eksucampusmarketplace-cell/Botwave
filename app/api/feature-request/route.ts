import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { processFeatureRequest } from '@/lib/feature-requests';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, platform, userIdentifier } = body;

    if (!description || typeof description !== 'string' || description.trim().length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters.' },
        { status: 400 },
      );
    }

    if (description.length > 2000) {
      return NextResponse.json(
        { error: 'Description too long (max 2000 characters).' },
        { status: 400 },
      );
    }

    const validPlatform = ['telegram', 'whatsapp', 'web'].includes(platform) ? platform : 'web';
    const identifier = userIdentifier || 'anonymous';

    const supabase = await createAdminClient();

    // Insert the feature request
    const { data: inserted, error: insertError } = await supabase
      .from('feature_requests')
      .insert({
        user_identifier: identifier,
        platform: validPlatform,
        description: description.trim(),
        status: 'processing',
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === 'PGRST205' || insertError.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Feature requests not yet enabled. Run migration 047.' },
          { status: 503 },
        );
      }
      throw insertError;
    }

    // Process with AI in the background (don't block the response)
    const requestId = inserted.id;
    processFeatureRequest(description.trim()).then(async (aiResponse) => {
      const newStatus = aiResponse ? 'completed' : 'failed';
      await supabase
        .from('feature_requests')
        .update({
          ai_response: aiResponse,
          status: newStatus,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);
    }).catch((err) => {
      console.error('[FeatureReq] Background processing failed:', err);
    });

    return NextResponse.json({
      success: true,
      id: requestId,
      message: 'Feature request submitted! Our AI is analyzing it now.',
    });
  } catch (error) {
    console.error('[FeatureReq] Submit error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feature request' },
      { status: 500 },
    );
  }
}
