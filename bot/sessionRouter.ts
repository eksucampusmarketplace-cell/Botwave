import { assignWorker } from './workerConfig';

export function getSessionServer(): string | null {
  return assignWorker();
}
