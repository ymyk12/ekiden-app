/*
 * AthleteRaceView — 選手画面の大会ハブ（race）ビュー（表示専用）
 *
 * AthleteView から race ビューを分離。大会ごとの自分のレースカード一覧・
 * 新規追加・チームレポートへの導線を表示する。月フィルターのみ内部で保持し、
 * データ・ハンドラは props で受け取る。
 */
import { useState } from "react";
import {
  ArrowLeft,
  Flag,
  Calendar,
  MessageSquare,
  ChevronRight,
  Plus,
  Users,
} from "lucide-react";

const AthleteRaceView = ({
  safeChangeView,
  tournaments,
  raceCards,
  currentUserId,
  setRaceCardInput,
  setEditingRaceCardId,
  setView,
  setShowTeamReportId,
}) => {
  const [raceMonthFilter, setRaceMonthFilter] = useState("all");

  return (
          <div className="bg-white p-6 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in pb-24">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => safeChangeView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Race Cards
              </h3>
              <div className="w-9" />
            </div>

            <div className="space-y-4">
              {tournaments.length > 0 && (() => {
                const months = [...new Set(tournaments.map(t => t.startDate?.slice(0, 7)).filter(Boolean))].sort().reverse();
                return (
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {["all", ...months].map((m) => (
                      <button
                        key={m}
                        onClick={() => setRaceMonthFilter(m)}
                        className={`flex-none px-3 py-1 rounded-full text-[10px] font-black transition-all ${raceMonthFilter === m ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                      >
                        {m === "all" ? "すべて" : m.replace("-", "/")}
                      </button>
                    ))}
                  </div>
                );
              })()}
              <div className="space-y-6 overflow-y-auto max-h-[calc(100dvh-400px)] pr-1">
              {tournaments.length === 0 ? (
                <div className="text-center py-10">
                  <Flag size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-xs font-bold text-slate-400">
                    予定されている大会はありません
                  </p>
                </div>
              ) : (
                tournaments.filter(t => raceMonthFilter === "all" || t.startDate?.slice(0, 7) === raceMonthFilter).map((tour) => {
                  const myCards = raceCards.filter(
                    (c) =>
                      c.tournamentId === tour.id &&
                      c.runnerId === currentUserId,
                  );
                  const now = new Date().toISOString().slice(0, 10);
                  const isOngoing =
                    now >= tour.startDate && now <= tour.endDate;
                  return (
                    <div
                      key={tour.id}
                      className={`p-5 rounded-3xl border transition-all ${isOngoing ? "bg-blue-50/30 border-blue-200 shadow-md" : "bg-slate-50 border-slate-100"}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-slate-800">
                            {tour.name}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar size={12} />{" "}
                            {tour.startDate.replace(/-/g, "/")} 〜{" "}
                            {tour.endDate.replace(/-/g, "/")}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {myCards.map((card) => (
                          <div
                            key={card.id}
                            onClick={() => {
                              setRaceCardInput(card);
                              setEditingRaceCardId(card.id);
                              setView("race-entry");
                            }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-all group"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                                  {card.raceType}
                                </span>
                                {/* 達成バッジ */}
                                {(card.badges || []).map((badge) => (
                                  <span
                                    key={badge}
                                    className={`text-[9px] font-black px-2 py-1 rounded-lg text-white ${
                                      badge === "自己ベスト"
                                        ? "bg-orange-500"
                                        : badge === "組1位"
                                          ? "bg-blue-500"
                                          : "bg-emerald-500"
                                    }`}
                                  >
                                    {badge}
                                  </span>
                                ))}
                                {/* フィードバックがあれば通知バッジを表示 */}
                                {card.coachFeedback && (
                                  <span className="bg-indigo-500 text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse flex items-center gap-1 shadow-sm">
                                    <MessageSquare size={10} /> コメントあり
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-black text-slate-400 group-hover:text-blue-500 flex items-center gap-1">
                                編集 <ChevronRight size={14} />
                              </span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="font-black text-lg text-slate-700">
                                  {card.distance === "その他"
                                    ? card.ekidenDistance
                                    : card.raceType === "駅伝"
                                      ? `${card.distance}(${card.ekidenDistance}km)`
                                      : card.distance}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">
                                  目標: {card.targetTime || "未設定"}
                                </p>
                              </div>
                              <div className="text-right">
                                {card.resultTime ? (
                                  <>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                      Result
                                    </p>
                                    <p className="font-black text-emerald-600">
                                      {card.resultTime}
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">
                                    レース前
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setEditingRaceCardId(null);
                            setRaceCardInput({
                              tournamentId: tour.id,
                              raceType: "トラック",
                              distance: "1500m",
                              ekidenDistance: "",
                              targetTime: "",
                              wupPlan: "",
                              racePlan: "",
                              condition: 3,
                              weather: "",
                              wind: "",
                              temp: "",
                              humidity: "",
                              resultTime: "",
                              lapTimes: "",
                              goodPoints: "",
                              issues: "",
                              teammateGoodPoints: "",
                              nextGoal: "",
                            });
                            setView("race-entry");
                          }}
                          className="w-full py-3 border-2 border-dashed border-blue-200 text-blue-500 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={16} /> 出場種目を追加
                        </button>
                        {/* チームレポートを開くボタン */}
                        <button
                          onClick={() => setShowTeamReportId(tour.id)}
                          className="w-full py-3 mt-4 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-black text-sm hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Users size={18} /> 今大会のチームレポートを見る
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>
          </div>
  );
};

export default AthleteRaceView;
