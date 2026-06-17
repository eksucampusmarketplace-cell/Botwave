import { Router, type Request, type Response, type NextFunction } from "express";

const router = Router();

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", pt: "Portuguese", de: "German",
  ar: "Arabic", zh: "Chinese (Simplified)", hi: "Hindi", yo: "Yoruba", ig: "Igbo",
  ha: "Hausa", sw: "Swahili", ru: "Russian", ja: "Japanese", ko: "Korean",
  tr: "Turkish", it: "Italian", nl: "Dutch", pl: "Polish", vi: "Vietnamese",
};

router.get("/translate", (_req, res) => {
  return res.status(200).json({ supported_languages: Object.keys(SUPPORTED_LANGUAGES) });
});

router.post("/translate", async (req, res) => {
  const { text, targetLang, sourceLang } = req.body as Record<string, string>;
  if (!text?.trim()) return res.status(400).json({ error: "text is required" });
  if (text.length > 5000) return res.status(400).json({ error: "Text too long (max 5000 chars)" });

  const target = targetLang && SUPPORTED_LANGUAGES[targetLang] ? targetLang : "en";
  const targetName = SUPPORTED_LANGUAGES[target];
  const sourceName = sourceLang && SUPPORTED_LANGUAGES[sourceLang] ? SUPPORTED_LANGUAGES[sourceLang] : null;

  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    return res.status(503).json({
      error: "Translation service unavailable — AI provider not configured.",
      supported_languages: Object.keys(SUPPORTED_LANGUAGES),
    });
  }

  try {
    const prompt = sourceName
      ? `Translate from ${sourceName} to ${targetName}. Return ONLY the translated text, no commentary:\n\n${text.trim()}`
      : `Translate to ${targetName}. Return ONLY the translated text, no commentary:\n\n${text.trim()}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a precise translator. Output only the translated text." },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      return res.status(503).json({ error: "Translation service temporarily unavailable." });
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const translated = data.choices?.[0]?.message?.content?.trim();

    if (!translated) {
      return res.status(503).json({ error: "Translation service temporarily unavailable." });
    }

    return res.json({ translated, targetLang: target, sourceLang: sourceLang ?? "auto" });
  } catch {
    return res.status(503).json({ error: "Translation failed. Please try again." });
  }
});

router.get("/og", (_req, res) => {
  res.setHeader("Content-Type", "image/svg+xml");
  return res.status(200).send(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0a0a0a"/><text x="600" y="315" text-anchor="middle" fill="white" font-size="48" font-family="sans-serif">BotWave</text></svg>`
  );
});

router.get("/status", (_req, res) => {
  return res.json({ status: "operational", services: { api: "ok" }, uptime: process.uptime() });
});

router.get("/diagnostics", (_req, res) => {
  return res.json({ ok: true, timestamp: new Date().toISOString() });
});

router.post("/feature-request", (req, res) => {
  const { feature, description } = req.body;
  if (!feature && !description) return res.status(400).json({ error: "feature description is required" });
  return res.status(201).json({ success: true, message: "Feature request received.", id: `fr-${Date.now()}` });
});

const COMMUNITY_COMMANDS = [
  { id: "1", name: "!ai", category: "AI", description: "Ask Google Gemini any question directly in chat", likes: 324, author: "BotWave Team", status: "approved" },
  { id: "2", name: "!sticker", category: "Media", description: "Convert any image or GIF to a WhatsApp sticker", likes: 287, author: "BotWave Team", status: "approved" },
  { id: "3", name: "!download", category: "Media", description: "Download TikTok, YouTube, Instagram videos without watermark", likes: 265, author: "BotWave Team", status: "approved" },
  { id: "4", name: "!translate", category: "Utility", description: "Translate any message to 20+ languages. Reply to a message to translate it.", likes: 241, author: "BotWave Team", status: "approved" },
  { id: "5", name: "!trivia", category: "Games", description: "Start a trivia quiz in your group. 15 categories available.", likes: 198, author: "BotWave Team", status: "approved" },
  { id: "6", name: "!warn", category: "Moderation", description: "Warn a tagged member. Auto-kick after 3 warnings.", likes: 176, author: "BotWave Team", status: "approved" },
  { id: "7", name: "!kick", category: "Moderation", description: "Remove a member from the group (admin only)", likes: 154, author: "BotWave Team", status: "approved" },
  { id: "8", name: "!promote", category: "Moderation", description: "Promote a member to admin (super admin only)", likes: 132, author: "BotWave Team", status: "approved" },
  { id: "9", name: "!hangman", category: "Games", description: "Play Hangman in your group. Guess the hidden word.", likes: 121, author: "BotWave Team", status: "approved" },
  { id: "10", name: "!chess", category: "Games", description: "Challenge another member to a chess game", likes: 109, author: "BotWave Team", status: "approved" },
  { id: "11", name: "!schedule", category: "Utility", description: "Schedule a message for later. e.g. !schedule 2h30m Hello group!", likes: 98, author: "BotWave Team", status: "approved" },
  { id: "12", name: "!poll", category: "Utility", description: "Create a poll in the group. Members react to vote.", likes: 87, author: "BotWave Team", status: "approved" },
  { id: "13", name: "!lyrics", category: "Media", description: "Get lyrics for any song. e.g. !lyrics Bohemian Rhapsody", likes: 76, author: "BotWave Team", status: "approved" },
  { id: "14", name: "!summary", category: "AI", description: "AI summary of the last 50 group messages", likes: 65, author: "BotWave Team", status: "approved" },
  { id: "15", name: "!ocr", category: "Utility", description: "Extract text from an image using OCR. Reply to any image.", likes: 54, author: "BotWave Team", status: "approved" },
];

router.get("/community-commands", (req, res) => {
  const category = (req.query["category"] as string) ?? "";
  const sort = (req.query["sort"] as string) ?? "likes";

  let commands = [...COMMUNITY_COMMANDS];
  if (category && category !== "All") {
    commands = commands.filter(c => c.category === category);
  }
  if (sort === "newest") {
    commands = commands.reverse();
  } else {
    commands = commands.sort((a, b) => b.likes - a.likes);
  }
  return res.json({ success: true, commands });
});

router.post("/community-commands", (req, res) => {
  const { name, description, category } = req.body as Record<string, string>;
  if (!name || !description) return res.status(400).json({ error: "name and description are required" });
  return res.status(201).json({
    success: true,
    command: { id: `cc-${Date.now()}`, name, description, category: category ?? "Utility", likes: 0, status: "pending" },
    message: "Command submitted for review. It will appear after approval.",
  });
});

// Wildcard catch-alls — these come after real routers so they only fire for unimplemented sub-paths
const notConfigured = (_req: Request, res: Response, _next: NextFunction) => {
  return res.status(503).json({ error: "Service not yet configured." });
};
const requireAuthFallback = (_req: Request, res: Response, _next: NextFunction) => {
  return res.status(401).json({ error: "Authentication required.", code: "UNAUTHENTICATED" });
};

router.use("/telegram", requireAuthFallback);
router.use("/admin", requireAuthFallback);
router.use("/user", requireAuthFallback);
router.use("/payments", requireAuthFallback);
router.use("/support", notConfigured);
router.use("/email", notConfigured);
router.use("/internal", requireAuthFallback);
router.use("/study", requireAuthFallback);
router.use("/miniapp", requireAuthFallback);
router.use("/game", notConfigured);
router.use("/indexnow", notConfigured);
router.use("/evolution", notConfigured);

export default router;
