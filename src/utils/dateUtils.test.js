/*
 * dateUtils のユニットテスト
 * 期間計算・目標値の取り出しを固定する。
 * 実行: npm test -- --watchAll=false
 */
import {
  getMonthRange,
  getYearRange,
  getDatesInRange,
  calculateAutoQuarters,
  getGoalValue,
  extractGoalInputs,
} from "./dateUtils";

describe("getMonthRange", () => {
  test("月初〜月末と表示名を返す", () => {
    const r = getMonthRange("2026-06-15");
    expect(r.start).toBe("2026-06-01");
    expect(r.end).toBe("2026-06-30");
    expect(r.name).toBe("2026年6月");
  });

  test("2月（うるう年）も正しい", () => {
    const r = getMonthRange("2028-02-10");
    expect(r.end).toBe("2028-02-29");
  });
});

describe("getYearRange", () => {
  test("年度は4/1〜翌3/31", () => {
    const r = getYearRange(2025);
    expect(r.start).toBe("2025-04-01");
    expect(r.end).toBe("2026-03-31");
    expect(r.name).toBe("2025年度");
  });
});

describe("getDatesInRange", () => {
  test("開始〜終了の日付配列を返す", () => {
    expect(getDatesInRange("2026-06-01", "2026-06-03")).toEqual([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });

  test("開始 > 終了 は空配列", () => {
    expect(getDatesInRange("2026-06-03", "2026-06-01")).toEqual([]);
  });

  test("370日超はフリーズ防止のため空配列", () => {
    expect(getDatesInRange("2024-01-01", "2026-01-01")).toEqual([]);
  });
});

describe("calculateAutoQuarters", () => {
  test("8日間を2日ずつ4分割する", () => {
    const qs = calculateAutoQuarters("2026-04-01", "2026-04-08");
    expect(qs).toHaveLength(4);
    expect(qs[0]).toEqual({ id: 1, start: "2026-04-01", end: "2026-04-02" });
    expect(qs[3]).toEqual({ id: 4, start: "2026-04-07", end: "2026-04-08" });
  });

  test("不正な日付は空のテンプレートを返す", () => {
    const qs = calculateAutoQuarters("", "");
    expect(qs).toHaveLength(4);
    expect(qs[0].start).toBe("");
  });
});

describe("getGoalValue / extractGoalInputs", () => {
  const runner = {
    goalMonthly: 200,
    goalPeriod: 1000,
    goalQ1: 250,
    periodGoals: {
      camp2026: { total: 300, q1: 80 },
    },
  };

  test("global: ルートのフィールドを返す", () => {
    expect(getGoalValue(runner, "any", "global", "goalMonthly")).toBe(200);
    expect(getGoalValue(runner, "any", "global", "goalPeriod")).toBe(1000);
    expect(getGoalValue(runner, "any", "global", "goalQ1")).toBe(250);
  });

  test("custom: periodGoals 配下から返す", () => {
    expect(getGoalValue(runner, "camp2026", "custom", "goalPeriod")).toBe(300);
    expect(getGoalValue(runner, "camp2026", "custom", "goalQ1")).toBe(80);
    expect(getGoalValue(runner, "unknown", "custom", "goalPeriod")).toBe(0);
  });

  test("month: 期間目標として月間目標を返す", () => {
    expect(getGoalValue(runner, "any", "month", "goalPeriod")).toBe(200);
    expect(getGoalValue(runner, "any", "month", "goalQ1")).toBe(0);
  });

  test("extractGoalInputs: 未設定(0)は空文字になる", () => {
    const inputs = extractGoalInputs({ goalMonthly: 0 }, "any", "global");
    expect(inputs.monthly).toBe("");
    expect(inputs.q4).toBe("");
  });
});
