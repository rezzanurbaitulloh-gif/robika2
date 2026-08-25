type Handler = (payload?: unknown) => void;

class TypedEventBus {
  private listeners = new Map<string, Set<Handler>>();

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

export const EventBus = new TypedEventBus();
