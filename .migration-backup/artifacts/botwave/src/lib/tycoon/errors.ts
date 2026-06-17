import { NextResponse } from 'next/server';

type ErrorBody = {
  error: string;
  [key: string]: unknown;
};

export function tycoonError(body: ErrorBody, status: number) {
  return NextResponse.json(body, { status });
}

export function retryAfterUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil((ms - Date.now()) / 1000));
}
