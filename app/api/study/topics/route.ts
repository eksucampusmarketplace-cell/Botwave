import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  getCachedStudyTopics,
  cacheStudyTopics,
  invalidateStudyTopics,
} from '@/lib/redisApiCache';

const supabaseUrl = process.env.SUPABASE_INTERNAL_URL || (process.env.SUPABASE_INTERNAL_URL || process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — list user's topics (Redis first, Supabase fallback)
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Try Redis cache first
  const cached = await getCachedStudyTopics(user.id);
  if (cached) return NextResponse.json({ success: true, data: cached });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('study_topics')
    .select('*, study_materials(count)')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cache in Redis for next time
  if (data) await cacheStudyTopics(user.id, data);

  return NextResponse.json({ success: true, data });
}

// POST — create a new topic
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, description, icon, color } = body;

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('study_topics')
    .insert({ user_id: user.id, name, description, icon, color })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Invalidate cached topics
  await invalidateStudyTopics(user.id);

  return NextResponse.json({ success: true, data });
}

// DELETE — remove a topic
export async function DELETE(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Topic ID required' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from('study_topics')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Invalidate cached topics
  await invalidateStudyTopics(user.id);

  return NextResponse.json({ success: true });
}
