import { Router } from "express";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  return res.status(503).json({
    error: "Auth service not yet configured. Please connect Supabase or another auth provider.",
  });
});

router.post("/auth/signup", async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }
  return res.status(503).json({
    error: "Auth service not yet configured. Please connect Supabase or another auth provider.",
  });
});

router.post("/auth/logout", async (_req, res) => {
  return res.status(200).json({ success: true });
});

router.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  return res.status(503).json({
    error: "Auth service not yet configured.",
  });
});

export default router;
