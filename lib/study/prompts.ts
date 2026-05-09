/**
 * Study Feature — AI Prompt Templates
 * Used with Groq API to generate summaries, questions, and flashcards.
 */

export function buildSummaryPrompt(content: string, title: string): string {
  return `You are an expert medical education tutor. Analyze the following study material and create a comprehensive, exam-focused summary.

MATERIAL TITLE: ${title}

MATERIAL CONTENT:
${content.slice(0, 12000)}

INSTRUCTIONS — follow ALL of these strictly:

1. **KEY POINTS** — Extract every important concept as bullet points. Do NOT skip anything exam-worthy. Use clear, concise language.

2. **EXAM HIGHLIGHTS** — List the most likely exam questions/topics. What would a professor ask? Mark these with a star.

3. **DEFINITIONS** — List all key terms with their definitions.

4. **CLINICAL CORRELATIONS** — Any clinical relevance, diseases, conditions, or applied knowledge.

5. **DIAGRAMS & PROCESSES** — Describe any processes, pathways, or mechanisms step by step.

6. **MNEMONICS** — Create helpful memory aids for complex lists or processes.

7. **QUICK REVIEW** — A 5-bullet ultra-condensed version for last-minute revision.

TOPIC GROUPING — VERY IMPORTANT:
If the material covers MULTIPLE topics or sub-topics, you MUST group content under topic headers for readability.
Use these special prefixes in your string arrays:
- "## TOPIC NAME" — a topic sub-heading (use ALL CAPS for the topic name)
- ">> Brief intro text" — a 1-2 sentence introduction/overview for that topic section
- Regular strings (no prefix) — normal bullet points under that topic

For definitions, use: {"term": "## TOPIC NAME", "definition": "Brief intro for this topic section"} as a header entry, followed by normal definition entries.

Example for keyPoints:
["## PANCREATIC HORMONES", ">> The pancreas regulates blood glucose through insulin and glucagon.", "Insulin is the ONLY hypoglycaemic hormone...", "## ADRENAL HORMONES", ">> The adrenal glands produce steroids and catecholamines.", "Cortisol is regulated by the HPA axis..."]

If the material covers only ONE topic, you may skip the ## headers.

FORMAT: Return valid JSON with this structure:
{
  "keyPoints": ["## TOPIC (if multi-topic)", ">> Brief intro", "point 1", "point 2", ...],
  "examHighlights": ["## TOPIC (if multi-topic)", ">> Brief intro", "highlight 1", ...],
  "definitions": [{"term": "## TOPIC", "definition": "Brief intro"}, {"term": "...", "definition": "..."}],
  "clinicalCorrelations": ["## TOPIC (if multi-topic)", ">> Brief intro", "correlation 1", ...],
  "processes": [{"name": "...", "steps": ["step 1", "step 2", ...]}],
  "mnemonics": [{"topic": "...", "mnemonic": "...", "explanation": "..."}],
  "quickReview": ["point 1", "point 2", "point 3", "point 4", "point 5"]
}

Be thorough. A medical student's exam grade depends on this. Do not skip necessary things.`;
}

export function buildQuestionsPrompt(content: string, title: string, count: number = 100): string {
  return `You are a medical exam question writer. Generate ${count} high-quality objective questions from the following material.

MATERIAL TITLE: ${title}

MATERIAL CONTENT:
${content.slice(0, 12000)}

INSTRUCTIONS:
- Generate a MIX of question types:
  * 8 MCQs (Multiple Choice — 4 options each, one correct)
  * 4 True/False questions
  * 3 Fill-in-the-blank questions
- Questions should test UNDERSTANDING, not just memorization
- Include questions on: definitions, mechanisms, clinical applications, comparisons
- Vary difficulty: 5 easy, 5 medium, 5 hard
- Each question MUST have a clear explanation for the correct answer

FORMAT: Return valid JSON array:
[
  {
    "type": "mcq",
    "question": "Which hormone is primarily responsible for...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": "B) Option 2",
    "explanation": "Option 2 is correct because...",
    "difficulty": "medium"
  },
  {
    "type": "true_false",
    "question": "Growth hormone is secreted by the posterior pituitary. True or False?",
    "options": ["True", "False"],
    "correctAnswer": "False",
    "explanation": "Growth hormone is secreted by the anterior pituitary...",
    "difficulty": "easy"
  },
  {
    "type": "fill_blank",
    "question": "The hormone _____ stimulates the release of growth hormone from the anterior pituitary.",
    "options": [],
    "correctAnswer": "GHRH (Growth Hormone Releasing Hormone)",
    "explanation": "GHRH is released from the hypothalamus and...",
    "difficulty": "medium"
  }
]

Make questions exam-realistic. A student studying these should be well-prepared for their actual exam.`;
}

export function buildFlashcardsPrompt(content: string, title: string, count: number = 10): string {
  return `You are a medical education specialist. Create ${count} flashcards from the following study material.

MATERIAL TITLE: ${title}

MATERIAL CONTENT:
${content.slice(0, 12000)}

INSTRUCTIONS:
- Front: A clear question or term
- Back: A concise but complete answer
- Focus on exam-worthy content
- Include definitions, mechanisms, clinical facts
- Vary difficulty

FORMAT: Return valid JSON array:
[
  {
    "front": "What is the function of Growth Hormone?",
    "back": "Stimulates growth of bones and tissues, increases protein synthesis, promotes lipolysis, and has anti-insulin effects on carbohydrate metabolism.",
    "difficulty": "medium"
  }
]`;
}
