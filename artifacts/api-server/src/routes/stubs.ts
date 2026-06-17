import { Router, type Request, type Response, type NextFunction } from "express";

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
