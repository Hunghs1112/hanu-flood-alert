import Link from "next/link";
import { ArrowLeft, Clock3, MapPin, Plus, Share2, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { ReportCard } from "@/components/report-card";
import { StatusChip, timeAgo } from "@/components/status";
import { getAreaBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getAreaBySlug(slug);
  if (!data) notFound();
  const { area, reports } = data;

  return (
    <div className="split-page"><div className="side-panel area-page">
      <section className={`area-hero ${area.status.toLowerCase()}`}>
        <div className="area-top-actions"><Link href="/" aria-label="Quay lại bản đồ"><ArrowLeft /></Link><button aria-label="Chia sẻ"><Share2 /></button></div>
        <div className="eyebrow"><MapPin size={14} /> TÌNH TRẠNG KHU VỰC</div>
        <h1>{area.name}</h1>
        <StatusChip status={area.status} />
        <p>{area.recentReporterCount >= 4 ? "Cộng đồng đang báo cáo mạnh" : area.recentReporterCount >= 2 ? "Nhiều người cùng ghi nhận" : area.recentReporterCount === 1 ? "Có báo cáo mới" : "Chưa có cập nhật gần đây"}</p>
        <div className="area-metrics"><div><Users /><strong>{area.recentReporterCount}</strong><span>người báo gần đây</span></div><div><Plus /><strong>{area.recentReportCount}</strong><span>bài trong 2 giờ</span></div><div><Clock3 /><strong>{timeAgo(area.latestReportAt)}</strong><span>cập nhật mới nhất</span></div></div>
        <Link className="primary-button" href={`/report?area=${area.id}`}>Cập nhật tình trạng</Link>
      </section>
      <div className="area-content">
        <section className="timeline-section"><div className="section-heading"><div><div className="eyebrow">DÒNG THỜI GIAN</div><h2>Lịch sử cộng đồng</h2></div><div className="time-tabs"><button className="active">Hiện tại</button><button>Hôm nay</button><button>7 ngày</button></div></div>
          <div className="timeline">{reports.slice(0, 8).map((report) => <div className="timeline-item" key={report.id}><span className={`timeline-dot ${report.severity.toLowerCase()}`} /><time>{new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(report.occurredAt))}</time><div><StatusChip status={report.severity} /><p>{report.reporterName}{report.description ? ` · ${report.description}` : ""}</p></div></div>)}</div>
        </section>
        <section className="area-feed"><div className="section-heading"><div><div className="eyebrow">BÀI ĐĂNG</div><h2>Cập nhật tại {area.name}</h2></div><Link href={`/feed?area=${area.id}`}>Xem feed</Link></div><div className="feed-list">{reports.slice(0, 4).map((report) => <ReportCard key={report.id} report={report} area={area} compact />)}</div></section>
      </div>
    </div></div>
  );
}
