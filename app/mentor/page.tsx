"use client";

import { useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";

export default function MentorPage() {
  const [prompt, setPrompt] = useState("");
  const [log, setLog] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (busy || !prompt.trim()) return;
    const q = prompt.trim();
    setPrompt("");
    setLog((l) => [...l, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: q }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setLog((l) => [...l, { role: "ai", text: data.reply ?? data.error ?? "Maaf, coba lagi." }]);
    } catch {
      setLog((l) => [...l, { role: "ai", text: "Gagal terhubung." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d1b1e] p-6 font-mono text-emerald-100">
      <div className="mx-auto max-w-2xl">
        <Link href="/game" className="text-xs text-emerald-600 underline">« {t("common.back")}</Link>
        <h1 className="mt-3 text-3xl font-black tracking-widest text-emerald-400" style={{ textShadow: "3px 3px 0 #064e3b" }}>
          MENTOR AI
        </h1>
        <p className="mt-2 text-xs text-emerald-400/70">Tanya konsep coding — aku beri petunjuk, bukan jawaban penuh.</p>

        <div className="mt-6 space-y-2 rounded border border-emerald-900 bg-[#12262b] p-4">
          {log.length === 0 && <p className="text-xs text-emerald-700">Contoh: “bagaimana loop bekerja?”</p>}
          {log.map((m, i) => (
            <div key={i} className={`rounded px-3 py-2 text-xs ${m.role === "user" ? "bg-emerald-900/40 text-emerald-200" : "bg-black/40 text-emerald-400"}`}>
              <span className="font-bold">{m.role === "user" ? "Kamu:" : "Mentor:"}</span> {m.text}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void send()}
            placeholder="Ketik pertanyaanmu…"
            className="flex-1 rounded border border-emerald-800 bg-[#12262b] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button onClick={() => void send()} disabled={busy} className="rounded bg-emerald-600 px-4 py-2 text-sm font-bold text-[#0d1b1e] disabled:opacity-40">
            Kirim
          </button>
        </div>
      </div>
    </main>
  );
}
