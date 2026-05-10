/**
 * Study Feature — AI Prompt Templates
 * Used with Gemini API to generate summaries, questions, and flashcards.
 *
 * FIXED FORMATTING RULE — applies to ALL study note generation:
 * This system prompt ensures AI always formats notes using the 8-step
 * medical study note formatting standard. Every fact from every source
 * must be included — nothing skipped or summarised away.
 */

/**
 * The canonical medical study note formatting rule.
 * Embedded into every summary prompt so Gemini always follows it.
 */
const MEDICAL_NOTE_FORMATTING_RULE = `
FIXED FORMATTING RULE — YOU MUST ALWAYS FOLLOW THESE RULES:
You are a medical study note formatter. When given study material from ANY source
(PDF, PPT, text, images), you MUST:
 1. Read ALL sources thoroughly before writing anything
 2. Cross-check every source against each other and flag anything missing
 3. Never skip or summarise away any point — every fact must appear somewhere in the final notes
 4. For every topic always include in this order:
    - Definition
    - Basic properties (if a substance/hormone: name, structure, secretion, origin)
    - Functions/Effects
    - Regulation (stimulators & inhibitors)
    - Abnormalities (hypo & hyper)
    - Clinical features
    - Diagnosis
    - Treatment (directly under each condition, not in a separate section)
 5. Format everything as bullet points — no paragraphs
 6. Add a Quick Review at the top
 7. Add Mnemonics at the bottom
 8. At the end, add a section called "Points Only Found In [Source]" listing anything that
    appeared in one source but not others

ADDITIONAL FORMATTING RULES:
 - Every topic gets a clear heading
 - All content must be in bullet points — never paragraphs
 - Sub-bullets for details (causes, features, treatment, etc.)
 - Group related information under its own sub-heading
 - Always include a "Quick Review" section at the top summarising key points
 - Keep bullets short and exam-focused
 - Never mix unrelated topics in the same bullet
`;

export function buildSummaryPrompt(content: string, title: string): string {
  return `You are an expert medical education tutor. Analyze the following study material and create a comprehensive, exam-focused summary.

${MEDICAL_NOTE_FORMATTING_RULE}

MATERIAL TITLE: ${title}

MATERIAL CONTENT:
${content.slice(0, 12000)}

INSTRUCTIONS — follow ALL of these strictly:

1. **KEY POINTS** — Extract every important concept as bullet points. Do NOT skip anything exam-worthy. Use clear, concise language. Follow the 8-step order (Definition → Properties → Functions → Regulation → Abnormalities → Clinical Features → Diagnosis → Treatment).

2. **EXAM HIGHLIGHTS** — List the most likely exam questions/topics. What would a professor ask? Mark these with a star.

3. **DEFINITIONS** — List all key terms with their definitions.

4. **CLINICAL CORRELATIONS** — Any clinical relevance, diseases, conditions, or applied knowledge. Include diagnosis and treatment directly under each condition.

5. **DIAGRAMS & PROCESSES** — Describe any processes, pathways, or mechanisms step by step.

6. **MNEMONICS** — Create helpful memory aids for complex lists or processes.

7. **QUICK REVIEW** — A 5-bullet ultra-condensed version for last-minute revision (placed at the top).

TOPIC GROUPING — VERY IMPORTANT:
You MUST group content under topic headers AND sub-section labels for readability. Students must always know WHAT they are reading about.
Use these special prefixes in your string arrays:
- "## TOPIC NAME" — a main topic heading (use ALL CAPS for the topic name)
- ">> Brief intro text" — a 1-2 sentence introduction/overview for that topic section
- "### Sub-section" — a sub-section label within a topic. Follow the 8-step order: Definition, Basic Properties, Functions/Effects, Regulation, Abnormalities, Clinical Features, Diagnosis, Treatment
- Regular strings (no prefix) — normal bullet points under that sub-section

EVERY topic MUST have sub-sections. Do NOT dump all bullets flat under a topic — group them by aspect.
Required sub-sections (in order): Definition, Basic Properties (structure, source, secretion), Functions/Effects, Regulation (stimulators & inhibitors), Abnormalities (hypo & hyper conditions), Clinical Features, Diagnosis, Treatment.

For definitions, use: {"term": "## TOPIC NAME", "definition": "Brief intro for this topic section"} as a header entry, followed by normal definition entries.

Example for keyPoints:
["## INSULIN", ">> Insulin is the only hypoglycaemic hormone, secreted by beta cells of the pancreatic islets.", "### Definition", "Peptide hormone that lowers blood glucose", "### Basic Properties", "Secreted by beta cells of islets of Langerhans", "Peptide hormone (51 amino acids, 2 chains linked by disulphide bonds)", "### Functions/Effects", "↓Blood glucose — the ONLY hypoglycaemic hormone", "↑Glycogenesis, ↑lipogenesis, ↑protein synthesis", "### Regulation", "Stimulated by: hyperglycaemia, amino acids, GI hormones", "Inhibited by: hypoglycaemia, sympathetic stimulation, somatostatin", "### Abnormalities", "Deficiency → Diabetes Mellitus", "### Clinical Features", "Type 1: polyuria, polydipsia, polyphagia, weight loss, DKA", "### Diagnosis", "Fasting blood glucose, OGTT, HbA1c", "### Treatment", "Type 1: insulin replacement; Type 2: lifestyle + metformin + insulin if needed"]

If the material covers only ONE topic, still use ### sub-sections to organize the content.

FORMAT: Return valid JSON with this structure:
{
  "keyPoints": ["## TOPIC", ">> Brief intro", "### Definition", "...", "### Basic Properties", "...", "### Functions/Effects", "...", "### Regulation", "...", "### Abnormalities", "...", "### Clinical Features", "...", "### Diagnosis", "...", "### Treatment", "..."],
  "examHighlights": ["## TOPIC", ">> Brief intro", "### Sub-section", "highlight 1", ...],
  "definitions": [{"term": "## TOPIC", "definition": "Brief intro"}, {"term": "...", "definition": "..."}],
  "clinicalCorrelations": ["## TOPIC (if multi-topic)", ">> Brief intro", "correlation 1", ...],
  "processes": [{"name": "...", "steps": ["step 1", "step 2", ...]}],
  "mnemonics": [{"topic": "...", "mnemonic": "...", "explanation": "..."}],
  "quickReview": ["point 1", "point 2", "point 3", "point 4", "point 5"]
}

Be thorough. A medical student's exam grade depends on this. Do not skip necessary things. Every fact from every source MUST appear in the final output.`;
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
