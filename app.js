// 可選擇查詢的一階年度（之後要加年度，只要改這裡）
const AVAILABLE_YEARS = [115, 114, 113, 112, 111];

document.addEventListener("DOMContentLoaded", () => {
  const examYearInput = document.getElementById("examYear");
  const targetYearSelects = document.querySelectorAll(".targetYear");
  const collegeSelect = document.getElementById("collegeSelect");
  const applyBtn = document.getElementById("applyBtn");
  // ====== 各科標的（頂/前/均/後/底） ======
let benchmarksCache = null;

// inputId → 科目名稱（對照 benchmarks.json 的 key）
const SUBJECT_MAP = {
  scoreChinese: "國文",
  scoreEnglish: "英文",
  scoreMathA: "數A",
  scoreMathB: "數B",
  scoreSocial: "社會",
  scoreScience: "自然",
};

// ✅ 記錄最近一次「套用」的輸入（給卡片3即時重算用）
let lastRun = {
  examYear: null,
  raw: null,
  targetYears: [],
};

const SIEVE_OPTIONS = [
  // 單科
  { key: "國文", parts: ["國文"] },
  { key: "英文", parts: ["英文"] },
  { key: "數A", parts: ["數A"] },
  { key: "數B", parts: ["數B"] },
  { key: "社會", parts: ["社會"] },
  { key: "自然", parts: ["自然"] },

  // 兩科
  { key: "國英", parts: ["國文","英文"] },
  { key: "國數A", parts: ["國文","數A"] },
  { key: "國數B", parts: ["國文","數B"] },
  { key: "國社", parts: ["國文","社會"] },
  { key: "國自", parts: ["國文","自然"] },
  { key: "英數A", parts: ["英文","數A"] },
  { key: "英數B", parts: ["英文","數B"] },
  { key: "英社", parts: ["英文","社會"] },
  { key: "英自", parts: ["英文","自然"] },
  { key: "數A數B", parts: ["數A","數B"] },
  { key: "數A社", parts: ["數A","社會"] },
  { key: "數A自", parts: ["數A","自然"] },
  { key: "數B社", parts: ["數B","社會"] },
  { key: "數B自", parts: ["數B","自然"] },
  { key: "社自", parts: ["社會","自然"] },

  // 三科
  { key: "國英數A", parts: ["國文","英文","數A"] },
  { key: "國英數B", parts: ["國文","英文","數B"] },
  { key: "國英社", parts: ["國文","英文","社會"] },
  { key: "國英自", parts: ["國文","英文","自然"] },
  { key: "國數A數B", parts: ["國文","數A","數B"] },
  { key: "國數A社", parts: ["國文","數A","社會"] },
  { key: "國數A自", parts: ["國文","數A","自然"] },
  { key: "國數B社", parts: ["國文","數B","社會"] },
  { key: "國數B自", parts: ["國文","數B","自然"] },
  { key: "國社自", parts: ["國文","社會","自然"] },
  { key: "英數A數B", parts: ["英文","數A","數B"] },
  { key: "英數A社", parts: ["英文","數A","社會"] },
  { key: "英數A自", parts: ["英文","數A","自然"] },
  { key: "英數B社", parts: ["英文","數B","社會"] },
  { key: "英數B自", parts: ["英文","數B","自然"] },
  { key: "英社自", parts: ["英文","社會","自然"] },

  // 四科
  { key: "數A數B社", parts: ["數A","數B","社會"] },
  { key: "數A數B自", parts: ["數A","數B","自然"] },
  { key: "數A社自", parts: ["數A","社會","自然"] },
  { key: "數B社自", parts: ["數B","社會","自然"] },
  { key: "國英數A數B", parts: ["國文","英文","數A","數B"] },
  { key: "國英數A社", parts: ["國文","英文","數A","社會"] },
  { key: "國英數A自", parts: ["國文","英文","數A","自然"] },
  { key: "國英數B社", parts: ["國文","英文","數B","社會"] },
  { key: "國英數B自", parts: ["國文","英文","數B","自然"] },
  { key: "國英社自", parts: ["國文","英文","社會","自然"] },
  { key: "國數A數B社", parts: ["國文","數A","數B","社會"] },
  { key: "國數A數B自", parts: ["國文","數A","數B","自然"] },
  { key: "國數A社自", parts: ["國文","數A","社會","自然"] },
  { key: "國數B社自", parts: ["國文","數B","社會","自然"] },
  { key: "英數A數B社", parts: ["英文","數A","數B","社會"] },
  { key: "英數A數B自", parts: ["英文","數A","數B","自然"] },
  { key: "英數A社自", parts: ["英文","數A","社會","自然"] },
  { key: "英數B社自", parts: ["英文","數B","社會","自然"] },
  { key: "數A數B社自", parts: ["數A","數B","社會","自然"] }
];
  
  const deptSelect = document.getElementById("deptSelect");
  const deptInput = document.getElementById("deptInput");

  const yearTabs = document.querySelectorAll(".year-tab");
  const sieveFrame = document.getElementById("sieveFrame");
  const openInNewTabBtn = document.getElementById("openInNewTabBtn");

  // 目前選定的換算年度與學校，供 iframe / 新分頁使用
  let currentTargetYears = ["", "", ""];
  let currentCollegeCode = "";
  let currentActiveSlot = null; // 0,1,2

  /* ---------- 初始化：填入年度選項與學校清單 ---------- */

  // 填換算年度下拉選單
  targetYearSelects.forEach((sel) => {
    // 先放一個空選項
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "（未選）";
    sel.appendChild(emptyOpt);

    AVAILABLE_YEARS.forEach((year) => {
      const opt = document.createElement("option");
      opt.value = String(year);
      opt.textContent = `${year} 年`;
      sel.appendChild(opt);
    });
  });

  // 填學校選單
  if (Array.isArray(colleges)) {
    colleges.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.code;
      opt.textContent = `(${c.code}) ${c.name}`;
      collegeSelect.appendChild(opt);
    });
  }

  // 若有學校資料，預設選第一間
  if (collegeSelect.options.length > 0) {
    collegeSelect.selectedIndex = 0;
    currentCollegeCode = collegeSelect.value;
    populateDeptSelect(currentCollegeCode); // 一開始就載入該校科系
  }

  /* ---------- 功能：更新左側標題 ---------- */

  function updateHeaders() {
    const examYear = examYearInput.value.trim();

    // 考試年度標題
    const examHeader = document.getElementById("headerExamYear");
    if (examHeader) {
      examHeader.textContent = examYear
        ? `考試年度：${examYear} 年`
        : "考試年度：尚未設定";
    }

    // 三個換算年度標題
    currentTargetYears = Array.from(targetYearSelects).map((sel) =>
      sel.value.trim()
    );

    currentTargetYears.forEach((y, i) => {
      const header = document.getElementById(`headerTargetYear${i}`);
      if (!header) return;

      if (y) {
        header.textContent = `換算年度 ${i + 1}：${y} 年大學申請一階資料`;
      } else {
        header.textContent = `換算年度 ${i + 1}：尚未設定`;
      }
    });

    // 更新 tabs 顯示與可用狀態
    updateYearTabs();
  }

  async function loadBenchmarks() {
  if (benchmarksCache) return benchmarksCache;
  const resp = await fetch("data/benchmarks.json");
  if (!resp.ok) throw new Error("找不到 benchmarks.json");
  benchmarksCache = await resp.json();
  return benchmarksCache;
}

