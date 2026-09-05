"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 bg-amber-900/90 px-4 py-2 text-center font-mono text-xs text-amber-100">
      ● Offline — progres akan disinkronkan saat online kembali
    </div>
  );
}
