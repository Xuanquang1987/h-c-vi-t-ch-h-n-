# Ứng dụng Android (Capacitor)

Thư mục này là **toàn bộ project** — không còn mã Vite/npm ở cấp trên.

- `app/src/main/assets/public/` — bundle web (HTML/CSS/JS, `hanzi-data`, JSON từ điển).
- `app/src/main/assets/capacitor.config.json` — cấu hình Capacitor.
- `capacitor-android/` — mã nguồn module Gradle Capacitor (nhúng sẵn, **không** cần `node_modules` ở repo cha).

## Mở và đóng gói APK

1. Android Studio → **Open** → chọn thư mục **`android`** (folder chứa file này).
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)** (debug hoặc ký release).

## Cập nhật giao diện (mã nguồn ở thư mục gốc repo)

1. Sửa `src/main.js`, `src/style.css`, v.v. Dữ liệu tĩnh dùng chung: `app/src/main/assets/public/` (hanzi-data, JSON).
2. Từ **thư mục gốc** (chứa `package.json`): `npm install` (lần đầu), rồi **`npm run android:sync`** (build web + đồng bộ Capacitor + vá lại `capacitor.settings.gradle` cho module nhúng).
3. Mở lại project `android` trong Android Studio và build APK.

Trên máy **chỉ cần APK** có thể bỏ qua bước 2 nếu không đổi code.

## Ghi chú

- WebView yếu có thể OOM với JSON rất lớn — bản đã đóng gói đã tối ưu (không parse hết từ điển cụm trên Android, v.v.).
