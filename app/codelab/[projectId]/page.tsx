"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  listVersions,
  loadProject,
  saveProject,
  type ProjectFile,
  type VersionRow,
} from "@/lib/codelab/data";

type Params = { projectId: string };

export default function WorkspacePage({ params }: { params: Promise<Params> }) {
  const { projectId } = use(params);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [active, setActive] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [runtime, setRuntime] = useState("javascript");
  const [output, setOutput] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionRow[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadProject(projectId)
        .then(({ project, files }) => {
          setProjectName(project.name);
          setRuntime(project.runtime);
          setFiles(files.length ? files : [{ path: "main.js", content: "" }]);
        })
        .catch((e) => setErr(String(e.message ?? e)));
    }, 0);
    return () => clearTimeout(t);
  }, [projectId]);

  const doSave = useCallback(
    async (makeVersion: boolean) => {
      if (saving) return;
      setSaving(true);
      try {
        await saveProject(projectId, files, makeVersion, makeVersion ? `manual ${new Date().toLocaleTimeString("id-ID")}` : undefined);
        setDirty(false);
        setSavedAt(new Date().toLocaleTimeString("id-ID"));
        if (makeVersion) setVersions(null);
      } catch (e) {
        setErr(String((e as Error).message));
      } finally {
        setSaving(false);
      }
    },
    [files, projectId, saving]
  );

  // Ctrl+S simpan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void doSave(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSave]);

  function updateActive(content: string) {
    setFiles((fs) => fs.map((f, i) => (i === active ? { ...f, content } : f)));
    setDirty(true);
  }

  function run() {
    if (running) return;
    const entry = files.find((f) => f.path.endsWith(".js") || f.path.endsWith(".ts")) ?? files[0];
    const isHtml = files.some((f) => f.path.endsWith(".html"));

    if (isHtml) {
      const html =
        files.find((f) => f.path.endsWith(".html"))?.content ?? "<h1>kosong</h1>";
      const css = files.find((f) => f.path.endsWith(".css"))?.content ?? "";
      const js = files.find((f) => f.path.endsWith(".js"))?.content ?? "";
      const doc = html
        .replace("</head>", `<style>${css}</style></head>`)
        .replace("</body>", `<script>${js.replace(/<\/script>/g, "<\\/script>")}<\/script></body>`);
      setPreviewDoc(doc);
      setShowPreview(true);
      setOutput(["▶ Preview dirender (sandbox iframe)."]);
      return;
    }

    setRunning(true);
    setOutput(["▶ Menjalankan " + entry.path + "…"]);
    const blob = new Blob(
      [
        `self.onmessage = function (e) {
  var logs = [];
  var orig = console.log;
  console.log = function () {
    logs.push(Array.prototype.slice.call(arguments).map(String).join(" "));
    if (logs.length > 100) logs = logs.slice(-100);
  };
  try {
    new Function("console", e.data.code)(console);
    self.postMessage({ status: "success", logs: logs });
  } catch (err) {
    self.postMessage({ status: "error", logs: logs, error: String(err && err.message || err) });
  }
};`,
      ],
      { type: "text/javascript" }
    );
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    workerRef.current = worker;
    const timer = setTimeout(() => {
      worker.terminate();
      setRunning(false);
      setOutput((o) => [...o, "⏱ Timeout 5 detik."]);
    }, 5000);
    worker.onmessage = (ev: MessageEvent) => {
      clearTimeout(timer);
      const d = ev.data as { status: string; logs: string[]; error?: string };
      setOutput([...(d.logs ?? []), ...(d.error ? [`✗ ${d.error}`] : ["✓ Selesai"])]);
      setRunning(false);
      worker.terminate();
      URL.revokeObjectURL(url);
    };
    worker.postMessage({ code: entry.content });
  }

  async function restoreVersion(v: VersionRow) {
    setFiles(v.snapshot);
    setDirty(true);
    setVersions(null);
  }

  const activeFile = files[active];

  return (
    <main className="min-h-screen bg-[#0d1b1e] p-4 font-mono text-emerald-100">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href="/codelab" className="text-xs text-emerald-600 underline">
            « CodeLab
          </Link>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={() => void doSave(false)}
              disabled={saving}
              className="rounded bg-black/40 px-2 py-1 ring-1 ring-emerald-800 disabled:opacity-40"
            >
              Simpan (Ctrl+S)
            </button>
            <button
              onClick={() => void doSave(true)}
              disabled={saving}
              className="rounded bg-emerald-800 px-2 py-1 ring-1 ring-emerald-600 disabled:opacity-40"
            >
              Simpan Versi
            </button>
            <button
              onClick={() => setVersions(versions === null ? [] : null)}
              className="rounded bg-black/40 px-2 py-1 ring-1 ring-emerald-800"
            >
              Riwayat
            </button>
          </div>
        </div>

        <h1 className="mt-2 text-xl font-bold text-emerald-300">{projectName || "…"}</h1>

        {err && <p className="mt-2 rounded bg-red-950/60 p-2 text-xs text-red-300">{err}</p>}

        <div className="mt-2 flex items-center gap-2 text-[11px]">
          <span className="rounded bg-black/40 px-2 py-1 text-emerald-600">runtime: {runtime}</span>
          <span className={dirty ? "text-amber-400" : "text-emerald-700"}>{dirty ? "● belum disimpan" : savedAt ? `tersimpan ${savedAt}` : ""}</span>
        </div>

        {/* tabs file */}
        <div className="mt-3 flex flex-wrap gap-1">
          {files.map((f, i) => (
            <button
              key={f.path}
              onClick={() => setActive(i)}
              className={`rounded px-3 py-1 text-[11px] ${
                i === active ? "bg-emerald-700 text-white" : "bg-black/40 text-emerald-400 ring-1 ring-emerald-900"
              }`}
            >
              {f.path}
            </button>
          ))}
        </div>

        {/* editor */}
        <textarea
          value={activeFile?.content ?? ""}
          onChange={(e) => updateActive(e.target.value)}
          spellCheck={false}
          rows={16}
          className="mt-2 w-full resize-none rounded border border-emerald-900 bg-black/70 p-3 text-xs leading-relaxed text-emerald-200 outline-none focus:ring-1 focus:ring-emerald-600"
        />

        {/* run bar */}
        <div className="mt-2 flex gap-2">
          <button
            onClick={run}
            disabled={running}
            className="rounded bg-emerald-500 px-4 py-1.5 text-xs font-bold text-[#0d1b1e] disabled:opacity-50"
          >
            {running ? "…" : "▶ RUN"}
          </button>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="rounded bg-black/40 px-3 py-1.5 text-xs text-emerald-300 ring-1 ring-emerald-800"
          >
            Preview
          </button>
        </div>

        {/* output */}
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-black/70 p-3 text-[11px] text-emerald-400">
          {output.length ? output.join("\n") : "Output muncul di sini…"}
        </pre>

        {/* preview */}
        {showPreview && (
          <div className="mt-2 overflow-hidden rounded border border-emerald-800">
            <iframe
              title="preview"
              sandbox="allow-scripts"
              srcDoc={previewDoc}
              className="h-64 w-full bg-white"
            />
          </div>
        )}

        {/* riwayat versi */}
        {versions !== null && (
          <div className="mt-3 rounded border border-emerald-900 bg-[#12262b] p-3">
            <p className="text-[10px] uppercase tracking-widest text-emerald-600">Riwayat Versi</p>
            <VersionList projectId={projectId} onLoad={restoreVersion} />
          </div>
        )}
      </div>
    </main>
  );
}

function VersionList({
  projectId,
  onLoad,
}: {
  projectId: string;
  onLoad: (v: VersionRow) => void;
}) {
  const [versions, setVersions] = useState<VersionRow[] | null>(null);

  useEffect(() => {
    void listVersions(projectId).then(setVersions);
  }, [projectId]);

  if (versions === null) return <p className="mt-2 text-[11px] text-emerald-700">memuat…</p>;
  if (!versions.length) return <p className="mt-2 text-[11px] text-emerald-700">Belum ada versi.</p>;
  return (
    <ul className="mt-2 space-y-1">
      {versions.map((v) => (
        <li key={v.id} className="flex items-center justify-between rounded bg-black/30 px-2 py-1.5">
          <span className="text-[11px] text-emerald-300">
            {v.label ?? "versi"} · {new Date(v.created_at).toLocaleString("id-ID")}
          </span>
          <button
            onClick={() => onLoad(v)}
            className="rounded bg-emerald-900 px-2 py-0.5 text-[10px] text-emerald-300"
          >
            Pulihkan
          </button>
        </li>
      ))}
    </ul>
  );
}
