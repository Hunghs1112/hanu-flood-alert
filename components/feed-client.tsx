"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, LoaderCircle } from "lucide-react";
import { AREAS } from "@/lib/areas";
import type { FloodReport, Severity } from "@/lib/types";
import { ReportCard } from "./report-card";

type FilterValue = "ALL" | Severity;

export default function FeedClient() {
  const [reports, setReports] = useState<FloodReport[]>([]);
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports", { cache: "no-store" }).then((response) => response.json()).then((data) => { setReports(data.reports); setLoading(false); });
  }, []);

  const shown = useMemo(() => filter === "ALL" ? reports : reports.filter((report) => report.severity === filter), [filter, reports]);
  const filters: Array<{ value: FilterValue; label: string }> = [
    { value: "ALL", label: "Tất cả" },
    { value: "HEAVY", label: "Ngập nặng" },
    { value: "LIGHT", label: "Ngập nhẹ" },
    { value: "DRY", label: "Đã khô" }
  ];

  return (
    <div className="split-page"><div className="side-panel feed-shell">
      <section className="feed-main">
        <header className="page-heading"><div className="eyebrow">CỘNG ĐỒNG QUANH HANU</div><h1>Feed tình trạng</h1><p>Ảnh và cập nhật mới nhất từ mọi người trong khu vực.</p></header>
        <div className="filter-bar glass"><Filter size={17} />{filters.map((item) => <button key={item.value} className={filter === item.value ? "active" : ""} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
        <div className="feed-list">
          {loading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="report-card skeleton-card"><div /><div /><div /></div>) : null}
          {!loading && shown.length ? shown.map((report) => {
            const area = AREAS.find((item) => item.id === report.areaId) ?? AREAS[0];
            return <ReportCard key={report.id} report={report} area={area} />;
          }) : null}
          {!loading && !shown.length ? <div className="empty-card"><h2>Chưa có bài phù hợp</h2><p>Thử đổi bộ lọc hoặc đăng cập nhật đầu tiên.</p></div> : null}
        </div>
      </section>
    </div></div>
  );
}
