import { SANDBOX_SOURCE, type RunResult } from "@/lib/coding/sandboxSource";
import { track } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

/**
 * D09 — latihan academy: sandbox klien (D07) + validasi ulang server
 * (edge function validate-exercise) sebelum progres diakui.
 */

export type ExerciseBlock = {
  type: "exercise";
  instruction?: string;
  fnName?: string;
  starter?: string;
  expect: { args: unknown[]; equals: unknown };
};
export type ExerciseResult = RunResult & { completed?: boolean; certificate?: boolean };

export async function runExercise(
  lessonId: string,
  courseId: string,
  skill: string,
  xp: number,
  code: string,
  block: ExerciseBlock
): Promise<ExerciseResult> {
  // 1) sandbox klien (timeout, log cap, dsb. — D07)
  const client = await runClient(code, block);
  track("code_run", { lesson: lessonId, status: client.status });
  if (client.status !== "success") return client;

  // 2) validasi ulang di server (Deno isolate) — §62
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-exercise`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          code,
          fnName: block.fnName,
          args: block.expect.args,
          equals: block.expect.equals,
        }),
      }
    );
    const verdict = (await res.json()) as { valid?: boolean; error?: string };
    if (!res.ok || !verdict.valid) {
      return {
        ...client,
        status: "error",
        error:
          verdict.error === "fn_not_found"
            ? `Fungsi ${block.fnName} tidak ditemukan.`
            : "Server menolak hasil latihan.",
      };
    }
  } catch {
    return { ...client, status: "error", error: "Server tidak terjangkau — coba lagi saat online." };
  }

  // 3) akui penyelesaian via satu RPC server (XP+mastery+completion+sertifikat)
  const res = await completeLesson(lessonId, courseId, skill, xp);
  return { ...client, completed: true, certificate: res?.certificate ?? false };
}

function runClient(code: string, block: ExerciseBlock): Promise<ExerciseResult> {
  return new Promise((resolve) => {
    const blob = new Blob([SANDBOX_SOURCE], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    let settled = false;
    const finish = (r: ExerciseResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(r);
    };
    const timer = setTimeout(
      () => finish({ status: "timeout", logs: [], effects: [], error: "Waktu habis (5s) — periksa loop-mu." }),
      5000
    );
    worker.onmessage = (e: MessageEvent) => {
      const raw = e.data as RunResult & { returned?: unknown };
      const ok = JSON.stringify(raw.returned) === JSON.stringify(block.expect.equals);
      finish({
        status: ok ? "success" : "error",
        logs: raw.logs ?? [],
        effects: [],
        error: ok ? undefined : `Hasil belum benar: ${JSON.stringify(raw.returned)}`,
      });
    };
    worker.onerror = (e) => finish({ status: "error", logs: [], effects: [], error: e.message });
    worker.postMessage({
      code,
      fnName: block.fnName,
      maxLogs: 40,
      expect: { args: block.expect.args, equals: block.expect.equals },
    });
  });
}

async function completeLesson(
  lessonId: string,
  courseId: string,
  skill: string,
  xp: number
): Promise<{ certificate?: boolean } | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("complete_lesson", {
      p_course_id: courseId,
      p_lesson_id: lessonId,
      p_skill: skill,
      p_xp: xp,
    });
    if (error) return null;
    localStorage.setItem(`robika.lesson.${lessonId}`, "1");
    // S26: achievement
    try { await supabase.rpc("grant_achievement", { p_achievement_id: "first_program" }); } catch {}
    // loop_master bila sudah 3 lesson js_dasar_kode
    try {
      const r = await supabase
        .from("lesson_completions")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId);
      const count = r.count ?? 0;
      if (count >= 3) {
        try { await supabase.rpc("grant_achievement", { p_achievement_id: "loop_master" }); } catch {}
      }
    } catch {}
    return data as { certificate?: boolean };
  } catch {
    return null;
  }
}
