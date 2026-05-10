'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardNav from '@/components/layout/DashboardNav';
import { createClient } from '@/lib/supabase/client';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  study_materials: { count: number }[];
}

interface Material {
  id: string;
  title: string;
  file_type: string;
  original_filename: string | null;
  word_count: number;
  status: string;
  topic_id: string | null;
  created_at: string;
}

interface Summary {
  keyPoints: string[];
  examHighlights: string[];
  definitions: { term: string; definition: string }[];
  clinicalCorrelations: string[];
  processes: { name: string; steps: string[] }[];
  mnemonics: { topic: string; mnemonic: string; explanation: string }[];
  quickReview: string[];
}

interface Question {
  id: string;
  question_type: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  difficulty: string;
}

interface QuizResult {
  total: number;
  correct: number;
  wrong: number;
  scorePercent: number;
  answers: {
    questionId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    isCorrect: boolean;
  }[];
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: string;
}

type Tab = 'upload' | 'reading' | 'quiz' | 'flashcards' | 'progress';

// ─── Topic Grouping Helpers ─────────────────────────────────────────────────
// Convention:
// "## TOPIC"     → main topic header (e.g. THYROID GLAND)
// ">> intro"     → brief topic introduction
// "### Subtopic" → sub-section within a topic (e.g. Structure, Synthesis, Actions)
// plain text     → regular bullet point

interface SubSection {
  label: string;
  items: string[];
}

interface TopicSection {
  topic: string | null;
  intro: string | null;
  items: string[];
  subSections: SubSection[];
}

function groupByTopic(items: string[]): TopicSection[] {
  const sections: TopicSection[] = [];
  let current: TopicSection = { topic: null, intro: null, items: [], subSections: [] };
  let currentSub: SubSection | null = null;

  for (const item of items) {
    if (item.startsWith('## ')) {
      if (currentSub) {
        current.subSections.push(currentSub);
        currentSub = null;
      }
      if (current.topic || current.items.length > 0 || current.subSections.length > 0) {
        sections.push(current);
      }
      current = { topic: item.slice(3), intro: null, items: [], subSections: [] };
    } else if (item.startsWith('>> ')) {
      current.intro = item.slice(3);
    } else if (item.startsWith('### ')) {
      if (currentSub) {
        current.subSections.push(currentSub);
      }
      currentSub = { label: item.slice(4), items: [] };
    } else {
      if (currentSub) {
        currentSub.items.push(item);
      } else {
        current.items.push(item);
      }
    }
  }
  if (currentSub) {
    current.subSections.push(currentSub);
  }
  if (current.topic || current.items.length > 0 || current.subSections.length > 0) {
    sections.push(current);
  }
  return sections;
}

function hasTopicMarkers(items: string[]): boolean {
  return items.some((item) => item.startsWith('## '));
}

interface GroupedDefinition {
  topic: string | null;
  intro: string | null;
  definitions: { term: string; definition: string }[];
}

function groupDefinitionsByComment(
  definitions: { term: string; definition: string }[],
  keyPoints: string[],
): GroupedDefinition[] {
  if (!hasTopicMarkers(keyPoints)) return [{ topic: null, intro: null, definitions }];

  const topicSections = groupByTopic(keyPoints);
  const topicNames = topicSections.filter((s) => s.topic).map((s) => s.topic!);
  if (topicNames.length === 0) return [{ topic: null, intro: null, definitions }];

  const groups: GroupedDefinition[] = topicNames.map((t) => ({
    topic: t,
    intro: null,
    definitions: [],
  }));
  const ungrouped: GroupedDefinition = { topic: null, intro: null, definitions: [] };

  for (const d of definitions) {
    let matched = false;
    for (const g of groups) {
      const topicLower = g.topic!.toLowerCase();
      const termLower = `${d.term} ${d.definition}`.toLowerCase();
      if (termLower.includes(topicLower.split(' ')[0]) || topicLower.includes(d.term.toLowerCase().split(' ')[0])) {
        g.definitions.push(d);
        matched = true;
        break;
      }
    }
    if (!matched) ungrouped.definitions.push(d);
  }

  const result = groups.filter((g) => g.definitions.length > 0);
  if (ungrouped.definitions.length > 0) result.push(ungrouped);
  return result;
}

