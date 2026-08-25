import { SANDBOX_SOURCE, type BridgeEffect, type RunResult } from "@/lib/coding/sandboxSource";
import { track } from "@/lib/analytics";

export type { RunResult, BridgeEffect };

export interface ChallengeTest {
  name: string;
  expectPulses?: number;
  expectTarget?: string;
}

export interface ChallengeDef {
  id: string;
  title: string;
  min_bridge_version?: number;
  language: string;
  function_name: string;
  story: string;
  starter: string;
  tests: ChallengeTest[];
  hints: string[];
  sandbox: { timeout_ms: number; max_logs: number };
  on_success: { verb: string; target: string; flag: string };
}

export function runChallenge(challenge: ChallengeDef, code: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const blob = new Blob([SANDBOX_SOURCE], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    let settled = false;

    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(result);
    };

    const timer = setTimeout(() => {
      track("code_run", { challenge: challenge.id, status: "timeout" });
      finish({
        status: "timeout",
        logs: [],
        effects: [],
        error: `Kode berjalan lebih dari ${challenge.sandbox.timeout_ms / 1000} detik — kemungkinan loop tak berujung. Periksa kondisi loop-mu.`,
      });
    }, challenge.sandbox.timeout_ms);

    worker.onerror = (e) =>
      finish({ status: "error", logs: [], effects: [], error: e.message || "Kesalahan tak terduga di sandbox." });

    worker.onmessage = (e: MessageEvent) => {
      const raw = e.data as Omit<RunResult, "failedTest"> & { status: string };
      if (raw.status !== "success") {
        finish({ ...raw, effects: raw.effects ?? [], logs: raw.logs ?? [] } as RunResult);
        return;
      }
      const failed = validateTests(challenge.tests, raw.effects ?? []);
      finish({
        status: failed ? "error" : "success",
        logs: raw.logs ?? [],
        effects: raw.effects ?? [],
        failedTest: failed?.name,
        error: failed ? `Uji gagal: ${failed.name}` : undefined,
      });
    };

    worker.postMessage({
      code,
      fnName: challenge.function_name,
      maxLogs: challenge.sandbox.max_logs,
    });
  });
}

export function validateTests(
  tests: ChallengeTest[],
  effects: BridgeEffect[]
): ChallengeTest | null {
  const pulses = effects.filter((e) => e.verb === "pulse");
  for (const t of tests) {
    if (t.expectPulses !== undefined && pulses.length !== t.expectPulses) return t;
    if (
      t.expectTarget !== undefined &&
      !pulses.every((p) => p.args[0] === t.expectTarget)
    )
      return t;
  }
  return null;
}
