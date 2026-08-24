"use client";

import { useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { touch } from "@/lib/game/touchInput";

export function PromptChip() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const off = EventBus.on("ui:prompt", (p) =>
      setLabel(p ? (p as { label: string }).label : null)
    );
    return off;
  }, []);

  if (!label) return null;
  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2">
      <button
        className="pointer-events-auto rounded bg-black/70 px-4 py-1.5 font-mono text-sm text-emerald-200 ring-1 ring-emerald-600"
        onClick={() => {
          touch.reset();
          EventBus.emit("input:interact");
        }}
      >
        [E] {label}
      </button>
    </div>
  );
}
