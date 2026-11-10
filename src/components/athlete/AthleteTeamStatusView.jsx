/*
 * AthleteTeamStatusView — 選手画面の「Team」ビュー（表示専用）
 *
 * AthleteView から team_status ビューを分離。ランキング／日誌／活動フィードの
 * サブタブを内部で保持し、データ・ハンドラは props で受け取る（挙動は従来と同一）。
 */
import { useState } from "react";
import {
  ArrowLeft,
  Dumbbell,
  Activity,
  MessageSquare,
} from "lucide-react";
import DiaryListItem from "../DiaryListItem";
import RankingList from "../shared/RankingList";
import TeamActivityFeed from "../shared/TeamActivityFeed";

const AthleteTeamStatusView = ({
  safeChangeView,
  targetPeriod,
  rankingData,
  allLogs,
  teamLogs,
  activeRunners,
  teamRunners,
  expandedDiaryId,
  setExpandedDiaryId,
}) => {
  const [teamSubView, setTeamSubView] = useState("ranking");

  return (
          <div className="bg-white rounded-[3rem] shadow-sm animate-in fade-in flex flex-col h-[calc(100dvh-290px)]">
            {/* サブヘッダー（固定）＋サブタブ */}
            <div className="flex-shrink-0 border-b border-slate-100">
              <div className="flex items-center gap-2 px-6 pt-6 pb-3">
                <button onClick={() => safeChangeView("menu")} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                  <ArrowLeft size={20} />
                </button>
                <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 tracking-[0.3em]">Team</h3>
                <div className="w-9" />
              </div>
            {/* サブタブ */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
              {[
                { id: "ranking", label: "ランキング" },
                { id: "diary", label: "日誌" },
                { id: "activity", label: "活動" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTeamSubView(tab.id)}
                  className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${teamSubView === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            </div>{/* /サブヘッダー */}

            {/* スクロールエリア */}
            <div className="flex-1 overflow-y-auto px-6 py-4 pb-8 space-y-4">

            {/* ランキング */}
            {teamSubView === "ranking" && (
              <RankingList
                rankingData={rankingData}
                title="ランキング"
                periodName={targetPeriod.name}
              />
            )}

            {/* 日誌 */}
            {teamSubView === "diary" && (
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {targetPeriod.name}
                  </span>
                </div>
                {(() => {
                  const start = new Date(targetPeriod.start);
                  const end = new Date(targetPeriod.end);
                  end.setHours(23, 59, 59, 999);
                  const filteredLogs = teamLogs
                    .filter((l) => {
                      const d = new Date(l.date);
                      return d >= start && d <= end;
                    })
                    .sort((a, b) => (a.date < b.date ? 1 : -1));

                  if (filteredLogs.length === 0) {
                    return (
                      <p className="text-center text-xs text-slate-300 py-8 font-bold">
                        この期間の日誌はありません
                      </p>
                    );
                  }

                  return filteredLogs.map((log) => {
                    const isExpanded = expandedDiaryId === log.date;
                    return (
                      <DiaryListItem
                        key={log.date}
                        log={log}
                        isExpanded={isExpanded}
                        onClick={() =>
                          setExpandedDiaryId(isExpanded ? null : log.date)
                        }
                      >
                        <div className="px-4 pb-4 space-y-4 border-t border-slate-200/50 pt-4 animate-in fade-in">
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                              <span className="text-indigo-400 block text-[9px] uppercase">Time</span>
                              {log.startTime ? `${log.startTime} - ${log.endTime}` : "-"}
                            </div>
                            <div className="bg-white p-2 rounded-lg border border-slate-100">
                              <span className="text-indigo-400 block text-[9px] uppercase">Cond</span>
                              {log.temp ? `${log.temp}℃` : "-"} / Wind: {log.wind || "-"}
                            </div>
                          </div>
                          {log.reinforcements && log.reinforcements.length > 0 && (
                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                              <p className="text-[9px] font-black text-blue-400 uppercase mb-2 flex items-center gap-1">
                                <Dumbbell size={10} /> Reinforcement
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {log.reinforcements.map((item, i) => (
                                  <span key={i} className="text-[10px] font-bold bg-white text-slate-600 px-2 py-1 rounded border border-blue-100">
                                    {item}
                                  </span>
                                ))}
                                {log.reinforcementDetail && (
                                  <span className="text-[10px] font-bold text-slate-400 self-center">
                                    ({log.reinforcementDetail})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                          {log.result && (
                            <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                              <p className="text-[9px] font-black text-indigo-400 uppercase mb-1 flex items-center gap-1">
                                <Activity size={10} /> Result / Notes
                              </p>
                              <p className="text-xs font-bold leading-relaxed text-slate-700 whitespace-pre-wrap">
                                {log.result}
                              </p>
                            </div>
                          )}
                          {log.coachNote && (
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                              <p className="text-[9px] font-black text-amber-600 uppercase mb-1 flex items-center gap-1 tracking-widest">
                                <MessageSquare size={10} /> Coach's Note
                              </p>
                              <p className="text-xs font-bold leading-relaxed text-slate-800 whitespace-pre-wrap">
                                {log.coachNote}
                              </p>
                            </div>
                          )}
                          <p className="text-[9px] text-right text-slate-300">
                            Updated by: {log.updatedBy}
                          </p>
                        </div>
                      </DiaryListItem>
                    );
                  });
                })()}
              </div>
            )}

            {/* 活動フィード（共通コンポーネント・閲覧専用） */}
            {teamSubView === "activity" && (
              <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  過去7日間の活動
                </p>
                {(() => {
                  const pastDate = new Date();
                  pastDate.setDate(pastDate.getDate() - 6);
                  const minDateStr = pastDate.toLocaleDateString("sv-SE");

                  const teamLogsList = allLogs
                    .filter((l) => l.date >= minDateStr)
                    .filter((l) => (teamRunners || activeRunners).some((r) => r.id === l.runnerId))
                    .sort((a, b) => {
                      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
                      return (b.createdAt || "").localeCompare(a.createdAt || "");
                    })
                    .slice(0, 20);

                  return (
                    <TeamActivityFeed logs={teamLogsList} accent="blue" />
                  );
                })()}
              </div>
            )}
            </div>{/* /スクロールエリア */}
          </div>
  );
};

export default AthleteTeamStatusView;
