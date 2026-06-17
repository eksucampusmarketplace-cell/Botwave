import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;
    const field = formData.get('field') as string | null;

    if (!file || !sessionId || !field) {
      return NextResponse.json({ error: 'Missing file, sessionId, or field' }, { status: 400 });
    }

    const allowedFields = ['alive_image', 'pm_permit_image'];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    // Verify session ownership
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: session } = await supabase
      .from('bot_sessions')
      .select('user_id')
      .eq('id', sessionId)
      .single();

    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ error: 'Session not found or unauthorized' }, { status: 403 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' }, { status: 400 });
    }

    // Max 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `userbot/${sessionId}/${field}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      // If bucket doesn't exist, try creating it
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        await supabase.storage.createBucket('uploads', { public: true });
        const { error: retryError } = await supabase.storage
          .from('uploads')
          .upload(path, buffer, {
            contentType: file.type,
            upsert: true,
          });
        if (retryError) {
          return NextResponse.json({ error: `Upload failed: ${retryError.message}` }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Update userbot config with the new image URL
    await supabase
      .from('userbot_config')
      .update({ [field]: publicUrl })
      .eq('session_id', sessionId);

    return NextResponse.json({ url: publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
