import { createClient } from "@/lib/supabase/client";

export interface SavePayload {
  world_id: string;
  scene: string;
  position: { x: number; y: number };
  state: Record<string, unknown>;
  device_id?: string;
}

function deviceId(): string {
  let id = localStorage.getItem("robika_device");
  if (!id) {
    id = `dvc_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("robika_device", id);
  }
  return id;
}

export class SaveSystem {
  private worldId: string;
  private debounce?: ReturnType<typeof setTimeout>;

  constructor(worldId: string) {
    this.worldId = worldId;
  }

  async load(): Promise<{
    world_id?: string;
    position: { x: number; y: number };
    state: Record<string, unknown>;
  } | null> {
    // Try remote first (when online)
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("saves")
            .select("world_id, position, state")
            .eq("user_id", user.id)
            .eq("slot", 1)
            .maybeSingle();
          if (!error && data) {
            return {
              world_id: data.world_id,
              position: data.position,
              state: data.state ?? {},
            };
          }
        }
      } catch {}
    }
    // Fallback to local cache (offline or no remote save)
    try {
      const raw = localStorage.getItem("robika_save_queue");
      if (raw) {
        const q = JSON.parse(raw) as SavePayload;
        return { world_id: q.world_id, position: q.position, state: q.state };
      }
    } catch {}
    return null;
  }

  save(sceneName: string, position: { x: number; y: number }, state: Record<string, unknown>) {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(async () => {
      const localKey = "robika_save_queue";
      const payload: SavePayload = {
        world_id: this.worldId,
        scene: sceneName,
        position,
        state,
        device_id: deviceId(),
      };
      // Always cache locally for offline
      try {
        localStorage.setItem(localKey, JSON.stringify({ ...payload, at: Date.now() }));
      } catch {}
      // Try sync if online
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        import("@/game/EventBus").then((m) => m.EventBus.emit("game:saved", {}));
        return;
      }
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { error } = await supabase.from("saves").upsert(
          { ...payload, user_id: user.id, slot: 1 },
          { onConflict: "user_id,slot" }
        );
        if (!error) import("@/game/EventBus").then((m) => m.EventBus.emit("game:saved", {}));
        else throw error;
      } catch {
        // keep in queue, will sync on next online event
        window.addEventListener(
          "online",
          () => {
            void (async () => {
              try {
                const queued = localStorage.getItem(localKey);
                if (!queued) return;
                const q = JSON.parse(queued) as SavePayload;
                const supabase = createClient();
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;
                await supabase.from("saves").upsert(
                  { ...q, user_id: user.id, slot: 1 },
                  { onConflict: "user_id,slot" }
                );
              } catch {}
            })();
          },
          { once: true }
        );
      }
    }, 800);
  }
}
