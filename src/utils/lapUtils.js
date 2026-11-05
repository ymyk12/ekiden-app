/*
 * lapUtils — LAPタイム文字列の共通変換ヘルパー
 *
 * SmartLapInput / CoachView / TeamRaceReport / RaceCardEntry で
 * 重複していた「時間⇔秒の変換」と「入力整形」を1か所に集約する。
 */

// "1'23\"45" のような文字列を秒に変換する
export const timeToSeconds = (str) => {
  if (!str) return 0;
  const cleanStr = str.replace(/[()（）]/g, "");
  const match = cleanStr.match(/(?:(\d+)')?(?:(\d+)")?(\d+)?/);
  if (!match) return 0;
  const m = parseFloat(match[1] || 0);
  const s = parseFloat(match[2] || 0);
  const c = parseFloat(match[3] || 0) / 100;
  return m * 60 + s + c;
};

// 秒を "1'23\"45"（1分未満は "23\"45"）形式の文字列に変換する
export const secondsToTime = (totalSeconds) => {
  if (totalSeconds <= 0) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const c = Math.round((totalSeconds % 1) * 100);
  const ss = String(s).padStart(2, "0");
  const cc = String(c).padStart(2, "0");
  return m > 0 ? `${m}'${ss}"${cc}` : `${s}"${cc}`;
};

// 全角のクォート（’ ′ ` ´ ” ″）を半角 ' " に正規化する
export const normalizeQuotes = (s) =>
  (s || "").replace(/[’′`´]/g, "'").replace(/[”″]/g, '"');

// タイム表記を秒に変換する（区切りは ' " . : いずれも可）
//   84"46 / 1'30"99 … クォート表記はそのまま timeToSeconds に委譲
//   37.72 → 37.72秒 / 1.12.84 → 1分12.84秒（ドット・コロン区切り）
export const flexTimeToSeconds = (raw) => {
  if (!raw) return 0;
  const t = normalizeQuotes(raw);
  if (t.includes('"') || t.includes("'")) return timeToSeconds(t);
  const parts = t.split(/[.:]/).filter((x) => x !== "");
  if (parts.length < 2 || parts.some((p) => !/^\d+$/.test(p))) return 0;
  if (parts.length === 2) return parseInt(parts[0], 10) + parseFloat("0." + parts[1]);
  // 3要素以上は 分.秒.コンマ秒 として扱う
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + parseFloat("0." + parts[2]);
};

// 種目・距離から区間（splitPoints）を生成する。
// 例: 1500m→[400,800,1000,1200,1500] / 3000m→400m刻み＋km / 3000mSC・駅伝・ロード→1000m刻み
export const buildSplits = (raceType, distanceStr, ekidenDist) => {
  const dStr = ekidenDist ? String(ekidenDist) : distanceStr || "";
  let totalDist = parseInt(dStr.replace(/[^0-9]/g, "")) || 0;
  if (dStr.toLowerCase().includes("km")) totalDist *= 1000;

  let splits = [];
  const t = (raceType || "").toLowerCase();
  // SC(障害)は raceType ではなく distance 側に入るため dStr で判定する
  const dLower = dStr.toLowerCase();
  if (totalDist > 0) {
    if (t.includes("駅伝") || t.includes("ロード") || dLower.includes("sc")) {
      for (let i = 1000; i <= totalDist; i += 1000) splits.push(i);
      if (totalDist % 1000 !== 0) splits.push(totalDist);
    } else if (totalDist === 800) {
      splits = [200, 400, 600, 800];
    } else if (totalDist === 1500) {
      splits = [400, 800, 1000, 1200, 1500];
    } else if (totalDist >= 3000) {
      for (let i = 400; i <= totalDist; i += 400) {
        splits.push(i);
        const nextK = Math.ceil(i / 1000) * 1000;
        if (nextK > i && nextK < i + 400 && nextK <= totalDist) splits.push(nextK);
      }
      if (splits[splits.length - 1] !== totalDist) splits.push(totalDist);
    }
  }
  return splits;
};

// 入力中のタイム文字列を「分'秒"コンマ秒」の表示形式に整える
// 区切り（' " ： : .）で分割し、要素数に応じて整形する
export const formatTimeInput = (text) => {
  if (!text) return "";
  let normalized = text.replace(/['"：:]/g, ".");
  const parts = normalized.split(".");
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}"${parts[1]}`;
  if (parts.length === 3) return `${parts[0]}'${parts[1]}"${parts[2]}`;
  return text;
};

// LAPタイム文字列を解析し、区間/累積/平均ペースを整形した行配列を返す。
// 1500m以上・駅伝・ロードは1000mごと、それ未満は400mごとの区間表示を付ける。
export const analyzeLaps = (lapStr, raceType, distanceStr, ekidenDist) => {
  if (!lapStr) return null;
  let targetDistStr = ekidenDist ? String(ekidenDist) + "km" : distanceStr;
  let totalDist = parseInt((targetDistStr || "").replace(/[^0-9]/g, ""));
  if ((targetDistStr || "").toLowerCase().includes("km")) totalDist *= 1000;

  const lines = lapStr.replace(/\s+(?=\d+(?:km|m):)/g, "\n").split("\n");
  let currentKilo = 1000;
  let current400 = 400;
  let lastKiloCumul = 0;
  let last400Cumul = 0;

  let totalSec = 0;
  let totalEnteredDist = 0;

  const formattedLines = [];

  const isLongDistance =
    totalDist >= 1500 ||
    (raceType && (raceType.includes("駅伝") || raceType.includes("ロード")));

  lines.forEach((line) => {
    const cleanLine = line.trim().replace(/\s/g, "").replace(/km:/g, "000m:");
    const match = cleanLine.match(/(\d+)m:(.*?)(?:\((.*?)\))?$/);
    if (!match) {
      if (line.trim()) formattedLines.push(line.trim());
      return;
    }

    const dist = parseInt(match[1]);
    const segTime = match[2];
    const cumulTimeStr = match[3] || match[2];

    const cumulSec = timeToSeconds(cumulTimeStr);
    if (cumulSec <= 0) {
      formattedLines.push(`${dist}m: ${segTime}`);
      return;
    }

    totalSec = cumulSec;
    totalEnteredDist = dist;

    let displayLine = `${dist}m: ${segTime}`;

    if (cumulTimeStr !== segTime) {
      displayLine += ` ${cumulTimeStr}`;
    }

    if (dist === currentKilo) {
      const splitSec = cumulSec - lastKiloCumul;
      if (isLongDistance) {
        displayLine += `(${secondsToTime(splitSec)})`;
      }
      lastKiloCumul = cumulSec;
      currentKilo += 1000;
    }

    if (dist === current400) {
      const splitSec = cumulSec - last400Cumul;
      if (!isLongDistance) {
        displayLine += `(${secondsToTime(splitSec)})`;
      }
      last400Cumul = cumulSec;
      current400 += 400;
    }

    formattedLines.push(displayLine);
  });

  if (totalEnteredDist === 0) return null;

  const avgPace = isLongDistance
    ? totalSec / (totalEnteredDist / 1000)
    : totalSec / (totalEnteredDist / 400);

  formattedLines.push(`AVG ${secondsToTime(avgPace)}`);

  return { formattedLines };
};