function getBenchmarkLabel(score, bmForSubject) {
  // bmForSubject 形如：{ "頂標":13, "前標":12, ... }
  if (!Number.isFinite(score) || !bmForSubject) return "";

  const top = bmForSubject["頂標"];
  const pre = bmForSubject["前標"];
  const avg = bmForSubject["均標"];
  const low = bmForSubject["後標"];
  const bot = bmForSubject["底標"];

  if (Number.isFinite(top) && score >= top) return "頂標";
  if (Number.isFinite(pre) && score >= pre) return "前標";
  if (Number.isFinite(avg) && score >= avg) return "均標";
  if (Number.isFinite(low) && score >= low) return "後標";
  if (Number.isFinite(bot) && score >= bot) return "底標";
  return "未達底標";
}

async function renderBenchmarkBadges(examYear, raw) {
  // raw 形如：{ "國文": 12, ... }
  // examYear 形如：114
  // 若 benchmarks 沒該年度，全部清空
  let data;
  try {
    data = await loadBenchmarks();
  } catch (e) {
    // 讀不到就不要讓主程式壞掉：清空 badge
    Object.keys(SUBJECT_MAP).forEach((inputId) => {
      const el = document.getElementById(`bm-${inputId}`);
      if (el) el.textContent = "";
    });
    return;
  }

  const yearKey = String(examYear);
  const bmYear = data?.[yearKey] ?? null;

  Object.entries(SUBJECT_MAP).forEach(([inputId, subjName]) => {
    const el = document.getElementById(`bm-${inputId}`);
    if (!el) return;

    if (!bmYear) {
      el.textContent = "（此年度尚未建置標的）";
      return;
    }

    const s = raw?.[subjName];
    const label = getBenchmarkLabel(s, bmYear[subjName]);
    el.textContent = label ? `〔${label}〕` : "";
  });
}

  /* ---------- 功能：更新年度 tabs 與 iframe 行為 ---------- */

  function updateYearTabs() {
    yearTabs.forEach((btn) => {
      const slot = Number(btn.dataset.yearSlot);
      const y = currentTargetYears[slot];

      if (!y) {
        btn.textContent = `年度 ${slot + 1}`;
        btn.disabled = true;
        btn.classList.remove("active");
        return;
      }

      btn.textContent = `${y} 年篩選一覽表`;
      btn.disabled = false;

      btn.onclick = () => {
        // 設定 active 樣式
        yearTabs.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentActiveSlot = slot;

        // 依目前學校與年度組出網址
        const url = buildSieveUrl(y, currentCollegeCode);
        if (url) {
          sieveFrame.src = url;
          openInNewTabBtn.disabled = false;
        }
      };
    });

    // 若目前 active 的 slot 已經沒有年度，清掉 iframe
    if (
      currentActiveSlot !== null &&
      !currentTargetYears[currentActiveSlot]
    ) {
      sieveFrame.src = "";
      openInNewTabBtn.disabled = true;
      currentActiveSlot = null;
    }
  }

  function buildSieveUrl(year, collegeCode) {
    if (!year || !collegeCode) return "";
    // 依你提供的規則組出網址
    return `https://www.cac.edu.tw/cacportal/apply_his_report/${year}/${year}_sieve_standard/report/${collegeCode}.htm`;
  }

  /* ---------- 依學校代碼產生該校的科系下拉選單 ---------- */

  function populateDeptSelect(collegeCode) {
    if (!deptSelect) return;

    // 先清空舊的選項
    deptSelect.innerHTML = "";

    // ✅ 這裡用 typeof 避免 departments 未宣告時直接當機
    const deptList =
      typeof departments !== "undefined" ? departments[collegeCode] : null;

    const defaultOpt = document.createElement("option");

    //（1）如果這間學校還沒建立科系清單 → 告知使用者改用手動輸入
    if (!deptList) {
      defaultOpt.value = "";
      defaultOpt.textContent =
        "（此校科系清單尚未建置，請改用下方手動輸入）";
      deptSelect.appendChild(defaultOpt);
      deptSelect.disabled = true;
      return;
    }

    //（2）如果有科系清單 → 產生下拉選單
    deptSelect.disabled = false;

    defaultOpt.value = "";
    defaultOpt.textContent = "（請選擇科系，或改用下方手動輸入）";
    deptSelect.appendChild(defaultOpt);

    deptList.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.code;
      opt.textContent = `(${d.code}) ${d.name}`;
      deptSelect.appendChild(opt);
    });
  }

  // ====== 卡片3：一階篩選自填區 ======
