// 可選擇查詢的一階年度（之後要加年度，只要改這裡）
const AVAILABLE_YEARS = [111, 112, 113, 114];

document.addEventListener("DOMContentLoaded", () => {
  const examYearInput = document.getElementById("examYear");
  const targetYearSelects = document.querySelectorAll(".targetYear");
  const collegeSelect = document.getElementById("collegeSelect");
  const applyBtn = document.getElementById("applyBtn");
 const cardsWrap = document.getElementById("resultCards");
cardsWrap.innerHTML = "";

for (const subj of Object.keys(raw)) {
  const perYear = [];

  let pct = null;
  for (const ty of targetYears) {
    const conv = await convertSubjectScore(examYear, ty, subj, raw[subj]);
    if (conv) {
      pct = conv.percentile;
      perYear.push(`${ty}：${conv.convertedScore}`);
    } else {
      perYear.push(`${ty}：無`);
    }
  }

  const pctText = (pct !== null) ? `前 ${(pct*100).toFixed(1)}%` : "-";

  cardsWrap.innerHTML += `
    <div class="subj-card">
      <div class="subj-title">${subj}</div>
      <div class="subj-row"><span>原年度</span><b>${examYear}：${raw[subj]}</b></div>
      <div class="subj-row"><span>落點</span><b>${pctText}</b></div>
      <div class="subj-row"><span>換算</span><b>${perYear.join(" / ")}</b></div>
    </div>
  `;
}

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
  const y0 = Number(document.getElementById("targetYear0").value);

  const raw = {
  "國文": Number(document.getElementById("scoreChinese").value),
  "英文": Number(document.getElementById("scoreEnglish").value),
  "數A": Number(document.getElementById("scoreMathA").value),
  "數B": Number(document.getElementById("scoreMathB").value),
  "社會": Number(document.getElementById("scoreSocial").value),
  "自然": Number(document.getElementById("scoreScience").value)
};

  if (!examYear || !y0) {
    alert("請先選擇考試年度與「年度1」");
    return;
  }

  // 檢查四科都有填（你也可以改成允許只填部分科目）
  for (const [subj, v] of Object.entries(raw)) {
    if (Number.isNaN(v)) {
      alert(`請輸入「${subj}」級分`);
      return;
    }
  }

  const tbody = document.getElementById("convertResultBody");
  tbody.innerHTML = "";

  try {
    // 逐科換算並顯示成多列
    for (const subj of Object.keys(raw)) {
      const conv = await convertSubjectScore(examYear, y0, subj, raw[subj]);

      if (!conv) {
        tbody.innerHTML += `
          <tr>
            <td>${subj}</td>
            <td>${examYear}：${raw[subj]}</td>
            <td>${y0}：無</td>
            <td>累積人數百分比：-</td>
          </tr>
        `;
        continue;
      }

      const pctText = (conv.percentile * 100).toFixed(1) + "%";

      tbody.innerHTML += `
        <tr>
          <td>${subj}</td>
          <td>${examYear}：${conv.rawScore}</td>
          <td>${conv.toYear}：${conv.convertedScore}</td>
          <td>累積人數百分比：${pctText}</td>
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




