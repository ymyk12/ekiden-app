// 日付の計算
export const getTodayStr = () => new Date().toLocaleDateString("sv-SE");

export const calculateAutoQuarters = (startStr, endStr) => {
  const s = new Date(startStr);
  const e = new Date(endStr);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return [
      { id: 1, start: "", end: "" },
      { id: 2, start: "", end: "" },
      { id: 3, start: "", end: "" },
      { id: 4, start: "", end: "" },
    ];
  }

  const totalDays = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays <= 0)
    return [
      { id: 1, start: "", end: "" },
      { id: 2, start: "", end: "" },
      { id: 3, start: "", end: "" },
      { id: 4, start: "", end: "" },
    ];

  const quarters = [];
  for (let i = 0; i < 4; i++) {
    const qStart = new Date(s);
    qStart.setDate(s.getDate() + Math.floor((totalDays / 4) * i));

    const qEnd = new Date(s);
    if (i === 3) {
      qEnd.setTime(e.getTime());
    } else {
      qEnd.setDate(s.getDate() + Math.floor((totalDays / 4) * (i + 1)) - 1);
    }
    quarters.push({
      id: i + 1,
      start: qStart.toLocaleDateString("sv-SE"),
      end: qEnd.toLocaleDateString("sv-SE"),
    });
  }
  return quarters;
};

export const calculateAutoQuartersFixed = (startStr, endStr) =>
  calculateAutoQuarters(startStr, endStr);

export const getDatesInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];

  // ★安全装置: 期間が長すぎる場合（370日を超える場合）は空配列を返してフリーズを防ぐ
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 370) {
    console.warn("期間が長すぎるため、日別レポートの生成をスキップしました。");
    return [];
  }

  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current).toLocaleDateString("sv-SE"));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export const getMonthRange = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1).toLocaleDateString("sv-SE");
  const end = new Date(year, month + 1, 0).toLocaleDateString("sv-SE");
  return { start, end, name: `${year}年${month + 1}月` };
};

export const getYearRange = (year) => {
  // ★年度対応: その年の4月1日 〜 翌年の3月31日
  return {
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    name: `${year}年度`,
  };
};
// カスタム期間設定
export const getGoalValue = (runner, periodId, periodType, key) => {
  if (!runner) return 0;
  if (periodType === "global") return runner[key] || 0;
  if (periodType === "custom") {
    let fieldKey = key;
    if (key === "goalPeriod") fieldKey = "total";
    else if (key.startsWith("goalQ"))
      fieldKey = key.replace("goal", "").toLowerCase();
    return runner.periodGoals?.[periodId]?.[fieldKey] || 0;
  }
  if (periodType === "month") {
    if (key === "goalPeriod") return runner.goalMonthly || 0;
    return 0;
  }
  return 0;
};
