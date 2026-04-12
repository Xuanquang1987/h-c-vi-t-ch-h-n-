import "./style.css";
import HanziWriter from "hanzi-writer";

const BASE = import.meta.env.BASE_URL;
let allChars = [];
/** @type {Record<string, { chu: string; hanViet: string; nghia: string; vidu: string; pinyin?: string }>} */
let definitions = {};
/** @type {Record<string, { chu: string; hanViet: string; nghia: string; vidu: string; pinyin?: string; source?: string }>} */
let wordDefinitions = {};
let writer = null;
let currentChar = "学";

/** Các chữ Hán (có dữ liệu nét) lấy từ ô nhập, theo thứ tự. */
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

/**
 * Một khối giải nghĩa gọn: ô 1 chữ → chữ đó; ô nhiều chữ và có mục cụm → cụm; không thì chữ đang xem.
 */
function renderDefinitionBlock(opts) {
  const { head, hanViet, nghia, extra, extraLabel, pinyin } = opts;
  const py = pinyin && String(pinyin).trim();
  const pinyinRow = py
    ? `<div class="def-block"><span class="def-k">Pinyin</span><p class="def-p def-pinyin">${escapeHtml(py)}</p></div>`
    : "";
  return `
    <div class="def-one">
      <div class="def-summary">
        <span class="def-ch">${escapeHtml(head)}</span>
        <span class="def-dot" aria-hidden="true">·</span>
        <span class="def-v">${escapeHtml(hanViet)}</span>
      </div>
      ${pinyinRow}
      <div class="def-block"><span class="def-k">Nghĩa</span><p class="def-p">${escapeHtml(nghia)}</p></div>
      <div class="def-block"><span class="def-k">${escapeHtml(extraLabel)}</span><p class="def-p">${escapeHtml(extra)}</p></div>
    </div>`;
}

function renderDefinitionPanel(detailChar) {
  const ch = detailChar ?? currentChar;
  const root = document.getElementById("definition-panel");
  if (!root) return;
  if (!definitions || Object.keys(definitions).length === 0) {
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
    root.innerHTML = renderDefinitionBlock({
      head: wd.chu,
      hanViet: wd.hanViet,
      nghia: wd.nghia,
      extra: wd.vidu,
      extraLabel: "Ghi chú",
      pinyin: wd.pinyin,
    });
    return;
  }

  const d = definitions[ch];
  if (!d) {
    root.innerHTML =
      '<p class="def-empty">Không có mục giải nghĩa cho chữ này trong bộ từ điển đã tải.</p>';
    return;
  }

  root.innerHTML = renderDefinitionBlock({
    head: d.chu,
    hanViet: d.hanViet,
    nghia: d.nghia,
    extra: d.vidu,
    extraLabel: "Ví dụ",
    pinyin: d.pinyin,
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

  document.getElementById("btn-demo").addEventListener("click", async () => {
    if (!writer) return;
    const seq = getSequenceFromInput();
    if (seq.length === 0) {
      setStatus("Không có chữ nào trong ô có dữ liệu nét để xem mẫu.", "err");
      return;
    }
    writer.cancelQuiz();
    for (let i = 0; i < seq.length; i++) {
      const ch = seq[i];
      currentChar = ch;
      renderDefinitionPanel(ch);
      await writer.setCharacter(ch);
      if (seq.length > 1) {
        setStatus(`Mẫu ${i + 1}/${seq.length}: «${ch}»`);
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

/** Luyện viết lần lượt từng chữ trong chuỗi; chuyển chữ khi onComplete của quiz trước. */
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
          <button type="button" class="action primary" id="btn-demo">Mẫu nét</button>
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
  try {
    const res = await fetch(`${BASE}hanzi-data/chars.json`);
    if (!res.ok) throw new Error("chars.json missing");
    allChars = await res.json();
    const dr = await fetch(`${BASE}char-definitions.json`);
    if (dr.ok) {
      definitions = await dr.json();
    }
    const wr = await fetch(`${BASE}word-definitions.json`);
    if (wr.ok) {
      wordDefinitions = await wr.json();
    }
  } catch {
    document.getElementById("loading").innerHTML =
      '<p class="status err">Chưa có dữ liệu. Chạy <code>npm install</code> (sẽ copy dữ liệu nét vào <code>public/hanzi-data</code>).</p>';
    return;
  }

  document.getElementById("loading").style.display = "none";
  document.getElementById("main-ui").style.display = "block";

  bindUi();
  document.getElementById("char-input").value = currentChar;
  await loadCharacter(currentChar);
}

init();
