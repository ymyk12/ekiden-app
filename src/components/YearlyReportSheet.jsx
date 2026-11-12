/*
 * YearlyReportSheet — 選手別 年間（年度）レポートの集計と A4 1枚分の表示
 *
 * MonthlyReportView が、ヘッダーで「年度」の期間が選ばれているときに使う。
 * 月間レポートと同じ見た目（CSS バー・印刷対応）で、練習ログの一覧は載せず、
 * 年間のサマリー・ハイライト・月別走行距離・区分内訳・大会結果・コンディションをまとめる。
 */
import { Trophy } from "lucide-react";
import { CATEGORY } from "../utils/constants";
import { weekStart, sumBy, maxEntry, round1 } from "../utils/logStats";

const pad2 = (n) => String(n).padStart(2, "0");
const fmtLocal = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const rpeColor = (v) =>
  v >= 8 ? "bg-rose-400" : v >= 4 ? "bg-amber-400" : "bg-emerald-400";

const BADGE_COLOR = {
  自己ベスト: "bg-orange-500",
  組1位: "bg-blue-500",
  学校記録: "bg-rose-500",
};

const inRange = (date, start, end) => !!date && date >= start && date <= end;

// 期間の開始・終了から、1年前の同じ範囲を返す
const shiftYear = (ds, delta) => `${Number(ds.slice(0, 4)) + delta}${ds.slice(4)}`;

const eventKey = (card) =>
  card.distance === "その他"
    ? card.ekidenDistance || "その他"
    : card.distance || card.ekidenDistance || "";

