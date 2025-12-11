// 可選擇查詢的一階年度（之後要加年度，只要改這裡）
const AVAILABLE_YEARS = [111, 112, 113, 114];

document.addEventListener("DOMContentLoaded", () => {
  const examYearInput = document.getElementById("examYear");
  const targetYearSelects = document.querySelectorAll(".targetYear");
  const collegeSelect = document.getElementById("collegeSelect");
  const applyBtn = document.getElementById("applyBtn");

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

  /* ---------- 事件綁定 ---------- */

  // 考試年度與換算年度變動時，更新標題與 tabs
  examYearInput.addEventListener("input", updateHeaders);
  targetYearSelects.forEach((sel) =>
    sel.addEventListener("change", updateHeaders)
  );

  // 學校變更
  collegeSelect.addEventListener("change", () => {
    currentCollegeCode = collegeSelect.value;

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

  // 按下「套用」按鈕：只是強制刷新一次（將來可以在這裡觸發級分換算）
  applyBtn.addEventListener("click", () => {
    updateHeaders();
    alert("已套用年度與學校設定（目前為骨架版，尚未進行級分換算計算）");
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
