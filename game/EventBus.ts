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
    return () => {
      set.delete(handler);
    };
  }

  emit(event: string, payload?: unknown): void {
    this.listeners.get(event)?.forEach((h) => h(payload));
  }
}

export const EventBus = new TypedEventBus();
