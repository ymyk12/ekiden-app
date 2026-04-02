// src/components/CoachReportView.jsx
import React, { useState } from "react";
import { Printer, FileText, Users, BarChart2 } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  BarChart,
  Bar,
  LabelList,
} from "recharts";

import { ROLES } from "../utils/constants";
import { getGoalValue } from "../utils/dateUtils";
// 印刷用フックのインポート
import { usePrint } from "../hooks/usePrint";

// グラフ用のカラーパレット
const COLORS = [
  "#2563eb",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#6366f1",
  "#14b8a6",
];

const CoachReportView = ({
  handleExportMatrixCSV,
  printStyles,
  activeRunners,
  targetPeriod,
  reportMatrix,
  monthlyTrendData,
  cumulativeData,
  reportChartData,
}) => {
  // カスタムフックから handlePrint 機能を引き出す
  const { handlePrint } = usePrint();
  // 今マウスが乗っている人のIDを記憶する「箱」
  const [hoveredLine, setHoveredLine] = useState(null);
  // ▼▼ マネージャーを除外した選手のみのリストを作成 ▼▼
  const runnersOnly = activeRunners.filter((r) => r.role !== ROLES.MANAGER);

  // 🌟 新機能：年次レポートの場合のみ、日々のデータを「月ごと」に圧縮する変換装置！
  let displayMatrix = reportMatrix.matrix;
  if (targetPeriod?.type === "year") {
    const monthlyMap = {};

    reportMatrix.matrix.forEach((row) => {
      const yyyymm = row.date.substring(0, 7); // "2026-04-15" から "2026-04" を切り出す

      if (!monthlyMap[yyyymm]) {
        monthlyMap[yyyymm] = { date: yyyymm };
        runnersOnly.forEach((r) => (monthlyMap[yyyymm][r.id] = 0)); // 全員の初期値を0に
      }

      runnersOnly.forEach((r) => {
        const val = row[r.id];
        // "未"や"休"の文字は無視し、数字が入っている場合のみ足し算する
        if (val !== "未" && val !== "休" && !isNaN(parseFloat(val))) {
          monthlyMap[yyyymm][r.id] += parseFloat(val);
        }
      });
    });

    // 圧縮したデータを配列に戻し、日付順に並べ替え、端数（小数点）を綺麗に整える
    displayMatrix = Object.values(monthlyMap)
      .map((row) => {
        const newRow = { date: row.date };
        runnersOnly.forEach((r) => {
          const total = row[r.id];
          newRow[r.id] = total > 0 ? Math.round(total * 10) / 10 : "0";
        });
        return newRow;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // 🌟🌟🌟 ここからグラフ用データの準備 🌟🌟🌟
  const isYearly = targetPeriod?.type === "year";

  // 1. 選手の総合距離を計算し、降順にソートする（凡例の順番と色を固定するため）
  const sortedRunners = runnersOnly
    .map((r) => ({
      ...r,
      finalDist: parseFloat(reportMatrix.totals[r.id]) || 0,
    }))
    .sort((a, b) => {
      if (b.finalDist !== a.finalDist) return b.finalDist - a.finalDist;
      return (a.memberCode || a.id).localeCompare(b.memberCode || b.id);
    });

  const isMonth = targetPeriod?.type === "month"; // 🌟 月次判定を追加！

  // 2. グラフ共通の文字フォーマッター（年次・月次なら「4月」）
  const formatAxisLabel = (val) => {
    if ((isYearly || isMonth) && val.length === 7)
      return `${parseInt(val.slice(5), 10)}月`;
    return val.length > 5 ? val.slice(5).replace("-", "/") : val;
  };

  // 3. Rechartsに邪魔されない、完全オリジナルのカスタム凡例コンポーネント
  const renderCustomLegend = () => (
    <ul
      style={{
        listStyle: "none",
        paddingLeft: 10,
        margin: 0,
        fontSize: "10px",
        fontWeight: "bold",
      }}
    >
      {sortedRunners.map((r, i) => (
        <li
          key={r.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
            marginBottom: "4px",
            cursor: "pointer",
          }}
          onMouseEnter={() => setHoveredLine(r.id)}
          onMouseLeave={() => setHoveredLine(null)}
        >
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              backgroundColor: COLORS[i % COLORS.length],
              marginTop: "1px",
              flexShrink: 0,
            }}
          ></span>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: COLORS[i % COLORS.length],
              lineHeight: "1",
            }}
          >
            <span>
              {r.lastName} {r.firstName}
            </span>
            <span style={{ fontSize: "10px", opacity: 0.9 }}>
              {r.finalDist} km
            </span>
          </div>
        </li>
      ))}
    </ul>
  );

  // 4. ① トレンドグラフ（区間ごとの推移）用データ
  let chartDataTrends = [];
  let trendsTitle = "";

  if (isYearly) {
    chartDataTrends = displayMatrix;
    trendsTitle = "Monthly Distance Trends (Yearly)";
  } else if (isMonth) {
    // 🌟 親(App.js)で全データから計算してくれた過去12ヶ月分のデータをそのまま使う！
    chartDataTrends = monthlyTrendData || [];
    trendsTitle = "Past 12 Months Trends";
  } else {
    // 指定期間などは日々のデータ
    chartDataTrends = reportMatrix.matrix.map((row) => {
      const newRow = { date: row.date };
      runnersOnly.forEach((r) => {
        const val = parseFloat(row[r.id]);
        newRow[r.id] = isNaN(val) ? 0 : val;
      });
      return newRow;
    });
    trendsTitle = "Daily Distance Trends";
  }

  // 5. ② 累積グラフ用データ
  // 年次なら月別データから累積を作成、それ以外ならPropsのcumulativeDataをそのまま使う
  let chartDataCumulative = cumulativeData;
  if (isYearly) {
    const currentTotals = {};
    runnersOnly.forEach((r) => (currentTotals[r.id] = 0));
    chartDataCumulative = displayMatrix.map((row) => {
      const newRow = { date: row.date };
      runnersOnly.forEach((r) => {
        currentTotals[r.id] += parseFloat(row[r.id]) || 0;
        newRow[r.id] = Math.round(currentTotals[r.id] * 10) / 10;
      });
      return newRow;
    });
  }

  // 6. Y軸の目盛り(ticks)を自動計算する便利関数
  const calculateTicks = (data) => {
    let maxVal = 0;
    data.forEach((row) => {
      runnersOnly.forEach((r) => {
        const val = parseFloat(row[r.id]) || 0;
        if (val > maxVal) maxVal = val;
      });
    });
    // 最大値に合わせて刻み幅を自動調整
    let step = 10;
    if (maxVal > 1000) step = 200;
    else if (maxVal > 500) step = 100;
    else if (maxVal > 100) step = 50;
    else if (maxVal > 50) step = 20;

    const limit = Math.ceil(maxVal / step) * step;
    const ticks = [];
    for (let i = 0; i <= limit; i += step) ticks.push(i);
    return ticks;
  };

  const cumulativeTicks = calculateTicks(chartDataCumulative);
  const trendsTicks = calculateTicks(chartDataTrends);

  // 🌟🌟🌟 ここから「MVPランキングボード」用のデータ計算 🌟🌟🌟
  // ① 期間タイプの判定
  const isCustom = targetPeriod?.type === "custom";

  // ② ランキング用の空の箱（配列）を用意しておく
  let topTotal = [],
    topDaily = [],
    topActive = [],
    topExtra = [];

  // ③ 指定期間(custom)の時だけ、重い計算を実行する！（プロの書き方）
  if (isCustom) {
    const rankingData = runnersOnly.map((r) => {
      let maxDaily = 0;
      let activeDays = 0;
      let extraDays = 0; // 自主練ポイント（チームの休日に走った日数）

      // 毎日のデータをチェック
      reportMatrix.matrix.forEach((row) => {
        const val = parseFloat(row[r.id]);
        const isValidRun = !isNaN(val) && val > 0;

        // 日間最長距離と稼働日数の更新
        if (isValidRun && val > maxDaily) maxDaily = val;
        if (isValidRun) activeDays++;

        // 自主練ポイントの判定：チームの半分以上が休んでいる日を「オフ日」とする
        let teamActiveCount = 0;
        runnersOnly.forEach((other) => {
          const oVal = parseFloat(row[other.id]);
          if (!isNaN(oVal) && oVal > 0) teamActiveCount++;
        });
        const isTeamRestDay = teamActiveCount < runnersOnly.length / 2;

        // オフ日なのに走っている場合、自主練ポイントを加算！
        if (isValidRun && isTeamRestDay) extraDays++;
      });

      return {
        ...r,
        totalDist: parseFloat(reportMatrix.totals[r.id]) || 0,
        maxDaily,
        activeDays,
        extraDays,
      };
    });

    // ④ 各部門のトップ5を抽出（同点の場合はID順で綺麗に並べる）
    topTotal = [...rankingData]
      .sort((a, b) =>
        b.totalDist !== a.totalDist
          ? b.totalDist - a.totalDist
          : a.id.localeCompare(b.id),
      )
      .slice(0, 5);
    topDaily = [...rankingData]
      .sort((a, b) =>
        b.maxDaily !== a.maxDaily
          ? b.maxDaily - a.maxDaily
          : a.id.localeCompare(b.id),
      )
      .slice(0, 5);
    topActive = [...rankingData]
      .sort((a, b) =>
        b.activeDays !== a.activeDays
          ? b.activeDays - a.activeDays
          : a.id.localeCompare(b.id),
      )
      .slice(0, 5);
    topExtra = [...rankingData]
      .sort((a, b) =>
        b.extraDays !== a.extraDays
          ? b.extraDays - a.extraDays
          : a.id.localeCompare(b.id),
      )
      .slice(0, 5);
  }
  // 🌟🌟🌟 ランキングデータ計算ここまで 🌟🌟🌟

  return (
    <div className="animate-in fade-in">
      <div className="flex flex-wrap justify-end items-center mb-6 gap-3 px-2 no-print">
        {/* ... */}
        <button
          onClick={() => {
            let fileName = "KSWC-TF_距離計測";
            if (targetPeriod?.type === "month") {
              const rawId = targetPeriod.id || "";
              const match = rawId.match(/(\d{4})\D*(\d{1,2})/);
              if (match) {
                const year = match[1];
                const month = match[2].padStart(2, "0");
                fileName = `${year}${month}_KSWC-TF_距離計測`;
              } else {
                fileName = `${rawId}_KSWC-TF_距離計測`;
              }
            } else {
              fileName = `${targetPeriod?.name || "指定期間"}_KSWC-TF_距離計測`;
            }

            console.log("✅ 生成したファイル名:", fileName);
            handlePrint(fileName);
          }}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-700 transition-colors shadow-md flex items-center gap-2 font-bold text-xs"
        >
          <Printer size={16} /> 印刷 / PDF
        </button>
      </div>

      <div>
        <style>{printStyles}</style>

        {/* レポート本編 */}
        <div id="printable-report">
          {/* 1. 学年ごとのテーブルエリア */}
          {(() => {
            const entranceYears = [
              ...new Set(
                activeRunners.map((r) =>
                  (r.memberCode || r.id).substring(0, 2),
                ),
              ),
            ].sort();

            return entranceYears.map((year, index) => {
              const groupRunners = activeRunners
                .filter((r) => (r.memberCode || r.id).startsWith(year))
                .filter((r) => r.role !== ROLES.MANAGER)
                .sort((a, b) =>
                  (a.memberCode || a.id).localeCompare(b.memberCode || b.id),
                );

              if (groupRunners.length === 0) return null;

              const wrapperClass = index === 0 ? "mb-8" : "page-break mb-8";

              return (
                <div key={year} className={wrapperClass}>
                  <div className="report-card-base">
                    <div className="pb-4 mb-4 border-b-2 border-slate-100 print:border-slate-800">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                        <div>
                          <h2 className="font-black text-lg md:text-xl text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                            <FileText
                              className="text-blue-600 print:text-black"
                              size={20}
                            />
                            KSWC EKIDEN REPORT
                          </h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-slate-600 mt-1">
                            Target Period: {targetPeriod.name} (
                            {targetPeriod.start} - {targetPeriod.end})
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black border border-slate-200 print:border-slate-400 print:bg-white print:text-black inline-block">
                            <Users className="inline mr-1 -mt-0.5" size={12} />
                            {year}年度生 (Grade {year})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* テーブル部分（プレビュー用の条件分岐がなくなりスッキリ！） */}
                    <div className="pb-4 print:overflow-visible w-full overflow-x-auto no-scrollbar">
                      <table className="w-full text-xs border-collapse min-w-max">
                        <thead>
                          <tr>
                            <th className="p-3 border-b-2 border-slate-100 font-black text-left text-slate-400 min-w-[100px] sticky left-0 bg-white">
                              DATE
                            </th>
                            {groupRunners.map((r) => (
                              <th
                                key={r.id}
                                className="p-3 border-b-2 border-slate-100 font-bold text-slate-800 min-w-[80px] whitespace-nowrap text-center bg-slate-50/50"
                              >
                                {r.lastName} {r.firstName.charAt(0)}.
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* 🌟 修正: reportMatrix.matrix ではなく、さっき作った displayMatrix を使う！ */}
                          {displayMatrix.map((row) => (
                            <tr
                              key={row.date}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="p-3 border-b border-slate-100 font-bold text-slate-500 whitespace-nowrap sticky left-0 bg-white">
                                {/* 🌟 修正: 年次レポートの時は「2026-04」を「4月」に変換して表示 */}
                                {targetPeriod?.type === "year"
                                  ? `${parseInt(row.date.slice(5), 10)}月`
                                  : row.date.slice(5).replace("-", "/")}
                              </td>
                              {groupRunners.map((r) => {
                                const val = row[r.id];
                                let cellClass =
                                  "p-2 border-b border-slate-100 text-center font-bold text-sm ";
                                if (val === "未")
                                  cellClass += "text-rose-400 bg-rose-50/30";
                                else if (val === "休")
                                  cellClass +=
                                    "text-emerald-500 bg-emerald-50/30";
                                else if (val === "0")
                                  cellClass += "text-slate-300";
                                else cellClass += "text-blue-600";
                                return (
                                  <td key={r.id} className={cellClass}>
                                    {val}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}

                          {targetPeriod.type === "custom" &&
                            reportMatrix.qTotals.map((row, i) => (
                              <tr
                                key={`qtotal-${i}`}
                                className="bg-slate-50 font-bold text-slate-600"
                              >
                                <td
                                  className="p-3 border-b border-slate-200 sticky left-0 bg-slate-50 whitespace-nowrap"
                                  style={{ minWidth: "80px" }}
                                >
                                  Q{i + 1} Total
                                </td>
                                {groupRunners.map((r) => {
                                  const goalKey = `goalQ${i + 1}`;
                                  const goal = getGoalValue(
                                    r,
                                    targetPeriod.id,
                                    targetPeriod.type,
                                    goalKey,
                                  );
                                  return (
                                    <td
                                      key={r.id}
                                      className="p-3 text-center border-b border-slate-200"
                                    >
                                      <span style={{ fontSize: "1em" }}>
                                        {row[r.id] || 0}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: "0.8em",
                                          color: "#94a3b8",
                                        }}
                                      >
                                        {" "}
                                        / {goal}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}

                          <tr className="bg-slate-100 font-black text-slate-900 print:bg-slate-50">
                            <td className="p-3 sticky left-0 bg-slate-100 print:bg-slate-50 border-t-2 border-slate-300 text-[10px]">
                              TOTAL
                            </td>
                            {groupRunners.map((r) => (
                              <td
                                key={r.id}
                                className="p-3 text-center border-t-2 border-slate-300"
                              >
                                <div className="flex flex-col items-center">
                                  <span
                                    className="text-blue-800 text-base font-black leading-none mb-1"
                                    style={{ fontSize: "2.0em" }}
                                  >
                                    {reportMatrix.totals[r.id] || 0}
                                  </span>
                                  <span
                                    className="text-slate-400 font-bold"
                                    style={{ fontSize: "0.7em" }}
                                  >
                                    /{" "}
                                    {getGoalValue(
                                      r,
                                      targetPeriod.id,
                                      targetPeriod.type,
                                      "goalPeriod",
                                    )}
                                  </span>
                                </div>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            });
          })()}

          {/* 2. グラフエリア */}
          <div className="page-break">
            {/* ① 累積折れ線グラフ (Cumulative) - 常に出す */}
            <div className="report-card-base mb-8">
              <div className="pb-4 mb-4 border-b border-slate-100 print:border-slate-800">
                <h2 className="font-black text-xl text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                  <BarChart2
                    className="text-blue-600 print:text-black"
                    size={20}
                  />
                  TEAM CUMULATIVE (累積距離)
                </h2>
              </div>
              <div className="mt-4">
                <h3 className="font-black text-sm uppercase tracking-widest mb-6 text-center text-slate-700">
                  Cumulative Distance Trends
                </h3>
                <div className="w-full h-[500px] print-chart-line">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartDataCumulative}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={formatAxisLabel}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        width={30}
                        type="number"
                        domain={[0, "auto"]}
                        interval={0}
                        ticks={cumulativeTicks}
                      />
                      <Tooltip labelFormatter={formatAxisLabel} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        content={renderCustomLegend}
                      />
                      {sortedRunners.map((r, i) => (
                        <Line
                          key={`cumul-${r.id}`}
                          type="monotone"
                          dataKey={r.id}
                          name={`${r.lastName} ${r.firstName} (累計: ${r.finalDist}km)`}
                          stroke={COLORS[i % COLORS.length]}
                          strokeWidth={hoveredLine === r.id ? 4 : 2}
                          strokeOpacity={
                            hoveredLine ? (hoveredLine === r.id ? 1 : 0.1) : 1
                          }
                          dot={isYearly || isMonth ? { r: 3 } : false}
                          activeDot={{ r: hoveredLine === r.id ? 8 : 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 🌟🌟 ② 期間タイプによる動的出し分けエリア 🌟🌟 */}
            {isCustom ? (
              /* パターンA：指定期間(custom)の場合は「MVPランキングボード」を表示 */
              <div className="grid grid-cols-2 gap-4 print:gap-4 mt-2">
                {/* 左上：総走行距離 */}
                <div className="report-card-base p-4">
                  <h3 className="font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2 text-blue-700">
                    👑 Distance King{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      (総距離)
                    </span>
                  </h3>
                  <ul className="space-y-2">
                    {topTotal.map((r, i) => (
                      <li
                        key={r.id}
                        className="flex justify-between items-center text-sm border-b border-slate-50 pb-1"
                      >
                        <span className="font-bold text-slate-700">
                          <span
                            className={`inline-block w-4 text-center mr-1 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-slate-300"}`}
                          >
                            {i + 1}.
                          </span>
                          {r.lastName} {r.firstName}
                        </span>
                        <span className="font-black text-blue-600">
                          {r.totalDist}{" "}
                          <span className="text-xs font-normal">km</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 右上：日間最長距離 */}
                <div className="report-card-base p-4">
                  <h3 className="font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2 text-rose-600">
                    🔥 Longest Drive{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      (最長距離/日)
                    </span>
                  </h3>
                  <ul className="space-y-2">
                    {topDaily.map((r, i) => (
                      <li
                        key={r.id}
                        className="flex justify-between items-center text-sm border-b border-slate-50 pb-1"
                      >
                        <span className="font-bold text-slate-700">
                          <span className="inline-block w-4 text-center mr-1 text-slate-300">
                            {i + 1}.
                          </span>
                          {r.lastName} {r.firstName}
                        </span>
                        <span className="font-black text-rose-500">
                          {r.maxDaily}{" "}
                          <span className="text-xs font-normal">km</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 左下：稼働日数 */}
                <div className="report-card-base p-4">
                  <h3 className="font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2 text-emerald-600">
                    📅 Iron Man{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      (稼働日数)
                    </span>
                  </h3>
                  <ul className="space-y-2">
                    {topActive.map((r, i) => (
                      <li
                        key={r.id}
                        className="flex justify-between items-center text-sm border-b border-slate-50 pb-1"
                      >
                        <span className="font-bold text-slate-700">
                          <span className="inline-block w-4 text-center mr-1 text-slate-300">
                            {i + 1}.
                          </span>
                          {r.lastName} {r.firstName}
                        </span>
                        <span className="font-black text-emerald-500">
                          {r.activeDays}{" "}
                          <span className="text-xs font-normal">days</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 右下：自主練ポイント */}
                <div className="report-card-base p-4">
                  <h3 className="font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2 text-amber-500">
                    ⭐ Extra Effort{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      (自主練/オフ日稼働)
                    </span>
                  </h3>
                  <ul className="space-y-2">
                    {topExtra.map((r, i) => (
                      <li
                        key={r.id}
                        className="flex justify-between items-center text-sm border-b border-slate-50 pb-1"
                      >
                        <span className="font-bold text-slate-700">
                          <span className="inline-block w-4 text-center mr-1 text-slate-300">
                            {i + 1}.
                          </span>
                          {r.lastName} {r.firstName}
                        </span>
                        <span className="font-black text-amber-500">
                          {r.extraDays}{" "}
                          <span className="text-xs font-normal">pts</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              /* パターンB：年次(year)・月次(month)の場合は「トレンド推移グラフ」を表示 */
              <div className="report-card-base">
                <div className="pb-4 mb-4 border-b border-slate-100 print:border-slate-800">
                  <h2 className="font-black text-xl text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                    <BarChart2
                      className="text-emerald-500 print:text-black"
                      size={20}
                    />
                    TEAM TRENDS (推移)
                  </h2>
                </div>
                <div className="mt-4">
                  <h3 className="font-black text-sm uppercase tracking-widest mb-6 text-center text-slate-700">
                    {trendsTitle}
                  </h3>
                  <div className="w-full h-[500px] print-chart-line">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartDataTrends}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#f1f5f9"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={formatAxisLabel}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          width={30}
                          type="number"
                          domain={[0, "auto"]}
                          interval={0}
                          ticks={trendsTicks}
                        />
                        <Tooltip labelFormatter={formatAxisLabel} />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          content={renderCustomLegend}
                        />
                        {sortedRunners.map((r, i) => (
                          <Line
                            key={`trend-${r.id}`}
                            type="monotone"
                            dataKey={r.id}
                            name={`${r.lastName} ${r.firstName}`}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={hoveredLine === r.id ? 4 : 2}
                            strokeOpacity={
                              hoveredLine ? (hoveredLine === r.id ? 1 : 0.1) : 1
                            }
                            // 🌟 月次(isMonth)の時もドットを表示するよう追加！
                            dot={isYearly || isMonth ? { r: 3 } : false}
                            activeDot={{ r: hoveredLine === r.id ? 8 : 6 }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
            {/* 🌟🌟 動的出し分けエリアここまで 🌟🌟 */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachReportView;
