'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface SSEOptions {
  onUpdate?: (data: SSEUpdateData) => void;
  enabled?: boolean;
}

interface SSESessionData {
  id: string;
  session_name: string;
  phone_number: string;
  state: string;
  last_active: string | null;
}

interface SSEStatsData {
  total_messages: number;
  total_commands: number;
}

interface SSEUpdateData {
  sessions: SSESessionData[];
  stats: SSEStatsData;
  timestamp: number;
}

export function useSSE({ onUpdate, enabled = true }: SSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource('/api/bot/events');
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setConnected(true);
    });

    es.addEventListener('update', (event) => {
      try {
        const data = JSON.parse(event.data) as SSEUpdateData;
        onUpdate?.(data);
      } catch {
        // ignore parse errors
      }
    });

    es.onerror = () => {
      setConnected(false);
      es.close();
      eventSourceRef.current = null;
      setTimeout(connect, 10000);
    };
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) return;

    connect();

    return () => {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [enabled, connect]);

  return { connected };
}
