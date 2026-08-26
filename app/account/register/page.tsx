"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account/setup";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    const password = String(fd.get("password") ?? "");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/account/setup` },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setSent(true);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0d1b1e] text-emerald-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border border-emerald-900 rounded-lg p-6 bg-[#12262b]">
        <h1 className="text-xl font-bold tracking-wide">Buat Akun ROBika</h1>
        {sent ? (
          <p className="text-sm text-emerald-300">Cek emailmu untuk konfirmasi, lalu login.</p>
        ) : (
          <>
            <input
              type="email"
              required
              placeholder="Email"
              name="email"
              defaultValue=""
              className="w-full bg-[#0d1b1e] border border-emerald-800 rounded px-3 py-2"
            />
            <input
              type="password"
              required
              minLength={8}
              placeholder="Password (min 8)"
              name="password"
              defaultValue=""
              className="w-full bg-[#0d1b1e] border border-emerald-800 rounded px-3 py-2"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              disabled={busy}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1b1e] font-bold py-2 rounded"
            >
              {busy ? "..." : "DAFTAR"}
            </button>
            <p className="text-sm text-emerald-300">
              Sudah punya akun?{" "}
              <a className="underline" href={`/account/login?next=${encodeURIComponent(next)}`}>
                Masuk
              </a>
            </p>
          </>
        )}
      </form>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0d1b1e]" />}>
      <RegisterForm />
    </Suspense>
  );
}
