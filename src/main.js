import "./style.css";
import HanziWriter from "hanzi-writer";

const BASE = import.meta.env.BASE_URL;
let allChars = [];
/** @type {Record<string, { chu: string; hanViet: string; nghia: string; vidu: string }>} */
let definitions = {};
let writer = null;
let currentChar = "学";

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

async function loadCharacter(ch) {
  const trimmed = [...ch.trim()][0];
  if (!trimmed) {
    setStatus("Nhập một chữ Hán.", "err");
    return;
  }
  if (!hasCharData(trimmed)) {
    renderDefinition(trimmed);
    setStatus(
      "Chữ này chưa có dữ liệu nét trong bộ đã tải. Chọn chữ khác trong danh sách.",
      "err"
    );
    return;
  }

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

  renderDefinition(trimmed);
  setStatus("");
}

function renderDefinition(ch) {
  const root = document.getElementById("definition-panel");
  if (!root) return;
  if (!definitions || Object.keys(definitions).length === 0) {
    root.innerHTML =
      '<p class="def-empty">Chưa tải được từ điển. Chạy <code>npm run build-definitions</code> rồi tải lại trang.</p>';
    return;
  }
  const d = definitions[ch];
  if (!d) {
    root.innerHTML =
      '<p class="def-empty">Không có mục giải nghĩa cho chữ này trong bộ từ điển đã tải.</p>';
    return;
  }
  root.innerHTML = `
    <div class="def-summary">
      <span class="def-ch">${escapeHtml(d.chu)}</span>
      <span class="def-dot" aria-hidden="true">·</span>
      <span class="def-v">${escapeHtml(d.hanViet)}</span>
    </div>
    <div class="def-block"><span class="def-k">Nghĩa</span><p class="def-p">${escapeHtml(d.nghia)}</p></div>
    <div class="def-block"><span class="def-k">Ví dụ</span><p class="def-p">${escapeHtml(d.vidu)}</p></div>
  `;
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

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) {
      document.getElementById("suggestions")?.classList.remove("open");
    }
  });

  document.getElementById("btn-demo").addEventListener("click", async () => {
    if (!writer) return;
    setStatus("");
    writer.cancelQuiz();
    await writer.setCharacter(currentChar);
    await writer.animateCharacter();
  });

  document.getElementById("btn-quiz").addEventListener("click", async () => {
    if (!writer) return;
    writer.cancelQuiz();
    await writer.setCharacter(currentChar);
    await writer.hideCharacter();
    setStatus("");
    await writer.quiz(
      getStrictQuizOptions(({ totalMistakes }) => {
        setStatus(
          totalMistakes ? `Xong · sai ${totalMistakes} lần` : "Xong",
          "ok"
        );
      })
    );
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
          <input id="char-input" type="text" maxlength="8" autocomplete="off" placeholder="Gõ hoặc dán, ví dụ 学" inputmode="text" />
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
