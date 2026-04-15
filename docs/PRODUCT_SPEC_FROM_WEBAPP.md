# Đặc tả sản phẩm — chuyển từ app web «Luyện viết chữ Hán»

Tài liệu này **bám sát** mã nguồn web (`src/main.js`, `src/style.css`, pipeline build) để dùng làm **nguồn sự thật** khi xây app Android native (Kotlin) mà không cần nhắc lại từng chi tiết.

---

## 1. Mục tiêu sản phẩm

- Luyện viết chữ Hán có **dữ liệu nét** (stroke order, quiz).
- **Chọn chữ / từ / cụm** trong ô nhập; gợi ý từ danh sách chữ có nét.
- **BẮT ĐẦU** (mẫu nét): phát animation nét theo thứ tự; nếu nhập **nhiều chữ** → chạy lần lượt từng chữ.
- **Luyện viết**: quiz nghiêm; nhiều chữ → xong chữ này tự sang chữ sau.
- **Giải nghĩa**: một khối gọn — ưu tiên **cụm** nếu có trong từ điển cụm; không thì **chữ đang xem**; có **Pinyin** (có dấu thanh), Hán Việt, nghĩa, ví dụ/ghi chú.

---

## 2. Nguồn dữ liệu (build + runtime)

| Tệp | Vai trò |
|-----|---------|
| `public/hanzi-data/chars.json` | Danh sách mọi chữ có file nét (chuỗi JSON array). |
| `public/hanzi-data/{char}.json` | Dữ liệu nét cho Hanzi Writer (theo chữ, URL-encode tên file). |
| `public/char-definitions.json` | Map `chữ` → `{ chu, hanViet, nghia, vidu, pinyin? }`. |
| `public/word-definitions.json` | Map `cụm` (≥2 chữ) → `{ chu, hanViet, nghia, vidu, pinyin?, source? }`. |

**Ô nhập:** chỉ ký tự **có trong `chars.json`** mới được đưa vào «chuỗi drawable» (bỏ khoảng trắng, dấu, chữ không có nét).

---

## 3. Trạng thái logic (web)

- `allChars`: copy của `chars.json`.
- `definitions`: `char-definitions.json`.
- `wordDefinitions`: `word-definitions.json` (có thể rỗng nếu không tải).
- `currentChar`: chữ đang hiển thị / luyện trên khung viết.
- `writer`: instance Hanzi Writer (null nếu lỗi tải nét).

---

## 4. Hành vi chi tiết

### 4.1 `parseDrawableSequence(raw)`

- Trim chuỗi.
- Duyệt từng **grapheme** (ký tự Unicode).
- Giữ chỉ những ký tự `hasCharData` (có trong `allChars`).

### 4.2 Gợi ý (`filterSuggestions` / `renderSuggestions`)

- Truy vấn trim; tối đa **40** kết quả.
- Ưu tiên: chữ trong `allChars` mà `c.includes(q) || c === q`.
- Nếu rỗng: thử khớp **mã hex** của codepoint (chuỗi query lowercase).
- Tap một gợi ý: gán ô nhập = chữ đó, đóng hộp, `loadCharacter(ch)`.

### 4.3 `loadCharacter(input)`

- `seq = parseDrawableSequence(input)`.
- Nếu rỗng → báo lỗi (ít nhất một chữ có nét).
- `trimmed = seq[0]`; `currentChar = trimmed`.
- Writer: `cancelQuiz`, `setCharacter(trimmed)`, `updateDimensions` (kích thước ô viết).
- Lần đầu: `HanziWriter.create` với options (mục 5).
- `renderDefinitionPanel(trimmed)`.

### 4.4 Kích thước vùng viết

- `width = height = min(windowWidth - 20, 340)`, `padding: 4`.
- Resize cửa sổ: debounce 200ms → `updateDimensions`.

### 4.5 BẮT ĐẦU (demo)

- `seq = getSequenceFromInput()` từ ô nhập (drawable).
- Rỗng → lỗi «Không có chữ… để xem mẫu».
- `cancelQuiz`.
- Vòng `i = 0 .. seq.length-1`: `currentChar = ch`, `renderDefinitionPanel(ch)`, `setCharacter(ch)`, nếu `seq.length > 1` status `Bắt đầu i+1/len: «ch»`, `animateCharacter()`.
- Cuối: xóa status.

