/*
 * lapUtils のユニットテスト
 * タイム解析はバグっても画面上で気づきにくいため、変換の基本動作を固定する。
 * 実行: npm test -- --watchAll=false
 */
import {
  timeToSeconds,
  secondsToTime,
  formatTimeInput,
  analyzeLaps,
} from "./lapUtils";

describe("timeToSeconds", () => {
  test("分'秒\"コンマ秒 を秒に変換する", () => {
    expect(timeToSeconds("15'30\"00")).toBe(930);
  });

  test("秒のみの表記を変換する", () => {
    expect(timeToSeconds('30"50')).toBeCloseTo(30.5);
  });

  test("括弧付き（累積表記）も読める", () => {
    expect(timeToSeconds("(2'05\"30)")).toBeCloseTo(125.3);
  });

  test("空文字・null は 0", () => {
    expect(timeToSeconds("")).toBe(0);
    expect(timeToSeconds(null)).toBe(0);
  });
});

describe("secondsToTime", () => {
  test("930秒 → 15'30\"00", () => {
    expect(secondsToTime(930)).toBe("15'30\"00");
  });

  test("1分未満は 秒\"コンマ秒", () => {
    expect(secondsToTime(30.5)).toBe('30"50');
  });

  test("0以下は空文字", () => {
    expect(secondsToTime(0)).toBe("");
    expect(secondsToTime(-5)).toBe("");
  });

  test("timeToSeconds と往復して値が保たれる", () => {
    expect(timeToSeconds(secondsToTime(185))).toBeCloseTo(185);
    expect(timeToSeconds(secondsToTime(62.5))).toBeCloseTo(62.5);
  });
});

describe("formatTimeInput", () => {
  test("ドット区切り3要素 → 分'秒\"コンマ秒", () => {
    expect(formatTimeInput("15.30.00")).toBe("15'30\"00");
  });

  test("ドット区切り2要素 → 秒\"コンマ秒", () => {
    expect(formatTimeInput("30.50")).toBe('30"50');
  });

  test("コロン区切りも同様に整形する", () => {
    expect(formatTimeInput("1:23.45")).toBe("1'23\"45");
  });

  test("区切りなしはそのまま", () => {
    expect(formatTimeInput("abc")).toBe("abc");
  });
});

describe("analyzeLaps", () => {
  test("空入力は null", () => {
    expect(analyzeLaps("", "トラック", "3000m", "")).toBeNull();
    expect(analyzeLaps(null, "トラック", "3000m", "")).toBeNull();
  });

  test("3000m: 1000m毎の区間タイムと平均（/km）を付与する", () => {
    const res = analyzeLaps(
      "1000m:3'00\"00 2000m:6'10\"00",
      "トラック",
      "3000m",
      "",
    );
    expect(res.formattedLines).toEqual([
      "1000m: 3'00\"00(3'00\"00)",
      "2000m: 6'10\"00(3'10\"00)",
      "AVG 3'05\"00",
    ]);
  });

  test("800m: 400m毎の区間タイムと平均（/400m）を付与する", () => {
    const res = analyzeLaps(
      "400m:60\"00 800m:2'05\"00",
      "トラック",
      "800m",
      "",
    );
    expect(res.formattedLines).toEqual([
      '400m: 60"00(1\'00"00)',
      "800m: 2'05\"00(1'05\"00)",
      "AVG 1'02\"50",
    ]);
  });

  test("駅伝（kmのみの距離指定）でも解析できる", () => {
    const res = analyzeLaps(
      "1000m:3'10\"00 2000m:6'30\"00",
      "駅伝",
      "1区",
      "3",
    );
    expect(res.formattedLines[res.formattedLines.length - 1]).toBe(
      "AVG 3'15\"00",
    );
  });
});
