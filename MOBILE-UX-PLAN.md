# Kế hoạch cải thiện UX mobile — HANU Pulse

## Mục tiêu

Mobile cần ưu tiên nội dung và thao tác chính, không để bản đồ nền cạnh tranh với Feed/Form, không che nội dung khi cuộn, và mọi control quan trọng vẫn dễ chạm bằng một tay.

## Phạm vi sửa

Chủ yếu:

- `app/globals.css`

Chỉ sửa component nếu CSS không đủ:

- `components/feed-client.tsx`
- `components/report-form.tsx`
- `components/map-experience.tsx`

## 1. Layout chung mobile

### Breakpoint

- `<= 900px`: mobile/tablet layout.
- `<= 520px`: điện thoại nhỏ.

### Thay đổi

- Route Feed/Form/Area dùng nền opaque toàn chiều rộng.
- Không để map persistent lộ ra ngoài panel ở các trang nội dung.
- Giữ `body` không scroll ngang.
- Chừa khoảng dưới cho mobile navigation bằng `padding-bottom` theo `safe-area-inset-bottom`.
- Không dùng `overflow: hidden` trên container nội dung vì sẽ làm mất khả năng cuộn form.

### Acceptance criteria

- 390x844: không thấy map lọt ở hai mép Feed/Form.
- Không có horizontal overflow.
- 768x1024: nội dung vẫn cân đối, không bị kéo giãn quá rộng.

## 2. Mobile navigation

Giữ mô hình 3 nút:

- Bản đồ.
- Đăng bài.
- Feed.

### Thay đổi

- Vùng chạm tối thiểu khoảng `48px`.
- Không che CTA hoặc nội dung cuối trang.
- Tôn trọng `env(safe-area-inset-bottom)`.
- Trạng thái active có tương phản rõ.
- Giữ `aria-label` dù text label đang ẩn trên mobile.

### Acceptance criteria

- Chạm được bằng một tay.
- Không bị che bởi keyboard hoặc safe area.
- Nút Đăng bài không đè lên thanh submit.

## 3. Trang Bản đồ

Giữ bản đồ là màn hình chính.

### Thay đổi

- Search button và legend button nằm trong vùng top, không đè nhau.
- Nút “Đặt ghim” nằm phía trên mobile nav một khoảng cố định.
- Control vị trí/HANU nằm bên phải, không bị panel che.
- Khi chưa chọn khu vực: chỉ hiển thị sheet tổng quan khi cần, tránh chiếm màn hình.
- Khi đã chọn khu vực: panel dạng bottom sheet với:
  - handle rõ ràng;
  - chiều cao tối đa khoảng `40–45vh`;
  - cuộn nội bộ nếu nội dung dài;
  - nút đóng và CTA luôn nhìn thấy.

### Acceptance criteria

- Map vẫn còn đủ vùng thao tác.
- Không control nào nằm dưới mobile nav.
- Panel khu vực không vượt quá nửa màn hình ở 390x844.
- Search result không che toàn bộ bản đồ và có thể cuộn.

## 4. Trang Feed

### Nguyên nhân hiện tại

`.feed-shell` vừa là panel nền vừa có `width: calc(100% - 24px)`, nên map lộ hai bên.

### Thay đổi

- `.feed-shell` trên mobile dùng `width: 100%`.
- Giữ khoảng cách bằng `padding-inline: 12px`, không dùng width nhỏ hơn viewport.
- Nền panel opaque để Feed là một trang độc lập.
- Giảm nhẹ cỡ heading trên màn hình nhỏ.
- Filter:
  - giữ scroll ngang nếu cần;
  - không cắt chữ button cuối;
  - thêm padding cuối;
  - ẩn scrollbar xấu nhưng vẫn hỗ trợ touch scroll;
  - giữ touch target đủ lớn.
- Empty state không chiếm quá nhiều chiều cao khi không có bài.

