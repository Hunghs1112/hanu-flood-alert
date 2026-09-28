"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Newspaper, Plus, RadioTower } from "lucide-react";

export function Brand() {
  return <Link className="brand" href="/"><span className="brand-mark"><RadioTower size={18} /></span><span>HANU <b>PULSE</b></span></Link>;
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <header className="desktop-nav glass">
      <Brand />
      <nav>
        <Link className={pathname === "/" ? "active" : ""} href="/"><Map size={18} /> Bản đồ</Link>
        <Link className={pathname.startsWith("/feed") ? "active" : ""} href="/feed"><Newspaper size={18} /> Feed</Link>
        <Link className="nav-create" href="/report"><Plus size={18} /> Đăng bài</Link>
      </nav>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/report")) return null;
  return (
    <nav className="mobile-nav glass" aria-label="Điều hướng chính">
      <Link className={pathname === "/" || pathname.startsWith("/area") ? "active" : ""} href="/"><Map /><span>Bản đồ</span></Link>
      <Link className="mobile-create" href="/report" aria-label="Đăng bài"><Plus /><span>Đăng bài</span></Link>
      <Link className={pathname.startsWith("/feed") ? "active" : ""} href="/feed"><Newspaper /><span>Feed</span></Link>
    </nav>
  );
}
