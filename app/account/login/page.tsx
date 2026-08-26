"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/game";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    console.log('[LOGIN] submit terpanggil');
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const supabase = createClient();
    console.log('[LOGIN] memanggil signIn');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[LOGIN] signIn selesai, error:', error?.message ?? 'null');
    setBusy(false);
    if (error) return setError(error.message);
    router.push(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0d1b1e] text-emerald-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border border-emerald-900 rounded-lg p-6 bg-[#12262b]">
        <h1 className="text-xl font-bold tracking-wide">Masuk ke Aetheria</h1>
        <input
          type="email"
          name="email"
          required
          placeholder="Email"
          defaultValue=""
          className="w-full bg-[#0d1b1e] border border-emerald-800 rounded px-3 py-2"
        />
        <input
          type="password"
          name="password"
          required
          placeholder="Password"
          defaultValue=""
          className="w-full bg-[#0d1b1e] border border-emerald-800 rounded px-3 py-2"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          disabled={busy}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1b1e] font-bold py-2 rounded"
        >
          {busy ? "..." : "MASUK"}
        </button>
        <p className="text-sm text-emerald-300">
          Belum punya akun?{" "}
          <a className="underline" href={`/account/register?next=${encodeURIComponent(next)}`}>
            Daftar
          </a>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0d1b1e]" />}>
      <LoginForm />
    </Suspense>
  );
}
