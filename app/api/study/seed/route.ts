import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import {
  invalidateStudyMaterials,
  invalidateStudyTopics,
} from '@/lib/redisApiCache';

import { introEndocrinologyMaterial } from '@/lib/study/seed/intro-endocrinology';
import { hypothalamoPituitaryMaterial } from '@/lib/study/seed/hypothalamo-pituitary';
import { growthHormoneMaterial } from '@/lib/study/seed/growth-hormone';
import { finalBlockMaterial } from '@/lib/study/seed/final-block';
import { physiologyTextbookMaterial } from '@/lib/study/seed/physiology-textbook';

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

interface SeedMaterial {
  title: string;
  fileType: string;
  wordCount: number;
  status: string;
  summary: {
    definitions: { term: string; definition: string }[];
    keyPoints: string[];
    examHighlights: string[];
    clinicalCorrelations: string[];
    processes: { name: string; steps: string[] }[];
    mnemonics: { topic: string; mnemonic: string; explanation: string }[];
    quickReview: string[];
  };
  questions: {
    questionType: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: string;
  }[];
  flashcards: {
    front: string;
    back: string;
    difficulty: string;
  }[];
}

const ALL_SEEDS: SeedMaterial[] = [
  introEndocrinologyMaterial,
  hypothalamoPituitaryMaterial,
  growthHormoneMaterial,
  finalBlockMaterial,
  physiologyTextbookMaterial,
];

// GET — list available seed materials
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const seeds = ALL_SEEDS.map((s) => ({
    title: s.title,
    fileType: s.fileType,
    wordCount: s.wordCount,
    questionCount: s.questions.length,
    flashcardCount: s.flashcards.length,
  }));

  return NextResponse.json({ success: true, data: seeds });
}

// POST — load seed materials into user's study hub
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { titles, force } = body as { titles?: string[]; force?: boolean };

  const supabase = getServiceSupabase();
  const loaded: string[] = [];
  const errors: string[] = [];

  // Determine which seeds to load
  const seedsToLoad = titles
    ? ALL_SEEDS.filter((s) => titles.includes(s.title))
    : ALL_SEEDS;

  // Create or get "Endocrinology" topic
  let topicId: string | null = null;
  const { data: existingTopics } = await supabase
    .from('study_topics')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', 'Endocrinology')
    .limit(1);

  if (existingTopics && existingTopics.length > 0) {
    topicId = existingTopics[0].id;
  } else {
    const { data: newTopic, error: topicErr } = await supabase
      .from('study_topics')
      .insert({ user_id: user.id, name: 'Endocrinology', description: 'Endocrine system physiology — 300 Level MBBS' })
      .select('id')
      .single();
    if (topicErr) {
      return NextResponse.json({ error: `Failed to create topic: ${topicErr.message}` }, { status: 500 });
    }
    topicId = newTopic.id;
  }

  for (const seed of seedsToLoad) {
    try {
      // Check if already loaded
      const { data: existing } = await supabase
        .from('study_materials')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', seed.title)
        .limit(1);

      if (existing && existing.length > 0) {
        if (force) {
          // Force reload: delete old data and re-insert
          const oldId = existing[0].id;
          await supabase.from('study_summaries').delete().eq('material_id', oldId);
          await supabase.from('study_questions').delete().eq('material_id', oldId);
          await supabase.from('study_flashcards').delete().eq('material_id', oldId);
          await supabase.from('study_materials').delete().eq('id', oldId);
        } else {
          loaded.push(`${seed.title} (already exists)`);
          continue;
        }
      }

      // Build a text representation for the required `content` column
      const contentParts: string[] = [
        seed.title,
        '',
        ...seed.summary.keyPoints,
        '',
        ...seed.summary.examHighlights,
        '',
        ...seed.summary.clinicalCorrelations,
        '',
        ...seed.summary.definitions.map((d) => `${d.term}: ${d.definition}`),
        '',
        ...seed.summary.quickReview,
      ];
      const contentText = contentParts.join('\n');

      // Insert material
      const { data: material, error: matErr } = await supabase
        .from('study_materials')
        .insert({
          user_id: user.id,
          topic_id: topicId,
          title: seed.title,
          file_type: seed.fileType,
          word_count: seed.wordCount,
          status: seed.status,
          content: contentText,
        })
        .select('id')
        .single();

      if (matErr || !material) {
        errors.push(`${seed.title}: ${matErr?.message || 'Insert failed'}`);
        continue;
      }

      const materialId = material.id;

      // Insert summary
      const summaryContent = {
        definitions: seed.summary.definitions,
        keyPoints: seed.summary.keyPoints,
        examHighlights: seed.summary.examHighlights,
        clinicalCorrelations: seed.summary.clinicalCorrelations,
        processes: seed.summary.processes,
        mnemonics: seed.summary.mnemonics,
        quickReview: seed.summary.quickReview,
      };
      await supabase
        .from('study_summaries')
        .insert({ material_id: materialId, user_id: user.id, content: summaryContent });

      // Insert questions
      if (seed.questions.length > 0) {
        const questionRows = seed.questions.map((q) => ({
          material_id: materialId,
          question_type: q.questionType,
          question: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
        }));
        // Insert in batches of 50
        for (let i = 0; i < questionRows.length; i += 50) {
          await supabase
            .from('study_questions')
            .insert(questionRows.slice(i, i + 50));
        }
      }

      // Insert flashcards
      if (seed.flashcards.length > 0) {
        const flashcardRows = seed.flashcards.map((fc) => ({
          material_id: materialId,
          front: fc.front,
          back: fc.back,
          difficulty: fc.difficulty,
        }));
        await supabase
          .from('study_flashcards')
          .insert(flashcardRows);
      }

      loaded.push(seed.title);
    } catch (err: unknown) {
      errors.push(`${seed.title}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  // Invalidate caches
  await invalidateStudyMaterials(user.id);
  await invalidateStudyTopics(user.id);

  return NextResponse.json({
    success: true,
    data: {
      loaded,
      errors,
      totalMaterials: loaded.length,
      totalQuestions: seedsToLoad.reduce((sum, s) => sum + s.questions.length, 0),
      totalFlashcards: seedsToLoad.reduce((sum, s) => sum + s.flashcards.length, 0),
    },
  });
}
