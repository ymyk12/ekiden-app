/*
 * MonthlyReportView — 選手別 月間レポート（A4印刷 → PDF配布用）。ヘッダーで年度が選ばれているときは年間レポート
 *
 * 監督が「月 × 選手（または全員一括）」を選ぶと、月間走行距離・練習日数・
 * 週別推移・区分内訳・大会結果・日々の練習ログをA4 1枚に自動集計する。
 * 印刷ボタン → ブラウザの「PDFに保存」で選手に配布できる。
 * 全員一括モードでは print.css の .page-break により1人1ページで改ページ。
 * グラフは印刷の確実性を優先して recharts ではなく CSS バーで描画する。
 */
import { useState, useEffect } from "react";
import { Printer, Trophy, ChevronLeft, ChevronRight } from "lucide-react";
import { usePeriodNav } from "../hooks/usePeriodNav";
import { useLogRange } from "../hooks/useLogRange";
import { ROLES, CATEGORY, PERIOD_KINDS, periodKindOf } from "../utils/constants";
import { getTodayStr, makeYearPeriod } from "../utils/dateUtils";
import { YearlySheet, buildYearlyData } from "./YearlyReportSheet";

const pad2 = (n) => String(n).padStart(2, "0");
const fmtLocal = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const DAY_JP = ["日", "月", "火", "水", "木", "金", "土"];

// ログ表の区分は短縮表記（半幅2カラムに収めるため）
const CAT_SHORT = {
  [CATEGORY.MORNING]: "朝",
  [CATEGORY.AM]: "午前",
  [CATEGORY.PM]: "午後",
  [CATEGORY.SELF]: "自主",
  [CATEGORY.MATCH]: "試合",
  [CATEGORY.CAMP]: "合宿",
  [CATEGORY.REST]: "休養",
};

// RPEの強度カラー（入力フォームの 楽=緑⇔限界=赤 と同じ感覚）
const rpeColor = (v) =>
  v >= 8 ? "bg-rose-400" : v >= 4 ? "bg-amber-400" : "bg-emerald-400";

