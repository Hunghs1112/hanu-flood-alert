import type { AreaStatusValue, Severity } from "@/lib/types";

export const STATUS_META: Record<AreaStatusValue, { label: string; short: string; className: string }> = {
  HEAVY: { label: "Ngập nặng", short: "Nguy hiểm", className: "status-heavy" },
  LIGHT: { label: "Ngập nhẹ", short: "Cảnh báo", className: "status-light" },
  DRY: { label: "Đã khô", short: "Ổn định", className: "status-dry" },
  UNKNOWN: { label: "Chưa có cập nhật", short: "Chưa rõ", className: "status-unknown" }
};

export function StatusChip({ status }: { status: AreaStatusValue | Severity }) {
  const meta = STATUS_META[status];
  return <span className={`status-chip ${meta.className}`}><span className="status-dot" />{meta.label}</span>;
}

export function timeAgo(value?: string | null) {
  if (!value) return "Chưa có cập nhật";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
