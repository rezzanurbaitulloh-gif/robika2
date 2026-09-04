"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

type ShopItem = { id: string; title: string; description: string; kind: string; price_credits: number; rarity: string };
type Purchase = { id: string; shop_item_id: string; created_at: string };

const RARITY: Record<string, string> = {
  common: "border-zinc-700 bg-zinc-900/40 text-zinc-400",
  uncommon: "border-green-700 bg-green-950/30 text-green-400",
  rare: "border-blue-600 bg-blue-950/30 text-blue-400",
  epic: "border-purple-600 bg-purple-950/30 text-purple-300",
  legendary: "border-amber-500 bg-amber-950/30 text-amber-300",
};

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [history, setHistory] = useState<Purchase[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const supabase = createClient();
    const [shop, hist, wallet] = await Promise.all([
      supabase.from("shop_items").select("id, title, description, kind, price_credits, rarity").order("sort_order"),
      supabase.from("purchases").select("id, shop_item_id, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("wallets").select("credits").maybeSingle(),
    ]);
    setItems((shop.data as ShopItem[]) ?? []);
    setHistory((hist.data as Purchase[]) ?? []);
    setCredits((wallet.data as { credits?: number } | null)?.credits ?? 0);
  };

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, []);

  async function buy(id: string) {
    setMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("purchase_with_credits", { p_shop_item_id: id });
    if (error) {
      setMsg(error.message);
      return;
    }
    const res = data as { status?: string; credits?: number };
    if (res.status === "insufficient") {
      setMsg("Credits tidak cukup!");
      return;
    }
    setMsg("Pembelian berhasil! Cek Vault.");
    void load();
  }

  return (
    <main className="min-h-screen bg-[#0d1b1e] p-6 font-mono text-emerald-100">
      <div className="mx-auto max-w-4xl">
        <Link href="/game" className="text-xs text-emerald-600 underline">« {t("common.back")}</Link>
        <div className="mt-3 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-widest text-emerald-400" style={{ textShadow: "3px 3px 0 #064e3b" }}>
            TOKO
          </h1>
          <span className="rounded bg-black/40 px-3 py-1 text-xs text-amber-300">◈ {credits ?? "…"}</span>
        </div>
        <p className="mt-2 text-xs text-emerald-400/70">Belanja kosmetik & equipment dengan Credits. Gems & Top-up (Midtrans) segera.</p>
        {msg && <p className="mt-3 rounded bg-black/40 p-2 text-xs text-amber-300">{msg}</p>}

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((it) => (
            <div key={it.id} className={`rounded border p-4 ${RARITY[it.rarity] ?? RARITY.common}`}>
              <p className="text-xs font-bold">{it.title}</p>
              <p className="mt-1 text-[11px] opacity-70">{it.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">◈ {it.price_credits || "—"}</span>
                {it.price_credits > 0 ? (
                  <button onClick={() => void buy(it.id)} className="rounded bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-600">
                    Beli
                  </button>
                ) : (
                  <span className="text-[11px] opacity-50">Segera</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-xs font-bold tracking-widest text-emerald-500">RIWAYAT PEMBELIAN</h2>
        <div className="mt-2 space-y-1">
          {history.length === 0 && <p className="text-[11px] text-zinc-600">Belum ada pembelian.</p>}
          {history.map((h) => (
            <div key={h.id} className="flex justify-between rounded bg-black/30 px-3 py-2 text-[11px] text-zinc-400">
              <span>{h.shop_item_id}</span>
              <span>{new Date(h.created_at).toLocaleString("id-ID")}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
