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

export const getDatesInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];

  // 370日超の期間は日別展開せずに空配列を返す（フリーズ防止）
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

// 未入力日数を数える: start〜min(end, 前日) の各日のうち、logDateSet に無い日数。
// 当日は入力猶予として数えない（＝「前日まで」で確定）。完全休養もログ扱い（logDateSet に含まれる）。
// ランキングの「未入力◯日」や本人用 missingDates と同じ基準で使う。
export const countMissingDays = (logDateSet, startStr, endStr) => {
  if (!startStr) return 0;
  const current = new Date(startStr);
  current.setHours(0, 0, 0, 0);

  const periodEnd = new Date(endStr || "2100-12-31");
  periodEnd.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const checkEnd = periodEnd < yesterday ? periodEnd : yesterday;
  if (isNaN(current.getTime()) || current > checkEnd) return 0;

  let count = 0;
  let safety = 0;
  while (current <= checkEnd && safety < 370) {
    const dateStr = current.toLocaleDateString("sv-SE");
    if (!logDateSet.has(dateStr)) count++;
    current.setDate(current.getDate() + 1);
    safety++;
  }
  return count;
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
  // 年度: 4月1日〜翌年3月31日
  return {
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    name: `${year}年度`,
  };
};
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

export const extractGoalInputs = (runner, periodId, periodType) => ({
  monthly: getGoalValue(runner, periodId, periodType, "goalMonthly") || "",
  period:  getGoalValue(runner, periodId, periodType, "goalPeriod")  || "",
  q1:      getGoalValue(runner, periodId, periodType, "goalQ1")      || "",
  q2:      getGoalValue(runner, periodId, periodType, "goalQ2")      || "",
  q3:      getGoalValue(runner, periodId, periodType, "goalQ3")      || "",
  q4:      getGoalValue(runner, periodId, periodType, "goalQ4")      || "",
});

// 期間（ヘッダーの期間選択）から、月単位の画面が表示すべき月（"YYYY-MM"）を返す。
// 月の期間ならその月、年度・カスタム期間なら「期間の終了日（未来なら今日）」の月。
export const getPeriodViewMonth = (period) => {
  if (!period) return getTodayStr().slice(0, 7);
  if (period.type === "month" && period.start) return period.start.slice(0, 7);
  const today = getTodayStr();
  const base = period.end && period.end < today ? period.end : today;
  return base.slice(0, 7);
};

// "YYYY-MM" を delta か月ずらした月の期間オブジェクト（usePeriod の月の期間と同じ形）
export const makeMonthPeriod = (ym, delta = 0) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  const range = getMonthRange(d);
  return {
    id: `month_${d.getFullYear()}_${d.getMonth() + 1}`,
    name: range.name,
    start: range.start,
    end: range.end,
    type: "month",
  };
};

// 年度の期間オブジェクト（usePeriod の年度の期間と同じ形。year は年度の開始年）
export const makeYearPeriod = (year) => {
  const range = getYearRange(year);
  return {
    id: `year_${year}`,
    name: range.name,
    start: range.start,
    end: range.end,
    type: "year",
  };
};
