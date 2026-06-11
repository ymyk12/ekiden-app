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
