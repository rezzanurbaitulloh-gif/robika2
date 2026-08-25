import { create } from "zustand";
import { EventBus } from "@/game/EventBus";

/** §75 state slices — sumber kebenaran UI; engine tetap memancarkan event. */

interface UIState {
  toast: string | null;
  prompt: string | null;
  dialogue: { speaker: string; text: string } | null;
  terminalChallenge: string | null;
  toastSeq: number;
  setToast: (t: string | null) => void;
  setPrompt: (p: string | null) => void;
  setDialogue: (d: { speaker: string; text: string } | null) => void;
  setTerminal: (id: string | null) => void;
}

export const useUIState = create<UIState>((set) => ({
  toast: null,
  prompt: null,
  dialogue: null,
  terminalChallenge: null,
  toastSeq: 0,
  setToast: (t) => set((s) => ({ toast: t, toastSeq: s.toastSeq + 1 })),
  setPrompt: (p) => set({ prompt: p }),
  setDialogue: (d) => set({ dialogue: d }),
  setTerminal: (id) => set({ terminalChallenge: id }),
}));

interface PlayerState {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  credits: number;
  gems: number;
  setVitals: (hp: number, maxHp: number) => void;
  setWallet: (w: Partial<Pick<PlayerState, "level" | "xp" | "credits" | "gems">>) => void;
}

export const usePlayerState = create<PlayerState>((set) => ({
  hp: 50,
  maxHp: 50,
  level: 1,
  xp: 0,
  credits: 0,
  gems: 0,
  setVitals: (hp, maxHp) => set({ hp, maxHp }),
  setWallet: (w) => set(w),
}));

interface QuestState {
  activeQuest: {
    id: string;
    title: string;
    state: "active" | "ready_turn_in";
    objectives: Array<{ id: string; text: string; done: boolean }>;
  } | null;
  setQuest: (q: QuestState["activeQuest"]) => void;
}

export const useQuestState = create<QuestState>((set) => ({
  activeQuest: null,
  setQuest: (q) => set({ activeQuest: q }),
}));

/** Jembatan event engine -> store (dipasang sekali di GameCanvas). */
export function bindEngineEvents(): () => void {
  const offs = [
    EventBus.on("ui:toast", (p) => useUIState.getState().setToast((p as { text: string }).text)),
    EventBus.on("ui:prompt", (p) =>
      useUIState.getState().setPrompt(p ? (p as { label: string }).label : null)
    ),
    EventBus.on("ui:dialogue:start", (p) =>
      useUIState.getState().setDialogue((p as { line: { speaker: string; text: string } }).line)
    ),
    EventBus.on("ui:dialogue:line", (p) =>
      useUIState.getState().setDialogue((p as { line: { speaker: string; text: string } }).line)
    ),
    EventBus.on("ui:dialogue:end", () => useUIState.getState().setDialogue(null)),
    EventBus.on("ui:hp", (p) => {
      const v = p as { hp: number; max: number };
      usePlayerState.getState().setVitals(v.hp, v.max);
    }),
    EventBus.on("wallet:data", (p) => usePlayerState.getState().setWallet(p as Record<string, number>)),
  ];
  return () => offs.forEach((off) => off());
}
