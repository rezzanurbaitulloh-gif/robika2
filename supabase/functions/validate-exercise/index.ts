// D07/§62 — server-side exercise validation: kode dijalankan ULANG di isolate Deno.
// Klien tidak pernah dipercaya; hasil hanya 'valid' true/false.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Payload {
  code: string;
  fnName: string;
  args?: unknown[];
  equals?: unknown;
}

const MAX_CODE = 20_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "unauthorized" }, 401);

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
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
