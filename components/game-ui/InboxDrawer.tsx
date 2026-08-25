"use client";

import { useCallback, useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

interface Msg {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export function InboxDrawer() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);

  const load = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("inbox_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setMsgs((data as Msg[]) ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [open, load]);

  async function markRead() {
    try {
      const supabase = createClient();
      const unread = msgs.filter((m) => !m.read_at).map((m) => m.id);
      if (unread.length)
        await supabase.from("inbox_messages").update({ read_at: new Date().toISOString() }).in("id", unread);
    } catch {}
  }

  const unread = msgs.filter((m) => !m.read_at).length;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          void markRead();
        }}
        className="pointer-events-auto rounded bg-black/60 px-2 py-1 font-mono text-xs text-emerald-300 ring-1 ring-emerald-800"
        aria-label={t("inbox.title")}
      >
        ✉{unread > 0 && <span className="ml-1 text-amber-300">{unread}</span>}
      </button>
      {open && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-md overflow-auto rounded-lg border-2 border-emerald-700 bg-[#0d1b1e] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm font-bold tracking-widest text-emerald-300">{t("inbox.title")}</h2>
              <button onClick={() => setOpen(false)} className="font-mono text-xs text-emerald-500">
                ✕
              </button>
            </div>
            {msgs.length === 0 && <p className="mt-4 font-mono text-xs text-emerald-700">{t("inbox.empty")}</p>}
            <div className="mt-3 space-y-2">
              {msgs.map((m) => (
                <div key={m.id} className="rounded border border-emerald-900 bg-[#12262b] p-3">
                  <p className="font-mono text-xs font-bold text-emerald-300">{m.title}</p>
                  {m.body && <p className="mt-1 font-mono text-[11px] text-emerald-500">{m.body}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
