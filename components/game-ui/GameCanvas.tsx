"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "phaser";
import { Hud, TouchControls } from "@/components/game-ui/Hud";
import { DialogueBox } from "@/components/game-ui/DialogueBox";
import { PromptChip } from "@/components/game-ui/PromptChip";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [{ AUTO, Scale, Game }, { BootScene }] = await Promise.all([
          import("phaser"),
          import("@/game/scenes/BootScene"),
        ]);
        if (cancelled || !containerRef.current) return;

        gameRef.current = new Game({
          type: AUTO,
          parent: containerRef.current,
          pixelArt: true,
          scale: {
            mode: Scale.FIT,
            autoCenter: Scale.CENTER_BOTH,
            width: 960,
            height: 540,
          },
          scene: [BootScene],
        });
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d1b1e]">
      <div className="absolute inset-0 flex items-center justify-center p-2">
        {status === "loading" && (
          <p className="animate-pulse font-mono text-emerald-300">Memuat dunia…</p>
        )}
        {status === "error" && (
          <p className="font-mono text-red-400">
            Gagal memuat engine.{" "}
            <button className="underline" onClick={() => location.reload()}>
              Coba lagi
            </button>
          </p>
        )}
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {status === "ready" && (
        <>
          <Hud />
          <PromptChip />
          <DialogueBox />
          <TouchControls />
        </>
      )}
    </main>
  );
}
