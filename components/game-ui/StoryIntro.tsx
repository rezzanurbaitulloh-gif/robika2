"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { EventBus } from "@/game/EventBus";
import { audio } from "@/game/audio/AudioSystem";

const SLIDES = [1, 2, 3, 4] as const;
const FLAG = "robika.storyIntroSeen";

/** §68 — Story Intro sinematik sebelum Aetheria (sekali, bisa dilewati). */
export function StoryIntro() {
  const [seen, setSeen] = useState(true);
  const [armed, setArmed] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSeen(localStorage.getItem(FLAG) === "1"), 0);
    const off = EventBus.on("world:entering", () => setArmed(true));
    return () => {
      clearTimeout(t);
      off();
    };
  }, []);

  useEffect(() => {
    if (!seen && armed) audio.unlock();
  }, [seen, armed]);

  if (seen || !armed) return null;

  function finish() {
    localStorage.setItem(FLAG, "1");
    setSeen(true);
  }

  function next() {
    audio.play("ui.click");
    if (slide >= SLIDES.length - 1) finish();
    else setSlide((s) => s + 1);
  }

  const n = SLIDES[slide];

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0d1b1e] p-8 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-emerald-700">
        {slide + 1} / {SLIDES.length}
      </p>
      <h2
        className="mt-6 font-mono text-3xl font-black tracking-widest text-emerald-400"
        style={{ textShadow: "3px 3px 0 #064e3b" }}
      >
        {t(`story.${n}.title`)}
      </h2>
      <p className="mt-6 max-w-lg font-mono text-sm leading-relaxed text-emerald-200/90">
        {t(`story.${n}.body`)}
      </p>
      <div className="mt-10 flex gap-4">
        <button
          onClick={finish}
          className="font-mono text-xs text-emerald-700 underline hover:text-emerald-400"
        >
          {t("story.skip")}
        </button>
        <button
          onClick={next}
          className="rounded border-b-4 border-emerald-800 bg-emerald-500 px-8 py-2 font-mono text-sm font-bold text-[#0d1b1e] hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0"
        >
          {slide >= SLIDES.length - 1 ? t("story.enter") : t("story.next")}
        </button>
      </div>
    </div>
  );
}
