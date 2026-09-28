"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Users } from "lucide-react";
import type { Area, FloodReport } from "@/lib/types";
import { StatusChip, timeAgo } from "./status";

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function ReportCard({ report, area, compact = false }: { report: FloodReport; area: Area; compact?: boolean }) {
  return (
    <article className={`report-card ${compact ? "compact" : ""}`}>
      <header className="report-head">
        <div className="avatar" aria-hidden>{initials(report.reporterName)}</div>
        <div className="report-author"><strong>{report.reporterName}</strong><Link href={`/area/${area.slug}`}><MapPin size={13} /> {area.name}</Link></div>
        <time dateTime={report.occurredAt}>{timeAgo(report.occurredAt)}</time>
      </header>
      <div className="report-status"><StatusChip status={report.severity} /></div>
      {report.imageUrl ? <div className="report-image"><Image src={report.imageUrl} alt={`Ảnh tình trạng tại ${area.name}`} fill sizes="(max-width: 760px) 100vw, 640px" /></div> : null}
      {report.description ? <p className="report-copy">{report.description}</p> : null}
      <Link className="social-proof" href={`/area/${area.slug}`}><Users size={15} /> Xem tình trạng cộng đồng tại {area.name}</Link>
    </article>
  );
}
