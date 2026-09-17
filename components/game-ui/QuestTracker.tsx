"use client";

import { useCallback, useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { usePlayerState } from "@/lib/game/stores";

interface QuestView {
  id: string;
  title: string;
  state: "not_started" | "active" | "ready_turn_in" | "completed";
  objectives: Array<{ id: string; text: string; done: boolean }>;
}

export function QuestTracker() {
  const [quest, setQuest] = useState<QuestView | null>(null);

  useEffect(() => {
    const off = EventBus.on("quest:updated", (v) => setQuest(v as QuestView));
    return off;
  }, []);

  if (!quest || quest.state === "not_started" || quest.state === "completed") return null;

  return (
    <div className="pointer-events-none absolute left-2 top-[4.5rem] z-20 w-[14.5rem] rounded-xl border border-emerald-800/50 bg-black/70 p-3 shadow-[0_4px_24px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-md sm:left-3 sm:w-60">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-500/80">{t("quest.tracker")}</p>
      <p className="mt-1 text-balance font-mono text-xs font-bold leading-snug text-emerald-100">{quest.title}</p>
      <ul className="mt-2 space-y-1">
        {quest.objectives.map((o) => (
          <li
            key={o.id}
            className={`flex gap-1.5 font-mono text-[11px] leading-snug transition-colors duration-200 ${
              o.done ? "text-emerald-400/60 line-through" : "text-emerald-200"
            }`}
          >
            <span className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] text-[9px] ${
              o.done ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30" : "bg-white/5 text-emerald-600 ring-1 ring-white/10"
            }`}>
              {o.done ? "✓" : "○"}
            </span>
            <span className="flex-1 text-pretty">{o.text}</span>
          </li>
        ))}
      </ul>
      {quest.state === "ready_turn_in" && (
        <p className="mt-2.5 rounded-lg bg-amber-500/10 px-2 py-1.5 text-center font-mono text-[10px] font-bold tracking-wide text-amber-300 ring-1 ring-amber-500/20">
          {t("quest.return")}
        </p>
      )}
    </div>
  );
}

interface WalletView {
  credits: number;
  gems: number;
  level: number;
  xp: number;
}

export function WalletChip() {
  const [wallet, setWallet] = useState<WalletView | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const [w, c] = await Promise.all([
        supabase.from("wallets").select("credits, gems").eq("user_id", user.id).single(),
        supabase.from("character_state").select("level, xp").eq("user_id", user.id).single(),
      ]);
      if (w.data && c.data) {
        const prev = usePlayerState.getState();
        if (c.data.level > prev.level) {
          EventBus.emit("ui:levelup", {});
          EventBus.emit("ui:toast", { text: `⭐ Lv ${c.data.level}!` });
          void import("@/lib/analytics").then((m) => m.track("level_up", { level: c.data.level }));
          void import("@/lib/notify").then((m) => m.mirrorNotification("level_up", { level: c.data.level }));
        }
        usePlayerState.getState().setWallet({ ...w.data, ...c.data });
        setWallet({ ...w.data, ...c.data });
        EventBus.emit("wallet:data", { ...w.data, level: c.data.level, xp: c.data.xp });
      }
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    const off = EventBus.on("wallet:refresh", () => void refresh());
    return () => {
      clearTimeout(t);
      off();
    };
  }, [refresh]);

  if (!wallet) return null;
  return (
    <div className="pointer-events-none absolute right-2 top-[4.5rem] z-20 flex gap-1.5 sm:right-3">
      <span className="rounded-full bg-black/70 px-2.5 py-1 font-mono text-[11px] font-medium tabular-nums text-amber-300 shadow-[0_2px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-sm">
        ◈ {wallet.credits}
      </span>
      <span className="rounded-full bg-black/70 px-2.5 py-1 font-mono text-[11px] font-medium tabular-nums text-emerald-300 shadow-[0_2px_12px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-sm">
        Lv {wallet.level} · {wallet.xp} XP
      </span>
    </div>
  );
}
