# Ứng dụng Android (Capacitor)

**Toàn bộ chỉnh sửa nằm dưới thư mục `android/`** (repo). Cấu trúc chuẩn Capacitor:

| Thư mục / file | Nội dung |
|----------------|----------|
| `src/` | `main.js`, `style.css` — giao diện & logic (Vite) |
| `package.json`, `vite.config.js`, `index.html` | Build bundle vào `dist/` |
| **`android/android/`** | Project **Gradle** — mở **folder này** trong Android Studio |
| `android/android/app/src/main/assets/public/` | Bundle + `hanzi-data`, JSON (sau `npm run android:sync`) |

## Android Studio (đóng gói APK)

**File → Open** → chọn:

`…/android/android`

(trùng tên `android` hai lần: một là app Capacitor, một là module native — bắt buộc theo Capacitor.)

Sau đó **Build → Build APK(s)**.

## Sau khi sửa `src/`

Trong terminal, **cwd = thư mục `android`** (cấp có `package.json` và `src/`):

```bash
npm install
npm run android:sync
```

Rồi build lại APK trong Android Studio.

## Ghi chú

- WebView có thể OOM nếu JSON quá lớn — code đã hạn chế tải từ điển cụm nặng trên Android.
