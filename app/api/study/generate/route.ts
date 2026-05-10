import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { buildSummaryPrompt, buildQuestionsPrompt, buildFlashcardsPrompt } from '@/lib/study/prompts';
import {
  cacheStudySummary,
  cacheStudyQuestions,
  cacheStudyFlashcards,
  invalidateStudyMaterials,
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

async function getGroqKey(userId: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from('user_settings')
    .select('groq_api_key')
    .eq('user_id', userId)
    .single();
  return data?.groq_api_key || process.env.GROQ_API_KEY || null;
}

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function parseJsonFromResponse(text: string): unknown {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/) || text.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }
  return JSON.parse(text.trim());
}

// POST — generate summary, questions, or flashcards for a material
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { materialId, type = 'all' } = body;

  if (!materialId) {
    return NextResponse.json({ error: 'materialId is required' }, { status: 400 });
  }

  const groqKey = await getGroqKey(user.id);
  if (!groqKey) {
    return NextResponse.json(
      { error: 'Groq API key not set. Go to Settings and add your free Groq API key.' },
      { status: 400 },
    );
  }

  const supabase = getServiceSupabase();

  const { data: material, error: matErr } = await supabase
    .from('study_materials')
    .select('id, title, content, user_id')
    .eq('id', materialId)
    .eq('user_id', user.id)
    .single();

  if (matErr || !material) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 });
  }

  const results: { summary?: unknown; questions?: unknown; flashcards?: unknown } = {};

  try {
    if (type === 'all' || type === 'summary') {
      const summaryPrompt = buildSummaryPrompt(material.content, material.title);
      const summaryRaw = await callGroq(groqKey, summaryPrompt);
      const summaryData = parseJsonFromResponse(summaryRaw);

      await supabase.from('study_summaries').insert({
        material_id: materialId,
        user_id: user.id,
        summary_type: 'key_points',
        content: summaryData,
      });

      // Cache summary in Redis
      await cacheStudySummary(materialId, summaryData);
      results.summary = summaryData;
    }

    if (type === 'all' || type === 'questions') {
      const questionsPrompt = buildQuestionsPrompt(material.content, material.title);
      const questionsRaw = await callGroq(groqKey, questionsPrompt);
      const questionsData = parseJsonFromResponse(questionsRaw) as Array<{
        type: string;
        question: string;
        options: string[];
        correctAnswer: string;
        explanation: string;
        difficulty: string;
      }>;

      if (Array.isArray(questionsData)) {
        const questionRows = questionsData.map((q) => ({
          material_id: materialId,
          user_id: user.id,
          question_type: q.type || 'mcq',
          question: q.question,
          options: q.options || [],
          correct_answer: q.correctAnswer,
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'medium',
        }));

        await supabase.from('study_questions').insert(questionRows);

        // Cache questions in Redis
        await cacheStudyQuestions(materialId, questionsData);
      }

      results.questions = questionsData;
    }

    if (type === 'all' || type === 'flashcards') {
      const flashcardsPrompt = buildFlashcardsPrompt(material.content, material.title);
      const flashcardsRaw = await callGroq(groqKey, flashcardsPrompt);
      const flashcardsData = parseJsonFromResponse(flashcardsRaw) as Array<{
        front: string;
        back: string;
        difficulty: string;
      }>;

      if (Array.isArray(flashcardsData)) {
        const flashcardRows = flashcardsData.map((f) => ({
          material_id: materialId,
          user_id: user.id,
          front: f.front,
          back: f.back,
          difficulty: f.difficulty || 'medium',
        }));

        await supabase.from('study_flashcards').insert(flashcardRows);

        // Cache flashcards in Redis
        await cacheStudyFlashcards(materialId, flashcardsData);
      }

      results.flashcards = flashcardsData;
    }

    // Update material status & invalidate materials list cache
    await supabase
      .from('study_materials')
      .update({ status: 'analyzed', updated_at: new Date().toISOString() })
      .eq('id', materialId);

    await invalidateStudyMaterials(user.id);

    return NextResponse.json({ success: true, data: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    console.error('[STUDY-GENERATE]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
