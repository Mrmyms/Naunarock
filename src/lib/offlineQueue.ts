export const OFFLINE_QUEUE_KEY = 'nautilus_4010_scout_queue_v1';

export interface QueuedScoutEntry {
  queueId: string;
  queuedAt: string;
  capturedAt: string;
  payload: Record<string, any>;
  attempts: number;
  lastError?: string;
}

export interface SyncQueueResult {
  synced: number;
  failed: number;
  remaining: QueuedScoutEntry[];
  skipped?: boolean;
}

let activeSyncPromise: Promise<SyncQueueResult> | null = null;

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readScoutQueue(): QueuedScoutEntry[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeScoutQueue(items: QueuedScoutEntry[]): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error escribiendo cola offline en localStorage:', err);
  }
}

export function enqueueScoutPayload(
  payload: Record<string, any>,
  lastError?: string
): QueuedScoutEntry[] {
  const nowIso = new Date().toISOString();
  const capturedAt =
    typeof payload.timestamp === 'string' && payload.timestamp.trim()
      ? payload.timestamp.trim()
      : new Date().toLocaleString('es-MX', { timeZone: 'America/Monterrey' });

  const entry: QueuedScoutEntry = {
    queueId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: nowIso,
    capturedAt,
    payload: { ...payload, timestamp: capturedAt },
    attempts: 0,
    ...(lastError ? { lastError } : {}),
  };

  const next = [...readScoutQueue(), entry];
  writeScoutQueue(next);
  return next;
}

export function removeFromScoutQueue(queueId: string): QueuedScoutEntry[] {
  const next = readScoutQueue().filter((item) => item.queueId !== queueId);
  writeScoutQueue(next);
  return next;
}

function updateQueuedItemMeta(queueId: string, errorMsg: string): void {
  const next = readScoutQueue().map((item) =>
    item.queueId === queueId
      ? {
          ...item,
          attempts: (item.attempts || 0) + 1,
          lastError: errorMsg,
        }
      : item
  );
  writeScoutQueue(next);
}

export async function syncScoutQueue(options?: {
  endpoint?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<SyncQueueResult> {
  if (activeSyncPromise) {
    return {
      synced: 0,
      failed: 0,
      remaining: readScoutQueue(),
      skipped: true,
    };
  }

  const endpoint = options?.endpoint ?? '/api/scout';
  const timeoutMs = options?.timeoutMs ?? 12000;
  const fetchFn = options?.fetchImpl ?? fetch;

  const run = async (): Promise<SyncQueueResult> => {
    const queue = readScoutQueue();
    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetchFn(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
          signal: controller.signal,
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          // ignore non-JSON body
        }

        if (res.ok && json?.success) {
          removeFromScoutQueue(item.queueId);
          synced += 1;
          continue;
        }

        const errMsg = json?.error || `Error HTTP ${res.status}`;
        updateQueuedItemMeta(item.queueId, errMsg);
        failed += 1;

        // Si es un error 4xx de validación puntual, pasamos al siguiente sin bloquear toda la cola
        if (res.status >= 400 && res.status < 500) {
          continue;
        }

        // Ante 5xx detenemos el lote para reintentar cuando el servidor responda
        break;
      } catch (err: any) {
        const errMsg =
          err?.name === 'AbortError'
            ? 'Tiempo de espera agotado'
            : err?.message || 'Error de red';
        updateQueuedItemMeta(item.queueId, errMsg);
        failed += 1;
        break;
      } finally {
        clearTimeout(timer);
      }
    }

    return {
      synced,
      failed,
      remaining: readScoutQueue(),
    };
  };

  activeSyncPromise = run().finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}
