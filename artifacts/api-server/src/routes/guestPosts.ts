import { Router } from "express";

const router = Router();

const posts: Array<{
  id: string;
  author_name: string;
  title: string;
  body: string;
  original_lang: string;
  display_lang: string;
  upvotes: number;
  created_at: string;
}> = [
  {
    id: "1",
    author_name: "Emeka O.",
    title: "BotWave saved my Telegram group!",
    body: "I was spending 2 hours daily managing my 500-member group. After setting up BotWave, the anti-spam and welcome messages handle everything automatically. Highly recommended!",
    original_lang: "en",
    display_lang: "en",
    upvotes: 42,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    author_name: "Fatima A.",
    title: "The sticker maker is incredible",
    body: "My students love that they can make custom stickers right inside our Telegram group. No need for separate apps. BotWave makes it so easy.",
    original_lang: "en",
    display_lang: "en",
    upvotes: 38,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    author_name: "Kwame B.",
    title: "Free and actually works",
    body: "I tried three other bot platforms before BotWave. They either cost money or kept getting my account flagged. BotWave is free and the anti-ban system actually works.",
    original_lang: "en",
    display_lang: "en",
    upvotes: 57,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

router.get("/guest-posts", (_req, res) => {
  return res.json({ success: true, data: posts });
});

router.post("/guest-posts", (req, res) => {
  const { title, body, author_name, original_lang } = req.body;
  if (!title || !body) {
    return res.status(400).json({ success: false, error: "Title and body are required" });
  }
  const newPost = {
    id: String(Date.now()),
    title,
    body,
    author_name: author_name || "Anonymous",
    original_lang: original_lang || "en",
    display_lang: "en",
    upvotes: 0,
    created_at: new Date().toISOString(),
  };
  posts.unshift(newPost);
  return res.status(201).json({ success: true, data: newPost });
});

router.post("/guest-posts/:id/upvote", (req, res) => {
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) return res.status(404).json({ success: false, error: "Post not found" });
  post.upvotes += 1;
  return res.json({ success: true, upvotes: post.upvotes });
});

export default router;
