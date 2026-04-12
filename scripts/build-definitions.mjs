/**
 * Tạo public/char-definitions.json: Hán Việt, nghĩa (dic / từ ghép / CC-CEDICT / ghi chú).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as OpenCC from "opencc-js";
import { getAllHanvietsOfChar } from "hanviet-pinyin-words";
import cedict from "cc-cedict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const charsPath = path.join(root, "public", "hanzi-data", "chars.json");
const dbPath = path.join(__dirname, "hanviet-words-db.json");
const dicPath = path.join(__dirname, "zhcn-vi-dic.dic");
const dbUrl =
  "https://raw.githubusercontent.com/ryanphung/chinese-hanviet-api/master/db.json";
const dicUrl =
  "https://raw.githubusercontent.com/NguyenVi07/zhcn-vi-dic/main/addon/dictionaries/dic.dic";
const outPath = path.join(root, "public", "char-definitions.json");

const toTrad = OpenCC.Converter({ from: "cn", to: "tw" });

async function ensureDb() {
  if (fs.existsSync(dbPath)) {
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
  }
  const res = await fetch(dbUrl);
  if (!res.ok) throw new Error(`Tải từ điển thất bại: ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(dbPath, text, "utf8");
  return JSON.parse(text);
}

async function ensureDic() {
  if (fs.existsSync(dicPath)) return;
  console.log("Đang tải zhcn-vi dic.dic (~8 MB)…");
  const res = await fetch(dicUrl);
  if (!res.ok) throw new Error(`Tải dic.dic thất bại: ${res.status}`);
  fs.writeFileSync(dicPath, Buffer.from(await res.arrayBuffer()));
}

function parseDicDic(filePath) {
  const map = new Map();
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    const key = line.slice(0, tab);
    if ([...key].length !== 1) continue;
    const rest = line.slice(tab + 1);
    const tab2 = rest.indexOf("\t");
    const meaning = (tab2 >= 0 ? rest.slice(0, tab2) : rest).trim();
    if (!meaning) continue;
    if (map.has(key)) continue;
    map.set(key, meaning);
  }
  return map;
}

function indexWordsByChar(words) {
  const byChar = new Map();
  for (const w of words) {
    if (!w.word) continue;
    const rank = parseInt(String(w.chineseWordRanking), 10) || 999999;
    const forms = [w.word, w.traditional].filter(Boolean);
    for (const form of forms) {
      for (const g of [...form]) {
        const cur = byChar.get(g);
        if (!cur || rank < cur.rank) {
          byChar.set(g, { rank, entry: w });
        }
      }
    }
  }
  return byChar;
}

function hanVietForChar(simp) {
  const trad = toTrad(simp);
  const parts = [];
  for (const t of trad) {
    try {
      parts.push(...getAllHanvietsOfChar(t));
    } catch {
      /* skip */
    }
  }
  const uniq = [...new Set(parts)].filter(Boolean);
  return uniq.length ? uniq.join(" · ") : "—";
}

function meaningFromCompound(entry) {
  const parts = entry.meaning
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts.slice(0, 8).join("; ") : entry.meaning;
}

function englishFromCedict(char) {
  let results;
  try {
    results = cedict.getBySimplified(char, null, {
      mergeCases: true,
      asObject: true,
    });
  } catch {
    return [];
  }
  if (!results || typeof results !== "object") return [];
  const out = [];
  for (const arr of Object.values(results)) {
    for (const e of arr) {
      if (e.is_variant) continue;
      if (e.simplified !== char) continue;
      for (const g of e.english || []) {
        if (/^variant of/i.test(g)) continue;
        out.push(g);
      }
    }
  }
  return [...new Set(out)].slice(0, 12);
}

function isRadicalOrStrokeComponent(char) {
  const cp = char.codePointAt(0);
  return (
    (cp >= 0x2e80 && cp <= 0x2eff) ||
    (cp >= 0x2f00 && cp <= 0x2fdf) ||
    (cp >= 0x31c0 && cp <= 0x31ef)
  );
}

