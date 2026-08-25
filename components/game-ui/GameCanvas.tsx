"use client";

import { useEffect, useRef, useState } from "react";
import type { Game } from "phaser";
import { Hud, TouchControls } from "@/components/game-ui/Hud";
import { DialogueBox } from "@/components/game-ui/DialogueBox";
import { PromptChip } from "@/components/game-ui/PromptChip";
import { CodeTerminal } from "@/components/game-ui/CodeTerminal";
import { Toast } from "@/components/game-ui/Toast";
import { QuestPopup } from "@/components/game-ui/QuestPopup";
import { QuestTracker, WalletChip } from "@/components/game-ui/QuestTracker";
import { StoryIntro } from "@/components/game-ui/StoryIntro";
import { SettingsOverlay, RotatePrompt } from "@/components/game-ui/SettingsOverlay";
import { bindEngineEvents } from "@/lib/game/stores";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    void import("@/lib/game/keyboardInput").then((m) => m.attachKeyboardInput());
    const unbind = bindEngineEvents();
    return () => {
      unbind();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [
          { AUTO, Scale, Game },
          { BootScene },
          { TitleScene },
          { HubScene },
        ] = await Promise.all([
          import("phaser"),
          import("@/game/scenes/BootScene"),
          import("@/game/scenes/TitleScene"),
          import("@/game/scenes/HubScene"),
        ]);
        if (cancelled || !containerRef.current) return;

        const forceCanvas = new URLSearchParams(window.location.search).get("renderer") === "canvas";
        gameRef.current = new Game({
          type: forceCanvas ? 0 : AUTO,
          parent: containerRef.current,
          pixelArt: true,
          physics: {
            default: "arcade",
            arcade: { gravity: { x: 0, y: 0 }, debug: false },
          },
          scale: {
            mode: Scale.FIT,
            autoCenter: Scale.CENTER_BOTH,
            width: 960,
            height: 540,
          },
          scene: [BootScene, TitleScene, HubScene],
        });
        (window as unknown as { __ROBIKA_GAME?: Game }).__ROBIKA_GAME = gameRef.current;
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
          <QuestTracker />
          <WalletChip />
          <PromptChip />
          <DialogueBox />
          <CodeTerminal />
          <Toast />
          <QuestPopup />
          <TouchControls />
          <StoryIntro />
          <SettingsOverlay />
          <RotatePrompt />
        </>
      )}
    </main>
  );
}
