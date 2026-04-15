import "./style.css";
import { Capacitor } from "@capacitor/core";
import HanziWriter from "hanzi-writer";

const BASE = import.meta.env.BASE_URL;
let allChars = [];
/** @type {Record<string, { chu: string; hanViet: string; nghia: string; vidu: string; pinyin?: string }>} */
let definitions = {};
/** @type {Record<string, { chu: string; hanViet: string; nghia: string; vidu: string; pinyin?: string; source?: string }>} */
let wordDefinitions = {};
/** @type {{ w: string; rk?: number }[]} */
let wordDictWords = [];
/** Trên Android: từ điển chữ tải sau khung vẽ để tránh OOM WebView. */
let definitionsLoading = false;
let writer = null;
let currentChar = "学";

function parseDrawableSequence(raw) {
  const out = [];
  for (const g of String(raw).trim()) {
    if (hasCharData(g)) out.push(g);
  }
  return out;
}

function getSequenceFromInput() {
  const el = document.getElementById("char-input");
  return parseDrawableSequence(el ? el.value : "");
}

function charDataLoader(char, onLoad, onError) {
  fetch(`${BASE}hanzi-data/${encodeURIComponent(char)}.json`)
    .then((r) => {
      if (!r.ok) throw new Error("not found");
      return r.json();
    })
    .then(onLoad)
    .catch(onError);
}

function hasCharData(ch) {
  return allChars.includes(ch);
}

function setStatus(msg, kind = "") {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = msg;
  el.className = `status ${kind}`.trim();
}

function filterSuggestions(query) {
  const q = query.trim();
  if (!q) return [];
  const out = [];
  for (const c of allChars) {
    if (c.includes(q) || c === q) {
      out.push(c);
      if (out.length >= 40) break;
    }
  }
  if (out.length === 0) {
    for (const c of allChars) {
      if (c.codePointAt(0).toString(16).includes(q.toLowerCase())) {
        out.push(c);
        if (out.length >= 40) break;
      }
    }
  }
  return out;
}

function renderSuggestions(query) {
  const box = document.getElementById("suggestions");
  const items = filterSuggestions(query);
  box.innerHTML = "";
  if (!query.trim() || items.length === 0) {
    box.classList.remove("open");
    return;
  }
  for (const c of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = c;
    btn.addEventListener("click", () => {
      document.getElementById("char-input").value = c;
      box.classList.remove("open");
      loadCharacter(c);
    });
    box.appendChild(btn);
  }
  box.classList.add("open");
}

function getWriterSize() {
  const pad = 20;
  const w = Math.min(window.innerWidth - pad, 340);
  return { width: w, height: w, padding: 4 };
}

function baseWriterOptions() {
  const size = getWriterSize();
  return {
    ...size,
    showOutline: true,
    showCharacter: true,
    strokeColor: "#333",
    outlineColor: "#ccc",
    drawingColor: "#2563eb",
    highlightColor: "#93c5fd",
    charDataLoader,
    showHintAfterMisses: 3,
    highlightOnComplete: true,
    onLoadCharDataError: () => {
      setStatus("Không tải được dữ liệu nét.", "err");
    },
  };
}

function getStrictQuizOptions(onComplete) {
  return {
    markStrokeCorrectAfterMisses: false,
    acceptBackwardsStrokes: false,
    leniency: 0.9,
    averageDistanceThreshold: 300,
    showHintAfterMisses: 3,
    onMistake: ({ strokeNum }) => {
      setStatus(
        `Chưa đúng nét thứ ${strokeNum + 1} — viết lại đúng nét này (đúng thứ tự) rồi mới sang nét sau.`,
        "err"
      );
    },
    onCorrectStroke: () => {
      setStatus("");
    },
    onComplete,
  };
}

