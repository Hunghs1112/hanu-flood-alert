"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, Check, Clock3, Crosshair, Droplets, ImagePlus, LoaderCircle, MapPin, ShieldCheck, X } from "lucide-react";
import { AREAS } from "@/lib/areas";
import type { Severity } from "@/lib/types";
import { LocationPicker } from "./location-picker";

const severityOptions: Array<{ value: Severity; label: string; helper: string; icon: string }> = [
  { value: "HEAVY", label: "Ngập nặng", helper: "Khó hoặc không thể di chuyển", icon: "🔴" },
  { value: "LIGHT", label: "Ngập nhẹ", helper: "Có nước nhưng vẫn có thể đi", icon: "🟡" },
  { value: "DRY", label: "Đã khô", helper: "Nước đã rút, đường ổn định", icon: "🟢" }
];

function getNearestArea(coordinates: [number, number]) {
  return [...AREAS].sort((a, b) => {
    const distanceA = Math.hypot(a.coordinates[0] - coordinates[0], a.coordinates[1] - coordinates[1]);
    const distanceB = Math.hypot(b.coordinates[0] - coordinates[0], b.coordinates[1] - coordinates[1]);
    return distanceA - distanceB;
  })[0];
}

function getDeviceId() {
  const storageKey = "hanu-device-id";

  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
  } catch {
    // Private browsing modes can deny access to localStorage.
  }

  const randomBytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let index = 0; index < randomBytes.length; index += 1) {
      randomBytes[index] = Math.floor(Math.random() * 256);
    }
  }

  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;
  const hex = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, "0"));
  const value = `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;

  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // The ID still works for this submission when storage is unavailable.
  }

  return value;
}

export default function ReportForm() {
  const router = useRouter();
  const search = useSearchParams();
  const initialArea = search.get("area");
  const initialCoordinates = (() => {
    const latitude = Number.parseFloat(search.get("lat") ?? "");
    const longitude = Number.parseFloat(search.get("lng") ?? "");
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return [longitude, latitude] as [number, number];
    const area = AREAS.find((item) => item.id === initialArea);
    return area ? area.coordinates : null;
  })();
  const [areaId, setAreaId] = useState(() => {
    if (initialArea && AREAS.some((area) => area.id === initialArea)) return initialArea;
    return initialCoordinates ? getNearestArea(initialCoordinates).id : "";
  });
  const [coordinates, setCoordinates] = useState<[number, number] | null>(initialCoordinates);
  const [severity, setSeverity] = useState<Severity | "">("");
  const [reporterName, setReporterName] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const valid = useMemo(() => Boolean(areaId && severity && reporterName.trim().length >= 2), [areaId, severity, reporterName]);

  function chooseCoordinates(nextCoordinates: [number, number]) {
    setCoordinates(nextCoordinates);
    setAreaId(getNearestArea(nextCoordinates).id);
    setError("");
  }

  function chooseArea(nextAreaId: string) {
    setAreaId(nextAreaId);
    const area = AREAS.find((item) => item.id === nextAreaId);
    setCoordinates(area?.coordinates ?? null);
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(file ? URL.createObjectURL(file) : null);
    setError("");
  }

  function findNearestArea() {
    if (!navigator.geolocation) return setError("Trình duyệt chưa hỗ trợ định vị.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      chooseCoordinates([position.coords.longitude, position.coords.latitude]);
      setLocating(false);
    }, () => { setError("Không lấy được vị trí. Bạn có thể chọn khu vực bên dưới."); setLocating(false); });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const data = new FormData();
      data.set("areaId", areaId);
      data.set("severity", severity);
      data.set("reporterName", reporterName.trim());
      data.set("description", description.trim());
      data.set("occurredAt", new Date(occurredAt).toISOString());
      data.set("deviceId", getDeviceId());
      if (coordinates) {
        data.set("longitude", String(coordinates[0]));
        data.set("latitude", String(coordinates[1]));
      }
      if (image) data.set("image", image);

      const response = await fetch("/api/reports", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Chưa thể đăng báo cáo.");
        return;
      }
      window.dispatchEvent(new Event("hanu:reports-updated"));
      setSuccess(true);
    } catch {
      setError("Kết nối bị gián đoạn. Vui lòng thử đăng lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return (
    <section className="success-screen">
      <div className="success-icon"><Check /></div>
      <div className="eyebrow">ĐÃ CẬP NHẬT KHU VỰC</div>
      <h1>Cảm ơn bạn đã chia sẻ</h1>
      <p>Báo cáo đã xuất hiện trên feed và được tính vào bubble khu vực.</p>
      <div className="success-actions"><button className="primary-button" onClick={() => router.push("/")}>Xem trên bản đồ</button><button className="secondary-button" onClick={() => router.push("/feed")}>Xem trong feed</button></div>
    </section>
  );

  return (
    <form className="report-form" onSubmit={submit}>
      <header className="form-header"><button type="button" onClick={() => router.back()} aria-label="Đóng"><X /></button><div><div className="eyebrow">CẬP NHẬT CỘNG ĐỒNG</div><h1>Đăng tình trạng</h1><p>Chia sẻ nhanh trong vài giây, không cần tài khoản.</p></div></header>
      <section className="form-section"><div className="step">1</div><div className="form-section-body"><h2>Chọn vị trí trên bản đồ</h2><LocationPicker value={coordinates} onChange={chooseCoordinates} /><button className="locate-button" type="button" onClick={findNearestArea}>{locating ? <LoaderCircle className="spin" /> : <Crosshair />} {locating ? "Đang tìm vị trí..." : "Đặt ghim tại vị trí hiện tại"}</button><label className="field-label">Khu vực gần nhất<select value={areaId} onChange={(event) => chooseArea(event.target.value)}><option value="">Chọn khu vực</option>{AREAS.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</select><small>Chạm bản đồ sẽ tự động chọn khu vực gần điểm ghim.</small></label></div></section>
      <section className="form-section"><div className="step">2</div><div className="form-section-body"><h2>Tình trạng hiện tại</h2><div className="severity-grid">{severityOptions.map((option) => <button key={option.value} type="button" className={severity === option.value ? `selected ${option.value.toLowerCase()}` : ""} onClick={() => setSeverity(option.value)}><span>{option.icon}</span><div><strong>{option.label}</strong><small>{option.helper}</small></div>{severity === option.value ? <Check size={18} /> : null}</button>)}</div></div></section>
      <section className="form-section"><div className="step">3</div><div className="form-section-body"><h2>Tên người đăng</h2><label className="field-label"><input value={reporterName} maxLength={40} onChange={(event) => setReporterName(event.target.value)} placeholder="Ví dụ: Minh Anh" /><small>Tên này sẽ hiển thị công khai trên bài viết.</small></label></div></section>
      <section className="form-section"><div className="step">4</div><div className="form-section-body"><h2>Thêm ảnh <span>Tùy chọn</span></h2>{preview ? <div className="image-preview"><Image src={preview} alt="Ảnh xem trước" fill /><label><Camera size={18} /> Thay ảnh<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /></label><button type="button" onClick={() => { setImage(null); setPreview(null); }}>Xóa</button></div> : <label className="image-drop"><ImagePlus /><strong>Chụp hoặc chọn ảnh</strong><small>JPEG, PNG hoặc WebP · tối đa 5MB</small><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={chooseImage} /></label>}</div></section>
      <section className="form-section"><div className="step">5</div><div className="form-section-body"><h2>Mô tả <span>Tùy chọn</span></h2><label className="field-label"><textarea value={description} maxLength={300} onChange={(event) => setDescription(event.target.value)} placeholder="Nước cao khoảng bao nhiêu? Xe máy có đi được không?" /><small>{description.length}/300</small></label></div></section>
      <section className="form-section"><div className="step">6</div><div className="form-section-body"><h2>Thời gian ghi nhận</h2><label className="field-label time-field"><Clock3 /><input type="datetime-local" value={occurredAt} max={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} onChange={(event) => setOccurredAt(event.target.value)} /></label></div></section>
      {error ? <div className="form-error">{error}</div> : null}
      <div className="submit-bar glass"><div><ShieldCheck /><span>Thông tin được lưu vào lịch sử cộng đồng.</span></div><button className="primary-button" disabled={!valid || submitting}>{submitting ? <><LoaderCircle className="spin" /> Đang đăng...</> : "Đăng báo cáo"}</button></div>
    </form>
  );
}
