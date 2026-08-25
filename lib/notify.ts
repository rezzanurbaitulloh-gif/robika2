import { createClient } from "@/lib/supabase/client";

/** D18 — cermin notifikasi penting ke tabel notifications (lintas sesi). */
export async function mirrorNotification(code: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").insert({ user_id: user.id, code, payload });
  } catch {}
}
