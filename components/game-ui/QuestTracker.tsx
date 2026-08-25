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
    <div className="pointer-events-none absolute left-3 top-12 z-20 w-56 rounded border border-emerald-800 bg-black/65 p-2">
      <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-600">{t("quest.tracker")}</p>
      <p className="font-mono text-xs font-bold text-emerald-200">{quest.title}</p>
      <ul className="mt-1 space-y-0.5">
        {quest.objectives.map((o) => (
          <li
            key={o.id}
            className={`font-mono text-[11px] leading-snug ${
              o.done ? "text-emerald-500 line-through" : "text-emerald-300"
            }`}
          >
            {o.done ? "☑" : "☐"} {o.text}
          </li>
        ))}
      </ul>
      {quest.state === "ready_turn_in" && (
        <p className="mt-1 animate-pulse font-mono text-[10px] text-amber-300">{t("quest.return")}</p>
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
    <div className="pointer-events-none absolute right-3 top-12 z-20 flex gap-2">
      <span className="rounded bg-black/65 px-2 py-1 font-mono text-[11px] text-amber-300">
        ◈ {wallet.credits}
      </span>
      <span className="rounded bg-black/65 px-2 py-1 font-mono text-[11px] text-emerald-300">
        Lv {wallet.level} · {wallet.xp} XP
      </span>
    </div>
  );
}
