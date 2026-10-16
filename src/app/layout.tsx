import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FireOps", template: "%s · FireOps" },
  description:
    "Pemantauan deteksi hotspot dan koordinasi verifikasi manusia di Kalimantan Barat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <a href="#main" className="skip-link">
          Lewati ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
