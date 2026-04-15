# Ứng dụng Android (Capacitor)

Thư mục này là **toàn bộ project** — không còn mã Vite/npm ở cấp trên.

- `app/src/main/assets/public/` — bundle web (HTML/CSS/JS, `hanzi-data`, JSON từ điển).
- `app/src/main/assets/capacitor.config.json` — cấu hình Capacitor.
- `capacitor-android/` — mã nguồn module Gradle Capacitor (nhúng sẵn, **không** cần `node_modules` ở repo cha).

## Mở và đóng gói APK

1. Android Studio → **Open** → chọn thư mục **`android`** (folder chứa file này).
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)** (debug hoặc ký release).

## Khi cần cập nhật giao diện web

Làm trong project web riêng (`npm run build`), rồi **chép** nội dung `dist/` vào `app/src/main/assets/public/` (ghi đè). Có thể **xoá** `word-definitions.json` trong `public/` sau khi chép — app Android không dùng file này (tránh APK ~+60MB).

## Ghi chú

- WebView yếu có thể OOM với JSON rất lớn — bản đã đóng gói đã tối ưu (không parse hết từ điển cụm trên Android, v.v.).
