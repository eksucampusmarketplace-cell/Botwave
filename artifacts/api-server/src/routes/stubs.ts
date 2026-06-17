import { Router, Request, Response, NextFunction } from "express";

const router = Router();

router.post("/translate", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });
  return res.status(503).json({ error: "Translation service not yet configured." });
});

router.get("/translate", (_req, res) => {
  return res.status(200).json({
    supported_languages: ["en", "yo", "ig", "ha", "fr", "es", "pt", "ar", "zh", "sw"],
  });
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

router.get("/community-commands", (_req, res) => {
  return res.json({ success: true, data: [] });
});

router.post("/community-commands", (_req, res) => {
  return res.status(503).json({ error: "Community commands not yet configured." });
});

// Bot session events (SSE)
router.get("/bot/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write('data: {"type":"connected"}\n\n');
  const interval = setInterval(() => {
    res.write('data: {"type":"ping"}\n\n');
  }, 30000);
  req.on("close", () => clearInterval(interval));
});

router.get("/bot/sessions", (_req, res) => {
  return res.status(401).json({ error: "Authentication required.", code: "UNAUTHENTICATED" });
});

router.get("/bot/qr-alerts", (_req, res) => {
  return res.status(401).json({ error: "Authentication required.", code: "UNAUTHENTICATED" });
});

// Wildcard handlers for authenticated sections — use router.use() for prefix matching (Express 5 / path-to-regexp v8)
const requireAuth = (_req: Request, res: Response, _next: NextFunction) => {
  return res.status(401).json({ error: "Authentication required.", code: "UNAUTHENTICATED" });
};
const notConfigured = (_req: Request, res: Response, _next: NextFunction) => {
  return res.status(503).json({ error: "Service not yet configured." });
};

router.use("/bot", requireAuth);
router.use("/telegram", requireAuth);
router.use("/admin", requireAuth);
router.use("/user", requireAuth);
router.use("/payments", requireAuth);
router.use("/support", notConfigured);
router.use("/email", notConfigured);
router.use("/internal", requireAuth);
router.use("/study", requireAuth);
router.use("/miniapp", requireAuth);
router.use("/game", notConfigured);
router.use("/indexnow", notConfigured);
router.use("/evolution", notConfigured);

export default router;
