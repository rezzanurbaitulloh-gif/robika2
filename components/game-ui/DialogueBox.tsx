"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { touch } from "@/lib/game/touchInput";
import { t } from "@/lib/i18n";

interface Line {
  speaker: string;
  text: string;
}
interface ChoiceOpt {
  text: string;
  set_flag?: string;
  extra_keys?: string[];
}

const TYPE_MS = 18;

export function DialogueBox() {
  const [line, setLine] = useState<Line | null>(null);
  const [portrait, setPortrait] = useState<string | null>(null);
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const [choices, setChoices] = useState<ChoiceOpt[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const show = (p: unknown) => {
      const d = p as { line: Line; portrait?: string };
      setLine(d.line);
      setPortrait(d.portrait ?? null);
      setChoices(null);
    };
    const end = () => {
      setLine(null);
      setShown("");
      setChoices(null);
    };
    const offS = EventBus.on("ui:dialogue:start", show);
    const offL = EventBus.on("ui:dialogue:line", show);
    const offE = EventBus.on("ui:dialogue:end", end);
    const offC = EventBus.on("ui:dialogue:choices", (p) => {
      const d = p as { options: ChoiceOpt[] };
      setChoices(d.options);
    });
    return () => {
      offS();
      offL();
      offE();
      offC();
    };
  }, []);

  useEffect(() => {
    if (!line) return;
    let i = 0;
    timerRef.current = setInterval(() => {
      setShown(line.text.slice(0, i));
      i += 1;
      setDone(i > line.text.length);
    }, TYPE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [line]);

  const advance = useCallback(() => {
    touch.reset();
    if (choices) return;
    if (!done && line) {
      setShown(line.text);
      setDone(true);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    EventBus.emit("input:interact");
  }, [choices, done, line]);

  useEffect(() => {
    const off = EventBus.on("ui:dialogue:pick", (p) => {
      EventBus.emit("ui:dialogue:pick:handled", p);
    });
    return off;
  }, []);

  if (!line) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-3" onClick={advance}>
      <div className="flex w-full max-w-2xl gap-3 rounded-lg border border-emerald-700 bg-[#0d1b1e]/95 p-4 shadow-xl">
        {portrait && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/assets/portraits/${portrait}.png`}
            alt={line.speaker}
            className="h-16 w-16 shrink-0 rounded border border-emerald-800 bg-[#12262b] object-cover"
            style={{ imageRendering: "pixelated" }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
            {line.speaker}
          </p>
          <p className="font-mono text-sm leading-relaxed text-emerald-50">
            {shown}
            {!done && <span className="animate-pulse">▌</span>}
            {done && !choices && <span className="ml-2 animate-pulse text-emerald-500">▼</span>}
          </p>
          {choices && (
            <div className="mt-3 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-600">
                {t("dialogue.choice.hint")}
              </p>
              {choices.map((opt, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    touch.reset();
                    setChoices(null);
                    EventBus.emit("ui:dialogue:choicePicked", opt);
                    EventBus.emit("ui:dialogue:applyChoice", opt);
                  }}
                  className="block w-full rounded bg-black/40 px-3 py-2 text-left font-mono text-xs text-emerald-200 ring-1 ring-emerald-800 hover:ring-emerald-400"
                >
                  ▸ {t(opt.text)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
