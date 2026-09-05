import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

/** D10 — CodeLab data layer. Server-authoritative via RLS; versi = snapshot atomik. */

export interface ProjectRow {
  id: string;
  name: string;
  runtime: string;
  updated_at: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface VersionRow {
  id: string;
  label: string | null;
  snapshot: ProjectFile[];
  created_at: string;
}

const DEFAULT_FILES_WEB = (name: string): ProjectFile[] => [
  { path: "index.html", content: `<!doctype html>\n<html><head><meta charset="utf-8"><title>${name}</title><link rel="stylesheet" href="style.css"></head><body><h1>${name}</h1><p>Edit HTML/CSS/JS lalu RUN.</p><script src="script.js"></\/script></body></html>` },
  { path: "style.css", content: `body { font-family: monospace; background: #0d1b1e; color: #34d399; padding: 24px; }\nh1 { color: #a7f3d0; }` },
  { path: "script.js", content: `console.log("Halo dari ${name}!");` },
];
const DEFAULT_FILES = (name: string, runtime?: string): ProjectFile[] => {
  if (runtime === "web") return DEFAULT_FILES_WEB(name);
  return [
  {
    path: "main.js",
    content: `// ${name}\n// Tekan RUN untuk menjalankan.\n\nconsole.log("Halo dari ${name}!");\n`,
  },
  ];
};

export async function listProjects(): Promise<ProjectRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, runtime, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data as ProjectRow[]) ?? [];
}

export async function createProject(name: string, runtime = "javascript"): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name, runtime })
    .select("id")
    .single();
  if (error) throw error;
  const files = DEFAULT_FILES(name, runtime);
  await supabase.from("project_files").insert(files.map((f) => ({ ...f, project_id: data.id })));
  await supabase.from("project_versions").insert({
    project_id: data.id,
    label: "versi awal",
    snapshot: files,
  });
  track("codelab_project_created", { runtime });
  return data.id;
}

export async function loadProject(
  projectId: string
): Promise<{ project: ProjectRow; files: ProjectFile[] }> {
  const supabase = createClient();
  const [{ data: project }, { data: files }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase
      .from("project_files")
      .select("path, content")
      .eq("project_id", projectId)
      .order("path"),
  ]);
  if (!project) throw new Error("Proyek tidak ditemukan");
  await supabase.from("projects").update({ last_opened_at: new Date().toISOString() }).eq("id", projectId);
  return { project: project as ProjectRow, files: (files as ProjectFile[]) ?? [] };
}

export async function saveProject(
  projectId: string,
  files: ProjectFile[],
  makeVersion: boolean,
  label?: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("save_project", {
    p_project_id: projectId,
    p_files: files,
    p_version_label: label ?? null,
    p_make_version: makeVersion,
  });
  if (error) throw error;
}

export async function listVersions(projectId: string): Promise<VersionRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("project_versions")
    .select("id, label, snapshot, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data as VersionRow[]) ?? [];
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("projects").delete().eq("id", projectId);
}
