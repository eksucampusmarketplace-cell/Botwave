import { pgTable, text, timestamp, boolean, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const botSessionsTable = pgTable("bot_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  platform: text("platform").notNull().default("whatsapp"),
  status: text("status").notNull().default("disconnected"),
  phoneNumber: text("phone_number"),
  botToken: text("bot_token"),
  qrCode: text("qr_code"),
  features: jsonb("features").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastConnectedAt: timestamp("last_connected_at"),
});

export const insertBotSessionSchema = createInsertSchema(botSessionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastConnectedAt: true,
});

export type InsertBotSession = z.infer<typeof insertBotSessionSchema>;
export type BotSession = typeof botSessionsTable.$inferSelect;

export const defaultFeatures = {
  antiSpam: false,
  antiLink: false,
  welcomeMessage: false,
  autoReply: false,
  aiChat: false,
  stickerMaker: false,
  mediaDownloader: false,
  games: false,
  ghostMode: false,
  broadcastScheduler: false,
  contactHarvester: false,
  groupStats: false,
};
