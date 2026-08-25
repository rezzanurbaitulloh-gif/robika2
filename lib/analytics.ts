import { createClient } from "@/lib/supabase/client";

const QUEUE_KEY = "robika.analytics.queue";
const MAX_QUEUE = 100;

type Payload = Record<string, unknown>;

function loadQueue(): Payload[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as Payload[];
  } catch {
    return [];
  }
}

function saveQueue(q: Payload[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
  } catch {}
}

/** §64 analytics — fire-and-forget, offline-queued, never blocks gameplay. */
export function track(event: string, payload: Payload = {}): void {
  if (typeof window === "undefined") return;
  const queue = loadQueue();
  queue.push({ event, payload, at: new Date().toISOString() });
  saveQueue(queue);
  void flush();
}

let flushing = false;
export async function flush(): Promise<void> {
  if (flushing) return;
  const queue = loadQueue();
  if (!queue.length) return;
  flushing = true;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const rows = queue.map((q) => ({ user_id: user?.id ?? null, event: q.event, payload: q.payload ?? {} }));
    const { error } = await supabase.from("analytics_events").insert(rows);
    if (!error) saveQueue([]);
  } catch {
    // tetap antre; dicoba lagi pada event berikutnya
  } finally {
    flushing = false;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flush());
}
