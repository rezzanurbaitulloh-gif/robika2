"use client";

import { useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { touch } from "@/lib/game/touchInput";

export function Hud() {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const off = EventBus.on("game:saved", () => {
      setSaved(true);
      clearTimeout(t);
      t = setTimeout(() => setSaved(false), 1600);
    });
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
      <div className="rounded bg-black/60 px-2 py-1 font-mono text-[11px] font-bold tracking-widest text-emerald-300">
        ROBIKA
      </div>
      <div
        className={`rounded bg-black/60 px-2 py-1 font-mono text-[11px] transition-opacity ${
          saved ? "text-emerald-300 opacity-100" : "opacity-0"
        }`}
      >
        Tersimpan ✓
      </div>
    </div>
  );
}

function PadButton({
  label,
  onPress,
  onRelease,
}: {
  label: string;
  onPress: () => void;
  onRelease: () => void;
}) {
  return (
    <button
      className="h-12 w-12 select-none rounded bg-black/55 font-mono text-lg text-emerald-200 ring-1 ring-emerald-800 active:bg-emerald-900"
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export function TouchControls() {
  function set(dx: number, dy: number) {
    return () => touch.set(dx, dy);
  }
  return (
    <div className="absolute inset-x-0 bottom-4 z-20 flex items-end justify-between px-5 md:hidden">
      <div className="grid grid-cols-3 gap-1">
        <span />
        <PadButton label="▲" onPress={set(0, -1)} onRelease={() => touch.reset()} />
        <span />
        <PadButton label="◀" onPress={set(-1, 0)} onRelease={() => touch.reset()} />
        <span />
        <PadButton label="▶" onPress={set(1, 0)} onRelease={() => touch.reset()} />
        <span />
        <PadButton label="▼" onPress={set(0, 1)} onRelease={() => touch.reset()} />
        <span />
      </div>
      <button
        className="h-16 w-16 rounded-full bg-emerald-800/80 font-mono text-sm font-bold text-emerald-100 ring-2 ring-emerald-500 active:bg-emerald-600"
        onClick={() => {
          touch.reset();
          EventBus.emit("input:interact");
        }}
      >
        E
      </button>
    </div>
  );
}
