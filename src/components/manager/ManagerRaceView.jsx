/*
 * ManagerRaceView — マネージャーの大会記録管理（race）ビュー（表示専用）
 *
 * ManagerDashboard から race ビューを分離。大会一覧→エントリー選手一覧の
 * ドリルダウン、チームレポート導線、LAP入力起動を行う。月フィルターと選択中
 * 大会は内部で保持し、その他の状態・ハンドラは props で受け取る。
 */
import { useState } from "react";
import { Flag, ChevronRight, Users, ArrowLeft, Timer } from "lucide-react";
import TournamentMonthFilter from "../shared/TournamentMonthFilter";

const ManagerRaceView = ({
  tournaments,
  raceCards,
  setShowTeamReportId,
  setEditingCard,
  setLapInput,
}) => {
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [raceMonthFilter, setRaceMonthFilter] = useState("all");

  return (
          <div className="h-full flex flex-col animate-in fade-in">
            <div className="bg-white rounded-[2rem] shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="px-6 pt-6 pb-3 flex-shrink-0 border-b border-slate-100 space-y-3">
                <h3 className="font-black text-sm text-slate-700 flex items-center gap-2">
                  <Flag size={18} className="text-indigo-500" /> Race Management
                </h3>
                <TournamentMonthFilter
                  tournaments={tournaments}
                  value={raceMonthFilter}
                  onChange={setRaceMonthFilter}
                />
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {!selectedTourId ? (
                  <div className="space-y-3">
                    {tournaments.length === 0 ? (
                      <p className="text-center text-xs text-slate-300 py-10">
                        大会が登録されていません
                      </p>
                    ) : (
                      tournaments
                        .filter(
                          (t) =>
                            raceMonthFilter === "all" ||
                            t.startDate?.slice(0, 7) === raceMonthFilter,
                        )
                        .map((tour) => (
                          <div
                            key={tour.id}
                            className="flex flex-col gap-2 mb-3"
                          >
                            {/* 👇 これが元々あった「選手のエントリー一覧を見る」ボタンです */}
                            <button
                              onClick={() => setSelectedTourId(tour.id)}
                              className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-indigo-300 transition-all text-left shadow-sm"
                            >
                              <div>
                                <p className="font-black text-slate-700">
                                  {tour.name}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400">
                                  {tour.startDate} 〜{tour.endDate || ""}
                                </p>
                              </div>
                              <ChevronRight
                                size={18}
                                className="text-slate-300"
                              />
                            </button>

                            <button
                              onClick={() => setShowTeamReportId(tour.id)}
                              className="w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-black text-sm hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                              <Users size={18} /> チームレポートを見る
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <button
                      onClick={() => setSelectedTourId(null)}
                      className="text-xs font-bold text-indigo-600 flex items-center gap-1 mb-2"
                    >
                      <ArrowLeft size={14} /> 大会一覧に戻る
                    </button>

                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      エントリー選手一覧
                    </h4>
                    <div className="space-y-2">
                      {raceCards.filter(
                        (c) => c.tournamentId === selectedTourId,
                      ).length === 0 ? (
                        <p className="text-center text-xs text-slate-300 py-6">
                          エントリー選手はいません
                        </p>
                      ) : (
                        raceCards
                          .filter((c) => c.tournamentId === selectedTourId)
                          .map((card) => (
                            <div
                              key={card.id}
                              className="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-100"
                            >
                              <div>
                                <p className="font-bold text-sm text-slate-700">
                                  {card.runnerName}
                                </p>
                                <p className="text-[10px] font-bold text-indigo-500">
                                  {card.raceType} / {card.distance}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingCard(card);
                                  setLapInput(card.lapTimes || "");
                                }}
                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm active:scale-95 transition-all flex items-center gap-1"
                              >
                                <Timer size={12} /> LAP入力
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
  );
};

export default ManagerRaceView;
