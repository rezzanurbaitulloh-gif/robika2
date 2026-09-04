

import Link from "next/link";
import { getCourse } from "@/lib/academy/content";
import { t } from "@/lib/i18n";

export default function AcademyPage() {
  const course = getCourse("js_dasar_kode");
  return (
    <main className="min-h-screen bg-[#0d1b1e] p-6 font-mono text-emerald-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/game" className="text-xs text-emerald-600 underline">
          « Kembali
        </Link>
        <h1
          className="mt-3 text-4xl font-black tracking-widest text-emerald-400"
          style={{ textShadow: "3px 3px 0 #064e3b" }}
        >
          AKADEMI
        </h1>
        <p className="mt-2 text-sm text-emerald-300/80">
          Belajar pemrograman sungguhan — materi yang sama dengan dunia luar.
        </p>

        <div className="mt-8 space-y-4">
          <Link
            href="/academy/js_dasar_kode/variabel/apa-itu-variabel"
            className="block rounded-lg border border-emerald-800 bg-[#12262b] p-5 transition-colors hover:border-emerald-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-emerald-600">
                  Kursus · JavaScript
                </p>
                <h2 className="mt-1 text-xl font-bold text-emerald-300">{t("course.js_dasar.title")}</h2>
                <p className="mt-1 text-xs text-emerald-400/80">{t("course.js_dasar.desc")}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(course?.support ?? {}).map(([k, v]) => (
                    <span
                      key={k}
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        v ? "bg-emerald-900 text-emerald-300" : "bg-black/40 text-emerald-700"
                      }`}
                    >
                      {v ? "✓" : "✗"} {t(`support.${k}`)}
                    </span>
                  ))}
                </div>
              </div>
              <span className="rounded bg-emerald-900 px-3 py-1 text-xs text-emerald-300">
                3 Bab
              </span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
