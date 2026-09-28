import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { DesktopNav, MobileNav } from "@/components/navigation";
import { AppMapShell } from "@/components/app-map-shell";

export const metadata: Metadata = {
  title: "HANU Pulse — Bản đồ ngập cộng đồng",
  description: "Theo dõi và chia sẻ tình trạng ngập quanh Đại học Hà Nội.",
  icons: { icon: "/favicon.svg" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <DesktopNav />
        <main><AppMapShell>{children}</AppMapShell></main>
        <MobileNav />
      </body>
    </html>
  );
}
