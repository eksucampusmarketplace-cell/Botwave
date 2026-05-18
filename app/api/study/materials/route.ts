import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { extractTextFromFile } from '@/lib/study/extractors';
import {
  getCachedStudyMaterials,
  cacheStudyMaterials,
  invalidateStudyMaterials,
  invalidateStudyContent,
} from '@/lib/redisApiCache';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET - list user's materials (Redis first, Supabase fallback)
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topic_id') || undefined;

  // Try Redis cache first
  const cached = await getCachedStudyMaterials(user.id, topicId);
  if (cached) return NextResponse.json({ success: true, data: cached });

  const supabase = getServiceSupabase();
  let query = supabase
    .from('study_materials')
    .select('id, title, file_type, original_filename, word_count, status, topic_id, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (topicId) query = query.eq('topic_id', topicId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cache in Redis
  if (data) await cacheStudyMaterials(user.id, data, topicId);

  return NextResponse.json({ success: true, data });
}

// POST - upload and extract a file
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '';
    const topicId = (formData.get('topic_id') as string) || null;
    const pastedText = (formData.get('text') as string) || '';

    let content = '';
    let fileType = 'text';
    let originalFilename = '';

    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      originalFilename = file.name;

      if (buffer.length > 20 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
      }

      const extracted = await extractTextFromFile(buffer, file.name);
      content = extracted.text;
      fileType = extracted.fileType;
    } else if (pastedText) {
      content = pastedText;
      fileType = 'text';
    } else {
      return NextResponse.json({ error: 'No file or text provided' }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file. Try a different format.' }, { status: 400 });
    }

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const materialTitle = title || originalFilename || 'Untitled Material';

    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('study_materials')
      .insert({
        user_id: user.id,
        topic_id: topicId,
        title: materialTitle,
        file_type: fileType,
        original_filename: originalFilename || null,
        content,
        word_count: wordCount,
        status: 'uploaded',
      })
      .select('id, title, file_type, original_filename, word_count, status, topic_id, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Invalidate materials cache so new material shows up
    await invalidateStudyMaterials(user.id);

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    console.error('[STUDY-UPLOAD]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - remove a material
export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Material ID required' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('study_materials')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Invalidate both material list and content caches
  await invalidateStudyMaterials(user.id);
  await invalidateStudyContent(id);

  return NextResponse.json({ success: true });
}
