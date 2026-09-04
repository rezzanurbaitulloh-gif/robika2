"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

type Pull = { item_key: string; rarity: string; is_duplicate: boolean; created_at: string };

const RARITY: Record<string, string> = {
  common: "border-zinc-700 bg-zinc-900/40 text-zinc-400",
  uncommon: "border-green-700 bg-green-950/30",
  rare: "border-blue-600 bg-blue-950/30 text-blue-400",
  epic: "border-purple-600 bg-purple-950/30 text-purple-300",
  legendary: "border-amber-500 bg-amber-950/30 text-amber-300",
};

export default function GachaPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [pity, setPity] = useState<number | null>(null);
  const [history, setHistory] = useState<Pull[]>([]);
  const [result, setResult] = useState<{ item_key: string; rarity: string; duplicate: boolean } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const supabase = createClient();
    const [wallet, pityRow, pulls] = await Promise.all([
      supabase.from("wallets").select("credits").maybeSingle(),
      supabase.from("gacha_pity").select("pity_count").eq("banner_id", "capsule_aetheria").maybeSingle(),
      supabase.from("gacha_pulls").select("item_key, rarity, is_duplicate, created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setCredits((wallet.data as { credits?: number } | null)?.credits ?? 0);
    setPity((pityRow.data as { pity_count?: number } | null)?.pity_count ?? 0);
    setHistory((pulls.data as Pull[]) ?? []);
  };

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, []);

  async function pull() {
    setMsg(null);
    setResult(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("gacha_pull", { p_banner_id: "capsule_aetheria" });
    if (error) {
      setMsg(error.message);
      return;
    }
    const r = data as { status?: string; credits?: number; item_key?: string; rarity?: string; duplicate?: boolean; pity?: number };
    if (r.status === "insufficient") {
      setMsg(`Credits tidak cukup! Butuh 50, kamu punya ${r.credits}. Selesaikan quest untuk mendapat Credits.`);
      return;
    }
    setResult({ item_key: r.item_key!, rarity: r.rarity!, duplicate: !!r.duplicate });
    setMsg(r.duplicate ? "Duplikat — dikonversi +10 Credits" : "Item baru masuk Vault!");
    void load();
  }

  return (
    <main className="min-h-screen bg-[#0d1b1e] p-6 font-mono text-emerald-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/game" className="text-xs text-emerald-600 underline">« {t("common.back")}</Link>
        <h1 className="mt-3 text-3xl font-black tracking-widest text-emerald-400" style={{ textShadow: "3px 3px 0 #064e3b" }}>
          CAPSULE
        </h1>
        <p className="mt-2 text-xs text-emerald-400/70">Buka capsule untuk koleksi. Server yang mengacak, pity setiap 10 tarikan.</p>

        <div className="mt-4 flex items-center gap-3 text-xs">
          <span className="rounded bg-black/40 px-3 py-1 text-amber-300">◈ {credits ?? "…"}</span>
          <span className="rounded bg-black/40 px-3 py-1 text-zinc-400">Pity: {pity ?? "…"}/10</span>
        </div>

        <div className="mt-4 rounded border border-amber-800 bg-amber-950/20 p-4">
          <p className="text-xs font-bold text-amber-300">Capsule Aetheria — ◈ 50</p>
          <p className="mt-1 text-[11px] text-zinc-400">Rates: Common 56% · Uncommon 0% · Rare 28% · Epic 15% · Legendary 1% — pity jamin rare+ setiap 10.</p>
          <button onClick={() => void pull()} className="mt-3 w-full rounded bg-amber-600 py-2 text-sm font-bold text-black hover:bg-amber-500">
            BUKA CAPSULE (◈ 50)
          </button>
          {msg && <p className="mt-2 text-xs text-amber-300">{msg}</p>}
          {result && (
            <div className={`mt-3 rounded border p-3 ${RARITY[result.rarity] ?? RARITY.common}`}>
              <p className="text-xs font-bold">{result.item_key}</p>
              <p className="text-[10px] uppercase tracking-widest">{result.rarity} {result.duplicate ? "· duplikat" : "· baru!"}</p>
            </div>
          )}
        </div>

        <h2 className="mt-6 text-xs font-bold tracking-widest text-zinc-500">RIWAYAT</h2>
        <div className="mt-2 space-y-1">
          {history.length === 0 && <p className="text-[11px] text-zinc-600">Belum ada tarikan.</p>}
          {history.map((h, i) => (
            <div key={i} className="flex justify-between rounded bg-black/30 px-3 py-1.5 text-[11px] text-zinc-400">
              <span className={RARITY[h.rarity]?.split(" ")[2] ?? ""}>{h.item_key} · {h.rarity}{h.is_duplicate ? " (dup)" : ""}</span>
              <span>{new Date(h.created_at).toLocaleString("id-ID")}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
