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

const CHALLENGE_QUEUE_KEY = "robika_challenge_queue";

function queueForSync(challengeId: string, effects: BridgeEffect[]) {
  try {
    const q = JSON.parse(localStorage.getItem(CHALLENGE_QUEUE_KEY) ?? "[]") as Array<{
      id: string;
      effects: BridgeEffect[];
      at: number;
    }>;
    q.push({ id: challengeId, effects, at: Date.now() });
    localStorage.setItem(CHALLENGE_QUEUE_KEY, JSON.stringify(q.slice(-20)));
  } catch {}
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
      const raw = e.data as Omit<RunResult, "failedTest"> & { status: string; bridgeVersion?: number };
      if (raw.status !== "success") {
        finish({ ...raw, effects: raw.effects ?? [], logs: raw.logs ?? [] } as RunResult);
        return;
      }
      // Bridge version check
      const bridgeVersion = raw.bridgeVersion ?? 1;
      if (challenge.min_bridge_version && bridgeVersion < challenge.min_bridge_version) {
        finish({
          status: "error",
          logs: raw.logs ?? [],
          effects: [],
          error: `Versi bridge terlalu lama (v${bridgeVersion} < v${challenge.min_bridge_version}). Muat ulang halaman.`,
        });
        return;
      }
      const failed = validateTests(challenge.tests, raw.effects ?? []);
      if (failed) {
        finish({
          status: "error",
          logs: raw.logs ?? [],
          effects: raw.effects ?? [],
          failedTest: failed.name,
          error: `Uji gagal: ${failed.name}`,
        });
        return;
      }
      // Phase 11: offline queue — jika offline, jangan tunggu server, antre untuk sync nanti
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        queueForSync(challenge.id, raw.effects ?? []);
        track("code_run", { challenge: challenge.id, status: "success", offline_queued: true });
        finish({ status: "success", logs: raw.logs ?? [], effects: raw.effects ?? [] });
        // Sync saat online kembali — coba validasi server di background
        window.addEventListener(
          "online",
          () => {
            void (async () => {
              try {
                const { createClient } = await import("@/lib/supabase/client");
                const supabase = createClient();
                const rawQ = localStorage.getItem(CHALLENGE_QUEUE_KEY);
                if (!rawQ) return;
                const queue = JSON.parse(rawQ) as Array<{ id: string; effects: BridgeEffect[] }>;
                for (const item of queue) {
                  await supabase.rpc("validate_challenge_run", {
                    p_challenge_id: item.id,
                    p_effects: item.effects,
                  });
                }
                localStorage.removeItem(CHALLENGE_QUEUE_KEY);
              } catch {}
            })();
          },
          { once: true }
        );
        return;
      }
      // Online: validasi server sebelum dunia bereaksi (fail-closed)
      void (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data, error } = await supabase.rpc("validate_challenge_run", {
            p_challenge_id: challenge.id,
            p_effects: raw.effects ?? [],
          });
          if (error) throw error;
          const res = data as { valid: boolean; failedTest: string | null };
          if (!res.valid) {
            finish({
              status: "error",
              logs: raw.logs ?? [],
              effects: raw.effects ?? [],
              failedTest: res.failedTest ?? "server",
              error: `Server menolak hasil: ${res.failedTest ?? "tidak valid"}`,
            });
            return;
          }
          track("code_run", { challenge: challenge.id, status: "success" });
          finish({ status: "success", logs: raw.logs ?? [], effects: raw.effects ?? [] });
        } catch {
          // Network/server error saat online — tampilkan pesan, jangan buka gerbang
          finish({
            status: "error",
            logs: raw.logs ?? [],
            effects: [],
            error: "Server tidak dapat memvalidasi hasil. Coba lagi saat koneksi stabil.",
          });
        }
      })();
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
