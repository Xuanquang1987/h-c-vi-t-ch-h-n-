# Đóng gói APK chỉ với Android Studio

Dự án dùng **Capacitor**: mỗi lần bạn **Build APK** trong Android Studio, Gradle sẽ (trừ khi tắt) tự chạy:

1. `npm install` nếu chưa có `node_modules`
2. `npm run build` (Vite → `dist/`)
3. `npx cap sync android` (chép web + tạo `capacitor-cordova-android-plugins`, `assets/public`, v.v.)

Vì vậy bạn **không cần** nhớ chạy `npm run android:build` trước mỗi lần đóng gói, miễn là máy đã cài **Node.js** (khuyên bản LTS) và Node nằm trong **PATH** (mở CMD gõ `node -v` thấy phiên bản là được).

## Chuẩn bị một lần

- **Android Studio** (SDK, Build-Tools; AS thường cài sẵn JDK kèm theo).
- **Node.js LTS** từ [nodejs.org](https://nodejs.org/).

## Mở dự án

1. Android Studio → **Open** → chọn thư mục **`android`** (thư mục con của repo, không phải thư mục gốc chứa `package.json`).
2. Lần đầu, Android Studio tạo file **`android/local.properties`** với đường dẫn SDK (`sdk.dir=...`). Nếu build báo thiếu SDK, mở **SDK Manager** trong AS và cài Android SDK Platform khớp `compileSdk` trong `variables.gradle`.

## Build APK debug (cài thử máy thật / giả lập)

**Build → Build Bundle(s) / APK(s) → Build APK(s)**  
Chọn **debug**. File APK:

`android/app/build/outputs/apk/debug/app-debug.apk`

## Build bản phát hành (release, ký)

**Build → Generate Signed App Bundle / APK** và làm theo trình hướng dẫn (keystore riêng của bạn).  
APK/AAB release **không** dùng chung ký với debug.

## Bỏ qua bước sync web (build nhanh hơn)

Khi đã sync xong và chỉ sửa Kotlin/Java/XML:

- Thêm vào **Gradle** (Command-line options): `-PskipWebSync`  
  hoặc đặt biến môi trường: `SKIP_CAPACITOR_WEB_SYNC=true`

Khi bỏ qua sync mà thư mục `android/app/src/main/assets/public` **trống hoặc thiếu `index.html`**, build sẽ báo lỗi rõ ràng — khi đó hãy build lại **không** dùng skip, hoặc từ thư mục gốc repo chạy:  
`npm install && npm run build && npx cap sync android`.

## Node không tìm thấy khi Gradle chạy trong Android Studio

Trên Windows, đôi khi IDE không thấy PATH của user:

- Cài Node bản **User** hoặc thêm Node vào **PATH hệ thống**, khởi động lại Android Studio.
- Hoặc trong **Settings → Build, Execution, Deployment → Gradle → Environment** thêm biến `PATH` bổ sung đường dẫn tới thư mục chứa `node.exe`.

## Ứng dụng bị crash khi mở

Nguyên nhân thường gặp: **WebView hết RAM (OOM)** — log có thể ghi `Renderer process ... kill (OOM)`, `aw_browser_terminator`.

1. **`word-definitions.json`** rất lớn (~hàng chục MB): app **không** parse file này trên Android.
2. **`char-definitions.json`** (~vài MB) + **Hanzi Writer** (canvas) cùng lúc cũng có thể gây OOM: trên Android, từ điển chữ được **tải sau** khi khung vẽ đã khởi tạo (giảm đỉnh bộ nhớ).

Sau khi cập nhật mã, **Build → Build APK(s)** lại. Trên máy ảo, có thể tăng **RAM** (AVD → Edit) nếu vẫn chật.

## Ghi chú

- Thư mục `android/app/src/main/assets/public` và một số file Capacitor **không** commit (`.gitignore`); chúng được tạo lại khi sync/build.
- APK **debug** chỉ để thử nội bộ; đưa lên CH Play cần **release** đã ký và tuân thủ chính sách store.
