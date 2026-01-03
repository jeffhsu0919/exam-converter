(function () {
  function getCollegeDeptText() {
    const collegeSel = document.getElementById("collegeSelect");
    const deptSel = document.getElementById("deptSelect");
    const deptInput =
        document.getElementById("deptInput") ||
        document.getElementById("deptNameInput");

    const collegeText =
      (collegeSel && collegeSel.selectedOptions && collegeSel.selectedOptions[0])
        ? collegeSel.selectedOptions[0].text.trim()
        : "";

    // 科系優先：下拉選單 > 自填
    const deptTextFromSelect =
      (deptSel && deptSel.selectedOptions && deptSel.selectedOptions[0])
        ? deptSel.selectedOptions[0].text.trim()
        : "";
   const deptTextFromInput = deptInput ? deptInput.value.trim() : "";
   const deptTextFromSelectRaw = deptTextFromSelect;

// ✅ 若選單停在「請選擇科系」或空字樣，就視為無效，改用自填
const isPlaceholder =
  !deptTextFromSelectRaw ||
  /請選擇/.test(deptTextFromSelectRaw) ||
 /手動輸入|自填|或改用/.test(deptTextFromSelectRaw);

const deptText = (!isPlaceholder ? deptTextFromSelectRaw : "") || deptTextFromInput || "";

    return { collegeText, deptText };
  }

  function buildPdfHeader() {
    const { collegeText, deptText } = getCollegeDeptText();

    const header = document.createElement("div");
    header.className = "pdf-meta-header";
    header.innerHTML = `
      <div class="pdf-meta-title">級分換算與一階門檻比較</div>
      <div class="pdf-meta-sub">
        <span>學校：${collegeText || "（未選擇）"}</span>
        <span style="margin-left:12px;">科系：${deptText || "（未填寫）"}</span>
      </div>
    `;
    return header;
  }

  function init() {
    const btn = document.getElementById("exportPdfBtn");
    const pdfArea = document.getElementById("pdfArea"); // 我們在 index.html 新增的容器
    if (!btn || !pdfArea) return;

    btn.addEventListener("click", async () => {
      let headerEl = null;

      try {
        btn.disabled = true;
        btn.textContent = "PDF 產生中…";

        // 暫時插入標題（讓 PDF 內有學校/科系）
        headerEl = buildPdfHeader();
        pdfArea.insertBefore(headerEl, pdfArea.firstChild);

        const canvas = await html2canvas(pdfArea, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jspdf.jsPDF("p", "mm", "a4");

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pageW) / canvas.width;

        let y = 0;
        let remaining = imgH;

        while (remaining > 0) {
          pdf.addImage(imgData, "PNG", 0, y, pageW, imgH);
          remaining -= pageH;
          if (remaining > 0) {
            pdf.addPage();
            y -= pageH;
          }
        }

        const d = new Date();
        const stamp =
          d.getFullYear().toString() +
          String(d.getMonth() + 1).padStart(2, "0") +
          String(d.getDate()).padStart(2, "0") +
          "_" +
          String(d.getHours()).padStart(2, "0") +
          String(d.getMinutes()).padStart(2, "0");

        pdf.save(`學測換算_一階門檻_${stamp}.pdf`);
      } catch (err) {
        console.error(err);
        alert("PDF 匯出失敗：請開啟 F12 Console 查看錯誤訊息。");
      } finally {
        // 移除暫時標題
        if (headerEl && headerEl.parentNode) headerEl.parentNode.removeChild(headerEl);

        btn.disabled = false;
        btn.textContent = "匯出 PDF";
      }
    });
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
