"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TitlePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setLoggedIn(Boolean(data.user)))
      .catch(() => setLoggedIn(false))
      .finally(() => setChecking(false));
  }, []);

  function start() {
    router.push(loggedIn ? "/game" : "/account/login?next=%2Fgame");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0d1b1e] p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#34d399 1px, transparent 1px), linear-gradient(90deg, #34d399 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.4em] text-emerald-600">
        Petualangan Kode Pixel Art
      </p>
      <h1
        className="font-mono text-6xl font-black tracking-widest text-emerald-400 md:text-8xl"
        style={{ textShadow: "4px 4px 0 #064e3b, 8px 8px 0 rgba(0,0,0,0.4)" }}
      >
        ROBIKA
      </h1>
      <p className="mt-4 max-w-md text-center font-mono text-sm leading-relaxed text-emerald-200/80">
        Di Aetheria, kode adalah kekuatan. Jelajahi lembah, temui para insinyur,
        dan nyalakan kembali dunia — satu baris kode demi satu baris kode.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3">
        <button
          onClick={start}
          disabled={checking}
          className="group relative rounded border-b-4 border-emerald-800 bg-emerald-500 px-10 py-3 font-mono text-base font-black tracking-widest text-[#0d1b1e] transition-transform hover:-translate-y-0.5 hover:bg-emerald-400 active:translate-y-0.5 active:border-b-0 disabled:opacity-50"
        >
          {checking ? "…" : loggedIn ? "LANJUTKAN PETUALANGAN" : "MULAI PETUALANGAN"}
        </button>

        <div className="flex gap-4 font-mono text-xs text-emerald-500">
          <a href="/account/login" className="underline hover:text-emerald-300">
            Masuk
          </a>
          <span aria-hidden>·</span>
          <a href="/account/register" className="underline hover:text-emerald-300">
            Daftar Akun Baru
          </a>
          <span aria-hidden>·</span>
          <Link href="/academy" className="underline hover:text-emerald-300">
            Akademi
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-4 font-mono text-[10px] tracking-widest text-emerald-800 text-center">
        © 2026 portoja. All rights reserved. · PHASE 2 · LEMBAH BOOT · v0.2
      </footer>
    </main>
  );
}