### 4.6 Luyện viết (quiz chuỗi)

- `seq` như trên; rỗng → lỗi.
- `runQuizChain(seq, 0)`:
  - `setCharacter` → `hideCharacter` → `quiz(strictOptions)`.
  - `onComplete`: nếu còn chữ sau → status + `runQuizChain(seq, index+1)`; nếu một chữ → «Xong» / «Xong · sai N lần»; nếu nhiều chữ và chữ cuối → «… — hết chuỗi.».

### 4.7 Giải nghĩa (`renderDefinitionPanel`)

- `seq`, `compoundKey = seq.join("")`.
- Nếu `seq.length >= 2` **và** có `wordDefinitions[compoundKey]` → hiển thị **một** khối cụm: chữ lớn, Hán Việt, Pinyin (nếu có), Nghĩa, **Ghi chú** (từ `vidu`).
- Ngược lại: hiển thị **định nghĩa đơn chữ** `definitions[currentChar]` (hoặc `detailChar`): Pinyin, Nghĩa, **Ví dụ**.
- Không có mục → thông báo trống phù hợp.

### 4.8 Blur ô nhập

- Nếu drawable không rỗng → `loadCharacter(value)` để đồng bộ khung viết với ô nhập.

---

## 5. Hanzi Writer — tùy chọn (web)

- `showOutline`, `showCharacter`, màu nét / outline / vẽ / highlight như trong `baseWriterOptions`.
- `charDataLoader`: fetch JSON nét.
- Quiz nghiêm: `markStrokeCorrectAfterMisses: false`, `acceptBackwardsStrokes: false`, `leniency: 0.9`, `averageDistanceThreshold: 300`, `showHintAfterMisses: 3`, `highlightOnComplete: true`.
- `onMistake`: status «Chưa đúng nét thứ N…» (N = strokeNum + 1).

---

## 6. Giao diện (token thiết kế → Android)

| Token | Giá trị web |
|-------|-------------|
| Nền | `#f6f4f0` |
| Thẻ | `#fff`, viền `#e2ddd4`, bo góc ~10px, đổ bóng nhẹ |
| Chữ chính | `#1a1a1a` |
| Mờ / nhãn | `#5c5c5c` |
| Accent / nút primary | `#2563eb`, hover `#1d4ed8` |
| Khung viết | nền gradient `#faf9f6` → `#f0eeea`, viền nét đứt |
| Ô nhập | nền `#faf9f6`, focus viền accent |
| Gợi ý | dropdown, max-height ~40vh / 180px |

**Bố cục:** cột một, `max-width` ~480px; 3 vùng: (1) Khung luyện + 2 nút + status, (2) Chọn chữ + gợi ý, (3) Giải nghĩa.

**Chuỗi:** nút **BẮT ĐẦU** | **Luyện viết**; ô nhập `maxlength` 48; placeholder ví dụ «学习».

---

## 7. Khác biệt khi làm Android **thuần** (Kotlin)

1. **Engine nét:** Hanzi Writer là JS; native cần **Canvas/Path** + parser JSON nét **hoặc** giai đoạn 1 nhúng **WebView** chỉ khúc canvas (không mất logic đã mô tả ở đây).
2. **Tải JSON:** `AssetManager` / `fileProvider` thay cho `fetch`.
3. **Định nghĩa:** logic trong `DefinitionResolver` (đã port sang Kotlin trong thư mục `native-kotlin-core/`) giữ nguyên quy tắc mục 4.7.

**Ứng dụng Android (Capacitor):** mở thư mục `android` trong Android Studio; Gradle tự **build web + cap sync** trước mỗi lần đóng gói — xem **`docs/ANDROID_STUDIO_APK.md`** (cần Node.js trong PATH).

---

## 8. Tham chiếu mã

- Logic UI + writer: `src/main.js`
- Style: `src/style.css`
- Build từ điển: `scripts/build-definitions.mjs`

Phiên bản tài liệu: đồng bộ với repo tại thời điểm tạo file `docs/PRODUCT_SPEC_FROM_WEBAPP.md`.
