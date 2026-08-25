"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { findLesson } from "@/lib/academy/content";
import { runExercise } from "@/lib/academy/exercise";
import { track } from "@/lib/analytics";

type Params = { course: string; chapter: string; lesson: string };

export default function LessonPage({ params }: { params: Promise<Params> }) {
  const { course: courseId, chapter: chapterId, lesson: lessonId } = use(params);
  const found = findLesson(courseId, chapterId, lessonId);
  const [done, setDone] = useState(false);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [quizPick, setQuizPick] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  const lesson = found?.lesson;

  useEffect(() => {
    if (!lesson) return;
    track("lesson_started", { lesson: lesson.id });
    const timer = setTimeout(() => {
      setDone(localStorage.getItem(`robika.lesson.${lesson.id}`) === "1");
      const ex = lesson.blocks.find((b) => b.type === "exercise");
      if (ex?.starter) setCode(ex.starter);
    }, 0);
    return () => clearTimeout(timer);
  }, [lesson]);

  if (!found || !lesson) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0d1b1e] font-mono text-emerald-300">
        <div>
          <p>Pelajaran tidak ditemukan.</p>
          <Link href="/academy" className="underline">
            « Kembali ke Akademi
          </Link>
        </div>
      </main>
    );
  }

  async function onRun() {
    if (running || !lesson) return;
    const ex = lesson.blocks.find((b): b is import("@/lib/academy/exercise").ExerciseBlock => b.type === "exercise");
    if (!ex) return;
    setRunning(true);
    setOutput(["▶ Menjalankan di sandbox + validasi server…"]);
    const res = await runExercise(lesson.id, lesson.outcomes.skills[0] ?? "js.umum", lesson.outcomes.xp, code, ex);
    setOutput([...res.logs, ...(res.error ? [`✗ ${res.error}`] : []), ...(res.completed ? ["✓ LULUS — pelajaran selesai! +XP"] : [])]);
    if (res.completed) {
      setCompleted(true);
      setDone(true);
    }
    setRunning(false);
  }

  const nextPath = (() => {
    const { course, chapter } = found;
    const idx = chapter.lessons.findIndex((l) => l.id === lesson.id);
    if (idx < chapter.lessons.length - 1)
      return `/academy/${course.id}/${chapter.id}/${chapter.lessons[idx + 1].id}`;
    const chIdx = course.chapters.findIndex((c) => c.id === chapter.id);
    const nextCh = course.chapters[chIdx + 1];
    if (nextCh && nextCh.lessons[0]) return `/academy/${course.id}/${nextCh.id}/${nextCh.lessons[0].id}`;
    return null;
  })();

  return (
    <main className="min-h-screen bg-[#0d1b1e] p-6 font-mono text-emerald-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/academy" className="text-xs text-emerald-600 underline">
          « Akademi
        </Link>
        <p className="mt-3 text-[10px] uppercase tracking-widest text-emerald-700">
          {found.course.title} · {found.chapter.title}
        </p>
        <h1 className="text-2xl font-bold text-emerald-300">
          {lesson.title} {done && <span className="text-emerald-500">✓</span>}
        </h1>

        <div className="mt-6 space-y-6">
          {lesson.blocks.map((b, i) => {
            if (b.type === "text")
              return (
                <p key={i} className="text-sm leading-relaxed text-emerald-200/90">
                  {b.body?.split("**").map((part, j) => (j % 2 ? <strong key={j} className="text-emerald-300">{part}</strong> : part))}
                </p>
              );
            if (b.type === "code")
              return (
                <pre key={i} className="overflow-x-auto rounded border border-emerald-900 bg-black/60 p-3 text-xs leading-relaxed text-emerald-300">
                  {b.code}
                </pre>
              );
            if (b.type === "quiz")
              return (
                <div key={i} className="rounded border border-emerald-900 bg-[#12262b] p-4">
                  <p className="text-xs font-bold text-emerald-300">{b.question}</p>
                  <div className="mt-3 space-y-2">
                    {b.options?.map((opt, oi) => {
                      const picked = quizPick === oi;
                      const correct = oi === b.correctIndex;
                      const show = quizPick !== null;
                      return (
                        <button
                          key={oi}
                          onClick={() => {
                            setQuizPick(oi);
                            if (correct) setDone(true);
                          }}
                          className={`block w-full rounded px-3 py-2 text-left text-xs ring-1 ${
                            show && correct
                              ? "bg-emerald-900/60 text-emerald-200 ring-emerald-500"
                              : picked && show
                                ? "bg-red-900/40 text-red-300 ring-red-700"
                                : "bg-black/30 text-emerald-300 ring-emerald-900 hover:ring-emerald-600"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {quizPick !== null && (
                    <p className="mt-2 text-[11px] text-emerald-500">{b.explain}</p>
                  )}
                </div>
              );
            if (b.type === "exercise")
              return (
                <div key={i} className="rounded border border-emerald-800 bg-[#12262b] p-4">
                  <p className="text-xs font-bold text-emerald-300">🛠 Latihan</p>
                  <p className="mt-1 text-xs text-emerald-400/90">{b.instruction}</p>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    rows={7}
                    className="mt-3 w-full resize-none rounded bg-black/70 p-3 text-xs text-emerald-200 outline-none ring-1 ring-emerald-900 focus:ring-emerald-600"
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      onClick={() => void onRun()}
                      disabled={running}
                      className="rounded bg-emerald-500 px-4 py-1.5 text-xs font-bold text-[#0d1b1e] disabled:opacity-50"
                    >
                      {running ? "…" : "▶ RUN"}
                    </button>
                    {completed && <span className="text-xs text-emerald-400">Selesai ✓ (+{lesson.outcomes.xp} XP)</span>}
                  </div>
                  {output.length > 0 && (
                    <pre className="mt-3 max-h-40 overflow-auto rounded bg-black/60 p-3 text-[11px] text-emerald-400">
                      {output.join("\n")}
                    </pre>
                  )}
                </div>
              );
            if (b.type === "practice")
              return (
                <div key={i} className="rounded border border-amber-800 bg-amber-950/30 p-4">
                  <p className="text-xs font-bold text-amber-300">⚔ Practice in Game</p>
                  <p className="mt-1 text-xs text-amber-200/80">{b.text}</p>
                  <Link
                    href="/game"
                    className="mt-3 inline-block rounded bg-amber-600 px-4 py-1.5 text-xs font-bold text-[#0d1b1e]"
                  >
                    Masuk ke Dunia
                  </Link>
                </div>
              );
            return null;
          })}
        </div>

        <div className="mt-8 flex justify-between border-t border-emerald-900 pt-4">
          <Link href="/academy" className="text-xs text-emerald-600 underline">
            « Akademi
          </Link>
          {nextPath && (
            <Link href={nextPath} className="text-xs text-emerald-400 underline">
              Pelajaran berikutnya »
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