// 1人分の年間データを集計する
export const buildYearlyData = (runner, allLogs, raceCards, tournaments, period) => {
  const { start, end } = period;
  const mine = (allLogs || []).filter((l) => l.runnerId === runner.id && l.date);
  const logs = mine.filter((l) => inRange(l.date, start, end));
  const isRest = (l) => l.category === CATEGORY.REST;
  const train = logs.filter((l) => !isRest(l));

  const totalKm = round1(logs.reduce((s, l) => s + (Number(l.distance) || 0), 0));
  const trainDates = new Set(train.map((l) => l.date));
  const trainDays = trainDates.size;
  const restDays = new Set(logs.filter(isRest).map((l) => l.date)).size;

  const rpeLogs = train.filter((l) => Number(l.rpe) > 0);
  const avgRpe = rpeLogs.length
    ? round1(rpeLogs.reduce((s, l) => s + Number(l.rpe), 0) / rpeLogs.length)
    : null;
  const painDays = new Set(
    logs.filter((l) => Number(l.pain) >= 3).map((l) => l.date),
  ).size;

  // 前年度（同じ範囲を1年前にずらす）
  const prevLogs = mine.filter((l) =>
    inRange(l.date, shiftYear(start, -1), shiftYear(end, -1)),
  );
  const prevKm = round1(
    prevLogs.reduce((s, l) => s + (Number(l.distance) || 0), 0),
  );
  const hasPrev = prevLogs.length > 0;

  // 月別（期間の開始月から12か月）
  const sy = Number(start.slice(0, 4));
  const sm = Number(start.slice(5, 7));
  const months = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(sy, sm - 1 + i, 1);
    const ym = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
    const mLogs = logs.filter((l) => l.date.startsWith(`${ym}-`));
    const mTrain = mLogs.filter((l) => !isRest(l) && Number(l.rpe) > 0);
    months.push({
      ym,
      label: `${d.getMonth() + 1}月`,
      km: round1(mLogs.reduce((s, l) => s + (Number(l.distance) || 0), 0)),
      rpe: mTrain.length
        ? round1(mTrain.reduce((s, l) => s + Number(l.rpe), 0) / mTrain.length)
        : 0,
      painDays: new Set(
        mLogs.filter((l) => Number(l.pain) >= 3).map((l) => l.date),
      ).size,
    });
  }

  // ハイライト
  const bestDayEntry = maxEntry(sumBy(logs, (l) => l.date));
  const bestWeekEntry = maxEntry(sumBy(logs, (l) => weekStart(l.date)));
  const bestMonth = months.reduce(
    (a, b) => (b.km > (a?.km ?? 0) ? b : a),
    null,
  );
  let maxStreak = 0;
  let streak = 0;
  let prev = null;
  [...trainDates].sort().forEach((ds) => {
    if (prev) {
      const diff = Math.round((new Date(ds) - new Date(prev)) / 86400000);
      streak = diff === 1 ? streak + 1 : 1;
    } else streak = 1;
    if (streak > maxStreak) maxStreak = streak;
    prev = ds;
  });

  // 区分内訳（完全休養を除く）
  const catMap = {};
  train.forEach((l) => {
    const c = l.category || "その他";
    if (!catMap[c]) catMap[c] = { km: 0, days: new Set() };
    catMap[c].km += Number(l.distance) || 0;
    catMap[c].days.add(l.date);
  });
  const catOrder = Object.values(CATEGORY);
  const categories = Object.entries(catMap)
    .map(([name, v]) => ({ name, km: round1(v.km), days: v.days.size }))
    .sort((a, b) => {
      const ia = catOrder.indexOf(a.name);
      const ib = catOrder.indexOf(b.name);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  // 大会結果（年度内のすべて）。バッジは監督が大会カードに付けた公式のものをそのまま出す
  const races = (raceCards || [])
    // 削除された大会のカード（大会が存在しないもの）は載せない
    .filter(
      (c) =>
        c.runnerId === runner.id &&
        inRange(c.date, start, end) &&
        (tournaments || []).some((t) => t.id === c.tournamentId),
    )
    .map((c) => ({
      date: c.date,
      name: (tournaments || []).find((t) => t.id === c.tournamentId)?.name || "大会",
      distKey: eventKey(c),
      resultTime: c.resultTime || "",
      badges: c.badges || [],
    }))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const pbCount = races.filter((r) => r.badges.includes("自己ベスト")).length;

  return {
    totalKm,
    trainDays,
    restDays,
    avgRpe,
    painDays,
    prevKm,
    hasPrev,
    months,
    bestDay: bestDayEntry && { date: bestDayEntry.key, km: round1(bestDayEntry.value) },
    bestWeek: bestWeekEntry && { start: bestWeekEntry.key, km: round1(bestWeekEntry.value) },
    bestMonth: bestMonth && bestMonth.km > 0 ? bestMonth : null,
    maxStreak,
    categories,
    races,
    pbCount,
  };
};

const Tile = ({ label, children, sub, span }) => (
  <div
    className={`border border-slate-200 rounded-xl p-2.5 print:p-1 text-center ${span ? "col-span-2 md:col-span-1 print:col-span-1" : ""}`}
  >
    <p className="text-[9px] font-black text-slate-400 uppercase">{label}</p>
    {children}
    {sub}
  </div>
);

const Unit = ({ children }) => (
  <span className="text-[10px] text-slate-400 font-bold">{children}</span>
);

// A4 1枚分の年間レポート
export const YearlySheet = ({ runner, data, periodName, isFirst }) => {
  const d = data;
  const diff = round1(d.totalKm - d.prevKm);
  const monthsWithKm = d.months.filter((m) => m.km > 0).length;
  const avgMonthly = monthsWithKm ? round1(d.totalKm / monthsWithKm) : 0;
  const maxMonthKm = Math.max(...d.months.map((m) => m.km), 1);
  const maxCatKm = Math.max(...d.categories.map((c) => c.km), 1);

  return (
    <div
      className={`bg-white rounded-[2rem] print:rounded-none shadow-sm print:shadow-none p-6 print:p-0 space-y-4 print:space-y-3 ${isFirst ? "" : "page-break"}`}
    >
      <div className="flex items-end justify-between gap-2 border-b-2 border-slate-800 pb-2 print:pb-1">
        <div>
          <p className="text-[10px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest">
            Yearly Training Report
          </p>
          <h2 className="text-xl max-sm:text-base print:text-base font-black text-slate-800 whitespace-nowrap">
            {periodName} 年間レポート
          </h2>
        </div>
        <p className="text-lg max-sm:text-sm print:text-base font-black text-slate-800 whitespace-nowrap flex-shrink-0">
          {runner.lastName} {runner.firstName}
        </p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-5 print:grid-cols-5 gap-2">
        <Tile label="年間走行距離" span>
          <p className="text-xl font-black text-blue-600 leading-tight">
            {d.totalKm}
            <Unit>km</Unit>
          </p>
          <p className="text-[9px] font-bold text-slate-500">
            月平均 {avgMonthly}km
          </p>
        </Tile>
        <Tile
          label="前年度比"
          sub={
            <p className="text-[9px] font-bold text-slate-400">
              {d.hasPrev ? `前年度 ${d.prevKm}km` : "前年度の記録なし"}
            </p>
          }
        >
          <p
            className={`text-lg font-black leading-tight ${!d.hasPrev ? "text-slate-300" : diff >= 0 ? "text-emerald-600" : "text-rose-500"}`}
          >
            {d.hasPrev ? `${diff >= 0 ? "+" : ""}${diff}` : "—"}
            {d.hasPrev && <Unit>km</Unit>}
          </p>
        </Tile>
        <Tile label="練習 / 休養">
          <p className="text-lg font-black text-slate-700 leading-tight">
            {d.trainDays}
            <Unit>日</Unit>
            <span className="text-slate-300 mx-0.5">/</span>
            {d.restDays}
            <Unit>日</Unit>
          </p>
        </Tile>
        <Tile label="平均RPE">
          <p className="text-lg font-black text-slate-700 leading-tight">
            {d.avgRpe ?? "—"}
          </p>
        </Tile>
        <Tile label="Pain3以上">
          <p
            className={`text-lg font-black leading-tight ${d.painDays > 0 ? "text-rose-500" : "text-slate-700"}`}
          >
            {d.painDays}
            <Unit>日</Unit>
          </p>
        </Tile>
      </div>

      {/* ハイライト */}
      <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-3 print:p-2">
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">
          年間のハイライト
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400">最長走行日</p>
            <p className="text-base print:text-sm font-black text-slate-700 leading-tight">
              {d.bestDay ? <>{d.bestDay.km}<Unit>km</Unit></> : "—"}
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
              {d.bestWeek ? <>{d.bestWeek.km}<Unit>km</Unit></> : "—"}
            </p>
            {d.bestWeek && (
              <p className="text-[9px] font-bold text-slate-400">
                {d.bestWeek.start.slice(5).replace("-", "/")}〜の週
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400">最多月</p>
            <p className="text-base print:text-sm font-black text-slate-700 leading-tight">
              {d.bestMonth ? <>{d.bestMonth.km}<Unit>km</Unit></> : "—"}
            </p>
            {d.bestMonth && (
              <p className="text-[9px] font-bold text-slate-400">
                {d.bestMonth.label}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black text-slate-400">連続練習</p>
            <p className="text-base print:text-sm font-black text-slate-700 leading-tight">
              {d.maxStreak}
              <Unit>日</Unit>
            </p>
          </div>
        </div>
      </div>

      {/* 月別走行距離 */}
      <div className="border border-slate-200 rounded-xl p-3 print:p-2">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
          月別走行距離
        </p>
        <div className="relative">
          <div className="flex items-end gap-1.5 h-24 print:h-20">
            {d.months.map((m) => (
              <div
                key={m.ym}
                className="flex-1 flex flex-col items-center justify-end h-full"
              >
                <span className="text-[9px] font-black leading-none mb-0.5 text-slate-500">
                  {m.km > 0 ? Math.round(m.km) : ""}
                </span>
                <div
                  className="w-full max-w-[2.5rem] rounded-t bg-blue-500"
                  style={{
                    height: `${Math.max((m.km / maxMonthKm) * 85, m.km > 0 ? 3 : 0)}%`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {d.months.map((m) => (
              <span
                key={m.ym}
                className="flex-1 text-center text-[8px] font-bold text-slate-400 leading-none"
              >
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 区分内訳 + コンディション */}
      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-4 print:gap-3">
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
                  <span className="text-[10px] font-black text-slate-700 w-24 text-right">
                    {c.km}km・{c.days}日
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border border-slate-200 rounded-xl p-3 print:p-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            月別コンディション（平均RPE）
            <span className="ml-2 normal-case tracking-normal text-rose-400 font-bold">
              ●=Pain3以上の日数
            </span>
          </p>
          <div className="flex items-end gap-1.5 h-16 print:h-14">
            {d.months.map((m) => (
              <div
                key={m.ym}
                className="flex-1 h-full flex flex-col items-center justify-end"
              >
                {m.painDays > 0 && (
                  <span className="text-[8px] font-black text-rose-500 leading-none mb-0.5">
                    ●{m.painDays}
                  </span>
                )}
                {m.rpe > 0 && (
                  <div
                    className={`w-full max-w-[2rem] rounded-t-sm ${rpeColor(m.rpe)}`}
                    style={{ height: `${m.rpe * 8}%` }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 mt-1">
            {d.months.map((m) => (
              <span
                key={m.ym}
                className="flex-1 text-center text-[8px] font-bold text-slate-400 leading-none"
              >
                {m.label.replace("月", "")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 大会結果（年度内すべて） */}
      <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-3">
        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <Trophy size={11} /> 年間の大会結果
          {d.pbCount > 0 && (
            <span className="ml-2 normal-case tracking-normal text-orange-500 font-bold">
              自己ベスト更新 {d.pbCount}回
            </span>
          )}
        </p>
        {d.races.length === 0 ? (
          <p className="text-[10px] text-slate-400 font-bold">この年度の大会記録はありません</p>
        ) : (
          <div className="space-y-2 print:space-y-1">
            {d.races.map((r, i) => (
              <div key={i} className="text-[11px] print:text-[10px] font-bold text-slate-700">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-slate-500 flex-shrink-0">
                    {r.date?.slice(5).replace("-", "/")}
                  </span>
                  <span className="min-w-0">{r.name}</span>
                </div>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5">
                  <span className="text-slate-600">{r.distKey}</span>
                  <span className="font-black text-slate-800">
                    {r.resultTime || "—"}
                  </span>
                  {r.badges.map((badge) => (
                    <span
                      key={badge}
                      className={`text-[9px] font-black text-white px-1.5 py-0.5 rounded ${BADGE_COLOR[badge] || "bg-emerald-500"}`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[8px] text-slate-400 text-right">
        KCTF Ekiden Team — Generated {fmtLocal(new Date())}
      </p>
    </div>
  );
};
