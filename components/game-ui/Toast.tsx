"use client";

import { useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";

export function Toast() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const off = EventBus.on("ui:toast", (p) => {
      setText((p as { text: string }).text);
      clearTimeout(t);
      t = setTimeout(() => setText(null), 3500);
    });
    return () => {
      off();
      clearTimeout(t);
    };
  }, []);

  if (!text) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-14 z-50 -translate-x-1/2">
      <div className="animate-pulse rounded border border-emerald-500 bg-black/85 px-4 py-2 font-mono text-xs font-bold text-emerald-300 shadow-lg">
        {text}
      </div>
    </div>
  );
}
