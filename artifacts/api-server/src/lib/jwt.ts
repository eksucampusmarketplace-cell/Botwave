import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

const rawSecret = process.env["JWT_SECRET"];
if (!rawSecret && process.env["NODE_ENV"] === "production") {
  throw new Error("JWT_SECRET must be set in production. Add it as a Replit Secret.");
}
const JWT_SECRET: string = rawSecret ?? (() => {
  const dev = randomBytes(64).toString("hex");
  console.warn("[jwt] JWT_SECRET not set — using ephemeral dev secret. Tokens will not survive restart. Set JWT_SECRET as a Replit Secret for persistence.");
  return dev;
})();
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
