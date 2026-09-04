"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProject, listProjects, type ProjectRow } from "@/lib/codelab/data";
import { t } from "@/lib/i18n";

export default function CodelabPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[] | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => void listProjects().then(setProjects), 0);
    return () => clearTimeout(t);
  }, []);

  async function onCreate() {
    const name = nameRef.current?.value.trim() ?? "";
    if (busy || !name) return;
    setBusy(true);
    setCreateErr(null);
    try {
      const id = await createProject(name);
      router.push(`/codelab/${id}`);
    } catch (e) {
      setCreateErr(String((e as Error).message ?? e).slice(0, 200));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d1b1e] p-6 font-mono text-emerald-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/game" className="text-xs text-emerald-600 underline">
          « {t("common.back")}
        </Link>
        <h1
          className="mt-3 text-3xl font-black tracking-widest text-emerald-400"
          style={{ textShadow: "3px 3px 0 #064e3b" }}
        >
          CODELAB
        </h1>
        <p className="mt-2 text-xs text-emerald-400/80">
          Bengkel proyek sungguhan: file, editor, run, preview, riwayat versi.
        </p>

        <div className="mt-6 flex gap-2">
          <input
            ref={nameRef}
            onKeyDown={(e) => { if (e.key === "Enter") void onCreate(); }}
            placeholder="Nama proyek baru…"
            className="flex-1 rounded border border-emerald-800 bg-[#12262b] px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={() => void onCreate()}
            disabled={busy}
            className="rounded bg-emerald-500 px-4 py-2 text-sm font-bold text-[#0d1b1e] disabled:opacity-40"
          >
            + Proyek
          </button>
        </div>

        {createErr && (
          <p className="mt-3 rounded bg-red-950/60 p-2 text-xs text-red-300">Gagal: {createErr}</p>
        )}
        <div className="mt-8 space-y-3">
          {projects === null && <p className="animate-pulse text-xs text-emerald-600">Memuat…</p>}
          {projects?.length === 0 && (
            <p className="rounded border border-emerald-900 bg-[#12262b] p-4 text-xs text-emerald-500">
              Belum ada proyek. Buat proyek pertamamu di atas!
            </p>
          )}
          {projects?.map((pr) => (
            <Link
              key={pr.id}
              href={`/codelab/${pr.id}`}
              className="block rounded-lg border border-emerald-800 bg-[#12262b] p-4 transition-colors hover:border-emerald-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-emerald-200">{pr.name}</h2>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-emerald-600">
                    {pr.runtime} · {new Date(pr.updated_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <span className="text-emerald-500">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
