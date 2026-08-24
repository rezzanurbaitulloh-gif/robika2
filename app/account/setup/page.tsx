"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [appearance, setAppearance] = useState("scout_teal");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi berakhir — login ulang.");
      const { error } = await supabase.rpc("complete_onboarding", {
        p_username: username,
        p_appearance: appearance,
      });
      if (error) throw error;
      router.push("/game");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0d1b1e] text-emerald-50 p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border border-emerald-900 rounded-lg p-6 bg-[#12262b]">
        <h1 className="text-xl font-bold tracking-wide">Siapkan Petualangmu</h1>
        <input
          required
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_]+"
          title="3–24 huruf, angka, atau garis bawah"
          placeholder="Nama petualang"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-[#0d1b1e] border border-emerald-800 rounded px-3 py-2"
        />
        <fieldset className="space-y-2">
          <legend className="text-sm text-emerald-300">Tampilan awal</legend>
          {["scout_teal", "rust_wanderer"].map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="appearance"
                value={opt}
                checked={appearance === opt}
                onChange={() => setAppearance(opt)}
              />
              {opt.replace("_", " ")}
            </label>
          ))}
        </fieldset>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          disabled={busy}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d1b1e] font-bold py-2 rounded"
        >
          {busy ? "..." : "MULAI PETUALANGAN"}
        </button>
      </form>
    </main>
  );
}
