/*
 * CoachStatsView — 監督の統計画面（ランキング／レポート／月間レポート）
 *
 * CoachView から coach-stats ビューの JSX を分離。サブタブ切替を内部で保持し、
 * ランキング（recharts の棒グラフ）を描画、レポート／月間は既存の
 * CoachReportView / MonthlyReportView に委譲する。データ・ハンドラは props。
 */
import { useState } from "react";
import { Trophy, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import CoachReportView from "../CoachReportView";
import MonthlyReportView from "../MonthlyReportView";

const CoachStatsView = ({
  exportCSV,
  rankingData,
  handlePrint,
  activeRunners,
  targetPeriod,
  reportMatrix,
  monthlyTrendData,
  cumulativeData,
  reportChartData,
  allLogs,
  raceCards,
  tournaments,
}) => {
  const [statsSubTab, setStatsSubTab] = useState("ranking");

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl print:hidden">
        {["ranking", "report", "monthly"].map((sub) => (
          <button
            key={sub}
            onClick={() => setStatsSubTab(sub)}
            className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${statsSubTab === sub ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
          >
            {
              {
                ranking: "ランキング",
                report: "レポート",
                monthly: "月間レポート",
              }[sub]
            }
          </button>
        ))}
      </div>
      {statsSubTab === "ranking" && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm h-[28rem] lg:h-[calc(100dvh-240px)] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <Trophy size={18} className="text-orange-500" /> Team
              Ranking
            </h3>
            <button
              onClick={exportCSV}
              className="text-blue-600 p-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <Download size={20} />
            </button>
          </div>
          <div className="flex-1 w-full min-h-0 overflow-y-auto pr-2">
            <div
              style={{ height: Math.max(300, rankingData.length * 50) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rankingData}
                  layout="vertical"
                  margin={{ left: -10, right: 60 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{
                      fontSize: 12,
                      fontWeight: "bold",
                      fill: "#1e293b",
                      interval: 0,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar
                    dataKey="total"
                    radius={[0, 10, 10, 0]}
                    barSize={24}
                  >
                    {rankingData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          i === 0
                            ? "#0f172a"
                            : i < 3
                              ? "#3b82f6"
                              : "#cbd5e1"
                        }
                      />
                    ))}
                    <LabelList
                      dataKey="total"
                      position="right"
                      formatter={(v) => `${v}km`}
                      style={{
                        fontSize: "11px",
                        fontWeight: "black",
                        fill: "#475569",
                      }}
                      offset={10}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      {statsSubTab === "report" && (
        <CoachReportView
          handlePrint={handlePrint}
          activeRunners={activeRunners}
          targetPeriod={targetPeriod}
          reportMatrix={reportMatrix}
          monthlyTrendData={monthlyTrendData}
          cumulativeData={cumulativeData}
          reportChartData={reportChartData}
        />
      )}
      {statsSubTab === "monthly" && (
        <MonthlyReportView
          handlePrint={handlePrint}
          activeRunners={activeRunners}
          allLogs={allLogs}
          raceCards={raceCards}
          tournaments={tournaments}
        />
      )}
    </div>
  );
};

export default CoachStatsView;