const sieveRowsWrap = document.getElementById("sieveRows");
const addSieveRowBtn = document.getElementById("addSieveRowBtn");
const clearSieveBtn = document.getElementById("clearSieveBtn");

let sieveRowCount = 0;

function getSelectedTargetYearsForRow() {
  // 用你目前選到的年度（currentTargetYears 是字串陣列 ["113","112","111"]）
  // 回傳可用的 slot 清單
  const slots = [];
  currentTargetYears.forEach((y, i) => {
    if (y) slots.push({ slot: i, year: Number(y) });
  });
  return slots;
}

function buildSieveOptionSelectHtml() {
  const opts = ['<option value="">（選擇篩選項目）</option>'];
  for (const it of SIEVE_OPTIONS) {
    opts.push(`<option value="${it.key}">${it.key}</option>`);
  }
  return opts.join("");
}

function buildYearSelectHtml() {
  const slots = getSelectedTargetYearsForRow();
  if (slots.length === 0) {
    return `<option value="">（先選年度1/2/3）</option>`;
  }
  return [
    `<option value="">（選擇年度）</option>`,
    ...slots.map(s => `<option value="${s.slot}">${s.year}（年度${s.slot+1}）</option>`)
  ].join("");
}

function addSieveRow() {
  if (sieveRowCount >= 6) return;
  sieveRowCount++;

  const row = document.createElement("div");
  row.className = "sieve-row";
  row.dataset.idx = String(sieveRowCount);

  row.innerHTML = `
    <select class="sieve-year-slot">
      ${buildYearSelectHtml()}
    </select>

    <select class="sieve-criterion">
      ${buildSieveOptionSelectHtml()}
    </select>

    <input class="sieve-cutoff" type="number" placeholder="門檻" />

    <div class="sieve-my-score diff-na">-</div>
    <div class="sieve-diff diff-na">-</div>

    <button type="button" class="sieve-del btn-ghost">×</button>
  `;

  sieveRowsWrap.appendChild(row);

  // 綁定事件：任何變動就重算
  row.querySelector(".sieve-year-slot").addEventListener("change", recomputeSieveRows);
  row.querySelector(".sieve-criterion").addEventListener("change", recomputeSieveRows);
  row.querySelector(".sieve-cutoff").addEventListener("input", recomputeSieveRows);

  row.querySelector(".sieve-del").addEventListener("click", () => {
    row.remove();
    sieveRowCount--;
    recomputeSieveRows();
  });

  recomputeSieveRows();
}

