"use client";

import { useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { t } from "@/lib/i18n";
import { audio } from "@/game/audio/AudioSystem";

/** S55 — popup quest complete bergaya pixel: bintang, reward, tombol lanjut. */
export function QuestPopup() {
  const [data, setData] = useState<{ title: string; xp: number; credits: number } | null>(null);

  useEffect(() => {
    const off = EventBus.on("quest:rewardPopup", (p) => setData(p as { title: string; xp: number; credits: number }));
    return off;
  }, []);

  useEffect(() => {
    if (data) audio.play("quest.complete");
  }, [data]);

  if (!data) return null;
  return (
    <div className="absolute inset-0 z-45 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg border-2 border-amber-500 bg-[#0d1b1e] p-6 text-center shadow-2xl">
        <p className="animate-pulse font-mono text-sm font-black tracking-[0.3em] text-amber-400">
          ★ {t("popup.questComplete")} ★
        </p>
        <h2 className="mt-3 font-mono text-lg font-bold text-emerald-200">{data.title}</h2>
        <div className="mt-4 space-y-1 font-mono text-sm">
          <p className="text-emerald-300">+{data.xp} XP</p>
          <p className="text-amber-300">+{data.credits} Credits</p>
        </div>
        <button
          onClick={() => {
            audio.play("ui.click");
            setData(null);
          }}
          className="mt-6 w-full rounded border-b-4 border-emerald-800 bg-emerald-500 py-2 font-mono text-sm font-black tracking-widest text-[#0d1b1e] hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0"
        >
          {t("popup.continue")}
        </button>
      </div>
    </div>
  );
}
