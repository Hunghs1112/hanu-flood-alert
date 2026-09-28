import { Suspense } from "react";
import ReportForm from "@/components/report-form";
import { PageMapBackdrop } from "@/components/page-map-backdrop";

export const metadata = { title: "Đăng tình trạng — HANU Pulse" };

export default function ReportPage() {
  return <div className="split-page"><PageMapBackdrop /><div className="side-panel report-page"><Suspense><ReportForm /></Suspense></div></div>;
}
