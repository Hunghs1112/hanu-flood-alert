"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Map, Newspaper, Plus, RadioTower } from "lucide-react";
import { getReportLocation } from "@/lib/report-location";

export function Brand() {
  return <Link className="brand" href="/"><span className="brand-mark"><RadioTower size={18} /></span><span>HANU <b>PULSE</b></span></Link>;
}

export function DesktopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const openReport = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const location = getReportLocation();
    if (!location) return;
    event.preventDefault();
    router.push(`/report?lat=${location.coordinates[1]}&lng=${location.coordinates[0]}`);
  };
  return (
    <header className="desktop-nav glass">
      <Brand />
      <nav>
        <Link className={pathname === "/" ? "active" : ""} href="/"><Map size={18} /> Bản đồ</Link>
        <Link className={pathname.startsWith("/feed") ? "active" : ""} href="/feed"><Newspaper size={18} /> Feed</Link>
        <Link className="nav-create" href="/report" onClick={openReport}><Plus size={18} /> Đăng bài</Link>
      </nav>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const openReport = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const location = getReportLocation();
    if (!location) return;
    event.preventDefault();
    router.push(`/report?lat=${location.coordinates[1]}&lng=${location.coordinates[0]}`);
  };
  return (
    <nav className="mobile-nav glass" aria-label="Điều hướng chính">
      <Link aria-label="Bản đồ" title="Bản đồ" className={pathname === "/" || pathname.startsWith("/area") ? "active" : ""} href="/"><Map /><span>Bản đồ</span></Link>
      <Link className={`mobile-create ${pathname.startsWith("/report") ? "active" : ""}`} href="/report" onClick={openReport} aria-label="Đăng bài" title="Đăng bài"><Plus /><span>Đăng bài</span></Link>
      <Link aria-label="Feed" title="Feed" className={pathname.startsWith("/feed") ? "active" : ""} href="/feed"><Newspaper /><span>Feed</span></Link>
    </nav>
  );
}
