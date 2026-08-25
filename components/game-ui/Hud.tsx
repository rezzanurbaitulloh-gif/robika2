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
  const [gems, setGems] = useState(0);

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
    const offWallet = EventBus.on("wallet:data", (p) =>
      setGems((p as { gems?: number }).gems ?? 0)
    );
    return () => {
      off();
      offHp();
      offEn();
      offWallet();
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
      <div className="flex items-center gap-2">
        <div className="rounded bg-black/60 px-2 py-1 font-mono text-[11px] font-bold tracking-widest text-emerald-300">
          ROBIKA
        </div>
        <InboxDrawer />
      </div>
      <div className="space-y-1">
        <div className="rounded bg-black/60 px-2 py-1 font-mono text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-red-400">HP</span>
            <div className="h-2 w-20 overflow-hidden rounded bg-black/70 ring-1 ring-red-900">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(hp.hp / hp.max) * 100}%` }}
              />
            </div>
            <span className="text-red-300">
              {hp.hp}/{hp.max}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            <span className="text-teal-300">{t("hud.energy")}</span>
            <div className="h-1.5 w-20 overflow-hidden rounded bg-black/70 ring-1 ring-teal-900">
              <div
                className="h-full bg-teal-400 transition-all"
                style={{ width: `${(energy.energy / energy.max) * 100}%` }}
              />
            </div>
          </div>
        </div>
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
      <div className="flex items-center gap-3">
        <button
          className="h-12 w-12 rounded-full bg-teal-900/80 font-mono text-xs font-bold text-teal-100 ring-2 ring-teal-500 active:bg-teal-600 md:hidden"
          onClick={() => {
            touch.reset();
            EventBus.emit("input:dodge");
          }}
        >
          »»
        </button>
        <button
          className="h-16 w-16 rounded-full bg-red-900/80 font-mono text-sm font-bold text-red-100 ring-2 ring-red-500 active:bg-red-600 md:hidden"
          onClick={() => {
            touch.reset();
            EventBus.emit("input:attack");
          }}
        >
          ⚔
        </button>
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
    </div>
  );
}
