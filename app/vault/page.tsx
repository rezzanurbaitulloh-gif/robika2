"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

type VaultItem = { item_key: string; category: string; rarity: string; acquired_at: string };
type Achievement = { id: string; title: string; description: string };
type Loadout = Record<string, string | null>;

const RARITY_COLOR: Record<string, string> = {
  common: "border-zinc-700 bg-zinc-900 text-zinc-400",
  uncommon: "border-green-700 bg-green-950 text-green-400",
  rare: "border-blue-600 bg-blue-950 text-blue-400",
  epic: "border-purple-600 bg-purple-950 text-purple-300",
  legendary: "border-amber-500 bg-amber-950 text-amber-300",
};

export default function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loadout, setLoadout] = useState<Loadout | null>(null);
  const [inventory, setInventory] = useState<{ item_key: string; quantity: number }[]>([]);

  const load = async () => {
    const supabase = createClient();
    const [v, a, c, l, inv] = await Promise.all([
      supabase.from("vault_items").select("item_key, category, rarity, acquired_at").order("acquired_at", { ascending: false }),
      supabase.from("achievements").select("id, title, description").order("id"),
      supabase.from("achievement_completions").select("achievement_id"),
      supabase.from("loadout").select("skin_key, weapon_key, gear_key, module_key, companion_key, effect_key").maybeSingle(),
      supabase.from("inventory").select("item_key, quantity").order("item_key"),
    ]);
    setItems((v.data as VaultItem[]) ?? []);
    setAchievements((a.data as Achievement[]) ?? []);
    setCompleted(new Set(((c.data ?? []) as { achievement_id: string }[]).map((r) => r.achievement_id)));
    setLoadout((l.data as Loadout | null) ?? null);
    setInventory(((inv.data ?? []) as { item_key: string; quantity: number }[]));
  };

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, []);

  async function equip(category: string, key: string) {
    const supabase = createClient();
    const col = category === "skin" ? "p_skin" : category === "weapon" ? "p_weapon" : category === "gear" ? "p_gear" : "p_module";
    await supabase.rpc("equip_loadout", { [col]: key });
    void load();
  }

  const categories = ["skin", "weapon", "gear", "module", "companion", "badge", "effect", "emote"];

  return (
    <main className="min-h-screen bg-[#0d1b1e] p-6 font-mono text-emerald-100">
      <div className="mx-auto max-w-4xl">
        <Link href="/game" className="text-xs text-emerald-600 underline">
          « {t("common.back")}
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-widest text-emerald-400" style={{ textShadow: "3px 3px 0 #064e3b" }}>
          VAULT
        </h1>
        <p className="mt-2 text-xs text-emerald-400/70">
          Koleksi permanen — semua yang telah kamu buka. Inventory = yang dibawa sekarang; Vault = semua yang dimiliki.
        </p>

        {/* Loadout */}
        {loadout && (
          <div className="mt-6 rounded border border-emerald-900 bg-[#12262b] p-4">
            <p className="text-[10px] uppercase tracking-widest text-emerald-600">Loadout Aktif</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {(["skin_key", "weapon_key", "gear_key", "module_key"] as const).map((k) => (
                <span key={k} className="rounded bg-black/40 px-2 py-1 text-emerald-300">
                  {k.replace("_key", "")}: {loadout[k] ?? "—"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Inventory */}
        {inventory.length > 0 && (
          <div className="mt-6 rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Inventory</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {inventory.map((it) => (
                <span key={it.item_key} className="rounded bg-black/40 px-2 py-1 text-xs text-zinc-300">
                  {it.item_key} ×{it.quantity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <h2 className="mt-8 text-sm font-bold tracking-widest text-emerald-300">ACHIEVEMENTS</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`rounded border p-3 ${completed.has(a.id) ? "border-amber-700 bg-amber-950/30" : "border-zinc-800 bg-zinc-900/40 opacity-60"}`}
            >
              <p className="text-xs font-bold text-emerald-200">
                {completed.has(a.id) ? "★ " : "☆ "}
                {a.title}
              </p>
              <p className="mt-1 text-[11px] text-emerald-500">{a.description}</p>
            </div>
          ))}
          {!achievements.length && <p className="text-xs text-emerald-700">Memuat…</p>}
        </div>

        {/* Vault grid per kategori */}
        {categories.map((cat) => {
          const filtered = items.filter((i) => i.category === cat);
          if (!filtered.length) return null;
          return (
            <div key={cat} className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-500">{cat}</h3>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {filtered.map((it) => (
                  <div
                    key={it.item_key}
                    className={`rounded border p-3 ${RARITY_COLOR[it.rarity] ?? RARITY_COLOR.common}`}
                  >
                    <p className="text-xs font-bold">{it.item_key}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest opacity-70">{it.rarity}</p>
                    {(cat === "skin" || cat === "weapon") && (
                      <button
                        onClick={() => void equip(cat, it.item_key)}
                        className="mt-2 w-full rounded bg-black/30 px-2 py-1 text-[10px] font-bold hover:bg-black/50"
                      >
                        Equip
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {!items.length && (
          <p className="mt-8 rounded border border-emerald-900 bg-[#12262b] p-4 text-center text-xs text-emerald-600">
            Vault kosong. Selesaikan quest & achievements untuk membuka koleksi!
          </p>
        )}
      </div>
    </main>
  );
}
