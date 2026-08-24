"use client";

import { useCallback, useEffect, useState } from "react";
import { EventBus } from "@/game/EventBus";
import { runChallenge, type ChallengeDef, type RunResult } from "@/lib/coding/ChallengeRunner";

const DRAFT_PREFIX = "robika.draft.";

export function CodeTerminal() {
  const [challenge, setChallenge] = useState<ChallengeDef | null>(null);
  const [code, setCode] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [closing, setClosing] = useState(false);
  const [MonacoEditor, setMonacoEditor] = useState<React.ComponentType<{
    language: string;
    theme: string;
    value: string;
    onChange: (v: string | undefined) => void;
    height: string;
    options?: Record<string, unknown>;
  }> | null>(null);

  useEffect(() => {
    const off = EventBus.on("ui:terminal:open", (p) => {
      const { challengeId } = p as { challengeId: string };
      import("@/game/data/ContentRegistry").then(({ challenges }) => {
        const def = challenges[challengeId];
        if (!def) return;
        const saved = localStorage.getItem(DRAFT_PREFIX + challengeId);
        setCode(saved ?? def.starter);
        setChallenge(def);
        setLogs([]);
        setResult(null);
        setHintLevel(0);
        setClosing(false);
      });
    });
    return off;
  }, []);

  useEffect(() => {
    let alive = true;
    import("@monaco-editor/react").then((m) => {
      if (alive) setMonacoEditor(m.default as never);
    });
    return () => {
      alive = false;
    };
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    EventBus.emit("ui:terminal:closed", {});
    setTimeout(() => setChallenge(null), 150);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && challenge) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [challenge, close]);

  if (!challenge) return null;

  async function onRun() {
    if (running || !challenge) return;
    setRunning(true);
    setResult(null);
    setLogs(["▶ Menjalankan di sandbox…"]);
    const res = await runChallenge(challenge, code);
    setLogs(res.logs);
    setResult(res);
    setRunning(false);
    if (res.status === "success") {
      localStorage.setItem(DRAFT_PREFIX + challenge.id, code);
      EventBus.emit("world:effect", {
        verb: challenge.on_success.verb,
        target: challenge.on_success.target,
      });
      setTimeout(close, 1400);
    }
  }

  function onReset() {
    setCode(challenge!.starter);
    setResult(null);
    setLogs([]);
  }

  function persistDraft(v: string) {
    setCode(v);
    localStorage.setItem(DRAFT_PREFIX + challenge!.id, v);
  }

  return (
    <div
      className={`absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-3 transition-opacity ${
        closing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex h-full max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border-2 border-emerald-700 bg-[#0d1b1e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-emerald-900 px-4 py-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-emerald-500">
              Terminal Kode
            </p>
            <h2 className="font-mono text-sm font-bold text-emerald-100">{challenge.title}</h2>
          </div>
          <button
            onClick={close}
            className="rounded bg-black/40 px-2 py-1 font-mono text-xs text-emerald-300 ring-1 ring-emerald-800"
          >
            ESC ✕
          </button>
        </div>

        <p className="px-4 pt-2 font-mono text-[11px] leading-relaxed text-emerald-400">
          {challenge.story}
        </p>

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 md:flex-row">
          <div className="min-h-[180px] flex-1 overflow-hidden rounded border border-emerald-900">
            {MonacoEditor ? (
              <MonacoEditor
                language="javascript"
                theme="vs-dark"
                value={code}
                onChange={(v) => persistDraft(v ?? "")}
                height="100%"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  tabSize: 2,
                  padding: { top: 8 },
                }}
              />
            ) : (
              <textarea
                className="h-full w-full resize-none bg-[#111b1f] p-2 font-mono text-[13px] text-emerald-100 outline-none"
                value={code}
                onChange={(e) => persistDraft(e.target.value)}
                spellCheck={false}
              />
            )}
          </div>

          <div className="flex w-full flex-col gap-2 md:w-64">
            <div className="flex gap-2">
              <button
                onClick={onRun}
                disabled={running}
                className="flex-1 rounded bg-emerald-500 py-1.5 font-mono text-xs font-bold text-[#0d1b1e] disabled:opacity-50"
              >
                {running ? "…" : "▶ RUN"}
              </button>
              <button
                onClick={onReset}
                className="rounded bg-black/40 px-2 py-1.5 font-mono text-xs text-emerald-300 ring-1 ring-emerald-800"
              >
                Reset
              </button>
            </div>

            <div className="min-h-[70px] flex-1 overflow-auto rounded bg-black/60 p-2 font-mono text-[11px] leading-relaxed">
              {logs.map((l, i) => (
                <p key={i} className="text-emerald-300">
                  {">"} {l}
                </p>
              ))}
              {result?.status === "success" && (
                <p className="mt-1 font-bold text-emerald-400">
                  ✓ SEMUA UJI LULUS — dunia merespons!
                </p>
              )}
              {result?.status === "error" && (
                <p className="mt-1 text-red-400">✗ {result.error}</p>
              )}
              {result?.status === "timeout" && (
                <p className="mt-1 text-amber-400">⏱ {result.error}</p>
              )}
            </div>

            <div className="rounded bg-black/40 p-2">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-600">
                  Petunjuk {hintLevel}/{challenge.hints.length}
                </p>
                <button
                  onClick={() => setHintLevel((h) => Math.min(h + 1, challenge.hints.length))}
                  disabled={hintLevel >= challenge.hints.length}
                  className="font-mono text-[10px] text-emerald-400 underline disabled:opacity-40"
                >
                  + Buka petunjuk
                </button>
              </div>
              {challenge.hints.slice(0, hintLevel).map((h, i) => (
                <p key={i} className="mt-1 font-mono text-[11px] text-amber-300/90">
                  {i + 1}. {h}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
