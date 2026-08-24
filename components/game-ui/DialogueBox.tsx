"use client";

import { useEffect, useRef, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { touch } from "@/lib/game/touchInput";

interface Line {
  speaker: string;
  text: string;
}

const TYPE_MS = 18;

export function DialogueBox() {
  const [line, setLine] = useState<Line | null>(null);
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const start = (p: unknown) => setLine((p as { line: Line }).line);
    const next = (p: unknown) => setLine((p as { line: Line }).line);
    const end = () => {
      setLine(null);
      setShown("");
    };
    const offS = EventBus.on("ui:dialogue:start", start);
    const offL = EventBus.on("ui:dialogue:line", next);
    const offE = EventBus.on("ui:dialogue:end", end);
    return () => {
      offS();
      offL();
      offE();
    };
  }, []);

  useEffect(() => {
    if (!line) return;
    let i = 0;
    timerRef.current = setInterval(() => {
      setShown(line.text.slice(0, i));
      i += 1;
      setDone(i > line.text.length);
      if (i >= line.text.length) {
        setDone(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, TYPE_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [line]);

  if (!line) return null;

  function advance() {
    touch.reset();
    if (!done && line) {
      setShown(line.text);
      setDone(true);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    EventBus.emit("input:interact");
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center p-3" onClick={advance}>
      <div className="w-full max-w-2xl cursor-pointer rounded-lg border border-emerald-700 bg-[#0d1b1e]/95 p-4 shadow-xl">
        <p className="mb-1 font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
          {line.speaker}
        </p>
        <p className="font-mono text-sm leading-relaxed text-emerald-50">
          {shown}
          {!done && <span className="animate-pulse">▌</span>}
          {done && <span className="ml-2 animate-pulse text-emerald-500">▼</span>}
        </p>
      </div>
    </div>
  );
}
