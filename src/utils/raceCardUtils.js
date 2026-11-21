/*
 * raceCardUtils — 大会カード（raceCards）の表示用ヘルパー
 *
 * マイログ「記録」タブの大会一覧・大会レポートで共有する。
 */
import { flexTimeToSeconds, secondsToTime } from "./lapUtils";

// 種目の表示名（例: 1500m / 3区(8.5km)）
export const raceDistLabel = (card) =>
  card.distance === "その他"
    ? card.ekidenDistance || ""
    : card.raceType === "駅伝" && card.ekidenDistance
      ? `${card.distance}(${card.ekidenDistance}km)`
      : card.distance || "";

// 出場状況: finish / dns（欠場） / dnf（途中棄権）
export const raceStatusOf = (card) => card.status || "finish";

export const raceStatusLabel = (card) => {
  const s = raceStatusOf(card);
  return s === "dns" ? "欠場" : s === "dnf" ? "途中棄権" : "";
};

// 秒差の表示（1分未満は「1.23秒」、それ以上は 1'02"34）
const fmtGap = (sec) =>
  sec < 60 ? `${sec.toFixed(2)}秒` : secondsToTime(sec);

// 目標と結果の差。どちらかが時間として読めなければ null。
//   { diff: 秒（負なら目標より速い）, achieved: boolean, label }
export const raceTargetDiff = (card) => {
  if (raceStatusOf(card) !== "finish") return null;
  const res = flexTimeToSeconds(card.resultTime);
  const tgt = flexTimeToSeconds(card.targetTime);
  if (!(res > 0) || !(tgt > 0)) return null;
  const diff = res - tgt;
  const abs = Math.abs(diff);
  if (abs < 0.005) return { diff: 0, achieved: true, label: "目標ぴったり" };
  return diff < 0
    ? { diff, achieved: true, label: `目標より ${fmtGap(abs)} 速い` }
    : { diff, achieved: false, label: `目標まで ${fmtGap(abs)}` };
};

// 大会カードの実施日（カードの日付 → 大会の開始日）
export const raceDateOf = (card, tour) =>
  card.date || tour?.startDate || "";

export const fmtRaceDate = (ds) =>
  ds ? `${ds.slice(0, 4)}/${Number(ds.slice(5, 7))}/${Number(ds.slice(8, 10))}` : "";

// バッジの色
export const badgeColor = (badge) =>
  badge === "自己ベスト"
    ? "bg-orange-500"
    : badge === "組1位"
      ? "bg-blue-500"
      : badge === "学校記録"
        ? "bg-rose-500"
        : "bg-emerald-500";
