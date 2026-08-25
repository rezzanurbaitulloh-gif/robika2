#!/usr/bin/env node
// D20 — integritas manifest ↔ file: setiap URL manifest harus ada di public/.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const manifest = JSON.parse(readFileSync("public/assets/manifest.json", "utf8"));
let fail = 0;

function checkUrl(url) {
  const rel = url.replace(/^\//, "");
  if (!existsSync(join("public", rel))) {
    console.error(`MISSING: ${url}`);
    fail += 1;
  }
}

for (const img of Object.values(manifest.images ?? {})) checkUrl(img.url);
for (const sheet of Object.values(manifest.spritesheets ?? {})) checkUrl(sheet.url);

const total =
  Object.keys(manifest.images ?? {}).length + Object.keys(manifest.spritesheets ?? {}).length;
console.log(`asset manifest: ${total} entri, ${fail} hilang`);
process.exit(fail > 0 ? 1 : 0);
