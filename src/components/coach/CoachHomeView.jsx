/*
 * CoachHomeView — 監督ダッシュボードのホーム画面（表示専用）
 *
 * CoachView から coach-home ビューの JSX を分離。日付指定の提出状況・アラート、
 * 最近のアクティビティ、未入力リスト（期間指定＋コピー）を表示する。
 * 状態・ハンドラ・派生データ（missingListText など）は CoachView 側に残し
 * props で受け取る（挙動は従来と同一）。
 */
import {
  AlertTriangle,
  Check,
  Activity,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import SubmissionStatusRow from "../shared/SubmissionStatusRow";
import TeamActivityFeed from "../shared/TeamActivityFeed";

const CoachHomeView = ({
  checkDate,
  setCheckDate,
  coachStats,
  setIsPainAlertModalOpen,
  isSubmitListOpen,
  setIsSubmitListOpen,
  checkListData,
  allLogs,
  activeRunners,
  teamRunners,
  openCoachEditModal,
  isMissingListOpen,
  setIsMissingListOpen,
  missingStart,
  setMissingStart,
  missingEnd,
  setMissingEnd,
  missingListText,
  missingCopied,
  setMissingCopied,
}) => {
  return (
    <div className="space-y-6 lg:flex lg:items-start lg:gap-6 lg:space-y-0 animate-in fade-in">
      {/* 左カラム */}
      <div className="lg:flex-1 space-y-6">
      {/* 提出状況 */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="flex-1 p-2.5 bg-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:ring-2 ring-blue-500"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
          />
          <div
            onClick={() => {
              if (coachStats.alertList?.length > 0)
                setIsPainAlertModalOpen(true);
            }}
            className={`px-4 py-2.5 rounded-2xl flex flex-col items-center flex-shrink-0 transition-all ${coachStats.alertList?.length > 0 ? "bg-rose-50 cursor-pointer active:scale-95" : "bg-slate-100"}`}
          >
            <span
              className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-0.5 whitespace-nowrap ${coachStats.alertList?.length > 0 ? "text-rose-500" : "text-slate-400"}`}
            >
              <AlertTriangle size={9} /> Alert
            </span>
            <div className="flex items-end gap-0.5 whitespace-nowrap">
              <span
                className={`text-2xl font-black leading-tight ${coachStats.alertList?.length > 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {coachStats.alertList?.length || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                名
              </span>
            </div>
          </div>
          <div
            onClick={() => setIsSubmitListOpen((v) => !v)}
            className="px-4 py-2.5 rounded-2xl flex flex-col items-center flex-shrink-0 bg-slate-100 cursor-pointer active:scale-95 transition-all hover:bg-slate-200"
          >
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              提出済
            </span>
            <div className="flex items-end gap-0.5 whitespace-nowrap">
              <span className="text-2xl font-black text-emerald-600 leading-tight">
                {
                  checkListData.filter(
                    (r) => r.status !== "unsubmitted",
                  ).length
                }
              </span>
              <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                / {checkListData.length}名
              </span>
            </div>
          </div>
        </div>
        {isSubmitListOpen && (
          <div className="divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2">
            {checkListData.map((r) => {
              // 付加情報: 月間km（共通行で表示）＋その日のログ（Painバッジ・クリックで監督編集）
              const log = allLogs.find(
                (l) => l.runnerId === r.id && l.date === checkDate,
              );
              return (
                <SubmissionStatusRow
                  key={r.id}
                  runner={r}
                  monthTotal={r.monthTotal}
                  log={log}
                  onClick={openCoachEditModal}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 h-[28rem] lg:h-[calc(100dvh-220px)] flex flex-col">
        <div className="p-5 bg-slate-50 border-b flex items-center gap-2">
          <Activity size={16} className="text-slate-400" />
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Recent Activity
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <TeamActivityFeed
            logs={allLogs
              .filter((l) => (teamRunners || activeRunners).some((r) => r.id === l.runnerId))
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 50)}
            accent="blue"
            canEdit
            onEdit={openCoachEditModal}
          />
        </div>
      </div>
    </div>{/* /左カラム */}
    {/* 右カラム */}
    <div className="lg:flex-1 space-y-6">
      {/* 未入力リスト */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm space-y-3">
        <div
          className="flex items-center justify-between cursor-pointer active:scale-95 transition-all"
          onClick={() => setIsMissingListOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-slate-400" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              未入力リスト
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${isMissingListOpen ? "rotate-180" : ""}`}
          />
        </div>
        {isMissingListOpen && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="p-2.5 bg-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:ring-2 ring-blue-500"
                value={missingStart}
                onChange={(e) => setMissingStart(e.target.value)}
              />
              <input
                type="date"
                className="p-2.5 bg-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:ring-2 ring-blue-500"
                value={missingEnd}
                onChange={(e) => setMissingEnd(e.target.value)}
              />
            </div>
            {missingListText && (
              <div className="space-y-2">
                <pre className="bg-slate-50 rounded-2xl p-3 text-xs font-bold text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {missingListText}
                </pre>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(missingListText);
                    setMissingCopied(true);
                    setTimeout(() => setMissingCopied(false), 2000);
                  }}
                  className="w-full py-2.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 bg-slate-800 text-white"
                >
                  {missingCopied ? (
                    <>
                      <Check size={14} /> コピーしました
                    </>
                  ) : (
                    <>
                      <ClipboardList size={14} /> テキストをコピー
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>{/* /右カラム */}
  </div>
  );
};

export default CoachHomeView;
