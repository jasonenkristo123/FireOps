"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";

const snapshotSchema = z.object({
  modes: z
    .array(
      z.object({
        mode: z.enum(["demo", "live"]),
        unread: z.number().int().nonnegative(),
        latest: z.uuid().nullable(),
      }),
    )
    .length(2),
});
export function NotificationIndicator() {
  const router = useRouter();
  const pathname = usePathname();
  const [counts, setCounts] = useState({ demo: 0, live: 0 });
  const [status, setStatus] = useState("Memeriksa notifikasi…");
  useEffect(() => {
    let disposed = false;
    let pending = false;
    let denied = false;
    let delay = 30000;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    let signature: string | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!disposed && !denied) timer = setTimeout(check, delay);
    };
    async function check() {
      if (disposed || pending || denied) return;
      if (document.hidden || !navigator.onLine) {
        setStatus(
          navigator.onLine
            ? "Pembaruan dijeda saat tab tidak aktif."
            : "Offline · notifikasi akan diperbarui setelah tersambung.",
        );
        schedule();
        return;
      }
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (disposed) return;
        if ([401, 403].includes(response.status)) {
          denied = true;
          setCounts({ demo: 0, live: 0 });
          setStatus("Sesi atau izin berubah. Muat ulang untuk masuk kembali.");
          router.refresh();
          return;
        }
        if (!response.ok) throw new Error("UNAVAILABLE");
        const data = snapshotSchema.parse(await response.json());
        if (disposed) return;
        const next = JSON.stringify(data);
        setCounts({
          demo: data.modes.find((m) => m.mode === "demo")?.unread ?? 0,
          live: data.modes.find((m) => m.mode === "live")?.unread ?? 0,
        });
        setStatus("Notifikasi diperiksa setiap 30 detik saat tab aktif.");
        if (
          signature !== undefined &&
          signature !== next &&
          pathname === "/notifications"
        )
          router.refresh();
        signature = next;
        delay = 30000;
      } catch {
        if (!disposed) {
          setStatus(
            "Pembaruan tertunda · mencoba kembali otomatis. Daftar tersimpan tetap tersedia.",
          );
          delay = Math.min(delay * 2, 120000);
        }
      } finally {
        clearTimeout(timeout);
        pending = false;
        schedule();
      }
    }
    const resume = () => {
      if (!document.hidden && navigator.onLine) {
        clearTimeout(timer);
        void check();
      }
    };
    const offline = () => {
      controller?.abort();
      setStatus("Offline · notifikasi akan diperbarui setelah tersambung.");
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    void check();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
    };
  }, [pathname, router]);
  return (
    <div className="max-w-md text-sm">
      <output
        className="flex flex-wrap gap-x-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <Link href="/notifications?mode=demo">
          Notifikasi DEMO: {counts.demo} belum dibaca
        </Link>
        <Link href="/notifications?mode=live">
          Notifikasi LIVE: {counts.live} belum dibaca
        </Link>
      </output>
      <p className="mt-1 text-xs text-muted-foreground">{status}</p>
    </div>
  );
}
