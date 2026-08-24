import { EventBus } from "@/game/EventBus";
import { createClient } from "@/lib/supabase/client";

export type QuestState = "not_started" | "active" | "ready_turn_in" | "completed";

export interface QuestObjectiveView {
  id: string;
  text: string;
  done: boolean;
}

export interface QuestView {
  id: string;
  title: string;
  state: QuestState;
  objectives: QuestObjectiveView[];
}

interface QuestDef {
  id: string;
  title: string;
  giver: string;
  objectives: Array<{ id: string; type: string; target: string; text: string }>;
  rewards: { xp: number; credits: number };
}

const QUEST_FLAG = "q_boot_01_darkened_bridge";

export class QuestEngine {
  private def: QuestDef;
  private flags: Record<string, unknown>;
  private onFlagsDirty: () => void;

  constructor(def: QuestDef, flags: Record<string, unknown>, onFlagsDirty: () => void) {
    this.def = def;
    this.flags = flags;
    this.onFlagsDirty = onFlagsDirty;
  }

  private get state(): QuestState {
    if (this.flags[QUEST_FLAG] === "done") return "completed";
    if (this.flags[QUEST_FLAG] === "active") {
      return this.objectiveDone("obj_talk_mira") && this.objectiveDone("obj_power_gate")
        ? "ready_turn_in"
        : "active";
    }
    return "not_started";
  }

  private objectiveDone(id: string): boolean {
    if (id === "obj_talk_mira") return this.flags["met_mira"] === true;
    if (id === "obj_power_gate") return this.flags["gate_opened"] === true;
    return false;
  }

  view(): QuestView {
    return {
      id: this.def.id,
      title: this.def.title,
      state: this.state,
      objectives: this.def.objectives.map((o) => ({
        id: o.id,
        text: o.text,
        done: o.type === "turn_in" ? false : this.objectiveDone(o.id),
      })),
    };
  }

  /** Which dialogue tree Mira should use right now. */
  miraTree(): string {
    switch (this.state) {
      case "not_started":
        return "first_meeting";
      case "active":
        return "repeat";
      case "ready_turn_in":
        return "turn_in";
      default:
        return "after_done";
    }
  }

  onDialogueEnd(tree: string) {
    if (tree === "first_meeting" && this.state === "not_started") {
      this.flags["met_mira"] = true;
      this.flags[QUEST_FLAG] = "active";
      this.onFlagsDirty();
      EventBus.emit("quest:updated", this.view());
      EventBus.emit("ui:toast", {
        text: `Quest baru: ${this.def.title}! (lihat pelacak kiri-atas)`,
      });
    }
    if (tree === "turn_in" && this.state === "ready_turn_in") {
      void this.turnIn();
    }
  }

  private async turnIn() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("complete_quest", {
        p_quest_id: this.def.id,
      });
      if (error) throw error;
      const res = data as {
        status: string;
        rewards?: { credits?: number; xp_granted?: number; level?: number };
      };
      if (res.status === "already_completed") {
        this.flags[QUEST_FLAG] = "done";
        this.onFlagsDirty();
        EventBus.emit("quest:updated", this.view());
        return;
      }
      this.flags[QUEST_FLAG] = "done";
      this.onFlagsDirty();
      EventBus.emit("quest:updated", this.view());
      EventBus.emit("ui:toast", {
        text: `Quest selesai! +${res.rewards?.xp_granted ?? 0} XP · +${res.rewards?.credits ?? 0} Credits`,
      });
      EventBus.emit("wallet:refresh", {});
    } catch {
      EventBus.emit("ui:toast", {
        text: "Gagal melapor ke server (RPC quest belum aktif). Coba lagi nanti.",
      });
    }
  }
}
