import {
  Bell,
  Flame,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { AccessProfile } from "@/features/auth/access";
import { logout } from "@/features/auth/actions";
import { NotificationIndicator } from "./notification-indicator";

const links = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/incidents", "Insiden", MapPinned],
  ["/priorities", "Prioritas", ListChecks],
  ["/assignments", "Penugasan", ListChecks],
  ["/teams", "Tim & petugas", Users],
  ["/notifications", "Notifikasi", Bell],
  ["/settings", "Profil & pengaturan", Settings],
] as const;
export function Shell({
  profile,
  districts,
  children,
}: {
  profile: AccessProfile;
  districts: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b bg-card p-4 lg:sticky lg:top-0 lg:h-screen lg:border-r">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-2xl font-bold no-underline"
        >
          <Flame aria-hidden className="text-orange-700" />
          FireOps
        </Link>
        <p className="my-3 text-sm text-muted-foreground">
          Koordinasi pemantauan
          <br />
          Kalimantan Barat
        </p>
        <nav
          aria-label="Navigasi utama"
          className="flex gap-2 overflow-x-auto lg:flex-col"
        >
          {links.map(([href, name, Icon]) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline hover:bg-muted"
            >
              <Icon aria-hidden className="size-4" />
              {name}
            </Link>
          ))}
          {profile.role === "admin" && (
            <>
              <Link
                href="/admin/users"
                className="gap-2 rounded-md px-3 py-2 text-sm no-underline hover:bg-muted"
              >
                <ShieldCheck aria-hidden className="size-4" />
                Akses akun
              </Link>
              <Link
                href="/admin/settings"
                className="gap-2 rounded-md px-3 py-2 text-sm no-underline hover:bg-muted"
              >
                <Settings aria-hidden className="size-4" />
                Kesehatan sistem
              </Link>
              <Link
                href="/admin/audit"
                className="gap-2 rounded-md px-3 py-2 text-sm no-underline hover:bg-muted"
              >
                <ShieldCheck aria-hidden className="size-4" />
                Audit perubahan
              </Link>
            </>
          )}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3">
          <div>
            <strong>{profile.display_name || "Ruang kerja petugas"}</strong>
            <p className="text-sm text-muted-foreground">
              Peran: {profile.role} · Wilayah tugas:{" "}
              {districts.join(", ") || "Belum ditetapkan"}
            </p>
          </div>
          {districts.length > 0 && <NotificationIndicator />}
          <form action={logout}>
            <Button variant="outline" type="submit">
              Keluar
            </Button>
          </form>
        </header>
        <main id="main" className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-7">
          {children}
        </main>
      </div>
    </div>
  );
}
