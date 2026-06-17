import { assignWorker } from './scaling/workerConfig';

export function getSessionServer(): string | null {
  return assignWorker();
}
