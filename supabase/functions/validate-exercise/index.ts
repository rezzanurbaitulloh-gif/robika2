// D07/§62 — server-side exercise validation: kode dijalankan ULANG di isolate Deno.
// Tanpa dependensi eksternal (import esm.sh flaky → BOOT_ERROR): auth via GoTrue REST.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const MAX_CODE = 20_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

async function getUser(authHeader: string): Promise<{ id: string } | null> {
  if (!authHeader.startsWith("Bearer ")) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: ANON_KEY },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string };
    return user?.id ? { id: user.id } : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const user = await getUser(req.headers.get("Authorization") ?? "");
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: { code?: string; fnName?: string; args?: unknown[]; equals?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  if (!body.code || !body.fnName) return json({ error: "bad_payload" }, 400);
  if (body.code.length > MAX_CODE) return json({ error: "code_too_large" }, 413);

  try {
    const factory = new Function(
      "console",
      `"use strict";\n${body.code}\n;return typeof ${body.fnName} !== "undefined" ? ${body.fnName} : null;`
    );
    const logs: string[] = [];
    const fakeConsole = { log: (...a: unknown[]) => logs.push(a.map(String).join(" ")) };
    const fn = factory(fakeConsole);
    if (typeof fn !== "function") return json({ valid: false, error: "fn_not_found" });

    const ret = fn(...(body.args ?? []));
    const valid = JSON.stringify(ret) === JSON.stringify(body.equals);
    return json({ valid, returned: ret ?? null });
  } catch (e) {
    return json({ valid: false, error: String((e as Error).message).slice(0, 200) });
  }
});
