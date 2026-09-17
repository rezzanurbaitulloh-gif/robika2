"use client";

import { useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { touch } from "@/lib/game/touchInput";
import { InboxDrawer } from "@/components/game-ui/InboxDrawer";
import { t } from "@/lib/i18n";

export function Hud() {
  const [saved, setSaved] = useState(false);
  const [hp, setHp] = useState({ hp: 50, max: 50 });
  const [energy, setEnergy] = useState({ energy: 100, max: 100 });

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const off = EventBus.on("game:saved", () => {
      setSaved(true);
      clearTimeout(t);
      t = setTimeout(() => setSaved(false), 1600);
    });
    const offHp = EventBus.on("ui:hp", (p) =>
      setHp(p as { hp: number; max: number })
    );
    const offEn = EventBus.on("ui:energy", (p) =>
      setEnergy(p as { energy: number; max: number })
    );
    return () => {
      off();
      offHp();
      offEn();
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-black/70 px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.14em] text-emerald-300 shadow-[0_2px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-sm">
          ROBIKA
        </div>
        <InboxDrawer />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="rounded-lg bg-black/70 px-2.5 py-2 font-mono text-[11px] shadow-[0_2px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 text-center text-[10px] font-bold tracking-widest text-red-400">HP</span>
            <div className="h-2.5 w-24 overflow-hidden rounded-full bg-black/60 ring-1 ring-red-900/60 sm:w-28">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 ease-out"
                style={{ width: `${(hp.hp / hp.max) * 100}%` }}
              />
            </div>
            <span className="min-w-[3ch] text-right text-[11px] font-medium tabular-nums text-red-200">
              {hp.hp}/{hp.max}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="w-6 text-center text-[10px] font-bold tracking-widest text-teal-300">{t("hud.energy")}</span>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/60 ring-1 ring-teal-900/60 sm:w-28">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-600 to-teal-300 transition-all duration-300 ease-out"
                style={{ width: `${(energy.energy / energy.max) * 100}%` }}
              />
            </div>
            <span className="min-w-[3ch] text-right text-[10px] tabular-nums text-teal-200">
              {Math.round(energy.energy)}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`rounded-lg bg-black/70 px-2.5 py-1.5 font-mono text-[11px] font-medium shadow-[0_2px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 ${
          saved ? "translate-y-0 text-emerald-300 opacity-100" : "-translate-y-1 text-emerald-300/0 opacity-0"
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
      className="h-[44px] w-[44px] select-none rounded-xl bg-black/60 font-mono text-lg text-emerald-200 shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-sm transition-colors duration-100 active:scale-[0.96] active:bg-emerald-900"
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
    <div className="absolute inset-x-0 bottom-3 z-20 flex items-end justify-between gap-3 px-3 sm:px-4 md:hidden">
      <div className="rounded-2xl bg-black/40 p-2 shadow-[0_4px_24px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-md">
        <div className="grid grid-cols-3 gap-1.5">
          <span />
          <PadButton label="▲" onPress={set(0, -1)} onRelease={() => touch.reset()} />
          <span />
          <PadButton label="◀" onPress={set(-1, 0)} onRelease={() => touch.reset()} />
          <div className="flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-emerald-900/30 ring-1 ring-emerald-800/50">
            <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
          </div>
          <PadButton label="▶" onPress={set(1, 0)} onRelease={() => touch.reset()} />
          <span />
          <PadButton label="▼" onPress={set(0, 1)} onRelease={() => touch.reset()} />
          <span />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-teal-900/90 font-mono text-[11px] font-bold tracking-widest text-teal-100 shadow-[0_2px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/15 backdrop-blur-sm transition-transform duration-100 active:scale-[0.96] active:bg-teal-700"
          onClick={() => {
            touch.reset();
            EventBus.emit("input:dodge");
          }}
        >
          »»
        </button>
        <button
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-800 to-red-900 font-mono text-base font-bold text-red-100 shadow-[0_4px_16px_rgba(0,0,0,0.5)] ring-1 ring-white/15 backdrop-blur-sm transition-transform duration-100 active:scale-[0.96] active:from-red-700 active:to-red-800"
          onClick={() => {
            touch.reset();
            EventBus.emit("input:attack");
          }}
        >
          ⚔
        </button>
        <button
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-800 font-mono text-sm font-bold tracking-widest text-emerald-50 shadow-[0_4px_16px_rgba(0,0,0,0.5)] ring-1 ring-white/15 backdrop-blur-sm transition-transform duration-100 active:scale-[0.96] active:from-emerald-600 active:to-emerald-700"
          onClick={() => {
            touch.reset();
            EventBus.emit("input:interact");
          }}
        >
          E
        </button>
      </div>
    </div>
  );
}
