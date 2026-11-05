/*
 * CoachRaceView — 監督の大会（レース）管理画面
 *
 * CoachView から coach-race ビューの JSX を分離。大会の登録/編集/削除、
 * 月フィルター、提出枚数・フィードバック状況の表示を扱う。
 * この画面専用の UI 状態（登録モーダルの開閉・月フィルター・編集中の大会）は
 * 子で保持し、大会データや遷移系の setter は CoachView から props で受け取る。
 */
import { useState } from "react";
import {
  Plus,
  Flag,
  X,
  BarChart2,
  ClipboardCheck,
  MessageSquare,
  Check,
  Edit,
  Trash2,
} from "lucide-react";
import { updateDoc } from "firebase/firestore";
import { docRef } from "../../utils/firestore";

const CoachRaceView = ({
  tournaments,
  raceCards,
  newTournamentInput,
  setNewTournamentInput,
  handleSaveTournament,
  handleDeleteTournament,
  isSubmitting,
  setShowTeamReportId,
  setSelectedTourId,
  setOnlyPendingFeedback,
}) => {
  const [isNewTournamentModalOpen, setIsNewTournamentModalOpen] =
    useState(false);
  const [editingTourId, setEditingTourId] = useState(null);
  const [editingTourInput, setEditingTourInput] = useState({ name: "", startDate: "", endDate: "" });
  const [raceMonthFilter, setRaceMonthFilter] = useState("all");

  return (
    <div className="bg-white p-5 rounded-[2rem] shadow-sm space-y-3 animate-in fade-in">
      <button
        onClick={() => setIsNewTournamentModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
      >
        <Plus size={15} strokeWidth={3} /> 新しい大会を登録する
      </button>

      {/* 大会登録モーダル */}
      {isNewTournamentModalOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsNewTournamentModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-[2rem] p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
                <Flag size={14} /> 新しい大会を登録する
              </h4>
              <button
                onClick={() => setIsNewTournamentModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="大会名 (例: 秋季県大会)"
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-sm"
              value={newTournamentInput.name}
              onChange={(e) =>
                setNewTournamentInput({
                  ...newTournamentInput,
                  name: e.target.value,
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                value={newTournamentInput.startDate}
                onChange={(e) =>
                  setNewTournamentInput({
                    ...newTournamentInput,
                    startDate: e.target.value,
                  })
                }
              />
              <input
                type="date"
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                value={newTournamentInput.endDate}
                onChange={(e) =>
                  setNewTournamentInput({
                    ...newTournamentInput,
                    endDate: e.target.value,
                  })
                }
              />
            </div>
            <button
              onClick={async () => {
                await handleSaveTournament();
                setIsNewTournamentModalOpen(false);
              }}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-black text-sm transition-all ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"}`}
            >
              {isSubmitting ? "登録中..." : "登録・通知"}
            </button>
          </div>
        </div>
      )}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Registered Races
        </h4>
        {tournaments.length > 0 &&
          (() => {
            const months = [
              ...new Set(
                tournaments
                  .map((t) => t.startDate?.slice(0, 7))
                  .filter(Boolean),
              ),
            ]
              .sort()
              .reverse();
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
        <div className="overflow-y-auto max-h-[calc(100dvh-300px)] space-y-3 pr-1">
          {tournaments.length === 0 ? (
            <p className="text-center text-xs text-slate-400 font-bold py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              大会はまだ登録されていません
            </p>
          ) : (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {tournaments
                .filter(
                  (t) =>
                    raceMonthFilter === "all" ||
                    t.startDate?.slice(0, 7) === raceMonthFilter,
                )
                .map((tour) => (
                  <div
                    key={tour.id}
                    className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm"
                  >
                    {editingTourId === tour.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingTourInput.name}
                          onChange={(e) => setEditingTourInput((p) => ({ ...p, name: e.target.value }))}
                          className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                          placeholder="大会名"
                          autoFocus
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={editingTourInput.startDate} onChange={(e) => setEditingTourInput((p) => ({ ...p, startDate: e.target.value }))} className="p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400" />
                          <input type="date" value={editingTourInput.endDate} onChange={(e) => setEditingTourInput((p) => ({ ...p, endDate: e.target.value }))} className="p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={async () => {
                              if (!editingTourInput.name) return;
                              await updateDoc(docRef("tournaments", tour.id), {
                                name: editingTourInput.name,
                                startDate: editingTourInput.startDate,
                                endDate: editingTourInput.endDate,
                              });
                              setEditingTourId(null);
                            }}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 active:scale-95 transition-all"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingTourId(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-black hover:bg-slate-200 active:scale-95 transition-all"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div className="flex justify-between items-center">
                    <div
                      className="flex-1 cursor-pointer group pr-4"
                      onClick={() => setShowTeamReportId(tour.id)}
                    >
                      <h5 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        {tour.name}{" "}
                        <BarChart2
                          size={16}
                          className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        />
                      </h5>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        {tour.startDate.replace(/-/g, "/")} 〜{" "}
                        {tour.endDate?.replace(/-/g, "/") || ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => { setSelectedTourId(tour.id); setOnlyPendingFeedback(false); }}
                          className="active:scale-95 transition-all"
                        >
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1 hover:bg-indigo-100 shadow-sm">
                            <ClipboardCheck size={12} />
                            {raceCards.filter((card) => card.tournamentId === tour.id).length}{" "}枚提出
                          </span>
                        </button>
                        {(() => {
                          const pending = raceCards.filter((card) => card.tournamentId === tour.id && !card.coachFeedback && !card.feedbackSkipped).length;
                          return pending > 0 ? (
                            <button
                              onClick={() => { setSelectedTourId(tour.id); setOnlyPendingFeedback(true); }}
                              className="active:scale-95 transition-all"
                            >
                              <span className="text-[10px] font-black bg-amber-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm hover:bg-amber-600">
                                <MessageSquare size={10} /> FB未 {pending}件
                              </span>
                            </button>
                          ) : raceCards.filter((card) => card.tournamentId === tour.id).length > 0 ? (
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                              <Check size={10} /> FB完了
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <button
                        onClick={() => {
                          setEditingTourId(tour.id);
                          setEditingTourInput({ name: tour.name, startDate: tour.startDate, endDate: tour.endDate || "" });
                        }}
                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="大会情報を編集する"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTournament(tour.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="大会を削除する"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachRaceView;
