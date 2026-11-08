/*
 * CoachStatsView — 監督の統計画面（ランキング／レポート／月間レポート）
 *
 * CoachView から coach-stats ビューの JSX を分離。サブタブ切替を内部で保持し、
 * ランキング（recharts の棒グラフ）を描画、レポート／月間は既存の
 * CoachReportView / MonthlyReportView に委譲する。データ・ハンドラは props。
 */
import { useState } from "react";
import { Trophy, Download } from "lucide-react";
import CoachReportView from "../CoachReportView";
import MonthlyReportView from "../MonthlyReportView";
import RankingList from "../shared/RankingList";

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
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm h-[32rem] lg:h-[calc(100dvh-170px)] flex flex-col">
          <div className="flex justify-between items-center mb-4">
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
            <RankingList rankingData={rankingData} />
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