function clearSieveRows() {
  sieveRowsWrap.innerHTML = "";
  sieveRowCount = 0;
}

// 重要：把 combo key 轉為 parts
function findSieveParts(key) {
  return SIEVE_OPTIONS.find(x => x.key === key)?.parts ?? null;
}

function sumRawByParts(raw, parts) {
  let s = 0;
  for (const p of parts) s += (raw[p] ?? 0);
  return s;
}

// ✅ 安全呼叫：避免組合資料不存在時整個 throw
async function safeConvert(fromYear, toYear, subjectKey, rawScore) {
  try {
    const conv = await convertSubjectScore(fromYear, toYear, subjectKey, rawScore);
    return { ok: true, conv };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function recomputeSieveRows() {
  // 還沒按套用就不算
  if (!lastRun.examYear || !lastRun.raw) {
    // 顯示提示
    sieveRowsWrap.querySelectorAll(".sieve-my-score, .sieve-diff").forEach(el => {
      el.textContent = "-";
      el.className = el.className.replace(/\bdiff-pos\b|\bdiff-neg\b/g, "").trim() + " diff-na";
    });
    return;
  }

  const examYear = lastRun.examYear;
  const raw = lastRun.raw;

  const slotYearMap = {};
  currentTargetYears.forEach((y, i) => { if (y) slotYearMap[i] = Number(y); });

  const rows = sieveRowsWrap.querySelectorAll(".sieve-row");
  for (const row of rows) {
    const slot = row.querySelector(".sieve-year-slot").value;
    const crit = row.querySelector(".sieve-criterion").value;
    const cutoff = Number(row.querySelector(".sieve-cutoff").value);

    const myScoreEl = row.querySelector(".sieve-my-score");
    const diffEl = row.querySelector(".sieve-diff");

    // reset
    myScoreEl.className = "sieve-my-score diff-na";
    diffEl.className = "sieve-diff diff-na";
    myScoreEl.textContent = "-";
    diffEl.textContent = "-";

    if (!slot || !crit) continue;

    const toYear = slotYearMap[Number(slot)];
    if (!toYear) continue;

    const parts = findSieveParts(crit);
    if (!parts) continue;

    const rawScore = sumRawByParts(raw, parts);

    // 單科/組合都統一走 convertSubjectScore
    // 單科：subjectKey 就是 "國文"... OK
    // 組合：subjectKey 是 "國英"..."數A數B社自"... 需要你之後在 JSON 補上對應統計表
    const ret = await safeConvert(examYear, toYear, crit, rawScore);

    if (!ret.ok) {
      myScoreEl.textContent = "缺組合資料";
      diffEl.textContent = "-";
      continue;
    }

    const conv = ret.conv;
    if (!conv) {
      myScoreEl.textContent = "無";
      diffEl.textContent = "-";
      continue;
    }

    myScoreEl.textContent = String(conv.convertedScore);

    if (!Number.isFinite(cutoff)) {
      diffEl.textContent = "-";
      continue;
    }

    const diff = conv.convertedScore - cutoff;
    diffEl.textContent = (diff >= 0 ? "+" : "") + String(diff);
    diffEl.className = "sieve-diff " + (diff >= 0 ? "diff-pos" : "diff-neg");
  }

  // 同步更新每列「年度下拉」的選項（當你改年度1/2/3時）
  sieveRowsWrap.querySelectorAll(".sieve-year-slot").forEach(sel => {
    const old = sel.value;
    sel.innerHTML = buildYearSelectHtml();
    if ([...sel.options].some(o => o.value === old)) sel.value = old;
  });
}

// 按鈕
if (addSieveRowBtn) addSieveRowBtn.addEventListener("click", addSieveRow);
if (clearSieveBtn) clearSieveBtn.addEventListener("click", () => { clearSieveRows(); });
  
  /* ---------- 事件綁定 ---------- */

  // 考試年度與換算年度變動時，更新標題與 tabs
  examYearInput.addEventListener("input", updateHeaders);
  targetYearSelects.forEach((sel) =>
    sel.addEventListener("change", updateHeaders)
  );

  // 學校變更
  collegeSelect.addEventListener("change", () => {
    currentCollegeCode = collegeSelect.value;
    // 換學校 → 重新載入科系清單
    populateDeptSelect(currentCollegeCode);

    // 如果已經有選定某個 active 年度，就重新載入 iframe
    if (
      currentActiveSlot !== null &&
      currentTargetYears[currentActiveSlot]
    ) {
      const y = currentTargetYears[currentActiveSlot];
      const url = buildSieveUrl(y, currentCollegeCode);
      sieveFrame.src = url;
    }
  });

  // 選擇科系時，自動把「(代碼) 科系名稱」填到文字輸入框，學生還是可以再修改
  if (deptSelect) {
    deptSelect.addEventListener("change", () => {
      const opt = deptSelect.options[deptSelect.selectedIndex];
      if (!opt || !opt.value) return; // 選到的是「未選」那個
      deptInput.value = opt.textContent; // 例如 "(001012) 中國文學系"
    });
  }

  // 按下「套用」按鈕：只是強制刷新一次（將來可以在這裡觸發級分換算）
applyBtn.addEventListener("click", async () => {
  updateHeaders();

  const examYear = Number(examYearInput.value);

  const targetYears = [
    Number(document.getElementById("targetYear0").value) || null,
    Number(document.getElementById("targetYear1").value) || null,
    Number(document.getElementById("targetYear2").value) || null
  ].filter(Boolean);

  const raw = {
    "國文": Number(document.getElementById("scoreChinese").value),
    "英文": Number(document.getElementById("scoreEnglish").value),
    "數A": Number(document.getElementById("scoreMathA").value),
    "數B": Number(document.getElementById("scoreMathB").value),
    "社會": Number(document.getElementById("scoreSocial").value),
    "自然": Number(document.getElementById("scoreScience").value)
  };

// ✅ 讓卡片3知道目前輸入
lastRun.examYear = examYear;
lastRun.raw = raw;
lastRun.targetYears = currentTargetYears.map(x => x ? Number(x) : null);

  // ✅ 顯示各科達標（頂/前/均/後/底）
renderBenchmarkBadges(examYear, raw);

  // ✅ 卡牌用：只取「考試年度」的 benchmarks（不要用換算年度）
  let bmYear = null;
  try {
    const bmData = await loadBenchmarks();
    bmYear = bmData?.[String(examYear)] ?? null;
  } catch (e) {
    bmYear = null;
  }

  if (!examYear || targetYears.length === 0) {
    alert("請先選擇考試年度與至少一個換算年度");
    return;
  }

  for (const [subj, v] of Object.entries(raw)) {
    if (Number.isNaN(v)) {
      alert(`請輸入「${subj}」級分`);
      return;
    }
  }

  const tbody = document.getElementById("convertResultBody");
  const cardsWrap = document.getElementById("resultCards");

  tbody.innerHTML = "";
  cardsWrap.innerHTML = "";

  try {
    for (const subj of Object.keys(raw)) {
      // 針對此科目，逐年度換算
      const perYearTexts = [];
      let pct = null;

      for (const ty of targetYears) {
        const conv = await convertSubjectScore(examYear, ty, subj, raw[subj]);
        if (conv) {
          pct = conv.percentile;
          perYearTexts.push(`${ty}：${conv.convertedScore}`);
        } else {
          perYearTexts.push(`${ty}：無`);
        }
      }
    recomputeSieveRows();
      
      // 卡片用：前xx%
      const pctText = (pct !== null) ? `前 ${(pct * 100).toFixed(1)}%` : "-";

            // ✅ 卡牌「原年度」後面的標的（只看考試年度 examYear）
      let bmHtml = "";
      if (bmYear) {
        const lb = getBenchmarkLabel(raw[subj], bmYear[subj]);
        if (lb) bmHtml = ` <span class="subj-bm">〔${lb}〕</span>`;
      } else {
        // 若該年度 benchmarks 未建置：用更低調的顯示（也可改成空字串）
        bmHtml = ` <span class="subj-bm subj-bm--na">〔尚未建置〕</span>`;
      }

      // ===== 卡片2：每科一張卡 =====
      cardsWrap.innerHTML += `
        <div class="subj-card">
          <div class="subj-title">${subj}</div>
          <div class="subj-row"><span>原年度</span><b>${examYear}：${raw[subj]}${bmHtml}</b></div>
          <div class="subj-row"><span>落點</span><b>${pctText}</b></div>
          <div class="subj-row"><span>換算</span><b>${perYearTexts.join(" / ")}</b></div>
        </div>
      `;

      // ===== 先保留原表格：你也可以之後拿掉 =====
      // 讓表格固定 4 欄：科目 / 原年度 / 年度1 / 落點（年度2/3 先不塞，避免破壞你表頭）
      // 若你想把年度2/3也塞進表格，我下一步可以幫你把 table 結構一起改掉。
      const y0 = Number(document.getElementById("targetYear0").value) || null;
      const conv0 = y0 ? await convertSubjectScore(examYear, y0, subj, raw[subj]) : null;
      const pctTextTable = conv0 ? (conv0.percentile * 100).toFixed(1) + "%" : "-";
      const convScore0 = conv0 ? conv0.convertedScore : "無";

      tbody.innerHTML += `
        <tr>
          <td>${subj}</td>
          <td>${examYear}：${raw[subj]}</td>
          <td>${y0 ? `${y0}：${convScore0}` : "-"}</td>
          <td>累積人數百分比：${pctTextTable}</td>
        </tr>
      `;
    }
  } catch (err) {
    alert("換算失敗：" + err.message);
  }
});

  // 另開新分頁按鈕
  openInNewTabBtn.addEventListener("click", () => {
    if (
      currentActiveSlot === null ||
      !currentTargetYears[currentActiveSlot] ||
      !currentCollegeCode
    ) {
      return;
    }
    const y = currentTargetYears[currentActiveSlot];
    const url = buildSieveUrl(y, currentCollegeCode);
    if (url) window.open(url, "_blank");
  });

  // 第一次載入時先更新一次標題（讓表頭是乾淨的）
  updateHeaders();
});


