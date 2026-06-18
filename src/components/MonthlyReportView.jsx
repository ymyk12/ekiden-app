/*
 * MonthlyReportView — 選手別 月間レポート（A4印刷 → PDF配布用）
 *
 * 監督が「月 × 選手（または全員一括）」を選ぶと、月間走行距離・練習日数・
 * 週別推移・区分内訳・大会結果・日々の練習ログをA4 1枚に自動集計する。
 * 印刷ボタン → ブラウザの「PDFに保存」で選手に配布できる。
 * 全員一括モードでは print.css の .page-break により1人1ページで改ページ。
 * グラフは印刷の確実性を優先して recharts ではなく CSS バーで描画する。
 */
import { useState } from "react";
import { Printer, FileText, Trophy } from "lucide-react";
import { ROLES, CATEGORY } from "../utils/constants";
import { getGoalValue } from "../utils/dateUtils";

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

// 1人分の月間データを集計する
const buildMonthlyData = (runner, allLogs, raceCards, tournaments, month) => {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const prefix = `${month}-`;

  const logs = (allLogs || [])
    .filter((l) => l.runnerId === runner.id && (l.date || "").startsWith(prefix))
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
  if (todayStr >= lastStr) elapsedDays = last.getDate();
  else if (todayStr < firstStr) elapsedDays = 0;
  else elapsedDays = Number(todayStr.slice(8, 10));
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

  // 前月合計（前月比表示用）
  const pd = new Date(y, m - 2, 1);
  const prevPrefix = `${pd.getFullYear()}-${pad2(pd.getMonth() + 1)}-`;
  const prevKm =
    Math.round(
      (allLogs || [])
        .filter(
          (l) => l.runnerId === runner.id && (l.date || "").startsWith(prevPrefix),
        )
        .reduce((s, l) => s + (Number(l.distance) || 0), 0) * 10,
    ) / 10;

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
    .filter((c) => (c.date || "").startsWith(prefix))
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
  for (let day = 1; day <= last.getDate(); day++) {
    const ds = `${month}-${pad2(day)}`;
    const dayLogs = logs.filter((l) => l.date === ds);
    const train = dayLogs.filter((l) => l.category !== CATEGORY.REST);
    daily.push({
      day,
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
  for (let day = 1; day <= last.getDate(); day++) {
    const ds = `${month}-${pad2(day)}`;
    ts = trainDates.has(ds) ? ts + 1 : 0;
    if (ts > maxTrainStreak) maxTrainStreak = ts;
  }
  const selfDays = new Set(
    logs.filter((l) => l.category === CATEGORY.SELF).map((l) => l.date),
  ).size;

  // 月間距離の推移（当月含む直近6ヶ月）
  const trend = [];
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

  const goal = getGoalValue(runner, "any", "month", "goalPeriod") || 0;
  const goalRate = goal > 0 ? Math.round((totalKm / goal) * 100) : null;

  return {
    logs,
    totalKm,
    trainDays,
    restDays,
    missingDays,
    avgRpe,
    painDays,
    prevKm,
    weeks,
    categories,
    races,
    goal,
    goalRate,
    trend,
    daily,
    bestDay,
    bestWeek,
    maxTrainStreak,
    selfDays,
  };
};

// A4 1枚分のレポート本体
const ReportSheet = ({ runner, data, monthLabel, isFirst }) => {
  const d = data;
  const diff = Math.round((d.totalKm - d.prevKm) * 10) / 10;
  const maxWeekKm = Math.max(...d.weeks.map((w) => w.km), 1);
  const maxCatKm = Math.max(...d.categories.map((c) => c.km), 1);
  const maxTrendKm = Math.max(...d.trend.map((t) => t.km), 1);

  return (
    <div
      className={`bg-white rounded-[2rem] print:rounded-none shadow-sm print:shadow-none p-6 print:p-0 space-y-4 print:space-y-3 ${isFirst ? "" : "page-break"}`}
    >
      {/* ヘッダー */}
      <div className="flex items-end justify-between border-b-2 border-slate-800 pb-2 print:pb-1">
        <div>
          <p className="text-[10px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest">
            Monthly Training Report
          </p>
          <h2 className="text-xl print:text-base font-black text-slate-800">
            {monthLabel} 月間レポート
          </h2>
        </div>
        <p className="text-lg print:text-base font-black text-slate-800">
          {runner.lastName} {runner.firstName}
        </p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-5 print:grid-cols-5 gap-2">
        <div className="border border-slate-200 rounded-xl p-2.5 print:p-1 text-center col-span-2 md:col-span-1 print:col-span-1">
          <p className="text-[9px] font-black text-slate-400 uppercase">
            月間走行距離
          </p>
          <p className="text-xl font-black text-blue-600 leading-tight">
            {d.totalKm}
            <span className="text-[10px] text-slate-400 font-bold">km</span>
          </p>
          {d.goal > 0 && (
            <p className="text-[9px] font-bold text-slate-500">
              目標 {d.goal}km（{d.goalRate}%）
            </p>
          )}
        </div>
        <div className="border border-slate-200 rounded-xl p-2.5 print:p-1 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase">前月比</p>
          <p
            className={`text-lg font-black leading-tight ${diff >= 0 ? "text-emerald-600" : "text-rose-500"}`}
          >
            {diff >= 0 ? "+" : ""}
            {diff}
            <span className="text-[10px] text-slate-400 font-bold">km</span>
          </p>
          <p className="text-[9px] font-bold text-slate-400">前月 {d.prevKm}km</p>
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
          今月のハイライト
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

      {/* 週別距離 + 区分内訳 */}
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

      {/* 大会結果（当月分があるときのみ） */}
      {d.races.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            <Trophy size={11} /> 今月の大会結果
          </p>
          <div className="space-y-1">
            {d.races.map((r, i) => (
              <p key={i} className="text-[11px] font-bold text-slate-700">
                {r.date?.slice(5).replace("-", "/")} {r.name}　{r.distKey}{" "}
                <span className="font-black">{r.resultTime || "—"}</span>
                {r.badges.map((badge) => (
                  <span
                    key={badge}
                    className={`ml-1 text-[9px] font-black text-white px-1.5 py-0.5 rounded ${badge === "自己ベスト" ? "bg-orange-500" : badge === "組1位" ? "bg-blue-500" : "bg-emerald-500"}`}
                  >
                    {badge}
                  </span>
                ))}
              </p>
            ))}
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
            この月の記録はありません
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
            <span>1日</span>
            <span>10日</span>
            <span>20日</span>
            <span>{d.daily.length}日</span>
          </div>
        </div>
        <div className="border border-slate-200 rounded-xl p-3 print:p-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            月間走行距離の推移（直近6ヶ月）
          </p>
          <div className="flex items-end gap-2 h-16 print:h-14">
          {d.trend.map((t) => (
            <div
              key={t.label}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <span
                className={`text-[9px] font-black leading-none mb-0.5 ${t.isCurrent ? "text-blue-600" : "text-slate-500"}`}
              >
                {t.km}
              </span>
              <div
                className={`w-full max-w-[3.5rem] rounded-t ${t.isCurrent ? "bg-blue-500" : "bg-slate-300"}`}
                style={{
                  height: `${Math.max((t.km / maxTrendKm) * 100, t.km > 0 ? 4 : 0)}%`,
                }}
              />
              <span
                className={`text-[8px] font-bold mt-0.5 leading-none ${t.isCurrent ? "text-blue-600" : "text-slate-400"}`}
              >
                {t.label}
              </span>
            </div>
          ))}
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
}) => {
  // 既定は「先月」（月初に前月分を配る運用を想定）
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });
  const [runnerId, setRunnerId] = useState("all");

  const athletes = (activeRunners || []).filter(
    (r) => r.role !== ROLES.MANAGER,
  );
  const targets =
    runnerId === "all" ? athletes : athletes.filter((r) => r.id === runnerId);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${y}年${m}月`;

  const printName =
    runnerId === "all"
      ? `月間レポート_${month}_全選手`
      : `月間レポート_${month}_${targets[0] ? `${targets[0].lastName}${targets[0].firstName}` : ""}`;

  return (
    <div className="space-y-4">
      {/* 操作バー（印刷時は非表示） */}
      <div className="no-print bg-white p-4 rounded-[2rem] shadow-sm flex flex-wrap items-center gap-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <FileText size={14} /> Monthly Report
        </p>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500"
        />
        <select
          value={runnerId}
          onChange={(e) => setRunnerId(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl px-3 py-2 outline-none focus:border-blue-500"
        >
          <option value="all">全選手（一括 {athletes.length}名）</option>
          {athletes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.lastName} {r.firstName}
            </option>
          ))}
        </select>
        <button
          onClick={() => handlePrint(printName)}
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-black text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-md shadow-blue-200"
        >
          <Printer size={16} /> 印刷 / PDF保存
        </button>
      </div>

      {targets.length === 0 ? (
        <p className="text-center text-xs text-slate-400 font-bold py-8">
          対象の選手がいません
        </p>
      ) : (
        targets.map((runner, idx) => (
          <ReportSheet
            key={runner.id}
            runner={runner}
            monthLabel={monthLabel}
            isFirst={idx === 0}
            data={buildMonthlyData(
              runner,
              allLogs,
              raceCards,
              tournaments,
              month,
            )}
          />
        ))
      )}
    </div>
  );
};

export default MonthlyReportView;
