import { Router } from "express";
import { db, botSessionsTable, defaultFeatures } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/sessions", async (req, res) => {
  const sessions = await db
    .select()
    .from(botSessionsTable)
    .where(eq(botSessionsTable.userId, req.user!.userId));

  return res.json({ sessions });
});

router.post("/sessions", async (req, res) => {
  const { name, platform, botToken } = req.body as Record<string, string>;
  if (!name) return res.status(400).json({ error: "Session name is required" });
  if (!platform || !["telegram-bot", "telegram-userbot"].includes(platform)) {
    return res.status(400).json({ error: "Invalid platform" });
  }

  const [session] = await db
    .insert(botSessionsTable)
    .values({
      userId: req.user!.userId,
      name,
      platform,
      botToken: botToken ?? null,
      status: "disconnected",
      features: defaultFeatures,
    })
    .returning();

  return res.status(201).json({ session });
});

router.get("/sessions/:id", async (req, res) => {
  const [session] = await db
    .select()
    .from(botSessionsTable)
    .where(and(eq(botSessionsTable.id, req.params["id"]!), eq(botSessionsTable.userId, req.user!.userId)))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });
  return res.json({ session });
});

router.patch("/sessions/:id", async (req, res) => {
  const { name, status, botToken } = req.body as Record<string, string>;

  const [session] = await db
    .select({ id: botSessionsTable.id })
    .from(botSessionsTable)
    .where(and(eq(botSessionsTable.id, req.params["id"]!), eq(botSessionsTable.userId, req.user!.userId)))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });

  const updates: Partial<typeof botSessionsTable.$inferInsert> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (status) updates.status = status;
  if (botToken !== undefined) updates.botToken = botToken;

  const [updated] = await db
    .update(botSessionsTable)
    .set(updates)
    .where(eq(botSessionsTable.id, req.params["id"]!))
    .returning();

  return res.json({ session: updated });
});

router.delete("/sessions/:id", async (req, res) => {
  const result = await db
    .delete(botSessionsTable)
    .where(and(eq(botSessionsTable.id, req.params["id"]!), eq(botSessionsTable.userId, req.user!.userId)))
    .returning({ id: botSessionsTable.id });

  if (result.length === 0) return res.status(404).json({ error: "Session not found" });
  return res.json({ success: true });
});

router.get("/sessions/:id/features", async (req, res) => {
  const [session] = await db
    .select({ features: botSessionsTable.features })
    .from(botSessionsTable)
    .where(and(eq(botSessionsTable.id, req.params["id"]!), eq(botSessionsTable.userId, req.user!.userId)))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });
  return res.json({ features: session.features ?? defaultFeatures });
});

router.put("/sessions/:id/features", async (req, res) => {
  const { features } = req.body as { features: Record<string, boolean> };
  if (!features || typeof features !== "object") {
    return res.status(400).json({ error: "features object is required" });
  }

  const [session] = await db
    .select({ id: botSessionsTable.id, features: botSessionsTable.features })
    .from(botSessionsTable)
    .where(and(eq(botSessionsTable.id, req.params["id"]!), eq(botSessionsTable.userId, req.user!.userId)))
    .limit(1);

  if (!session) return res.status(404).json({ error: "Session not found" });

  const merged = { ...(session.features as Record<string, boolean> ?? {}), ...features };
  const [updated] = await db
    .update(botSessionsTable)
    .set({ features: merged, updatedAt: new Date() })
    .where(eq(botSessionsTable.id, req.params["id"]!))
    .returning({ features: botSessionsTable.features });

  return res.json({ features: updated.features });
});

router.get("/stats", async (req, res) => {
  const sessions = await db
    .select({ status: botSessionsTable.status })
    .from(botSessionsTable)
    .where(eq(botSessionsTable.userId, req.user!.userId));

  const active = sessions.filter((s) => s.status === "active").length;
  return res.json({
    sessions: { total: sessions.length, active, offline: sessions.length - active },
    messages: { sent: 0, received: 0, commands: 0 },
    uptime: process.uptime(),
  });
});

router.get("/events", requireAuth, (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`data: ${JSON.stringify({ type: "connected", userId: req.user!.userId })}\n\n`);
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
  }, 30000);
  req.on("close", () => clearInterval(interval));
});

export default router;
