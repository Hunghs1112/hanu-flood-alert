# HANU Pulse

Website bản đồ cộng đồng hiển thị tình trạng ngập quanh Đại học Hà Nội.

## Tính năng hiện tại

- MapLibre map với zoom con lăn, pinch zoom và kéo bản đồ.
- Bubble màu theo trạng thái, kích thước theo số người báo cáo.
- Feed bài đăng có ảnh.
- Đăng báo cáo không cần tài khoản.
- Lịch sử vĩnh viễn theo khu vực.
- Giao diện glass, mobile-first và responsive desktop.
- API backend chạy trong Next.js Route Handlers.

## Chạy development

```bash
npm install
npm run dev
```

## Build production

```bash
npm run typecheck
npm run build
npm run start -- -p 4317 -H 0.0.0.0
```

## Dữ liệu

- Danh sách khu vực nằm trong `lib/areas.ts`.
- Report runtime được lưu tại `data/reports.runtime.json`.
- Ảnh tải lên được lưu tại `public/uploads`.
- Hai đường dẫn runtime trên được bỏ khỏi Git.

Kiến trúc lưu file hiện tại phù hợp cho MVP một process. Khi mở rộng nhiều instance, chuyển report sang PostgreSQL/PostGIS và ảnh sang object storage.

