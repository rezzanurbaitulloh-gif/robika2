import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: { prompt?: string; context?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad_json" }, { status: 400 });
  }
  const prompt = (body.prompt ?? "").trim().slice(0, 4000);
  if (!prompt) return Response.json({ error: "prompt_required" }, { status: 400 });

  // Guard: jangan ungkap solusi challenge secara langsung
  const lower = prompt.toLowerCase();
  const needsHint =
    lower.includes("loop") || lower.includes("for") || lower.includes("gerak") || lower.includes("gerbang");
  let reply: string;
  if (needsHint) {
    reply =
      "Petunjuk: coba pikirkan **loop** — `for (let i = 0; i < 3; i++) { bridge.pulse(\"gate_bridge\"); }`. Setiap iterasi mengirim satu denyut. Hitung: berapa kali loop berjalan jika `i < 3`?";
  } else if (lower.includes("variabel") || lower.includes("variable")) {
    reply = "Variabel = kotak berlabel. `let energi = 50;` artinya simpan 50 di kotak bernama energi. Coba buat satu dan cetak dengan `console.log(energi);`";
  } else if (lower.includes("if") || lower.includes("kondisi")) {
    reply = "Kondisi `if (energi >= 25) { buka } else { terkunci }` — blok `if` jalan saat syarat benar, `else` saat salah.";
  } else {
    reply =
      "Halo! Aku Mentor Aetheria. Tanyakan soal variabel, kondisi, loop, atau tantang Terminal Kode — aku beri petunjuk, bukan jawaban penuh. Coba tanyakan: *'bagaimana loop bekerja?'*";
  }

  // analytics minimal (offline-friendly: insert via analytics_events)
  try {
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event: "ai_mentor_chat",
      payload: { prompt_len: prompt.length },
    });
  } catch {}

  return Response.json({ reply, provider: "stub" });
}
