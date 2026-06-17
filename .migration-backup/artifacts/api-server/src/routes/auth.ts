import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

router.post("/auth/signup", async (req, res) => {
  const { email, password, username } = req.body as Record<string, string>;
  if (!email || !password || !username) {
    return res.status(400).json({ error: "email, password and username are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const existingUsername = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()))
    .limit(1);

  if (existingUsername.length > 0) {
    return res.status(409).json({ error: "Username is already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ email: email.toLowerCase(), username: username.toLowerCase(), passwordHash })
    .returning({ id: usersTable.id, email: usersTable.email, username: usersTable.username, plan: usersTable.plan });

  const token = signToken({ userId: user.id, email: user.email });
  return res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username, plan: user.plan } });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ userId: user.id, email: user.email });
  return res.json({ token, user: { id: user.id, email: user.email, username: user.username, plan: user.plan } });
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true });
});

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body as Record<string, string>;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    return res.json({ success: true, message: "If that email exists, a reset link has been sent." });
  }

  return res.json({ success: true, message: "Password reset link sent. Check your email." });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, username: usersTable.username, plan: usersTable.plan, createdAt: usersTable.createdAt })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});

export default router;
