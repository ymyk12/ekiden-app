/*
 * AthleteMenuView — 選手画面のホーム（menu）ビュー（表示専用）
 *
 * AthleteView から menu ビューを分離。目標未設定/未入力/フィードバック等の
 * アラート、距離メーター、四半期進捗、当日のチーム練習日誌を表示する。
 * 四半期の開閉トグルのみ内部で保持し、データ・ハンドラは props で受け取る。
 */
import { useState } from "react";
import {
  Target,
  AlertTriangle,
  MessageSquare,
  FileText,
  ChevronRight,
  ChevronDown,
  BookOpen,
  MapPin,
  Dumbbell,
  Activity,
} from "lucide-react";
import { getGoalValue, getTodayStr } from "../../utils/dateUtils";

const AthleteMenuView = ({
  currentProfile,
  targetPeriod,
  setView,
  safeChangeView,
  missingDates,
  logInput,
  setLogInput,
  hasUnreadReview,
  currentFeedback,
  setShowDocs,
  personalStats,
  activeQuarters,
  allLogs,
  currentUserId,
  teamLogs,
}) => {
  const [isQuarterExpanded, setIsQuarterExpanded] = useState(false);

  return (
          <>
            {(() => {
              const currentGoal = getGoalValue(
                currentProfile,
                targetPeriod.id,
                targetPeriod.type,
                "goalPeriod",
              );
              const today = new Date().toISOString().slice(0, 10);
              const isCustomPeriod = targetPeriod.type === "custom";
              const isActive = today >= targetPeriod.start && today <= targetPeriod.end;
              if ((!currentGoal || currentGoal === 0) && isCustomPeriod && isActive) {
                return (
                  <div
                    onClick={() => setView("goal")}
                    className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg mb-6 flex items-center justify-between cursor-pointer active:scale-95 transition-transform animate-in slide-in-from-top-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-full">
                        <Target size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-black text-xs uppercase tracking-widest opacity-90">
                          Action Required
                        </p>
                        <p className="font-bold text-sm">
                          目標が設定されていません
                        </p>
                      </div>
                    </div>
                    <div className="bg-white text-rose-600 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm">
                      設定する
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {missingDates.length > 0 && (
              <div className="mb-6 animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-2 px-2">
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={14} /> Missing Reports (
                    {missingDates.length})
                  </p>
                </div>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {missingDates.map((dateStr) => {
                    const d = new Date(dateStr);
                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          setLogInput({ ...logInput, date: dateStr });
                          setView("entry");
                        }}
                        className="bg-amber-400 text-slate-900 py-2 px-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-transform border border-slate-900/10"
                      >
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={16} className="text-slate-800" />
                          <div className="flex items-baseline gap-2">
                            <span className="font-black text-sm">
                              {d.getMonth() + 1}/{d.getDate()}
                            </span>
                            <span className="text-xs font-bold opacity-70">
                              未入力
                            </span>
                          </div>
                        </div>
                        <div className="bg-white/90 text-slate-900 px-2.5 py-1 rounded text-xs font-black min-w-[44px] text-center">
                          入力
                        </div>
                      </div>
                    );
                  })}
                </div>
                {missingDates.length > 3 && (
                  <p className="text-center text-[11px] text-slate-500 font-bold mt-2">
                    ↑ スクロールして過去分も確認できます
                  </p>
                )}
                {missingDates.length >= 2 && (
                  <p className="text-center text-[11px] text-slate-500 font-bold">
                    休みだった場合も「完全休養」として記録しましょう！
                  </p>
                )}
              </div>
            )}

            {hasUnreadReview && (
              <div
                onClick={() => safeChangeView("review")}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4 rounded-2xl shadow-lg mb-6 flex items-center justify-between cursor-pointer active:scale-95 transition-transform animate-in slide-in-from-top-2"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
                    <MessageSquare size={20} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-xs uppercase tracking-widest opacity-90">
                      Coach Feedback
                    </p>
                    <p className="font-bold text-sm truncate">
                      {currentFeedback?.coachComment
                        ? `「${currentFeedback.coachComment.slice(0, 20)}${currentFeedback.coachComment.length > 20 ? "…" : ""}」`
                        : "監督からフィードバックが届いています"}
                    </p>
                  </div>
                </div>
                <div className="bg-white text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm flex-shrink-0 ml-2">
                  確認する
                </div>
              </div>
            )}

            <button
              onClick={() => setShowDocs(true)}
              className="w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between active:scale-[0.99] hover:border-blue-200 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl flex-shrink-0">
                  <FileText size={18} className="text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-black text-xs uppercase tracking-widest text-slate-400">
                    Documents
                  </p>
                  <p className="font-bold text-sm text-slate-700">資料</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-md shadow-blue-900/5 border border-slate-100/80 space-y-6">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">
                    {targetPeriod.type === "year"
                      ? "Yearly Mileage"
                      : targetPeriod.type === "custom"
                        ? "Period Mileage"
                        : "Monthly Mileage"}
                  </h3>
                </div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-black text-blue-600 tracking-tighter">
                    {targetPeriod.type === "month"
                      ? personalStats.monthly
                      : personalStats.period}
                    <span className="text-xs font-normal text-slate-400">
                      km
                    </span>
                  </span>
                  <span className="text-xs font-bold text-slate-400 pb-1">
                    /{" "}
                    {getGoalValue(
                      currentProfile,
                      targetPeriod.id,
                      targetPeriod.type,
                      "goalPeriod",
                    )}{" "}
                    km
                  </span>
                </div>
                {getGoalValue(
                  currentProfile,
                  targetPeriod.id,
                  targetPeriod.type,
                  "goalPeriod",
                ) > 0 && (
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, ((targetPeriod.type === "month" ? personalStats.monthly : personalStats.period) / getGoalValue(currentProfile, targetPeriod.id, targetPeriod.type, "goalPeriod")) * 100)}%`,
                      }}
                    ></div>
                  </div>
                )}
                <p className="text-[9px] text-right text-slate-400 font-bold mt-1">
                  {targetPeriod.name}
                </p>
              </div>

              {activeQuarters &&
                activeQuarters.length > 0 &&
                targetPeriod.type !== "month" && (
                  <div className="pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setIsQuarterExpanded((v) => !v)}
                      className="w-full flex items-center justify-between"
                    >
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Target size={12} /> Quarterly Progress
                      </h4>
                      <ChevronDown
                        size={14}
                        className={`text-slate-400 transition-transform duration-200 ${isQuarterExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isQuarterExpanded && (
                      <div className="mt-3 space-y-2 animate-in fade-in">
                        {activeQuarters.map((q, idx) => {
                          const qKey = `q${idx + 1}`;
                          const qGoal =
                            getGoalValue(
                              currentProfile,
                              targetPeriod.id,
                              targetPeriod.type,
                              qKey,
                            ) || 0;
                          let currentQVal = 0;
                          let isActive = false;
                          if (q.start && q.end) {
                            const qStart = new Date(q.start);
                            const qEnd = new Date(q.end);
                            qEnd.setHours(23, 59, 59, 999);
                            const qTotal = allLogs
                              .filter((l) => l.runnerId === currentUserId)
                              .filter((l) => {
                                const d = new Date(l.date);
                                return !isNaN(d) && d >= qStart && d <= qEnd;
                              })
                              .reduce(
                                (sum, l) => sum + (Number(l.distance) || 0),
                                0,
                              );
                            currentQVal = Math.round(qTotal * 10) / 10;
                            const now = new Date();
                            isActive = now >= qStart && now <= qEnd;
                          }
                          const progressRate =
                            qGoal > 0
                              ? Math.min(100, (currentQVal / qGoal) * 100)
                              : 0;
                          return (
                            <div
                              key={qKey}
                              className={`p-3 rounded-2xl border transition-all ${isActive ? "bg-blue-50/50 border-blue-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-90"}`}
                            >
                              <div className="flex justify-between items-end mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-black ${isActive ? "text-blue-600" : "text-slate-500"}`}
                                  >
                                    Q{idx + 1}
                                  </span>
                                  {q.start && q.end && (
                                    <span className="text-[9px] font-bold text-slate-400">
                                      {q.start.slice(5).replace("-", "/")} -{" "}
                                      {q.end.slice(5).replace("-", "/")}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`text-sm font-black ${isActive ? "text-blue-600" : "text-slate-700"}`}
                                  >
                                    {currentQVal}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 mx-0.5">
                                    /
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {qGoal} km
                                  </span>
                                </div>
                              </div>
                              {qGoal > 0 ? (
                                <div className="w-full bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-1000 ${isActive ? "bg-gradient-to-r from-blue-400 to-blue-600" : "bg-slate-300"}`}
                                    style={{ width: `${progressRate}%` }}
                                  ></div>
                                </div>
                              ) : (
                                <div className="w-full bg-slate-100 h-1.5 rounded-full flex items-center justify-center">
                                  <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest scale-75">
                                    No Goal
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
            </div>

            {(() => {
              const todayStr = getTodayStr();
              const diary = teamLogs.find((l) => l.date === todayStr);
              if (!diary) return null;
              return (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-5 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                  <div className="relative z-10">
                    <div className="w-full flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-2">
                          <BookOpen size={12} /> Team Practice Diary
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {diary.location && (
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                              <MapPin size={11} className="text-blue-400" />
                              {diary.location === "その他" && diary.locationDetail
                                ? diary.locationDetail
                                : diary.location === "競技場" && diary.locationDetail
                                  ? `${diary.location}(${diary.locationDetail})`
                                  : diary.location}
                            </span>
                          )}
                          {diary.startTime && (
                            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                              {diary.startTime}{diary.endTime ? ` - ${diary.endTime}` : ""}
                            </span>
                          )}
                          {diary.weather && (
                            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
                              {diary.weather}{diary.temp ? ` ${diary.temp}℃` : ""}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-sm leading-snug text-white/90">
                          {diary.menu}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {diary.reinforcements && diary.reinforcements.length > 0 && (
                        <div className="bg-blue-900/30 p-3 rounded-xl border border-blue-500/20">
                          <p className="text-[10px] font-bold text-blue-300 mb-2 flex items-center gap-1">
                            <Dumbbell size={10} /> REINFORCEMENT
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {diary.reinforcements.map((item, i) => (
                              <span key={i} className="text-[10px] font-bold bg-blue-500/20 text-blue-100 px-2 py-1 rounded">
                                {item}
                              </span>
                            ))}
                            {diary.reinforcements.includes("その他") && diary.reinforcementDetail && (
                              <span className="text-[10px] font-bold text-slate-400 self-center">
                                : {diary.reinforcementDetail}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {diary.result && (
                        <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                          <p className="text-[10px] font-bold text-blue-300 mb-1 flex items-center gap-1">
                            <Activity size={10} /> RESULT / NOTES
                          </p>
                          <p className="text-xs font-bold leading-relaxed text-slate-200 whitespace-pre-wrap">
                            {diary.result}
                          </p>
                        </div>
                      )}
                      {diary.coachNote && (
                        <div className="bg-amber-300/20 p-3 rounded-xl border border-amber-300/30">
                          <p className="text-[10px] font-black text-amber-300 mb-1 flex items-center gap-1 uppercase tracking-widest">
                            <MessageSquare size={10} /> Coach's Note
                          </p>
                          <p className="text-xs font-bold leading-relaxed text-amber-50 whitespace-pre-wrap">
                            {diary.coachNote}
                          </p>
                        </div>
                      )}
                      <p className="text-[9px] text-slate-500 text-right">
                        Updated by: {diary.updatedBy}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

          </>
  );
};

export default AthleteMenuView;