async function loadCharacter(input) {
  const seq = parseDrawableSequence(String(input ?? ""));
  if (seq.length === 0) {
    setStatus("Nhập ít nhất một chữ Hán có dữ liệu nét trong bộ.", "err");
    return;
  }

  const trimmed = seq[0];
  currentChar = trimmed;
  const el = document.getElementById("writer-target");

  if (writer) {
    writer.cancelQuiz();
    await writer.setCharacter(trimmed);
    writer.updateDimensions(getWriterSize());
  } else {
    await new Promise((resolve, reject) => {
      writer = HanziWriter.create(el, trimmed, {
        ...baseWriterOptions(),
        onLoadCharDataSuccess: () => resolve(),
        onLoadCharDataError: (err) => reject(err ?? new Error("load")),
      });
    }).catch(() => {
      writer = null;
    });
    if (!writer) return;
  }

  renderDefinitionPanel(trimmed);
  setStatus("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Mọi từ ghép (≥2 chữ) trong word-dict + khóa word-definitions có chứa anchorChar */
function allCompoundStringsForAnchor(anchorChar) {
  const found = new Map();
  for (const x of wordDictWords) {
    if (!x.w || x.w.length < 2) continue;
    if (!x.w.includes(anchorChar)) continue;
    const rk = x.rk ?? 999999;
    const prev = found.get(x.w);
    if (prev === undefined || rk < prev) found.set(x.w, rk);
  }
  if (wordDefinitions && typeof wordDefinitions === "object") {
    for (const key of Object.keys(wordDefinitions)) {
      if (key.length < 2 || !key.includes(anchorChar)) continue;
      if (!found.has(key)) found.set(key, 888888);
    }
  }
  return [...found.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].length - b[0].length || a[0].localeCompare(b[0], "zh"))
    .map(([w]) => w);
}

function renderWordAsPickButtons(word) {
  const parts = [];
  for (const g of word) {
    if (hasCharData(g)) {
      parts.push(
        `<button type="button" class="def-pick-char" data-pick-char="${encodeURIComponent(g)}">${escapeHtml(g)}</button>`
      );
    } else {
      parts.push(`<span class="def-char-nodata">${escapeHtml(g)}</span>`);
    }
  }
  return `<span class="compound-chip">${parts.join("")}</span>`;
}

/** Chuỗi gốc (vidu): tách theo / và cho phép bấm từng chữ có nét */
function spanifyPickableVidu(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const segments = s.split("/").map((x) => x.trim()).filter(Boolean);
  if (segments.length === 0) return "";
  const html = segments
    .map((seg) => {
      const inner = [];
      for (const g of seg) {
        if (hasCharData(g)) {
          inner.push(
            `<button type="button" class="def-pick-char" data-pick-char="${encodeURIComponent(g)}">${escapeHtml(g)}</button>`
          );
        } else {
          inner.push(escapeHtml(g));
        }
      }
      return inner.join("");
    })
    .join(' <span class="vidu-slash">/</span> ');
  return `<div class="def-vidu-legacy">${html}</div>`;
}

/**
 * Một khối "Ví dụ": danh sách từ ghép từ điển + (tuỳ chọn) chuỗi vidu gốc — nhãn thống nhất "Ví dụ".
 */
function renderViduBlock(anchorChar, legacyVidu) {
  const compounds = allCompoundStringsForAnchor(anchorChar);
  const chips =
    compounds.length > 0
      ? compounds
          .map((w) => renderWordAsPickButtons(w))
          .join('<span class="compound-sep">，</span>')
      : "";

  const legacyHtml = legacyVidu && String(legacyVidu).trim() ? spanifyPickableVidu(legacyVidu) : "";

  if (!chips && !legacyHtml) return "";

  return `
    <div class="def-block def-vidu-block">
      <span class="def-k">Ví dụ</span>
      <div class="def-p def-vidu-body">
        ${chips ? `<div class="def-compound-chips">${chips}</div>` : ""}
        ${legacyHtml}
      </div>
    </div>`;
}

function renderPinyinRow(pinyin) {
  const py = pinyin && String(pinyin).trim();
  if (!py) return "";
  return `<div class="def-block"><span class="def-k">Pinyin</span><p class="def-p def-pinyin">${escapeHtml(py)}</p></div>`;
}

function renderDefinitionPanel(detailChar) {
  const ch = detailChar ?? currentChar;
  const root = document.getElementById("definition-panel");
  if (!root) return;
  if (!definitions || Object.keys(definitions).length === 0) {
    if (Capacitor.isNativePlatform() && definitionsLoading) {
      root.innerHTML = '<p class="def-empty">Đang tải từ điển…</p>';
      return;
    }
    root.innerHTML =
      '<p class="def-empty">Chưa tải được từ điển. Chạy <code>npm run build-definitions</code> rồi tải lại trang.</p>';
    return;
  }

  const seq = getSequenceFromInput();
  const compoundKey = seq.join("");
  const wd =
    seq.length >= 2 && wordDefinitions && wordDefinitions[compoundKey]
      ? wordDefinitions[compoundKey]
      : null;

  if (wd) {
    root.innerHTML = `
    <div class="def-one">
      <div class="def-summary">
        <span class="def-ch">${escapeHtml(wd.chu)}</span>
        <span class="def-dot" aria-hidden="true">·</span>
        <span class="def-v">${escapeHtml(wd.hanViet)}</span>
      </div>
      ${renderPinyinRow(wd.pinyin)}
      <div class="def-block"><span class="def-k">Nghĩa</span><p class="def-p">${escapeHtml(wd.nghia)}</p></div>
      ${renderViduBlock(currentChar, wd.vidu)}
    </div>`;
    return;
  }

  const d = definitions[ch];
  if (!d) {
    root.innerHTML =
      '<p class="def-empty">Không có mục giải nghĩa cho chữ này trong bộ từ điển đã tải.</p>';
    return;
  }

  root.innerHTML = `
    <div class="def-one">
      <div class="def-summary">
        <span class="def-ch">${escapeHtml(d.chu)}</span>
        <span class="def-dot" aria-hidden="true">·</span>
        <span class="def-v">${escapeHtml(d.hanViet)}</span>
      </div>
      ${renderPinyinRow(d.pinyin)}
      <div class="def-block"><span class="def-k">Nghĩa</span><p class="def-p">${escapeHtml(d.nghia)}</p></div>
      ${renderViduBlock(ch, d.vidu)}
    </div>`;
}

function bindUi() {
  const input = document.getElementById("char-input");
  input.addEventListener("input", () => {
    renderSuggestions(input.value);
  });
  input.addEventListener("focus", () => {
    renderSuggestions(input.value);
  });
  input.addEventListener("blur", () => {
    if (parseDrawableSequence(input.value).length > 0) {
      loadCharacter(input.value);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) {
      document.getElementById("suggestions")?.classList.remove("open");
    }
  });

  document.getElementById("main-ui").addEventListener("click", (e) => {
    const btn = e.target.closest(".def-pick-char");
    if (!btn) return;
    e.preventDefault();
    const raw = btn.getAttribute("data-pick-char");
    if (!raw) return;
    let pick;
    try {
      pick = decodeURIComponent(raw);
    } catch {
      return;
    }
    if (!hasCharData(pick)) {
      setStatus("Chữ này chưa có dữ liệu nét trong bộ.", "err");
      return;
    }
    document.getElementById("char-input").value = pick;
    loadCharacter(pick);
  });

  document.getElementById("btn-demo").addEventListener("click", async () => {
    if (!writer) return;
    const seq = getSequenceFromInput();
    if (seq.length === 0) {
      setStatus("Không có chữ nào trong ô có dữ liệu nét để xem mẫu.", "err");
      return;
    }
    writer.cancelQuiz();
    for (let i = 0; i < seq.length; i++) {
      const c = seq[i];
      currentChar = c;
      renderDefinitionPanel(c);
      await writer.setCharacter(c);
      if (seq.length > 1) {
        setStatus(`Bắt đầu ${i + 1}/${seq.length}: «${c}»`);
      } else {
        setStatus("");
      }
      await writer.animateCharacter();
    }
    setStatus("");
  });

  document.getElementById("btn-quiz").addEventListener("click", () => {
    if (!writer) return;
    const seq = getSequenceFromInput();
    if (seq.length === 0) {
      setStatus("Không có chữ nào trong ô có dữ liệu nét để luyện.", "err");
      return;
    }
    runQuizChain(seq, 0);
  });

  window.addEventListener(
    "resize",
    debounce(() => {
      if (!writer || !currentChar) return;
      writer.updateDimensions(getWriterSize());
    }, 200)
  );
}

function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

function runQuizChain(seq, index) {
  if (!writer || index >= seq.length) return;
  const ch = seq[index];
  currentChar = ch;
  renderDefinitionPanel(ch);
  writer.cancelQuiz();
  writer.setCharacter(ch).then(() => writer.hideCharacter()).then(() => {
    if (seq.length > 1) {
      setStatus(`Luyện ${index + 1}/${seq.length}: «${ch}»`, "");
    } else {
      setStatus("");
    }
    writer.quiz(
      getStrictQuizOptions(({ totalMistakes }) => {
        if (index + 1 < seq.length) {
          const part = totalMistakes
            ? `«${ch}» xong · sai ${totalMistakes} lần`
            : `«${ch}» xong`;
          setStatus(part + " — sang chữ tiếp…", "ok");
          runQuizChain(seq, index + 1);
        } else if (seq.length === 1) {
          setStatus(
            totalMistakes ? `Xong · sai ${totalMistakes} lần` : "Xong",
            "ok"
          );
        } else {
          const part = totalMistakes
            ? `«${ch}» xong · sai ${totalMistakes} lần`
            : `«${ch}» xong`;
          setStatus(part + " — hết chuỗi.", "ok");
        }
      })
    );
  });
}

function renderShell() {
  document.getElementById("app").innerHTML = `
    <div id="loading" class="loading">Đang tải danh sách chữ…</div>
    <div id="main-ui" class="main-ui" style="display:none">
      <section class="card card-practice" aria-label="Khung luyện viết">
        <div class="writer-box">
          <div id="writer-target"></div>
        </div>
        <div class="toolbar">
          <button type="button" class="action primary" id="btn-demo">BẮT ĐẦU</button>
          <button type="button" class="action primary" id="btn-quiz">Luyện viết</button>
        </div>
        <p id="status" class="status" aria-live="polite"></p>
      </section>
      <section class="card card-search">
        <label for="char-input">Chọn chữ</label>
        <div class="search-wrap">
          <input id="char-input" type="text" maxlength="48" autocomplete="off" placeholder="Một chữ hoặc cả từ/câu, ví dụ 学习" inputmode="text" />
          <div id="suggestions" class="suggestions" role="listbox"></div>
        </div>
      </section>
      <section class="card def-card">
        <h2 class="def-title">Giải nghĩa</h2>
        <div id="definition-panel" class="definition-panel"></div>
      </section>
    </div>
  `;
}

async function init() {
  renderShell();
  const isNative = Capacitor.isNativePlatform();
  try {
    const res = await fetch(`${BASE}hanzi-data/chars.json`);
    if (!res.ok) throw new Error("chars.json missing");
    allChars = await res.json();

    const wdjson = await fetch(`${BASE}word-dict.json`);
    if (wdjson.ok) {
      const j = await wdjson.json();
      wordDictWords = Array.isArray(j.words) ? j.words : [];
    }

    if (isNative) {
      definitionsLoading = true;
      definitions = {};
      wordDefinitions = {};
    } else {
      const dr = await fetch(`${BASE}char-definitions.json`);
      if (dr.ok) {
        definitions = await dr.json();
      }
      const wr = await fetch(`${BASE}word-definitions.json`);
      if (wr.ok) {
        wordDefinitions = await wr.json();
      }
    }
  } catch {
    document.getElementById("loading").innerHTML =
      '<p class="status err">Chưa có dữ liệu. Kiểm tra thư mục public (hanzi-data) trong project.</p>';
    return;
  }

  document.getElementById("loading").style.display = "none";
  document.getElementById("main-ui").style.display = "block";

  bindUi();
  document.getElementById("char-input").value = currentChar;
  await loadCharacter(currentChar);

  if (isNative) {
    try {
      const dr = await fetch(`${BASE}char-definitions.json`);
      if (dr.ok) {
        definitions = await dr.json();
      }
    } finally {
      definitionsLoading = false;
    }
    renderDefinitionPanel(currentChar);
  }
}

init();
