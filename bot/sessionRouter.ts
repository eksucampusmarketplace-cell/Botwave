const servers = (process.env.SESSION_SERVERS || '').split(',').filter(Boolean);

let counter = 0;

export function getSessionServer(): string | null {
  if (!servers.length) return null;
  const server = servers[counter % servers.length];
  counter++;
  return server;
}
