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

  async load():
    Promise<{ position: { x: number; y: number }; state: Record<string, unknown> } | null> {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("saves")
        .select("position, state")
        .eq("user_id", user.id)
        .eq("slot", 1)
        .maybeSingle();
      if (error || !data) return null;
      return { position: data.position, state: data.state ?? {} };
    } catch {
      return null;
    }
  }

  save(sceneName: string, position: { x: number; y: number }, state: Record<string, unknown>) {
    clearTimeout(this.debounce);
    this.debounce = setTimeout(async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const payload: SavePayload = {
          world_id: this.worldId,
          scene: sceneName,
          position,
          state,
          device_id: deviceId(),
        };
        const { error } = await supabase.from("saves").upsert(
          { ...payload, user_id: user.id, slot: 1 },
          { onConflict: "user_id,slot" }
        );
        if (!error) import("@/game/EventBus").then((m) => m.EventBus.emit("game:saved", {}));
      } catch {}
    }, 800);
  }
}
