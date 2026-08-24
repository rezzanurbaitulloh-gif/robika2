"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "phaser";

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
    <main className="min-h-screen bg-[#0d1b1e] flex items-center justify-center p-4">
      {status === "loading" && (
        <p className="text-emerald-300 font-mono animate-pulse">Memuat dunia…</p>
      )}
      {status === "error" && (
        <p className="text-red-400 font-mono">
          Gagal memuat engine.{" "}
          <button className="underline" onClick={() => location.reload()}>
            Coba lagi
          </button>
        </p>
      )}
      <div ref={containerRef} className="w-full max-w-5xl aspect-video" />
    </main>
  );
}