async function main() {
  if (!fs.existsSync(charsPath)) {
    console.error("Thiếu public/hanzi-data/chars.json — chạy npm run prepare-hanzi trước.");
    process.exit(1);
  }

  await ensureDic();
  const db = await ensureDb();
  const dicMap = parseDicDic(dicPath);
  console.log(`dic.dic: ${dicMap.size} mục một chữ (ước lượng).`);

  const chars = JSON.parse(fs.readFileSync(charsPath, "utf8"));
  const byChar = indexWordsByChar(db.words || []);
  const out = {};
  const stats = {
    viDic: 0,
    compound: 0,
    cedictEn: 0,
    radicalNote: 0,
    obscureNote: 0,
  };

  for (const c of chars) {
    const hanViet = hanVietForChar(c);
    const dicGloss = dicMap.get(c)?.trim() || "";
    const compound = byChar.get(c)?.entry;
    const en = englishFromCedict(c);

    let nghia = "—";
    let vidu =
      "Chưa có đủ dữ liệu trong các bộ từ điển đã tải (Trung–Việt, từ ghép, CC-CEDICT).";

    if (dicGloss) {
      nghia = dicGloss;
      stats.viDic++;
    } else if (compound) {
      nghia = meaningFromCompound(compound);
      stats.compound++;
    } else if (en.length) {
      nghia = `(Tham khảo tiếng Anh, CC-CEDICT) ${en.join("; ")}`;
      stats.cedictEn++;
    }

    if (nghia === "—" && isRadicalOrStrokeComponent(c)) {
      nghia =
        "(Bộ phụ hoặc ký hiệu cấu tạo chữ; hiếm khi dùng đứng một mình như một từ.)";
      vidu =
        "Thường gặp trong phân tích bộ thủ hoặc cấu trúc nét; tra chữ đầy đủ trong từ điển lớn để biết nghĩa dùng trong văn.";
      stats.radicalNote++;
    }

    if (nghia === "—") {
      nghia =
        "(Chưa có trong các nguồn từ điển đã tích hợp — thường là chữ rất hiếm, biến thể, hoặc không có trong CC-CEDICT.)";
      vidu =
        "Có thể tra thêm trong từ điển Hán–Việt in, Unihan, hoặc công cụ chuyên ngành.";
      stats.obscureNote++;
    }

    if (compound) {
      const e = compound;
      const parts = e.meaning
        .split("/")
        .map((s) => s.trim())
        .filter(Boolean);
      const first = parts[0] || e.meaning;
      vidu = `Trong từ thường gặp «${e.word}» (Hán Việt: ${e.hanviet}): ${first}.`;
    } else if (dicGloss && en.length) {
      vidu = `Gợi ý ngữ nghĩa (Anh, CC-CEDICT): «${en[0]}». Có thể tra thêm từ ghép trong sách học.`;
    } else if (dicGloss) {
      vidu =
        "Tra thêm từ ghép (ví dụ trong sách HSK hoặc từ điển cỡ lớn) để nắm cách dùng trong câu.";
    } else if (en.length) {
      vidu = `CC-CEDICT (Anh): ${en.slice(0, 3).join("; ")}.`;
    }

    out[c] = {
      chu: c,
      hanViet,
      nghia,
      vidu,
    };
  }

  fs.writeFileSync(outPath, JSON.stringify(out), "utf8");
  console.log(
    `build-definitions: ${Object.keys(out).length} mục → public/char-definitions.json`
  );
  console.log(
    `  nghĩa: dic Việt ${stats.viDic} | từ ghép ${stats.compound} | CC-CEDICT (Anh) ${stats.cedictEn} | ghi chú bộ phụ ${stats.radicalNote} | ghi chú chữ hiếm ${stats.obscureNote}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
