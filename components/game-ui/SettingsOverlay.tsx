"use client";

import { useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { t, getLocale, setLocale } from "@/lib/i18n";
import { audio } from "@/game/audio/AudioSystem";

/** §59 — Pengaturan in-game (overlay, dibuka dari Title scene) + halaman /settings. */
export function SettingsOverlay() {
  const [open, setOpen] = useState(false);
  const [vol, setVol] = useState(audio.getVolumes());
  const [locale, setLocaleState] = useState("id");

  useEffect(() => {
    const t = setTimeout(() => setLocaleState(getLocale()), 0);
    const off = EventBus.on("ui:settings:open", () => setOpen(true));
    return () => {
      clearTimeout(t);
      off();
    };
  }, []);

  if (!open) return null;

  function close() {
    audio.play("ui.click");
    setOpen(false);
  }

  function change(patch: Partial<typeof vol>) {
    const next = { ...vol, ...patch };
    setVol(next);
    audio.setVolumes(next);
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border-2 border-emerald-700 bg-[#0d1b1e] p-5">
        <h2 className="font-mono text-lg font-bold tracking-widest text-emerald-300">
          {t("settings.title")}
        </h2>

        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-emerald-600">
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
          className="mt-1 rounded bg-[#12262b] px-2 py-1 font-mono text-xs text-emerald-100 ring-1 ring-emerald-800"
        >
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </select>

        <div className="mt-6 flex justify-end">
          <button
            onClick={close}
            className="rounded border-b-2 border-emerald-800 bg-emerald-600 px-5 py-1.5 font-mono text-xs font-bold text-[#0d1b1e]"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/** §57 — Prompt rotasi untuk portrait. */
export function RotatePrompt() {
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const check = () => setPortrait(window.innerHeight > window.innerWidth);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!portrait) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1b1e] p-8 text-center">
      <div className="mb-6 animate-bounce text-5xl">📱↻</div>
      <p className="font-mono text-sm text-emerald-300">{t("hud.rotate")}</p>
    </div>
  );
}