### Acceptance criteria

- Các nhãn “Tất cả”, “Ngập nặng”, “Ngập nhẹ”, “Đã khô” đọc được.
- Có thể kéo filter ngang bằng touch.
- Feed không bị bản đồ lộ nền.
- Scroll đến cuối không bị mobile nav che card cuối.

## 5. Trang Đăng bài

Đây là phần cần ưu tiên nhất.

### Form layout

- Giữ từng bước thành card riêng.
- Giảm padding ngang trên màn hình nhỏ nhưng không dưới khoảng `14–16px`.
- Bản đồ chọn vị trí giữ chiều cao khoảng `240–255px`.
- Các nút severity full width, cao tối thiểu `56–64px`.
- Input/textarea cao và dễ chạm.
- Không để text địa điểm bị tràn; dùng ellipsis hoặc xuống dòng hợp lý.

### Thanh “Đăng báo cáo”

Hiện tại thanh sticky disabled vẫn che section bên dưới.

#### Cách sửa tối thiểu

- Khi form chưa hợp lệ: submit bar nằm trong flow bình thường, không sticky.
- Khi form hợp lệ: mới cho sticky phía trên mobile nav.
- Dùng CSS `:has()` nếu trình duyệt mục tiêu hỗ trợ; không cần thêm state React.
- Khi sticky:
  - nền đủ opaque;
  - có khoảng cách với mobile nav;
  - không che textarea, ảnh hoặc datetime input;
  - chừa `padding-bottom` tương ứng.

### Upload ảnh

- Giữ vùng upload đủ lớn để chạm.
- Hiển thị rõ giới hạn JPEG/PNG/WebP và 5MB.
- Preview không vượt chiều rộng card.
- Nút xóa/thay ảnh không nằm sát mép.

### Keyboard và focus

- Input đang focus phải tự cuộn lên khỏi submit bar/mobile nav.
- Không để keyboard che field đang nhập.
- Kiểm tra `datetime-local` trên mobile Chrome.

### Acceptance criteria

- Cuộn từ section 1 đến 6 không bị CTA che nội dung.
- Chọn severity thấy trạng thái active rõ.
- Nhập tên/mô tả không bị mất focus.
- Nút submit chỉ sticky khi có thể submit.
- Form invalid không thể gửi.
- Không gửi report thật trong test nếu chưa có xác nhận.

## 6. Trang Area detail

- Nền full width trên mobile.
- Hero card không quá cao.
- Metrics chuyển thành một cột hoặc grid dễ đọc.
- Timeline và Feed xếp dọc.
- CTA không bị mobile nav che.
- Nút quay lại/chia sẻ giữ vùng chạm tối thiểu.

## 7. Test matrix

### Viewport

- 360x800.
- 390x844.
- 430x932.
- 768x1024.
- Desktop hiện tại.

### Luồng

- Bản đồ → tìm kiếm → chọn khu vực → đóng panel.
- Bản đồ → đặt ghim → mở form.
- Feed → từng filter.
- Feed → mở bài/khu vực nếu có dữ liệu.
- Form → chọn vị trí → chọn severity → nhập tên → nhập mô tả → upload preview → kiểm tra datetime.
- Quay lại giữa các trang.
- Kiểm tra console và build.

### Lệnh kiểm tra

```powershell
npm run typecheck
npm run build
```

## Thứ tự triển khai

1. Sửa Feed background/full-width.
2. Sửa submit bar trên mobile.
3. Tinh chỉnh filter.
4. Kiểm tra bottom sheet của bản đồ.
5. Kiểm tra Area/detail.
6. Chạy typecheck/build.
7. Test lại toàn bộ trên mobile và desktop.

## Giới hạn phạm vi

Không thêm thư viện mới, không tạo abstraction mới, không thay đổi API hoặc data model. Ưu tiên một file CSS; chỉ sửa component khi cần để đạt hành vi UX.
