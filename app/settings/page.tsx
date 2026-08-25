"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t, getLocale, setLocale } from "@/lib/i18n";
import { audio } from "@/game/audio/AudioSystem";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [vol, setVol] = useState({ master: 0.8, music: 0.5, sfx: 0.7 });
  const [locale, setLocaleState] = useState("id");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setVol(audio.getVolumes());
      setLocaleState(getLocale());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function change(patch: Partial<typeof vol>) {
    const next = { ...vol, ...patch };
    setVol(next);
    audio.setVolumes(next);
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function clearDrafts() {
    const kill: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("robika.draft.")) kill.push(k);
    }
    kill.forEach((k) => localStorage.removeItem(k));
    setNote(t("settings.draftsCleared"));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1b1e] p-6">
      <div className="w-full max-w-md rounded-lg border-2 border-emerald-800 bg-[#12262b] p-6">
        <Link href="/game" className="font-mono text-xs text-emerald-500 underline">
          {t("settings.back")}
        </Link>
        <h1 className="mt-2 font-mono text-xl font-bold tracking-widest text-emerald-300">
          {t("settings.title")}
        </h1>

        <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-emerald-600">
          {t("settings.audio")}
        </p>
        {(["master", "music", "sfx"] as const).map((k) => (
          <label key={k} className="mt-2 flex items-center gap-3 font-mono text-xs text-emerald-200">
            <span className="w-20">{t(`settings.${k}`)}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(vol[k] * 100)}
              onChange={(e) => change({ [k]: Number(e.target.value) / 100 })}
              className="flex-1 accent-emerald-500"
            />
            <span className="w-8 text-right text-emerald-400">{Math.round(vol[k] * 100)}</span>
          </label>
        ))}

        <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-emerald-600">
          {t("settings.language")}
        </p>
        <select
          value={locale}
          onChange={(e) => {
            setLocale(e.target.value as "id" | "en");
            setLocaleState(e.target.value);
          }}
          className="mt-1 rounded bg-[#0d1b1e] px-2 py-1 font-mono text-xs text-emerald-100 ring-1 ring-emerald-800"
        >
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </select>

        <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-emerald-600">
          {t("settings.data")}
        </p>
        <div className="mt-2 flex gap-3">
          <button
            onClick={clearDrafts}
            className="rounded bg-black/40 px-3 py-1.5 font-mono text-xs text-emerald-300 ring-1 ring-emerald-800"
          >
            {t("settings.resetDrafts")}
          </button>
          <button
            onClick={() => void logout()}
            className="rounded bg-red-900/70 px-3 py-1.5 font-mono text-xs text-red-200 ring-1 ring-red-700"
          >
            {t("settings.logout")}
          </button>
        </div>
        {note && <p className="mt-3 font-mono text-[11px] text-emerald-400">{note}</p>}
      </div>
    </main>
  );
}
