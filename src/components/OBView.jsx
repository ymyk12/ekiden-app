/*
 * OBView — 引退した選手（status: "retired"）向けの閲覧専用画面
 *
 * 引退処理 ＝ この画面への移行。既存コンポーネントを流用し、新しい表示ロジックは持たない。
 *   - マイレポート : MonthlyReportView（本人固定）。在籍中の全期間の月間レポートを見返せる
 *   - 大会結果     : AthleteRaceView（閲覧専用）＋ TeamRaceReport（後輩を含むチームの大会結果）
 * 書き込み（記録・大会カードの追加/編集）は一切できない。
 */
import { useState, useMemo } from "react";
import { FileText, Flag, LogOut, Eye } from "lucide-react";
import MonthlyReportView from "./MonthlyReportView";
import TeamRaceReport from "./TeamRaceReport";
import AthleteRaceView from "./athlete/AthleteRaceView";
import { usePrint } from "../hooks/usePrint";

const noop = () => {};

const OBView = ({
  profile,
  teamRunners,
  allLogs,
  raceCards,
  tournaments,
  handleLogout,
  // 監督プレビュー用: 指定時は上部にバナーを出し、終了ボタンで監督画面へ戻る
  isPreview = false,
  onExitPreview,
}) => {
  const [tab, setTab] = useState("report");
  const [showTeamReportId, setShowTeamReportId] = useState(null);
  const { handlePrint } = usePrint();

  // マイレポートの既定月: 最後に記録した月（無ければ MonthlyReportView の既定＝先月）
  const defaultMonth = useMemo(() => {
    const dates = allLogs
      .filter((l) => l.runnerId === profile.id && l.date)
      .map((l) => l.date);
    if (dates.length === 0) return undefined;
    return dates.reduce((a, b) => (a > b ? a : b)).slice(0, 7);
  }, [allLogs, profile.id]);

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex flex-col items-center gap-1 w-24 rounded-xl py-1.5 transition-all ${tab === id ? "text-blue-600 bg-blue-50" : "text-slate-400 hover:text-slate-500"}`}
    >
      <Icon size={20} strokeWidth={tab === id ? 3 : 2} />
      <span className="text-[10px] font-black">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 print:bg-white print:pb-0">
      {isPreview && (
        <div className="no-print print:hidden fixed top-0 left-0 right-0 z-[100] bg-amber-400 text-slate-900 py-2 px-4 flex justify-between items-center shadow-lg">
          <span className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
            <Eye size={14} /> Preview Mode（OB画面）
          </span>
          <button
            onClick={onExitPreview}
            className="bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            終了する
          </button>
        </div>
      )}
      <header
        className={`no-print print:hidden bg-slate-800 text-white px-5 pb-6 rounded-b-[2rem] shadow-md ${isPreview ? "pt-14" : "pt-8"}`}
      >
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              OB / OG
            </p>
            <h1 className="text-lg font-black mt-1">
              {profile.lastName} {profile.firstName}
            </h1>
          </div>
          {!isPreview && (
            <button
              onClick={handleLogout}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 active:scale-95 transition-all"
              aria-label="ログアウト"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      <main className="px-5 mt-6 max-w-md mx-auto print:max-w-none print:w-full print:px-0 print:mx-0 print:mt-0">
        {tab === "report" && (
          <MonthlyReportView
            // 全期間の自分のログは少し遅れて届くため、既定月が決まった時点で作り直す
            key={defaultMonth || "no-logs"}
            handlePrint={handlePrint}
            activeRunners={teamRunners}
            allLogs={allLogs}
            raceCards={raceCards}
            tournaments={tournaments}
            lockedRunnerId={profile.id}
            allowAll={false}
            defaultMonth={defaultMonth}
          />
        )}

        {tab === "race" && (
          <AthleteRaceView
            readOnly
            safeChangeView={noop}
            tournaments={tournaments}
            raceCards={raceCards}
            currentUserId={profile.id}
            gender={profile.gender}
            setRaceCardInput={noop}
            setEditingRaceCardId={noop}
            setView={noop}
            setShowTeamReportId={setShowTeamReportId}
          />
        )}
      </main>

      <nav className="no-print print:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto flex justify-center gap-6 py-2">
          <TabButton id="report" icon={FileText} label="マイレポート" />
          <TabButton id="race" icon={Flag} label="大会結果" />
        </div>
      </nav>

      {showTeamReportId && (
        <TeamRaceReport
          reportTour={tournaments.find((t) => t.id === showTeamReportId)}
          reportCards={raceCards.filter(
            (c) => c.tournamentId === showTeamReportId,
          )}
          onClose={() => setShowTeamReportId(null)}
        />
      )}
    </div>
  );
};

export default OBView;
