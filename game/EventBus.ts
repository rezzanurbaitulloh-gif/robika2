type Handler = (payload?: unknown) => void;

class TypedEventBus {
  private listeners = new Map<string, Set<Handler>>();

  constructor() {
    if (typeof window !== "undefined") {
      const w = window as unknown as { __ebInstances?: number };
      w.__ebInstances = (w.__ebInstances ?? 0) + 1;
    }
  }

  on(event: string, handler: Handler): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(handler);
    if (typeof window !== "undefined") {
      const w = window as unknown as { __busOn?: Record<string, number> };
      w.__busOn = { ...(w.__busOn ?? {}), [event]: (w.__busOn?.[event] ?? 0) + 1 };
    }
    return () => {
      set.delete(handler);
    };
  }

  emit(event: string, payload?: unknown): void {
    if (typeof window !== "undefined") {
      const w = window as unknown as { __busEmit?: Record<string, number> };
      w.__busEmit = { ...(w.__busEmit ?? {}), [event]: (w.__busEmit?.[event] ?? 0) + 1 };
    }
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

// Singleton global — kebal duplikasi modul antar-chunk bundler.
const g = globalThis as unknown as { __robikaBus?: TypedEventBus };
export const EventBus = g.__robikaBus ?? (g.__robikaBus = new TypedEventBus());
