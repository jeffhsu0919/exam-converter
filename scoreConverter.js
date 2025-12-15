async function loadYearData(year) {
  const resp = await fetch(`data/year_${year}.json`);
  if (!resp.ok) throw new Error(`找不到年度資料檔：year_${year}.json`);
  return await resp.json();
}

function getPercentileForScore(yearData, subjectName, score) {
  const arr = yearData.subjects?.[subjectName];
  if (!arr) throw new Error(`該年度沒有科目資料：${subjectName}`);

  const row = arr.find(r => r.score === score);
  if (!row) return null;
  return row.cum_pct;
}

function getScoreForPercentile(yearData, subjectName, pct) {
  const arr = yearData.subjects?.[subjectName];
  if (!arr) throw new Error(`該年度沒有科目資料：${subjectName}`);

  // 找到 cum_pct >= pct 的第一個 row
  for (const row of arr) {
    if (row.cum_pct >= pct) return row.score;
  }
  // 若都沒有，回傳最低分（最後一筆）
  return arr[arr.length - 1].score;
}

async function convertSubjectScore(fromYear, toYear, subjectName, rawScore) {
  const [fromData, toData] = await Promise.all([
    loadYearData(fromYear),
    loadYearData(toYear)
  ]);

  const pct = getPercentileForScore(fromData, subjectName, rawScore);
  if (pct === null) return null;

  const converted = getScoreForPercentile(toData, subjectName, pct);

  return {
    fromYear,
    toYear,
    subject: subjectName,
    rawScore,
    percentile: pct,
    convertedScore: converted
  };
}
