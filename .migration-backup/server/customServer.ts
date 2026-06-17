/**
 * Custom server that wraps Next.js + Socket.io on the same port.
 * Used in production (Render) via: node dist/bot/server/customServer.js
 */
import { createServer } from 'http';
import next from 'next';
import { initGameServer } from './gameServer';

const port = parseInt(process.env.PORT || '10000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = initGameServer(httpServer);
  console.log('[GAME] Socket.io game server initialized on path /api/game/socket');

  // Store io instance globally so API routes can access it
  (global as any).__gameIO = io;

  httpServer.listen(port, () => {
    console.log(`[SERVER] Ready on http://localhost:${port}`);
  });
});