function FormattedBulletText({ text, textColor }: { text: string; textColor: string }) {
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0 && colonIdx < 80) {
    const prefix = text.slice(0, colonIdx);
    const rest = text.slice(colonIdx);
    return (
      <span style={{ color: textColor }}>
        <strong className="text-[var(--text-primary)]">{prefix}</strong>
        {rest}
      </span>
    );
  }
  return <span style={{ color: textColor }}>{text}</span>;
}

function BulletList({ items, bulletColor, bulletChar, textColor }: { items: string[]; bulletColor: string; bulletChar: string; textColor: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => {
        const numberedMatch = item.match(/^(\d+)\)\s/);
        if (numberedMatch) {
          return (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 shrink-0 text-xs font-bold min-w-[1.25rem] text-right" style={{ color: bulletColor }}>{numberedMatch[1]}.</span>
              <FormattedBulletText text={item.replace(/^\d+\)\s/, '')} textColor={textColor} />
            </li>
          );
        }
        return (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span className="mt-1 shrink-0 text-base leading-none" style={{ color: bulletColor }}>{bulletChar}</span>
            <FormattedBulletText text={item} textColor={textColor} />
          </li>
        );
      })}
    </ul>
  );
}

function TopicGroupedList({
  items,
  bulletColor = 'var(--primary)',
  bulletChar = '\u2022',
  textColor = 'var(--text-secondary)',
}: {
  items: string[];
  bulletColor?: string;
  bulletChar?: string;
  textColor?: string;
}) {
  if (!hasTopicMarkers(items)) {
    return <BulletList items={items} bulletColor={bulletColor} bulletChar={bulletChar} textColor={textColor} />;
  }

  const sections = groupByTopic(items);
  return (
    <div className="space-y-8">
      {sections.map((section, si) => (
        <div key={si}>
          {section.topic && (
            <div className="flex items-center gap-2.5 mb-3 pb-2 border-b-2 border-[var(--primary)]/30">
              <div className="w-1.5 h-6 rounded-full bg-[var(--primary)]" />
              <h4 className="text-base font-bold text-[var(--primary)] uppercase tracking-wider">
                {section.topic}
              </h4>
            </div>
          )}
          {section.intro && (
            <p className="text-sm text-[var(--text-muted)] italic mb-4 pl-4 border-l-2 border-[var(--primary)]/20">{section.intro}</p>
          )}
          {section.items.length > 0 && (
            <div className="pl-1 mb-3">
              <BulletList items={section.items} bulletColor={bulletColor} bulletChar={bulletChar} textColor={textColor} />
            </div>
          )}
          {section.subSections.map((sub, subi) => (
            <div key={subi} className="mt-4 ml-2 pl-3 border-l-2 border-[var(--border)]">
              <h5 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
                {sub.label}
              </h5>
              <BulletList items={sub.items} bulletColor={bulletColor} bulletChar={bulletChar} textColor={textColor} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function StudyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadTopicId, setUploadTopicId] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [quizActive, setQuizActive] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(0);
  const [attempts, setAttempts] = useState<{ id: string; score_percent: number; total_questions: number; completed_at: string }[]>([]);
  const [seedLoading, setSeedLoading] = useState(false);

  const fetchTopics = useCallback(async () => {
    try {
      const res = await fetch('/api/study/topics');
      const data = await res.json();
      if (data.success) setTopics(data.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/study/materials');
      const data = await res.json();
      if (data.success) setMaterials(data.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      fetchTopics();
      fetchMaterials();
    };
    init();
  }, [fetchTopics, fetchMaterials]);

  // ─── Upload Handler ──────────────────────────────────────────────────

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadMaterial(file);
  };

  const uploadMaterial = async (file?: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      if (pasteText) formData.append('text', pasteText);
      if (uploadTitle) formData.append('title', uploadTitle);
      if (uploadTopicId) formData.append('topic_id', uploadTopicId);

      const res = await fetch('/api/study/materials', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setSuccess('Material uploaded! Click "Analyze" to generate summaries and questions.');
      setUploadTitle('');
      setPasteText('');
      fetchMaterials();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteUpload = async () => {
    if (!pasteText.trim()) {
      setError('Please paste some text first');
      return;
    }
    await uploadMaterial();
  };

  // ─── Generate (AI Analysis) ──────────────────────────────────────────

  const handleGenerate = async (materialId: string, type: string = 'all') => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/study/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, type }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Generation failed');

      if (data.data.summary) setSummary(data.data.summary as Summary);
      if (data.data.questions) setQuestions(data.data.questions);
      if (data.data.flashcards) setFlashcards(data.data.flashcards);

      setSuccess('Analysis complete! Check Reading, Quiz, and Flashcards tabs.');
      fetchMaterials();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Load existing data for a material ───────────────────────────────

  const loadMaterialData = async (material: Material) => {
    setSelectedMaterial(material);
    setError(null);
    const supabase = createClient();

    // Load summary
    const { data: summaries } = await supabase
      .from('study_summaries')
      .select('content')
      .eq('material_id', material.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (summaries && summaries.length > 0) {
      setSummary(summaries[0].content as unknown as Summary);
    } else {
      setSummary(null);
    }

    // Load questions
    const { data: qs } = await supabase
      .from('study_questions')
      .select('*')
      .eq('material_id', material.id);
    setQuestions(qs || []);

    // Load flashcards
    const { data: fcs } = await supabase
      .from('study_flashcards')
      .select('*')
      .eq('material_id', material.id);
    setFlashcards(fcs || []);

    // Load quiz attempts
    const { data: att } = await supabase
      .from('study_quiz_attempts')
      .select('id, score_percent, total_questions, completed_at')
      .eq('material_id', material.id)
      .order('completed_at', { ascending: false })
      .limit(10);
    setAttempts(att || []);
  };

  // ─── Quiz Logic ──────────────────────────────────────────────────────

  const startQuiz = () => {
    setQuizActive(true);
    setQuizResult(null);
    setQuizAnswers({});
    setQuizStartTime(Date.now());
  };

  const submitQuiz = async () => {
    if (!selectedMaterial) return;
    setLoading(true);
    const timeSpent = Math.round((Date.now() - quizStartTime) / 1000);
    const answerArray = Object.entries(quizAnswers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    try {
      const res = await fetch('/api/study/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId: selectedMaterial.id,
          answers: answerArray,
          timeSpent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQuizResult(data.data);
        setQuizActive(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Quiz submission failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Topic Creation ──────────────────────────────────────────────────

  const createTopic = async () => {
    if (!newTopicName.trim()) return;
    try {
      const res = await fetch('/api/study/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTopicName }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTopicName('');
        setShowNewTopic(false);
        fetchTopics();
      }
    } catch { /* ignore */ }
  };

  // ─── Load Pre-built Seed Materials ──────────────────────────────────

  const loadSeedMaterials = async () => {
    setSeedLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/study/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load seed materials');
      setSuccess(`Loaded ${data.data.totalMaterials} materials with ${data.data.totalQuestions} questions and ${data.data.totalFlashcards} flashcards!`);
      fetchMaterials();
      fetchTopics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load seed materials');
    } finally {
      setSeedLoading(false);
    }
  };

  // ─── Delete Material ──────────────────────────────────────────────────

  const deleteMaterial = async (id: string) => {
    try {
      await fetch(`/api/study/materials?id=${id}`, { method: 'DELETE' });
      if (selectedMaterial?.id === id) setSelectedMaterial(null);
      fetchMaterials();
    } catch { /* ignore */ }
  };

  // ─── Tab Definitions ─────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'upload', label: 'Upload', icon: '\u{1F4E4}' },
    { id: 'reading', label: 'Reading', icon: '\u{1F4D6}' },
    { id: 'quiz', label: 'Quiz', icon: '\u{1F9E0}' },
    { id: 'flashcards', label: 'Flashcards', icon: '\u{1F0CF}' },
    { id: 'progress', label: 'Progress', icon: '\u{1F4CA}' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <DashboardNav />
      <div className="pt-20 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Study <span className="text-[var(--primary)]">Hub</span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Upload materials, get AI-powered summaries, take quizzes, and track your progress
          </p>
        </motion.div>

        {/* Alerts */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-100">&times;</button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm"
            >
              {success}
              <button onClick={() => setSuccess(null)} className="ml-2 text-emerald-300 hover:text-emerald-100">&times;</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--primary)] text-white shadow-lg'
                  : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-light)] border border-[var(--border)]'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Material Sidebar + Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Materials List (sidebar) */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Materials</h3>
                <span className="text-xs text-[var(--text-muted)]">{materials.length}</span>
              </div>

              {/* Topic filter */}
              <select
                value={uploadTopicId}
                onChange={(e) => setUploadTopicId(e.target.value)}
                className="w-full mb-3 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
              >
                <option value="">All Topics</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                ))}
              </select>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {materials.filter((m) => !uploadTopicId || m.topic_id === uploadTopicId).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => loadMaterialData(m)}
                    className={`w-full text-left p-3 rounded-xl transition-all text-sm ${
                      selectedMaterial?.id === m.id
                        ? 'bg-[var(--primary)]/15 border border-[var(--primary)]/30'
                        : 'bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--primary)]/30'
                    }`}
                  >
                    <div className="font-medium text-[var(--text-primary)] truncate">{m.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                      <span className="uppercase">{m.file_type}</span>
                      <span>{m.word_count.toLocaleString()} words</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        m.status === 'analyzed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  </button>
                ))}
                {materials.length === 0 && (
                  <p className="text-center text-[var(--text-muted)] text-sm py-4">No materials yet. Upload one!</p>
                )}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* ─── UPLOAD TAB ──────────────────────────────────────── */}
            {activeTab === 'upload' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* File Upload */}
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Upload Study Material</h2>

                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full mb-3 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm"
                  />

                  {/* Topic selector */}
                  <div className="flex gap-2 mb-4">
                    <select
                      value={uploadTopicId}
                      onChange={(e) => setUploadTopicId(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
                    >
                      <option value="">No Topic</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewTopic(!showNewTopic)}
                      className="px-4 py-2 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-medium hover:bg-[var(--primary)]/20"
                    >
                      + Topic
                    </button>
                  </div>

                  {showNewTopic && (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        placeholder="New topic name (e.g. Endocrinology)"
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
                      />
                      <button onClick={createTopic} className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium">
                        Create
                      </button>
                    </div>
                  )}

                  {/* Drop zone */}
                  <label className="block border-2 border-dashed border-[var(--border)] rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--primary)]/50 transition-colors">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.ppt,.pptx,.txt,.md"
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                    <div className="text-4xl mb-2">{loading ? '\u23f3' : '\u{1F4C1}'}</div>
                    <p className="text-[var(--text-primary)] font-medium">
                      {loading ? 'Uploading...' : 'Drop a file or click to browse'}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      PDF, DOCX, PPT, TXT (max 20MB)
                    </p>
                  </label>

                  {/* Paste text */}
                  <div className="mt-4">
                    <p className="text-sm text-[var(--text-secondary)] mb-2">Or paste text directly:</p>
                    <textarea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Paste your notes, lecture content, or study material here..."
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none"
                    />
                    <button
                      onClick={handlePasteUpload}
                      disabled={loading || !pasteText.trim()}
                      className="mt-2 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
                    >
                      Upload Text
                    </button>
                  </div>
                </div>

                {/* Pre-built Study Materials */}
                <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Pre-built Study Materials</h2>
                  <p className="text-xs text-[var(--text-muted)] mb-4">
                    Load comprehensive endocrinology study materials with 300+ quiz questions, flashcards, summaries, mnemonics, and clinical correlations — ready to study instantly.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Introduction to Endocrinology</p>
                      <p className="text-xs text-[var(--text-muted)]">87 questions &middot; 20 flashcards</p>
                    </div>
                    <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Hypothalamo-Pituitary Connection</p>
                      <p className="text-xs text-[var(--text-muted)]">68 questions &middot; 21 flashcards</p>
                    </div>
                    <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Growth Hormone</p>
                      <p className="text-xs text-[var(--text-muted)]">61 questions &middot; 21 flashcards</p>
                    </div>
                    <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Final Block — 8 Topics</p>
                      <p className="text-xs text-[var(--text-muted)]">108 questions &middot; 20 flashcards</p>
                    </div>
                    <div className="p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                      <p className="text-sm font-medium text-[var(--text-primary)]">Physiology Textbook — Endocrinology</p>
                      <p className="text-xs text-[var(--text-muted)]">55 questions &middot; 12 flashcards</p>
                    </div>
                  </div>
                  <button
                    onClick={loadSeedMaterials}
                    disabled={seedLoading}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-purple-600 text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {seedLoading ? 'Loading materials...' : 'Load All Pre-built Materials (379 Questions)'}
                  </button>
                </div>

                {/* Analyze button for selected material */}
                {selectedMaterial && selectedMaterial.status !== 'analyzed' && (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
                      Analyze: {selectedMaterial.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mb-3">
                      AI will generate summaries, quiz questions, and flashcards from this material.
                    </p>
                    <button
                      onClick={() => handleGenerate(selectedMaterial.id)}
                      disabled={generating}
                      className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
                    >
                      {generating ? 'Analyzing... (may take 30-60s)' : 'Analyze with AI'}
                    </button>
                  </div>
                )}

                {/* Materials list with actions */}
                {materials.length > 0 && (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Your Materials</h3>
                    <div className="space-y-2">
                      {materials.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{m.title}</p>
                            <p className="text-xs text-[var(--text-muted)]">{m.word_count.toLocaleString()} words &middot; {m.file_type}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            {m.status !== 'analyzed' && (
                              <button
                                onClick={() => handleGenerate(m.id)}
                                disabled={generating}
                                className="px-3 py-1.5 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20"
                              >
                                Analyze
                              </button>
                            )}
                            <button
                              onClick={() => loadMaterialData(m)}
                              className="px-3 py-1.5 rounded-lg bg-[var(--surface-light)] text-[var(--text-secondary)] text-xs hover:text-[var(--text-primary)]"
                            >
                              View
                            </button>
                            <button
                              onClick={() => deleteMaterial(m.id)}
                              className="px-2 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 text-xs"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── READING TAB ──────────────────────────────────────── */}
            {activeTab === 'reading' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {!selectedMaterial ? (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
                    <p className="text-4xl mb-3">{'\u{1F4D6}'}</p>
                    <p className="text-[var(--text-secondary)]">Select a material from the sidebar to view its summary</p>
                  </div>
                ) : !summary ? (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
                    <p className="text-4xl mb-3">{'\u{1F916}'}</p>
                    <p className="text-[var(--text-secondary)] mb-4">This material hasn&apos;t been analyzed yet</p>
                    <button
                      onClick={() => handleGenerate(selectedMaterial.id)}
                      disabled={generating}
                      className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
                    >
                      {generating ? 'Analyzing...' : 'Analyze Now'}
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedMaterial.title}</h2>

                    {/* Quick Review */}
                    {summary.quickReview?.length > 0 && (
                      <div className="bg-gradient-to-r from-[var(--primary)]/10 to-[var(--accent)]/10 rounded-2xl border border-[var(--primary)]/20 p-6">
                        <h3 className="text-sm font-bold text-[var(--primary)] uppercase tracking-wider mb-3">Quick Review</h3>
                        <ul className="space-y-2.5">
                          {summary.quickReview.map((point, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm">
                              <span className="text-[var(--primary)] mt-0.5 shrink-0">&bull;</span>
                              <FormattedBulletText text={point} textColor="var(--text-primary)" />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key Points */}
                    {summary.keyPoints?.length > 0 && (
                      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">{'\u{1F4CC}'} Key Points</h3>
                        <TopicGroupedList items={summary.keyPoints} bulletColor="var(--primary)" textColor="var(--text-secondary)" />
                      </div>
                    )}

                    {/* Exam Highlights */}
                    {summary.examHighlights?.length > 0 && (
                      <div className="bg-yellow-500/5 rounded-2xl border border-yellow-500/20 p-6">
                        <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider mb-3">{'\u2B50'} Exam Highlights</h3>
                        <TopicGroupedList items={summary.examHighlights} bulletColor="#facc15" bulletChar={'\u2605'} textColor="var(--text-primary)" />
                      </div>
                    )}

                    {/* Definitions */}
                    {summary.definitions?.length > 0 && (() => {
                      const hasHeaders = summary.definitions.some((d) => d.term.startsWith('## '));
                      if (!hasHeaders) {
                        return (
                          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">{'\u{1F4D6}'} Definitions</h3>
                            <div className="space-y-3">
                              {summary.definitions.map((d, i) => (
                                <div key={i} className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                                  <span className="font-semibold text-[var(--primary)] text-sm">{d.term}</span>
                                  <p className="text-sm text-[var(--text-secondary)] mt-1">{d.definition}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      const defGroups: { topic: string | null; intro: string | null; defs: { term: string; definition: string }[] }[] = [];
                      let currentGroup: { topic: string | null; intro: string | null; defs: { term: string; definition: string }[] } = { topic: null, intro: null, defs: [] };
                      for (const d of summary.definitions) {
                        if (d.term.startsWith('## ')) {
                          if (currentGroup.topic || currentGroup.defs.length > 0) defGroups.push(currentGroup);
                          currentGroup = { topic: d.term.slice(3), intro: d.definition || null, defs: [] };
                        } else {
                          currentGroup.defs.push(d);
                        }
                      }
                      if (currentGroup.topic || currentGroup.defs.length > 0) defGroups.push(currentGroup);

                      return (
                        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">{'\u{1F4D6}'} Definitions</h3>
                          <div className="space-y-5">
                            {defGroups.map((group, gi) => (
                              <div key={gi}>
                                {group.topic && (
                                  <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-[var(--primary)]/30">
                                    <div className="w-1.5 h-5 rounded-full bg-[var(--primary)]" />
                                    <h4 className="text-sm font-bold text-[var(--primary)] uppercase tracking-wider">
                                      {group.topic}
                                    </h4>
                                  </div>
                                )}
                                {group.intro && (
                                  <p className="text-sm text-[var(--text-muted)] italic mb-3 pl-4 border-l-2 border-[var(--border)]">{group.intro}</p>
                                )}
                                <div className="space-y-3">
                                  {group.defs.map((d, i) => (
                                    <div key={i} className="bg-[var(--bg)] rounded-xl p-4 border border-[var(--border)]">
                                      <span className="font-semibold text-[var(--primary)] text-sm">{d.term}</span>
                                      <p className="text-sm text-[var(--text-secondary)] mt-1">{d.definition}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Clinical Correlations */}
                    {summary.clinicalCorrelations?.length > 0 && (
                      <div className="bg-blue-500/5 rounded-2xl border border-blue-500/20 p-6">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">{'\u{1FA7A}'} Clinical Correlations</h3>
                        <TopicGroupedList items={summary.clinicalCorrelations} bulletColor="#60a5fa" textColor="var(--text-secondary)" />
                      </div>
                    )}

                    {/* Processes */}
                    {summary.processes?.length > 0 && (
                      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">{'\u{1F504}'} Processes & Pathways</h3>
                        <div className="space-y-4">
                          {summary.processes.map((p, i) => (
                            <div key={i}>
                              <h4 className="font-semibold text-[var(--primary)] text-sm mb-2">{p.name}</h4>
                              <ol className="space-y-1 pl-4">
                                {p.steps.map((step, j) => (
                                  <li key={j} className="text-sm text-[var(--text-secondary)] list-decimal">{step}</li>
                                ))}
                              </ol>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mnemonics */}
                    {summary.mnemonics?.length > 0 && (
                      <div className="bg-purple-500/5 rounded-2xl border border-purple-500/20 p-6">
                        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3">{'\u{1F4A1}'} Mnemonics</h3>
                        <div className="space-y-3">
                          {summary.mnemonics.map((m, i) => (
                            <div key={i} className="bg-[var(--bg)] rounded-xl p-4 border border-purple-500/20">
                              <div className="font-semibold text-purple-400 text-sm">{m.topic}</div>
                              <div className="text-[var(--text-primary)] text-sm font-medium mt-1">{m.mnemonic}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-1">{m.explanation}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ─── QUIZ TAB ──────────────────────────────────────── */}
            {activeTab === 'quiz' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {!selectedMaterial ? (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
                    <p className="text-4xl mb-3">{'\u{1F9E0}'}</p>
                    <p className="text-[var(--text-secondary)]">Select a material from the sidebar to take a quiz</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
                    <p className="text-4xl mb-3">{'\u{2753}'}</p>
                    <p className="text-[var(--text-secondary)] mb-4">No questions generated yet</p>
                    <button
                      onClick={() => handleGenerate(selectedMaterial.id, 'questions')}
                      disabled={generating}
                      className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : 'Generate Questions'}
                    </button>
                  </div>
                ) : quizResult ? (
                  /* Quiz Results */
                  <div className="space-y-4">
                    <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6 text-center">
                      <div className={`text-5xl font-bold mb-2 ${
                        quizResult.scorePercent >= 70 ? 'text-emerald-400' : quizResult.scorePercent >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {quizResult.scorePercent}%
                      </div>
                      <p className="text-[var(--text-secondary)] text-sm">
                        {quizResult.correct}/{quizResult.total} correct
                      </p>
                      <p className="text-[var(--text-muted)] text-xs mt-1">
                        {quizResult.scorePercent >= 70 ? 'Great job! Keep it up!' : quizResult.scorePercent >= 50 ? 'Good effort! Review the weak areas.' : 'Needs more study. Review the material and try again.'}
                      </p>
                      <button
                        onClick={startQuiz}
                        className="mt-4 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium"
                      >
                        Retake Quiz
                      </button>
                    </div>

                    {/* Detailed answers */}
                    {quizResult.answers.map((a, i) => (
                      <div key={i} className={`bg-[var(--surface)] rounded-2xl border p-4 ${
                        a.isCorrect ? 'border-emerald-500/30' : 'border-red-500/30'
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className={`text-sm shrink-0 ${a.isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                            {a.isCorrect ? '\u2713' : '\u2717'}
                          </span>
                          <div>
                            <p className="text-sm text-[var(--text-primary)] font-medium">{a.question}</p>
                            {!a.isCorrect && (
                              <p className="text-xs text-red-400 mt-1">Your answer: {a.userAnswer}</p>
                            )}
                            <p className="text-xs text-emerald-400 mt-1">Correct: {a.correctAnswer}</p>
                            {a.explanation && (
                              <p className="text-xs text-[var(--text-muted)] mt-2 italic">{a.explanation}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !quizActive ? (
                  /* Quiz Start Screen */
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 text-center">
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">{selectedMaterial.title}</h2>
                    <p className="text-[var(--text-secondary)] text-sm mb-1">{questions.length} questions available</p>
                    <p className="text-[var(--text-muted)] text-xs mb-6">MCQ, True/False, and Fill-in-the-blank</p>
                    <button
                      onClick={startQuiz}
                      className="px-8 py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:shadow-lg hover:shadow-[var(--primary)]/20 transition-all"
                    >
                      Start Quiz
                    </button>
                  </div>
                ) : (
                  /* Active Quiz */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        {Object.keys(quizAnswers).length}/{questions.length} answered
                      </h3>
                      <button
                        onClick={submitQuiz}
                        disabled={loading || Object.keys(quizAnswers).length === 0}
                        className="px-6 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
                      >
                        {loading ? 'Scoring...' : 'Submit Quiz'}
                      </button>
                    </div>

                    {questions.map((q, i) => (
                      <div key={q.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-bold px-2 py-1 rounded-lg shrink-0">
                            {i + 1}
                          </span>
                          <div>
                            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                              q.question_type === 'mcq' ? 'bg-blue-500/10 text-blue-400' :
                              q.question_type === 'true_false' ? 'bg-purple-500/10 text-purple-400' :
                              'bg-orange-500/10 text-orange-400'
                            }`}>
                              {q.question_type === 'mcq' ? 'MCQ' : q.question_type === 'true_false' ? 'TRUE/FALSE' : 'FILL IN BLANK'}
                            </span>
                            <span className={`ml-2 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                              q.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                              q.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' :
                              'bg-yellow-500/10 text-yellow-400'
                            }`}>
                              {q.difficulty}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--text-primary)] font-medium mb-3">{q.question}</p>

                        {q.options && q.options.length > 0 ? (
                          <div className="space-y-2">
                            {q.options.map((opt, j) => (
                              <button
                                key={j}
                                onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${
                                  quizAnswers[q.id] === opt
                                    ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--text-primary)]'
                                    : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Type your answer..."
                            value={quizAnswers[q.id] || ''}
                            onChange={(e) => setQuizAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
                          />
                        )}
                      </div>
                    ))}

                    <button
                      onClick={submitQuiz}
                      disabled={loading || Object.keys(quizAnswers).length === 0}
                      className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-medium disabled:opacity-50"
                    >
                      {loading ? 'Scoring...' : `Submit Quiz (${Object.keys(quizAnswers).length}/${questions.length})`}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── FLASHCARDS TAB ──────────────────────────────────── */}
            {activeTab === 'flashcards' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {!selectedMaterial ? (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
                    <p className="text-4xl mb-3">{'\u{1F0CF}'}</p>
                    <p className="text-[var(--text-secondary)]">Select a material from the sidebar to view flashcards</p>
                  </div>
                ) : flashcards.length === 0 ? (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
                    <p className="text-4xl mb-3">{'\u{1F0CF}'}</p>
                    <p className="text-[var(--text-secondary)] mb-4">No flashcards generated yet</p>
                    <button
                      onClick={() => handleGenerate(selectedMaterial.id, 'flashcards')}
                      disabled={generating}
                      className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-50"
                    >
                      {generating ? 'Generating...' : 'Generate Flashcards'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Card {flashcardIndex + 1} of {flashcards.length}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-lg ${
                        flashcards[flashcardIndex]?.difficulty === 'easy' ? 'bg-emerald-500/10 text-emerald-400' :
                        flashcards[flashcardIndex]?.difficulty === 'hard' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {flashcards[flashcardIndex]?.difficulty}
                      </span>
                    </div>

                    <div
                      onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                      className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-8 min-h-[200px] flex items-center justify-center cursor-pointer hover:border-[var(--primary)]/30 transition-all"
                    >
                      <div className="text-center">
                        <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                          {flashcardFlipped ? 'Answer' : 'Question'} — Click to flip
                        </p>
                        <p className="text-lg text-[var(--text-primary)] font-medium">
                          {flashcardFlipped
                            ? flashcards[flashcardIndex]?.back
                            : flashcards[flashcardIndex]?.front}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => { setFlashcardIndex(Math.max(0, flashcardIndex - 1)); setFlashcardFlipped(false); }}
                        disabled={flashcardIndex === 0}
                        className="px-6 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text-secondary)] disabled:opacity-30"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => { setFlashcardIndex(Math.min(flashcards.length - 1, flashcardIndex + 1)); setFlashcardFlipped(false); }}
                        disabled={flashcardIndex >= flashcards.length - 1}
                        className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-medium disabled:opacity-30"
                      >
                        Next
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--primary)] rounded-full transition-all"
                        style={{ width: `${((flashcardIndex + 1) / flashcards.length) * 100}%` }}
                      />
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ─── PROGRESS TAB ──────────────────────────────────── */}
            {activeTab === 'progress' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 text-center">
                    <p className="text-2xl font-bold text-[var(--primary)]">{materials.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Materials</p>
                  </div>
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 text-center">
                    <p className="text-2xl font-bold text-[var(--primary)]">{materials.filter((m) => m.status === 'analyzed').length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Analyzed</p>
                  </div>
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 text-center">
                    <p className="text-2xl font-bold text-[var(--primary)]">{topics.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Topics</p>
                  </div>
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 text-center">
                    <p className="text-2xl font-bold text-[var(--primary)]">{attempts.length}</p>
                    <p className="text-xs text-[var(--text-muted)]">Quiz Attempts</p>
                  </div>
                </div>

                {/* Quiz History */}
                {attempts.length > 0 && (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">Recent Quizzes</h3>
                    <div className="space-y-2">
                      {attempts.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                              a.score_percent >= 70 ? 'bg-emerald-500/15 text-emerald-400' :
                              a.score_percent >= 50 ? 'bg-yellow-500/15 text-yellow-400' :
                              'bg-red-500/15 text-red-400'
                            }`}>
                              {a.score_percent}%
                            </div>
                            <div>
                              <p className="text-sm text-[var(--text-primary)]">{a.total_questions} questions</p>
                              <p className="text-xs text-[var(--text-muted)]">{new Date(a.completed_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics Overview */}
                {topics.length > 0 && (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-6">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3">Your Topics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {topics.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 p-3 bg-[var(--bg)] rounded-xl border border-[var(--border)]">
                          <span className="text-2xl">{t.icon}</span>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{t.name}</p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {t.study_materials?.[0]?.count || 0} materials
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {materials.length === 0 && attempts.length === 0 && (
                  <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-12 text-center">
                    <p className="text-4xl mb-3">{'\u{1F4CA}'}</p>
                    <p className="text-[var(--text-secondary)]">Upload and study materials to see your progress here</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
