import { EventBus } from "@/game/EventBus";

/**
 * Input keyboard via window listener + EventBus — bypass keyboard internal
 * Phaser (tidak reliabel lintas lingkungan). Dipakai TitleScene & HubScene.
 */

const state = {
  up: false,
  down: false,
  left: false,
  right: false,
};

const MAP: Record<string, keyof typeof state> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

let attached = false;

export function attachKeyboardInput(): void {
  if (attached || typeof window === "undefined") return;
  attached = true;
  (window as unknown as { __kbAttached: boolean }).__kbAttached = true;

  window.addEventListener("keydown", (e) => {
    const w = window as unknown as { __kbLog?: string[] };
    w.__kbLog = [...(w.__kbLog ?? []), e.code].slice(-8);
    const dir = MAP[e.code];
    if (dir) {
      state[dir] = true;
      return;
    }
    if (e.code === "Space") {
      EventBus.emit("input:attack");
      return;
    }
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      EventBus.emit("input:dodge");
      return;
    }
    if (e.code === "KeyE") {
      EventBus.emit("input:interact");
      return;
    }
    if (e.code === "Enter") {
      EventBus.emit("input:confirm");
      return;
    }
    if (e.code === "ArrowUp" && e.shiftKey) EventBus.emit("input:menu:up");
    if (e.code === "ArrowDown" && e.shiftKey) EventBus.emit("input:menu:down");
  });

  window.addEventListener("keyup", (e) => {
    const dir = MAP[e.code];
    if (dir) state[dir] = false;
  });
}

export function emitConfirmDirect(): void {
  EventBus.emit("input:confirm");
}
declare global {
  interface Window { __emitConfirm?: () => void }
}
if (typeof window !== "undefined") {
  (window as { __emitConfirm?: () => void }).__emitConfirm = emitConfirmDirect;
}

export function keyboardState() {
  return state;
}