// 練習ログの半月分テーブル（A4 1枚化のため前半/後半を横並びにする）
const LogTable = ({ logs }) => (
  <table className="w-full border-collapse compact-log-table">
    <thead>
      <tr className="bg-slate-50">
        <th className="border border-slate-300 px-1 py-0.5 text-[9px] font-black text-slate-500 w-12">
          日付
        </th>
        <th className="border border-slate-300 px-1 py-0.5 text-[9px] font-black text-slate-500 w-9">
          区分
        </th>
        <th className="border border-slate-300 px-1 py-0.5 text-[9px] font-black text-slate-500 w-9">
          km
        </th>
        <th className="border border-slate-300 px-1 py-0.5 text-[9px] font-black text-slate-500 w-7">
          R
        </th>
        <th className="border border-slate-300 px-1 py-0.5 text-[9px] font-black text-slate-500 w-7">
          P
        </th>
        <th className="border border-slate-300 px-1 py-0.5 text-[9px] font-black text-slate-500 text-left">
          メニュー
        </th>
      </tr>
    </thead>
    <tbody>
      {logs.map((l) => {
        const isRest = l.category === CATEGORY.REST;
        const day = new Date(l.date);
        return (
          <tr key={l.id} className={isRest ? "bg-emerald-50/60" : ""}>
            <td className="border border-slate-300 px-1 py-0.5 text-[9px] font-bold text-slate-600 text-center whitespace-nowrap">
              {l.date.slice(5).replace("-", "/")}({DAY_JP[day.getDay()]})
            </td>
            <td className="border border-slate-300 px-1 py-0.5 text-[9px] font-bold text-slate-600 text-center whitespace-nowrap">
              {CAT_SHORT[l.category] || l.category}
            </td>
            <td className="border border-slate-300 px-1 py-0.5 text-[9px] font-black text-slate-700 text-center">
              {isRest ? "—" : l.distance}
            </td>
            <td className="border border-slate-300 px-0.5 py-0.5 text-[9px] font-bold text-slate-600 text-center">
              {isRest ? "—" : l.rpe || "—"}
            </td>
            <td
              className={`border border-slate-300 px-0.5 py-0.5 text-[9px] font-black text-center ${Number(l.pain) >= 3 ? "text-rose-600" : "text-slate-400"}`}
            >
              {Number(l.pain) > 1 ? l.pain : "—"}
            </td>
            <td className="border border-slate-300 px-1 py-0.5 text-[9px] text-slate-600 text-left break-words">
              {isRest ? "オフ" : (l.menuDetail || "").replace(/\s+/g, " ").trim()}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

const parseYmd = (s) => {
  const [yy, mm, dd] = s.split("-").map(Number);
  return new Date(yy, mm - 1, dd);
};
const addDaysStr = (s, n) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return fmtLocal(d);
};
const dayDiff = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
// "YYYY-MM" の月初〜月末
const monthRangeOf = (ym) => {
  const [yy, mm] = ym.split("-").map(Number);
  return { start: `${ym}-01`, end: fmtLocal(new Date(yy, mm, 0)) };
};

// 1人分のレポートデータを集計する。
// range = { start, end, kind } 。kind は "month"（月間）か "custom"（カスタム期間）。
const buildMonthlyData = (runner, allLogs, raceCards, tournaments, range) => {
  // 推移グラフは「期間の終了月」を含む直近6ヶ月
  const [y, m] = range.end.split("-").slice(0, 2).map(Number);
  const first = parseYmd(range.start);
  const last = parseYmd(range.end);
  const totalDays = dayDiff(range.start, range.end) + 1;
  const inRange = (ds) => !!ds && ds >= range.start && ds <= range.end;

  const logs = (allLogs || [])
    .filter((l) => l.runnerId === runner.id && inRange(l.date))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalKm =
    Math.round(logs.reduce((s, l) => s + (Number(l.distance) || 0), 0) * 10) / 10;
  const entryDates = new Set(logs.map((l) => l.date));
  const restDays = new Set(
    logs.filter((l) => l.category === CATEGORY.REST).map((l) => l.date),
  ).size;
  const trainDays = new Set(
    logs.filter((l) => l.category !== CATEGORY.REST).map((l) => l.date),
  ).size;

  // 未入力日数は「経過日数」基準（当月途中なら今日まで）
  const todayStr = fmtLocal(new Date());
  const lastStr = fmtLocal(last);
  const firstStr = fmtLocal(first);
  let elapsedDays;
  if (todayStr >= lastStr) elapsedDays = totalDays;
  else if (todayStr < firstStr) elapsedDays = 0;
  else elapsedDays = dayDiff(range.start, todayStr) + 1;
  const missingDays = Math.max(0, elapsedDays - entryDates.size);

  const rpeLogs = logs.filter(
    (l) => l.category !== CATEGORY.REST && Number(l.rpe) > 0,
  );
  const avgRpe = rpeLogs.length
    ? Math.round(
        (rpeLogs.reduce((s, l) => s + Number(l.rpe), 0) / rpeLogs.length) * 10,
      ) / 10
    : null;
  const painDays = new Set(
    logs.filter((l) => Number(l.pain) >= 3).map((l) => l.date),
  ).size;

  // 比較相手の合計（前月比表示用）。
  // カスタム期間は「同じ種類（鍛錬期／合宿）の直前の期間」。無ければ比較なし。
  const prevRange =
    range.kind === "custom"
      ? range.prev
      : monthRangeOf(
          (() => {
            const pd = new Date(first.getFullYear(), first.getMonth() - 1, 1);
            return `${pd.getFullYear()}-${pad2(pd.getMonth() + 1)}`;
          })(),
        );
  const hasPrev = !!prevRange;
  const prevKm = hasPrev
    ? Math.round(
        (allLogs || [])
          .filter(
            (l) =>
              l.runnerId === runner.id &&
              l.date >= prevRange.start &&
              l.date <= prevRange.end,
          )
          .reduce((s, l) => s + (Number(l.distance) || 0), 0) * 10,
      ) / 10
    : 0;

  // 週別集計（月曜始まり、月初・月末で区間をクリップ）
  const weeks = [];
  const cursor = new Date(first);
  cursor.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  while (cursor <= last) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(cursor.getDate() + 6);
    const s = cursor < first ? first : new Date(cursor);
    const e = weekEnd > last ? last : weekEnd;
    weeks.push({
      label: `${s.getMonth() + 1}/${s.getDate()}〜${e.getMonth() + 1}/${e.getDate()}`,
      start: fmtLocal(s),
      end: fmtLocal(e),
      km: 0,
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  logs.forEach((l) => {
    const w = weeks.find((w) => l.date >= w.start && l.date <= w.end);
    if (w) w.km += Number(l.distance) || 0;
  });
  weeks.forEach((w) => {
    w.km = Math.round(w.km * 10) / 10;
  });

  // 区分内訳（完全休養を除く）
  const catMap = {};
  logs.forEach((l) => {
    if (l.category === CATEGORY.REST) return;
    const c = l.category || "その他";
    if (!catMap[c]) catMap[c] = { km: 0, days: new Set() };
    catMap[c].km += Number(l.distance) || 0;
    catMap[c].days.add(l.date);
  });
  // 表示順は1日の時系列（朝練→午前練→午後練→…）= CATEGORY の定義順
  const catOrder = Object.values(CATEGORY);
  const categories = Object.entries(catMap)
    .map(([name, v]) => ({
      name,
      km: Math.round(v.km * 10) / 10,
      days: v.days.size,
    }))
    .sort((a, b) => {
      const ia = catOrder.indexOf(a.name);
      const ib = catOrder.indexOf(b.name);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  // 当月の大会結果
  // 種目キー: 「その他」は実際の種目名が ekidenDistance に手入力されている
  // バッジは監督が大会カードに付与した公式の badges をそのまま表示する
  // （独自のPB自動判定は誤判定の元になるため行わない）
  const eventKey = (card) =>
    card.distance === "その他"
      ? card.ekidenDistance || "その他"
      : card.distance || card.ekidenDistance || "";
  const myCards = (raceCards || []).filter((c) => c.runnerId === runner.id);
  const races = myCards
    // 削除された大会のカード（大会が存在しないもの）は載せない
    .filter(
      (c) =>
        inRange(c.date) &&
        (tournaments || []).some((t) => t.id === c.tournamentId),
    )
    .map((c) => {
      const tour = (tournaments || []).find((t) => t.id === c.tournamentId);
      return {
        date: c.date,
        name: tour?.name || "大会",
        distKey: eventKey(c),
        resultTime: c.resultTime || "",
        badges: c.badges || [],
      };
    })
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  // 日別コンディション（その日の最大RPE / 最大Pain。複数部練は高い方を採用）
  const daily = [];
  const trainDates = new Set(
    logs.filter((l) => l.category !== CATEGORY.REST).map((l) => l.date),
  );
  for (let i = 0; i < totalDays; i++) {
    const ds = addDaysStr(range.start, i);
    const dayLogs = logs.filter((l) => l.date === ds);
    const train = dayLogs.filter((l) => l.category !== CATEGORY.REST);
    daily.push({
      day: i + 1,
      rpe: Math.max(0, ...train.map((l) => Number(l.rpe) || 0)),
      pain: Math.max(0, ...dayLogs.map((l) => Number(l.pain) || 0)),
      isRest: dayLogs.length > 0 && train.length === 0,
    });
  }

  // 今月のハイライト（自動抽出）
  const kmByDate = {};
  logs.forEach((l) => {
    kmByDate[l.date] = (kmByDate[l.date] || 0) + (Number(l.distance) || 0);
  });
  let bestDay = null;
  Object.entries(kmByDate).forEach(([date, km]) => {
    if (km > 0 && (!bestDay || km > bestDay.km))
      bestDay = { date, km: Math.round(km * 10) / 10 };
  });
  const bestWeek = weeks.reduce(
    (a, b) => (b.km > (a?.km ?? -1) ? b : a),
    null,
  );
  let maxTrainStreak = 0;
  let ts = 0;
  for (let i = 0; i < totalDays; i++) {
    const ds = addDaysStr(range.start, i);
    ts = trainDates.has(ds) ? ts + 1 : 0;
    if (ts > maxTrainStreak) maxTrainStreak = ts;
  }
  const selfDays = new Set(
    logs.filter((l) => l.category === CATEGORY.SELF).map((l) => l.date),
  ).size;

  // 月間距離の推移（当月含む直近6ヶ月）
  let trend = [];
  let trendTitle = "月間走行距離の推移（直近6ヶ月）";
  for (let i = 5; i >= 0; i--) {
    const td = new Date(y, m - 1 - i, 1);
    const tPrefix = `${td.getFullYear()}-${pad2(td.getMonth() + 1)}-`;
    const km =
      Math.round(
        (allLogs || [])
          .filter(
            (l) => l.runnerId === runner.id && (l.date || "").startsWith(tPrefix),
          )
          .reduce((s, l) => s + (Number(l.distance) || 0), 0) * 10,
      ) / 10;
    trend.push({
      label: `${td.getFullYear()}/${td.getMonth() + 1}`,
      km,
      isCurrent: i === 0,
    });
  }
  // カスタム期間は、同じ種類（鍛錬期／合宿）の過去の期間との比較にする
  if (range.kind === "custom") {
    trendTitle =
      range.periodKind === "camp"
        ? "合宿の推移（過去の合宿との比較）"
        : "鍛錬期の推移（過去の鍛錬期との比較）";
    trend = (range.series || []).map((sp) => ({
      label: sp.name,
      sub: `${dayDiff(sp.start, sp.end) + 1}日間`,
      km:
        Math.round(
          (allLogs || [])
            .filter(
              (l) =>
                l.runnerId === runner.id && l.date >= sp.start && l.date <= sp.end,
            )
            .reduce((a, l) => a + (Number(l.distance) || 0), 0) * 10,
        ) / 10,
      isCurrent: sp.current,
    }));
  }

  // 日ごとの合計走行距離（合宿レポートで表示）
  const dayKm = [];
  for (let i = 0; i < totalDays; i++) {
    const ds = addDaysStr(range.start, i);
    const dayLogs = logs.filter((l) => l.date === ds);
    const km =
      Math.round(
        dayLogs
          .filter((l) => l.category !== CATEGORY.REST)
          .reduce((a, l) => a + (Number(l.distance) || 0), 0) * 10,
      ) / 10;
    dayKm.push({
      date: ds,
      km,
      isRest: dayLogs.length > 0 && dayLogs.every((l) => l.category === CATEGORY.REST),
    });
  }

  return {
    kind: range.kind,
    periodKind: range.periodKind,
    trendTitle,
    dayKm,
    start: range.start,
    end: range.end,
    logs,
    totalKm,
    trainDays,
    restDays,
    missingDays,
    avgRpe,
    painDays,
    prevKm,
    hasPrev,
    prevName: range.prev?.name || "",
    prevLabel: range.kind === "custom" ? range.prevLabel : "前月",
    weeks,
    categories,
    races,
    trend,
    daily,
    bestDay,
    bestWeek,
    maxTrainStreak,
    selfDays,
  };
};

// A4 1枚分のレポート本体
const ReportSheet = ({ runner, data, title, isFirst }) => {
  const d = data;
  const isCustom = d.kind === "custom";
  const shortDate = (ds) => `${Number(ds.slice(5, 7))}/${Number(ds.slice(8, 10))}`;
  const diff = Math.round((d.totalKm - d.prevKm) * 10) / 10;
  const maxWeekKm = Math.max(...d.weeks.map((w) => w.km), 1);
  const maxCatKm = Math.max(...d.categories.map((c) => c.km), 1);
  const maxTrendKm = Math.max(...d.trend.map((t) => t.km), 1);

  return (
    <div
      className={`bg-white rounded-[2rem] print:rounded-none shadow-sm print:shadow-none p-6 print:p-0 space-y-4 print:space-y-3 ${isFirst ? "" : "page-break"}`}
    >
      {/* ヘッダー。スマホ幅では max-sm で字を詰めて、タイトル・氏名とも1行に収める
          （A4印刷は print: 指定で従来どおり。max-sm は画面が狭いときだけ効く） */}
      <div className="flex items-end justify-between gap-2 border-b-2 border-slate-800 pb-2 print:pb-1">
        <div>
          <p className="text-[10px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest">
            Monthly Training Report
          </p>
          <h2 className="text-xl max-sm:text-base print:text-base font-black text-slate-800 whitespace-nowrap">
            {title}
          </h2>
        </div>
        <p className="text-lg max-sm:text-sm print:text-base font-black text-slate-800 whitespace-nowrap flex-shrink-0">
          {runner.lastName} {runner.firstName}
        </p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-5 print:grid-cols-5 gap-2">
        <div className="border border-slate-200 rounded-xl p-2.5 print:p-1 text-center col-span-2 md:col-span-1 print:col-span-1">
          <p className="text-[9px] font-black text-slate-400 uppercase">
            {isCustom ? "期間走行距離" : "月間走行距離"}
          </p>
          <p className="text-xl font-black text-blue-600 leading-tight">
            {d.totalKm}
            <span className="text-[10px] text-slate-400 font-bold">km</span>
          </p>
        </div>
        <div className="border border-slate-200 rounded-xl p-2.5 print:p-1 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase">
            {d.prevLabel}比
          </p>
          <p
            className={`text-lg font-black leading-tight ${!d.hasPrev ? "text-slate-300" : diff >= 0 ? "text-emerald-600" : "text-rose-500"}`}
          >
            {d.hasPrev ? `${diff >= 0 ? "+" : ""}${diff}` : "—"}
            {d.hasPrev && (
              <span className="text-[10px] text-slate-400 font-bold">km</span>
            )}
          </p>
          <p className="text-[9px] font-bold text-slate-400">
            {d.hasPrev
              ? `${d.prevName ? d.prevName + " " : d.prevLabel + " "}${d.prevKm}km`
              : `${d.prevLabel}なし`}
          </p>
        </div>
        <div className="border border-slate-200 rounded-xl p-2.5 print:p-1 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase">
            練習 / 休養
          </p>
          <p className="text-lg font-black text-slate-700 leading-tight">
            {d.trainDays}
            <span className="text-[10px] text-slate-400 font-bold">日</span>
            <span className="text-slate-300 mx-0.5">/</span>
            {d.restDays}
            <span className="text-[10px] text-slate-400 font-bold">日</span>
          </p>
          {d.missingDays > 0 && (
            <p className="text-[9px] font-bold text-amber-600">
              未入力 {d.missingDays}日
            </p>
          )}
        </div>
        <div className="border border-slate-200 rounded-xl p-2.5 print:p-1 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase">平均RPE</p>
          <p className="text-lg font-black text-slate-700 leading-tight">
            {d.avgRpe ?? "—"}
          </p>
        </div>
        <div className="border border-slate-200 rounded-xl p-2.5 print:p-1 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase">
            Pain3以上
          </p>
          <p
            className={`text-lg font-black leading-tight ${d.painDays > 0 ? "text-rose-500" : "text-slate-700"}`}
          >
            {d.painDays}
            <span className="text-[10px] text-slate-400 font-bold">日</span>
          </p>
        </div>
      </div>

      {/* 今月のハイライト */}
      <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-3 print:p-2">
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">
          {isCustom ? "期間のハイライト" : "今月のハイライト"}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400">最長走行日</p>
            <p className="text-base print:text-sm font-black text-slate-700 leading-tight">
              {d.bestDay ? (
                <>
                  {d.bestDay.km}
                  <span className="text-[10px] text-slate-400 font-bold">km</span>
                </>
              ) : (
                "—"
              )}
            </p>
            {d.bestDay && (
              <p className="text-[9px] font-bold text-slate-400">
                {d.bestDay.date.slice(5).replace("-", "/")}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400">最多週</p>
            <p className="text-base print:text-sm font-black text-slate-700 leading-tight">
              {d.bestWeek && d.bestWeek.km > 0 ? (
                <>
                  {d.bestWeek.km}
                  <span className="text-[10px] text-slate-400 font-bold">km</span>
                </>
              ) : (
                "—"
              )}
            </p>
            {d.bestWeek && d.bestWeek.km > 0 && (
              <p className="text-[9px] font-bold text-slate-400">
                {d.bestWeek.label}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400">連続練習</p>
            <p className="text-base print:text-sm font-black text-slate-700 leading-tight">
              {d.maxTrainStreak}
              <span className="text-[10px] text-slate-400 font-bold">日</span>
            </p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400">自主練</p>
            <p className="text-base print:text-sm font-black text-slate-700 leading-tight">
              {d.selfDays}
              <span className="text-[10px] text-slate-400 font-bold">日</span>
            </p>
          </div>
        </div>
      </div>

      {/* 週別距離 + 区分内訳（A4 1枚に収めるため2カラム） */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl p-3 print:p-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            週別走行距離
          </p>
          <div className="space-y-1.5">
            {d.weeks.map((w) => (
              <div key={w.start} className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-slate-500 w-20 flex-shrink-0">
                  {w.label}
                </span>
                <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded"
                    style={{ width: `${(w.km / maxWeekKm) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-slate-700 w-12 text-right">
                  {w.km}km
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-slate-200 rounded-xl p-3 print:p-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            区分内訳
          </p>
          {d.categories.length === 0 ? (
            <p className="text-[10px] text-slate-400 font-bold">記録なし</p>
          ) : (
            <div className="space-y-1.5">
              {d.categories.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-500 w-14 flex-shrink-0">
                    {c.name}
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded"
                      style={{ width: `${(c.km / maxCatKm) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-700 w-20 text-right">
                    {c.km}km・{c.days}日
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 大会結果（当月分があるときのみ）
          1行目=日付・大会名 / 2行目=種目・記録・バッジ（スマホでも崩れにくい2段組み） */}
      {d.races.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Trophy size={11} /> {isCustom ? "期間の大会結果" : "今月の大会結果"}
          </p>
          <div className="space-y-2 print:space-y-1">
            {d.races.map((r, i) => {
              const dateStr = r.date?.slice(5).replace("-", "/");
              const badgeEls = r.badges.map((badge) => (
                <span
                  key={badge}
                  className={`text-[9px] font-black text-white px-1.5 py-0.5 rounded ${badge === "自己ベスト" ? "bg-orange-500" : badge === "組1位" ? "bg-blue-500" : badge === "学校記録" ? "bg-rose-500" : "bg-emerald-500"}`}
                >
                  {badge}
                </span>
              ));
              return (
                <div key={i}>
                  {/* 画面表示: 1行目=日付・大会名 / 2行目=種目・記録・バッジ */}
                  <div className="print:hidden text-[11px] font-bold text-slate-700">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-slate-500 flex-shrink-0">
                        {dateStr}
                      </span>
                      <span className="min-w-0">{r.name}</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5">
                      <span className="text-slate-600">{r.distKey}</span>
                      <span className="font-black text-slate-800">
                        {r.resultTime || "—"}
                      </span>
                      {badgeEls}
                    </div>
                  </div>
                  {/* 印刷(PDF)表示: 従来どおり1行にまとめる */}
                  <p className="hidden print:block text-[10px] font-bold text-slate-700">
                    {dateStr} {r.name}　{r.distKey}{" "}
                    <span className="font-black">{r.resultTime || "—"}</span>
                    {r.badges.map((badge) => (
                      <span
                        key={badge}
                        className={`ml-1 text-[9px] font-black text-white px-1.5 py-0.5 rounded ${badge === "自己ベスト" ? "bg-orange-500" : badge === "組1位" ? "bg-blue-500" : badge === "学校記録" ? "bg-rose-500" : "bg-emerald-500"}`}
                      >
                        {badge}
                      </span>
                    ))}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 日ごとの合計走行距離（合宿のみ） */}
      {d.periodKind === "camp" && (
        <div className="border border-slate-200 rounded-xl p-3 print:p-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            日別走行距離（1日の合計）
          </p>
          <div className="space-y-1.5">
            {d.dayKm.map((dk) => {
              const maxDay = Math.max(...d.dayKm.map((x) => x.km), 1);
              const dt = parseYmd(dk.date);
              return (
                <div key={dk.date} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 w-16 flex-shrink-0">
                    {dt.getMonth() + 1}/{dt.getDate()}({DAY_JP[dt.getDay()]})
                  </span>
                  <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded"
                      style={{ width: `${(dk.km / maxDay) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-slate-700 w-16 text-right">
                    {dk.isRest ? "休養" : `${dk.km}km`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 練習ログ（本人の入力をそのまま掲載）
          前半/後半の2分割横並びでA4 1枚に収める（31日分でも約16行の高さ） */}
      <div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
          練習ログ
          <span className="ml-2 normal-case tracking-normal text-slate-400 font-bold">
            R=RPE / P=Pain
          </span>
        </p>
        {d.logs.length === 0 ? (
          <p className="border border-slate-300 rounded px-2 py-2 text-[10px] text-slate-400 font-bold text-center">
            {isCustom ? "この期間の記録はありません" : "この月の記録はありません"}
          </p>
        ) : (
          (() => {
            const half = Math.ceil(d.logs.length / 2);
            const left = d.logs.slice(0, half);
            const right = d.logs.slice(half);
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-3 gap-y-2 items-start">
                <LogTable logs={left} />
                {right.length > 0 && <LogTable logs={right} />}
              </div>
            );
          })()
        )}
      </div>

      {/* 日別コンディション + 月間距離の推移 */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-3">
        <div className="border border-slate-200 rounded-xl p-3 print:p-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            日別コンディション（RPE）
            <span className="ml-2 normal-case tracking-normal text-rose-400 font-bold">
              ●=Pain3以上
            </span>
          </p>
          <div className="flex items-end gap-px h-16 print:h-14">
            {d.daily.map((day) => (
              <div
                key={day.day}
                className="flex-1 h-full flex flex-col items-center justify-end"
              >
                {day.pain >= 3 && (
                  <span className="w-1 h-1 rounded-full bg-rose-500 mb-[1px] flex-shrink-0" />
                )}
                {day.rpe > 0 ? (
                  <div
                    className={`w-full rounded-t-sm ${rpeColor(day.rpe)}`}
                    style={{ height: `${day.rpe * 10}%` }}
                  />
                ) : day.isRest ? (
                  <div className="w-full h-[3px] bg-emerald-200 rounded" />
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[8px] font-bold text-slate-400 leading-none">
            {isCustom ? (
              <>
                <span>{shortDate(d.start)}</span>
                <span>{shortDate(d.end)}</span>
              </>
            ) : (
              <>
                <span>1日</span>
                <span>10日</span>
                <span>20日</span>
                <span>{d.daily.length}日</span>
              </>
            )}
          </div>
        </div>
        <div className="border border-slate-200 rounded-xl p-3 print:p-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            {d.trendTitle}
          </p>
          <div className="flex gap-2">
            {d.trend.map((t) => {
              // 棒の領域は固定の高さ。値の文字ぶん（上20%）を残して、最大値が80%になる
              const pct = Math.max((t.km / maxTrendKm) * 80, t.km > 0 ? 3 : 0);
              return (
                <div
                  key={t.label}
                  className="flex-1 flex flex-col items-center min-w-0"
                >
                  <div className="relative w-full h-16 print:h-14">
                    <span
                      className={`absolute left-0 right-0 text-center text-[9px] font-black leading-none ${t.isCurrent ? "text-blue-600" : "text-slate-500"}`}
                      style={{ bottom: `calc(${pct}% + 2px)` }}
                    >
                      {t.km}
                    </span>
                    <div
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[3.5rem] rounded-t ${t.isCurrent ? "bg-blue-500" : "bg-slate-300"}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[8px] font-bold mt-1 leading-tight text-center break-all ${t.isCurrent ? "text-blue-600" : "text-slate-400"}`}
                  >
                    {t.label}
                    {t.sub && <span className="block font-medium">{t.sub}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* フッター */}
      <p className="text-[8px] text-slate-400 text-right">
        KCTF Ekiden Team — Generated {fmtLocal(new Date())}
      </p>
    </div>
  );
};

const MonthlyReportView = ({
  handlePrint,
  activeRunners,
  allLogs,
  raceCards,
  tournaments,
  // 選手本人用: この選手に固定し、選手セレクタを隠す（監督フローは未指定で従来どおり）
  lockedRunnerId = null,
  // 「全選手（一括）」オプションを出すか（選手本人用では false）
  allowAll = true,
  // 初期表示月（"YYYY-MM"）。引退者向け OBView が「最後に記録した月」を渡す。未指定は先月
  defaultMonth = undefined,
  // 操作バーの上に同じカードで載せる見出し（My Log のタイトルとタブ）。未指定なら操作バーだけ
  topSlot = null,
}) => {
  // 既定は「先月」（月初に前月分を配る運用を想定）
  const [localMonth, setMonth] = useState(() => {
    if (defaultMonth) return defaultMonth;
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });
  // ヘッダーに期間選択がある画面（選手・監督）では、表示月をヘッダーの期間と連動させる。
  // 無い画面（OB 画面）は従来どおり自分で月を持つ。
  const periodNav = usePeriodNav();
  const month = periodNav ? periodNav.viewMonth : localMonth;
  // ヘッダーで「年度」が選ばれているときは、年間（年度）レポートを表示する。
  // 月・カスタム期間のときは、従来の月間レポート。
  const yearPeriod =
    periodNav && periodNav.period?.type === "year" ? periodNav.period : null;
  // カスタム期間が選ばれているときは、その期間のレポート（内容は月間レポートと同じ）
  const customPeriod =
    periodNav && periodNav.period?.type === "custom" ? periodNav.period : null;
  const isCurrentOrFuture = yearPeriod
    ? yearPeriod.end >= getTodayStr()
    : month >= getTodayStr().slice(0, 7);
  // lockedRunnerId 指定時はその選手を初期選択。未指定かつ全選手不可なら空。
  const [runnerId, setRunnerId] = useState(
    lockedRunnerId || (allowAll ? "all" : ""),
  );

  const athletes = (activeRunners || []).filter(
    (r) => r.role !== ROLES.MANAGER,
  );
  // lockedRunnerId が指定されていれば常にその選手に固定（他者データは出さない）
  const effectiveRunnerId = lockedRunnerId || runnerId;

  // 直近3か月より前の月を選んだときに過去ログを読み込む。
  // 特定の選手なら全期間、全選手（一括）なら選んだ月のチームのログだけ。
  const { ensureRunnerLogs, ensureLogsMonth } = useLogRange();
  const yearStart = yearPeriod?.start;
  const customStart = customPeriod?.start;
  const customEnd = customPeriod?.end;
  useEffect(() => {
    if (effectiveRunnerId && effectiveRunnerId !== "all") {
      ensureRunnerLogs(effectiveRunnerId);
    } else if (yearStart) {
      // 年度（と前年度比のための前年度）の24か月ぶん
      const sy = Number(yearStart.slice(0, 4));
      const sm = Number(yearStart.slice(5, 7));
      for (let i = -12; i < 12; i++) {
        const d = new Date(sy, sm - 1 + i, 1);
        ensureLogsMonth(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`);
      }
    } else if (customStart && customEnd) {
      // カスタム期間がまたぐ月のぶん（最大24か月まで）
      let cur = customStart.slice(0, 7);
      for (let i = 0; i < 24 && cur <= customEnd.slice(0, 7); i++) {
        ensureLogsMonth(cur);
        const [cy, cm] = cur.split("-").map(Number);
        const nd = new Date(cy, cm, 1);
        cur = `${nd.getFullYear()}-${pad2(nd.getMonth() + 1)}`;
      }
    } else {
      ensureLogsMonth(month);
    }
  }, [
    effectiveRunnerId,
    month,
    yearStart,
    customStart,
    customEnd,
    ensureRunnerLogs,
    ensureLogsMonth,
  ]);
  // 一括出力では、引退者はその月に記録がある場合のみ含める（空の帳票を出さない）。
  // 個別選択・本人固定では引退者も過去月のレポートを見られる。
  const hasLogsInMonth = (r) =>
    (allLogs || []).some(
      (l) =>
        l.runnerId === r.id &&
        (yearPeriod || customPeriod
          ? l.date >= (yearPeriod || customPeriod).start &&
            l.date <= (yearPeriod || customPeriod).end
          : (l.date || "").startsWith(month)),
    );
  const bulkAthletes = athletes.filter(
    (r) => r.status !== "retired" || hasLogsInMonth(r),
  );
  const targets =
    effectiveRunnerId === "all"
      ? bulkAthletes
      : athletes.filter((r) => r.id === effectiveRunnerId);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${y}年${m}月`;

  const reportKind = yearPeriod
    ? "年間レポート"
    : customPeriod
      ? "期間レポート"
      : "月間レポート";
  const reportKey = yearPeriod
    ? yearPeriod.name
    : customPeriod
      ? customPeriod.name
      : month;
  // 月間レポートの集計範囲（カスタム期間のときは期間の開始〜終了）
  // カスタム期間の比較相手: 同じ種類（鍛錬期／合宿）で、開始前に終わった直近の期間
  const customKind = customPeriod ? periodKindOf(customPeriod) : null;
  const prevCustom = customPeriod
    ? (periodNav.periods || [])
        .filter(
          (p) =>
            p.type === "custom" &&
            p.id !== customPeriod.id &&
            periodKindOf(p) === customKind &&
            p.end < customPeriod.start,
        )
        .sort((a, b) => b.end.localeCompare(a.end))[0] || null
    : null;
  const range = customPeriod
    ? {
        start: customPeriod.start,
        end: customPeriod.end,
        kind: "custom",
        prev: prevCustom
          ? { start: prevCustom.start, end: prevCustom.end, name: prevCustom.name }
          : null,
        prevLabel: PERIOD_KINDS[customKind].prevLabel,
        periodKind: customKind,
        // 同じ種類の過去の期間（今回を含む直近6件）。推移グラフの比較に使う
        series: (periodNav.periods || [])
          .filter(
            (p) =>
              p.type === "custom" &&
              periodKindOf(p) === customKind &&
              p.start <= customPeriod.start,
          )
          .sort((a, b) => a.start.localeCompare(b.start))
          .slice(-6)
          .map((p) => ({
            name: p.name,
            start: p.start,
            end: p.end,
            current: p.id === customPeriod.id,
          })),
      }
    : { ...monthRangeOf(month), kind: "month" };
  // ─ レポートの種類（月間／年間／鍛錬期／合宿）。ヘッダーの期間と連動する ─
  const reportType = yearPeriod ? "year" : customPeriod ? customKind : "month";
  const customsOf = (kind) =>
    (periodNav?.periods || [])
      .filter((p) => p.type === "custom" && periodKindOf(p) === kind)
      .sort((a, b) => a.start.localeCompare(b.start));
  const sameKindCustoms = customPeriod ? customsOf(customKind) : [];
  const customIdx = customPeriod
    ? sameKindCustoms.findIndex((p) => p.id === customPeriod.id)
    : -1;
  const stepCustom = (delta) => {
    const next = sameKindCustoms[customIdx + delta];
    if (next) periodNav.selectPeriod(next);
  };
  const onTypeChange = (t) => {
    if (!periodNav || t === reportType) return;
    if (t === "month") {
      periodNav.stepMonth(0);
    } else if (t === "year") {
      const yy = Number(month.slice(0, 4));
      const mm = Number(month.slice(5, 7));
      periodNav.selectPeriod(makeYearPeriod(mm <= 3 ? yy - 1 : yy));
    } else {
      // その種類のカスタム期間のうち、開始が今日以前で一番新しいもの（なければ最後のもの）
      const list = customsOf(t);
      const today = getTodayStr();
      const pick =
        [...list].reverse().find((p) => p.start <= today) ||
        list[list.length - 1];
      if (pick) periodNav.selectPeriod(pick);
    }
  };
  const reportTitle = customPeriod
    ? `${customPeriod.name} レポート`
    : `${monthLabel} 月間レポート`;
  const printName =
    effectiveRunnerId === "all"
      ? `${reportKind}_${reportKey}_全選手`
      : `${reportKind}_${reportKey}_${targets[0] ? `${targets[0].lastName}${targets[0].firstName}` : ""}`;

  return (
    <div className="space-y-4">
      {/* 操作バー（印刷時は非表示）。左: 種類 / 中央: 期間と「< >」 / 右: 印刷 */}
      <div
        className={
          topSlot
            ? "no-print bg-white rounded-[3rem] shadow-sm overflow-hidden"
            : "no-print bg-white px-4 py-3 rounded-2xl shadow-sm"
        }
      >
        {topSlot}
        <div
          className={
            topSlot ? "border-t border-slate-100 px-4 py-3 space-y-2" : "space-y-2"
          }
        >
        <div className="flex items-center gap-2">
          <div className="w-[4.75rem] flex-shrink-0">
            {periodNav && (
              <select
                value={reportType}
                onChange={(e) => onTypeChange(e.target.value)}
                aria-label="レポートの種類"
                className="w-full bg-slate-100 text-slate-700 font-black text-xs rounded-xl px-2 py-2.5 outline-none"
              >
                <option value="month">月間</option>
                <option value="year">年間</option>
                <option
                  value="training"
                  disabled={customsOf("training").length === 0}
                >
                  鍛錬期
                </option>
                <option value="camp" disabled={customsOf("camp").length === 0}>
                  合宿
                </option>
              </select>
            )}
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-center gap-1">
            {periodNav ? (
              <>
                <button
                  onClick={() =>
                    customPeriod
                      ? stepCustom(-1)
                      : yearPeriod
                        ? periodNav.stepYear(-1)
                        : periodNav.stepMonth(-1)
                  }
                  disabled={customPeriod ? customIdx <= 0 : false}
                  aria-label="前へ"
                  className="flex-shrink-0 p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="min-w-0 flex-1 text-center leading-tight">
                  <p className="text-[13px] font-black text-slate-700 break-all">
                    {customPeriod
                      ? customPeriod.name
                      : yearPeriod
                        ? yearPeriod.name
                        : `${month.split("-")[0]}年${Number(month.split("-")[1])}月`}
                  </p>
                  {customPeriod && (
                    <p className="text-[9px] font-bold text-slate-400">
                      {customPeriod.start.replace(/-/g, "/")}〜
                      {customPeriod.end.replace(/-/g, "/")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() =>
                    customPeriod
                      ? stepCustom(1)
                      : yearPeriod
                        ? periodNav.stepYear(1)
                        : periodNav.stepMonth(1)
                  }
                  disabled={
                    customPeriod
                      ? customIdx < 0 || customIdx >= sameKindCustoms.length - 1
                      : isCurrentOrFuture
                  }
                  aria-label="次へ"
                  className="flex-shrink-0 p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            ) : (
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500"
              />
            )}
          </div>
          <div className="w-[4.75rem] flex-shrink-0 flex justify-end">
            <button
              onClick={() => handlePrint(printName)}
              aria-label="印刷 / PDF保存"
              title="印刷 / PDF保存"
              className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md shadow-blue-200"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>
        {!lockedRunnerId && (
          <select
            value={runnerId}
            onChange={(e) => setRunnerId(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl px-2 py-2 outline-none focus:border-blue-500"
          >
            {allowAll && (
              <option value="all">全選手（一括 {bulkAthletes.length}名）</option>
            )}
            {athletes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.lastName} {r.firstName}
                {r.status === "retired" ? "（引退）" : ""}
              </option>
            ))}
          </select>
        )}
        </div>
      </div>

      {targets.length === 0 ? (
        <p className="text-center text-xs text-slate-400 font-bold py-8">
          対象の選手がいません
        </p>
      ) : (
        targets.map((runner, idx) =>
          yearPeriod ? (
            <YearlySheet
              key={runner.id}
              runner={runner}
              periodName={yearPeriod.name}
              isFirst={idx === 0}
              data={buildYearlyData(
                runner,
                allLogs,
                raceCards,
                tournaments,
                yearPeriod,
              )}
            />
          ) : (
          <ReportSheet
            key={runner.id}
            runner={runner}
            title={reportTitle}
            isFirst={idx === 0}
            data={buildMonthlyData(
              runner,
              allLogs,
              raceCards,
              tournaments,
              range,
            )}
          />
          ),
        )
      )}
    </div>
  );
};

export default MonthlyReportView;
