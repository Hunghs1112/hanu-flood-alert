"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Camera, Check, Clock3, Droplets, ImagePlus, LoaderCircle, ShieldCheck } from "lucide-react";
import { AREAS } from "@/lib/areas";
import type { Severity } from "@/lib/types";

const severityOptions: Array<{ value: Severity; label: string; helper: string; icon: string }> = [
  { value: "HEAVY", label: "Ngập nặng", helper: "Khó hoặc không thể di chuyển", icon: "🔴" },
  { value: "LIGHT", label: "Ngập nhẹ", helper: "Có nước nhưng vẫn có thể đi", icon: "🟡" },
  { value: "DRY", label: "Đã khô", helper: "Nước đã rút, đường ổn định", icon: "🟢" }
];

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_IMAGE_EDGE = 1920;
const imageTypes = ["image/jpeg", "image/png", "image/webp"];

async function prepareImage(file: File) {
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = source;
    });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.82;
    let blob: Blob | null = null;
    while (quality >= 0.42 && (!blob || blob.size > MAX_UPLOAD_BYTES)) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      quality -= 0.1;
    }
    if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error("too-large");
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(source);
  }
}

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
  const areaId = initialArea && AREAS.some((area) => area.id === initialArea)
    ? initialArea
    : initialCoordinates ? getNearestArea(initialCoordinates).id : "";
  const coordinates = initialCoordinates;
  const [severity, setSeverity] = useState<Severity | "">("");
  const [reporterName, setReporterName] = useState("");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16));
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [placeName, setPlaceName] = useState("");
  const [placeLoading, setPlaceLoading] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  useEffect(() => {
    if (!coordinates) {
      setPlaceName("");
      return;
    }
    const controller = new AbortController();
    setPlaceLoading(true);
    fetch(`/api/reverse-geocode?lat=${coordinates[1]}&lng=${coordinates[0]}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setPlaceName(result.placeName);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlaceName(`Tọa độ ${coordinates[1].toFixed(5)}, ${coordinates[0].toFixed(5)}`);
      })
      .finally(() => { if (!controller.signal.aborted) setPlaceLoading(false); });
    return () => controller.abort();
  }, [coordinates]);

  const valid = useMemo(() => Boolean(areaId && coordinates && placeName && !placeLoading && !preparingImage && severity && reporterName.trim().length >= 2), [areaId, coordinates, placeName, placeLoading, preparingImage, severity, reporterName]);

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!imageTypes.includes(file.type)) return setError("Ảnh phải là JPEG, PNG hoặc WebP.");
    setPreparingImage(true);
    setError("");
    try {
      const prepared = await prepareImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setImage(prepared);
      setPreview(URL.createObjectURL(prepared));
    } catch {
      setImage(null);
      setPreview(null);
      setError("Không thể nén ảnh này xuống mức có thể gửi. Hãy chọn ảnh khác.");
    } finally {
      setPreparingImage(false);
    }
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
      data.set("placeName", placeName);
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
      <header className="form-header"><div><div className="eyebrow">CẬP NHẬT CỘNG ĐỒNG</div><h1>Đăng tình trạng</h1><p>Chia sẻ nhanh trong vài giây, không cần tài khoản.</p></div></header>
      <section className="form-section"><div className="step">1</div><div className="form-section-body"><h2>Tình trạng hiện tại</h2><div className="severity-grid">{severityOptions.map((option) => <button key={option.value} type="button" className={severity === option.value ? `selected ${option.value.toLowerCase()}` : ""} onClick={() => setSeverity(option.value)}><span>{option.icon}</span><div><strong>{option.label}</strong><small>{option.helper}</small></div>{severity === option.value ? <Check size={18} /> : null}</button>)}</div></div></section>
      <section className="form-section"><div className="step">2</div><div className="form-section-body"><h2>Tên người đăng</h2><label className="field-label"><input value={reporterName} maxLength={40} onChange={(event) => setReporterName(event.target.value)} placeholder="Ví dụ: Minh Anh" /><small>Tên này sẽ hiển thị công khai trên bài viết.</small></label></div></section>
      <section className="form-section"><div className="step">3</div><div className="form-section-body"><h2>Thêm ảnh <span>Tùy chọn</span></h2>{preview ? <div className="image-preview"><Image src={preview} alt="Ảnh xem trước" fill /><label><Camera size={18} /> Thay ảnh<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} /></label><button type="button" onClick={() => { setImage(null); setPreview(null); }}>Xóa</button></div> : <label className="image-drop"><ImagePlus /><strong>{preparingImage ? "Đang tối ưu ảnh..." : "Chụp hoặc chọn ảnh"}</strong><small>JPEG, PNG hoặc WebP · ảnh lớn tự nén trước khi gửi</small><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={chooseImage} /></label>}</div></section>
      <section className="form-section"><div className="step">4</div><div className="form-section-body"><h2>Mô tả <span>Tùy chọn</span></h2><label className="field-label"><textarea value={description} maxLength={300} onChange={(event) => setDescription(event.target.value)} placeholder="Nước cao khoảng bao nhiêu? Xe máy có đi được không?" /><small>{description.length}/300</small></label></div></section>
      <section className="form-section"><div className="step">5</div><div className="form-section-body"><h2>Thời gian ghi nhận</h2><label className="field-label time-field"><Clock3 /><input type="datetime-local" value={occurredAt} max={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} onChange={(event) => setOccurredAt(event.target.value)} /></label></div></section>
      {error ? <div className="form-error">{error}</div> : null}
      <section className="form-submit-section">
        <div className="submit-bar glass"><div><ShieldCheck /><span>Thông tin được lưu vào lịch sử cộng đồng.</span></div><button className="primary-button" disabled={!valid || submitting}>{submitting ? <><LoaderCircle className="spin" /> Đang đăng...</> : "Đăng báo cáo"}</button></div>
      </section>
    </form>
  );
}
