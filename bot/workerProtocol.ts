// bot/workerProtocol.ts
// TypeScript types for all main ↔ worker thread messages.
// Uses postMessage (Structured Clone) for request/response semantics
// and SharedArrayBuffer + Atomics for read-only flag broadcasting.

// ─── Shared Flags (SharedArrayBuffer + Atomics) ─────────────────────────────
// These are read-only from workers, written by main thread.
// Workers read via Atomics.load(), main writes via Atomics.store().

export const FLAG_428_ACTIVE = 0;         // Int32 slot 0: 1 = 428 cooldown active
export const FLAG_EVOLUTION_DOWN = 1;     // Int32 slot 1: 1 = Evolution API is down
export const FLAG_COOLDOWN_EXPIRES = 2;   // Int32 slot 2: unix seconds when 428 cooldown expires
export const FLAG_PAUSED = 3;             // Int32 slot 3: 1 = all workers should pause
export const SHARED_FLAGS_SIZE = 16;      // 4 × Int32 = 16 bytes

// ─── Main → Worker Messages ─────────────────────────────────────────────────

export interface AssignSessionMsg {
  type: 'assign_session';
  sessionId: string;
  phone: string;
  state: string;
  userId: string;
}

export interface UnassignSessionMsg {
  type: 'unassign_session';
  sessionId: string;
}

export interface ShutdownMsg {
  type: 'shutdown';
}

export interface PauseMsg {
  type: 'pause';
}

export interface ResumeMsg {
  type: 'resume';
}

export interface ReportStatsMsg {
  type: 'report_stats';
}

export interface CreateApprovedMsg {
  type: 'create_approved';
  sessionId: string;
}

export interface CreateQueuedMsg {
  type: 'create_queued';
  sessionId: string;
  waitMs: number;
}

export type MainToWorkerMsg =
  | AssignSessionMsg
  | UnassignSessionMsg
  | ShutdownMsg
  | PauseMsg
  | ResumeMsg
  | ReportStatsMsg
  | CreateApprovedMsg
  | CreateQueuedMsg;

// ─── Worker → Main Messages ─────────────────────────────────────────────────

export interface HeartbeatMsg {
  type: 'heartbeat';
  sessionId: string;
  timestamp: number;
  state: string;
}

export interface SessionReadyMsg {
  type: 'session_ready';
  sessionId: string;
}

export interface SessionFailedMsg {
  type: 'session_failed';
  sessionId: string;
  reason: string;
}

export interface SessionDisconnectedMsg {
  type: 'session_disconnected';
  sessionId: string;
}

export interface WorkerStatsMsg {
  type: 'worker_stats';
  workerId: number;
  sessionCount: number;
  syncCycleMs: number;
  memMB: number;
}

export interface RequestCreateInstanceMsg {
  type: 'request_create_instance';
  sessionId: string;
}

export interface Report428Msg {
  type: 'report_428';
  source: string;
}

export interface ReportEvoFailureMsg {
  type: 'report_evo_failure';
}

export interface ReportEvoSuccessMsg {
  type: 'report_evo_success';
}

export interface WorkerReadyMsg {
  type: 'worker_ready';
  workerId: number;
}

export type WorkerToMainMsg =
  | HeartbeatMsg
  | SessionReadyMsg
  | SessionFailedMsg
  | SessionDisconnectedMsg
  | WorkerStatsMsg
  | RequestCreateInstanceMsg
  | Report428Msg
  | ReportEvoFailureMsg
  | ReportEvoSuccessMsg
  | WorkerReadyMsg;

// ─── Worker Thread Init Data ─────────────────────────────────────────────────

export interface WorkerInitData {
  workerId: number;
  sharedFlags: SharedArrayBuffer;
}
