import { Suspense } from "react";
import ReportForm from "@/components/report-form";

export const metadata = { title: "Đăng tình trạng — HANU Pulse" };

export default function ReportPage() {
  return <div className="report-page"><Suspense><ReportForm /></Suspense></div>;
}
