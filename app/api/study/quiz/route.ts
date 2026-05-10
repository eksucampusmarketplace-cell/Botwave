import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  getCachedStudyQuestions,
  cacheStudyQuestions,
} from '@/lib/redisApiCache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET — fetch questions for quiz mode (Redis first, Supabase fallback)
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const materialId = searchParams.get('material_id');
  const topicId = searchParams.get('topic_id');
  const difficulty = searchParams.get('difficulty');
  const limit = parseInt(searchParams.get('limit') || '15', 10);

  // Try Redis cache for material-specific questions
  if (materialId && !difficulty) {
    const cached = await getCachedStudyQuestions(materialId);
    if (cached) {
      const shuffled = (cached as Record<string, unknown>[]).sort(() => Math.random() - 0.5).slice(0, limit);
      return NextResponse.json({ success: true, data: shuffled });
    }
  }

  const supabase = getServiceSupabase();
  let query = supabase
    .from('study_questions')
    .select('*')
    .eq('user_id', user.id);

  if (materialId) query = query.eq('material_id', materialId);
  if (topicId) {
    const { data: materials } = await supabase
      .from('study_materials')
      .select('id')
      .eq('topic_id', topicId)
      .eq('user_id', user.id);

    if (materials && materials.length > 0) {
      const materialIds = materials.map((m) => m.id);
      query = query.in('material_id', materialIds);
    }
  }
  if (difficulty) query = query.eq('difficulty', difficulty);

  const { data, error } = await query.limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cache in Redis for material-specific queries
  if (materialId && data && data.length > 0 && !difficulty) {
    await cacheStudyQuestions(materialId, data);
  }

  const shuffled = (data || []).sort(() => Math.random() - 0.5);
  return NextResponse.json({ success: true, data: shuffled });
}

// POST — submit quiz answers and get scored
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { materialId, topicId, answers, timeSpent } = body;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'Answers are required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const questionIds = answers.map((a: { questionId: string }) => a.questionId);
  const { data: questions, error: qErr } = await supabase
    .from('study_questions')
    .select('id, correct_answer, explanation, question')
    .in('id', questionIds);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const questionMap = new Map((questions || []).map((q) => [q.id, q]));

  let correct = 0;
  let wrong = 0;
  const detailedAnswers = answers.map((a: { questionId: string; answer: string }) => {
    const q = questionMap.get(a.questionId);
    const isCorrect = q && a.answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
    if (isCorrect) correct++;
    else wrong++;
    return {
      questionId: a.questionId,
      question: q?.question || '',
      userAnswer: a.answer,
      correctAnswer: q?.correct_answer || '',
      explanation: q?.explanation || '',
      isCorrect: !!isCorrect,
    };
  });

  const total = answers.length;
  const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;

  const { data: attempt, error: saveErr } = await supabase
    .from('study_quiz_attempts')
    .insert({
      user_id: user.id,
      material_id: materialId || null,
      topic_id: topicId || null,
      total_questions: total,
      correct_answers: correct,
      wrong_answers: wrong,
      score_percent: scorePercent,
      time_spent_seconds: timeSpent || 0,
      answers: detailedAnswers,
    })
    .select()
    .single();

  if (saveErr) {
    console.error('[STUDY-QUIZ] Save error:', saveErr);
  }

  if (materialId) {
    const masteryLevel = scorePercent >= 90 ? 5 : scorePercent >= 70 ? 4 : scorePercent >= 50 ? 3 : scorePercent >= 30 ? 2 : 1;
    await supabase
      .from('study_progress')
      .upsert(
        {
          user_id: user.id,
          material_id: materialId,
          status: scorePercent >= 70 ? 'mastered' : 'in_progress',
          mastery_level: masteryLevel,
          last_studied_at: new Date().toISOString(),
          times_reviewed: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,material_id' },
      );
  }

  return NextResponse.json({
    success: true,
    data: {
      attemptId: attempt?.id,
      total,
      correct,
      wrong,
      scorePercent,
      answers: detailedAnswers,
    },
  });
}
