# Lõi logic Kotlin (bản sao hành vi app web)

Thư mục này chứa mã **Kotlin thuần** trích logic từ `src/main.js`, **không** phụ thuộc Android hay WebView.

## Cách dùng trong dự án Android Studio mới

1. Tạo module **Empty Activity (Compose)** hoặc thêm package vào app.
2. Copy cả cây `src/main/kotlin/net/hocviet/luyenviet/core/` vào module `app` (giữ nguyên package).
3. Thêm dependency (ví dụ Gson/Moshi) để parse JSON → `CharDefinition` / `WordDefinition` (field trùng key JSON).
4. Đọc **`docs/PRODUCT_SPEC_FROM_WEBAPP.md`** cho toàn bộ luồng UI, dữ liệu, Hanzi Writer.

## Phần chưa có trong Kotlin (cần làm trên Android)

- Vẽ nét / quiz: tương đương Hanzi Writer (Canvas native hoặc WebView tạm).
- Tải `hanzi-data/*.json` từ `assets`.

## Kiểm tra nhanh (tùy chọn)

Sau khi gắn module vào Gradle, có thể viết unit test cho `resolveDefinitionDisplay` với map giả lập.
