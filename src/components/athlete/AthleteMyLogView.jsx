/*
 * AthleteMyLogView — 選手画面の「My Log」(diary) ビュー（表示専用）
 *
 * AthleteView から diary ビューを分離。選択期間の自分の練習記録を一覧表示し、
 * タップで詳細（diaryDetailLog）を開く。状態・ハンドラは props で受け取る。
 */
import { useState, useMemo, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import MonthlyReportView from "../MonthlyReportView";
import { usePrint } from "../../hooks/usePrint";
import AthleteBestsTab from "./AthleteBestsTab";

const AthleteMyLogView = ({
  periodLogs,
  setDiaryDetailLog,
  targetPeriod,
  allLogs,
  raceCards,
  tournaments,
  currentUserId,
  teamRunners,
  initialSubView = "log",
}) => {
  const [subView, setSubView] = useState(initialSubView);
  // 別の画面（お知らせの「開く」など）から月間レポートを直接開くとき
  useEffect(() => {
    if (initialSubView === "report") setSubView("report");
  }, [initialSubView]);
  const { handlePrint } = usePrint();
  // 自分の全期間のログ・大会カード（記録タブ用）
  const myLogs = useMemo(
    () => (allLogs || []).filter((l) => l.runnerId === currentUserId && l.date),
    [allLogs, currentUserId],
  );
  const myCards = useMemo(
    () => (raceCards || []).filter((c) => c.runnerId === currentUserId),
    [raceCards, currentUserId],
  );

  const titleBar = (
    <div className="flex items-center gap-2 px-6 pt-6 pb-3">
      <div className="w-9" />
      <h3 className="flex-1 text-center font-black uppercase text-[10px] tracking-widest text-slate-400 tracking-[0.3em]">My Log</h3>
      <div className="w-9" />
    </div>
  );

  const subTabs = (
              <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                {[
                  { id: "log", label: "ログ" },
                  { id: "report", label: "レポート" },
                  { id: "records", label: "記録" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSubView(tab.id)}
                    className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${subView === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
  );

  // 月間レポートは印刷（A4）を想定しているため、固定高のスクロール枠の外に出して表示する
  if (subView === "report") {
    return (
      <div className="space-y-4 print:space-y-0">
        <MonthlyReportView
          topSlot={
            <>
              {titleBar}
              {subTabs}
            </>
          }
          handlePrint={handlePrint}
          activeRunners={teamRunners}
          allLogs={allLogs}
          raceCards={raceCards}
          tournaments={tournaments}
          lockedRunnerId={currentUserId}
          allowAll={false}
        />
      </div>
    );
  }

  return (
    <>
          <div className="bg-white rounded-[3rem] shadow-sm animate-in fade-in flex flex-col h-[calc(100dvh-290px)]">
            {/* サブヘッダー（固定） */}
            <div className="flex-shrink-0 border-b border-slate-100">
              {titleBar}
              {subTabs}
            </div>
            {/* スクロールエリア */}
            <div className="flex-1 overflow-y-auto px-6 py-4 pb-8 space-y-3">
              {subView === "records" ? (
                <AthleteBestsTab myLogs={myLogs} myCards={myCards} tournaments={tournaments || []} />
              ) : periodLogs.length === 0 ? (
                <p className="text-center text-xs text-slate-300 py-8 font-bold">
                  この期間の記録はありません
                </p>
              ) : (
                periodLogs
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((log) => {
                    const isRest = log.category === "完全休養";
                    return (
                      <button
                        key={log.id}
                        onClick={() => setDiaryDetailLog(log)}
                        className="w-full bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3 flex items-center gap-3 active:scale-[0.98] hover:bg-slate-100 transition-all text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0 ${isRest ? "bg-emerald-400" : "bg-blue-500"}`}>
                          {isRest ? (
                            <span className="text-base">💤</span>
                          ) : (
                            <>
                              <span className="text-[11px] font-black leading-none">{log.distance}</span>
                              <span className="text-[8px] font-bold leading-none mt-0.5">km</span>
                            </>
                          )}
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1 mb-0.5">
                            <p className="text-[11px] font-bold text-slate-500">
                              {log.date.slice(5).replace("-", "/")}
                            </p>
                            {!isRest && (
                              <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {log.category}
                              </span>
                            )}
                            {log.rpe > 0 && (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${log.rpe >= 8 ? "bg-rose-100 text-rose-600 border-rose-200" : log.rpe >= 5 ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                RPE {log.rpe}
                              </span>
                            )}
                            {log.pain > 1 && (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${log.pain >= 4 ? "bg-purple-100 text-purple-600 border-purple-200" : log.pain >= 3 ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
                                Pain {log.pain}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-black text-slate-700 truncate">
                            {isRest ? "完全休養" : (log.menuDetail || "—")}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
                      </button>
                    );
                  })
              )}
            </div>{/* /スクロールエリア */}
          </div>
    </>
  );
};

export default AthleteMyLogView;
