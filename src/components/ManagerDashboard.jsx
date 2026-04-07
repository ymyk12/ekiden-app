import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import {
  LogOut,
  ChevronRight,
  BookOpen,
  ClipboardList,
  BarChart2,
  ArrowLeft,
  X,
  Save,
  Flag,
  Timer,
} from "lucide-react";

import { ROLES } from "../utils/constants";
import { getTodayStr } from "../utils/dateUtils";
import { toast } from "react-hot-toast";

const ManagerDashboard = ({
  profile,
  allRunners,
  allLogs,
  tournaments = [],
  raceCards = [],
  db,
  appId,
  handleLogout,
  isDemoMode,
}) => {
  const [currentView, setCurrentView] = useState("check");
  const [checkDate, setCheckDate] = useState(getTodayStr());

  // 大会・ログ関連のステート
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [lapInput, setLapInput] = useState("");
  // 🌟 復活：日誌の詳細を開くために必要です！
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 🌟 LAPタイムの保存機能 (マネージャーが選手のノートを更新する)
  const saveLapTime = async () => {
    if (!editingCard) return;
    try {
      if (!isDemoMode) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "raceCards",
            editingCard.id,
          ),
          {
            lapTimes: lapInput,
            updatedAt: new Date().toISOString(),
            updatedBy: `${profile.lastName} (MG)`,
          },
        );
      }
      toast.success(`${editingCard.runnerName}選手のLAPを更新しました！`);
      setEditingCard(null);
    } catch (e) {
      toast.error("保存失敗: " + e.message);
    }
  };

  const shiftDate = (days) => {
    const d = new Date(checkDate);
    d.setDate(d.getDate() + days);
    setCheckDate(d.toLocaleDateString("sv-SE"));
  };

  const monthlyTotals = React.useMemo(() => {
    const targetMonthPrefix = checkDate.slice(0, 7);
    const totals = {};
    allLogs.forEach((l) => {
      if (l.date.startsWith(targetMonthPrefix)) {
        totals[l.runnerId] =
          (totals[l.runnerId] || 0) + (Number(l.distance) || 0);
      }
    });
    return totals;
  }, [allLogs, checkDate]);

  const submissionStatusList = React.useMemo(() => {
    const targetDateStr = checkDate;
    return allRunners
      .filter((runner) => runner.role !== ROLES.MANAGER)
      .map((runner) => {
        const targetLog = allLogs.find(
          (log) => log.runnerId === runner.id && log.date === targetDateStr,
        );
        const monthTotal = monthlyTotals[runner.id] || 0;
        let status = "unsubmitted",
          label = "未";
        if (targetLog) {
          const isRest = targetLog.category === "完全休養";
          if (targetLog.distance > 0) {
            status = "submitted";
            label = `${targetLog.distance}km`;
          } else if (isRest) {
            status = "rest";
            label = "休養";
          } else {
            status = "rest";
            label = "0km";
          }
        }
        return {
          ...runner,
          status,
          label,
          monthTotal: Math.round(monthTotal * 10) / 10,
        };
      });
  }, [allRunners, allLogs, checkDate, monthlyTotals]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-indigo-600 text-white pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">
              Manager Dashboard
            </p>
            <h1 className="text-2xl font-black tracking-tighter">
              {profile.lastName} {profile.firstName}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-indigo-800/50 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
          >
            <LogOut size={14} className="inline mr-1" /> ログアウト
          </button>
        </div>
      </header>

      <main className="px-5 max-w-md mx-auto space-y-6">
        {/* ナビゲーション */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex overflow-x-auto no-scrollbar">
          {["check", "status", "diary", "race"].map((v) => (
            <button
              key={v}
              onClick={() => setCurrentView(v)}
              className={`flex-1 min-w-[70px] py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                currentView === v
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              {v === "check" && <ClipboardList size={14} />}
              {v === "status" && <BarChart2 size={14} />}
              {v === "diary" && <BookOpen size={14} />}
              {v === "race" && <Flag size={14} />}
              {v === "check"
                ? "提出"
                : v === "status"
                  ? "状況"
                  : v === "diary"
                    ? "日誌"
                    : "大会"}
            </button>
          ))}
        </div>

        {/* --- 1. 提出チェック --- */}
        {currentView === "check" && (
          <div className="bg-white p-5 rounded-[2rem] shadow-sm animate-in fade-in">
            <div className="mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Select Date
                </span>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                  {checkDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500"
                >
                  <ArrowLeft size={18} />
                </button>
                <input
                  type="date"
                  className="flex-1 p-3 bg-white rounded-xl font-bold text-slate-700 text-center outline-none border border-slate-200"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                />
                <button
                  onClick={() => shiftDate(1)}
                  className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {submissionStatusList.map((r) => (
                <div
                  key={r.id}
                  className="py-3 flex items-center justify-between px-2 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white ${r.status === "unsubmitted" ? "bg-slate-200" : "bg-indigo-500"}`}
                    >
                      {r.lastName.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-700 block">
                        {r.lastName} {r.firstName}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">
                        月間: {r.monthTotal}km
                      </span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black border ${r.status === "unsubmitted" ? "bg-rose-50 text-rose-400 border-rose-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}
                    >
                      {r.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🌟 2. 状況 (復元) --- */}
        {currentView === "status" && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm animate-in fade-in">
            <h3 className="font-black text-sm text-slate-700 mb-4 flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-500" />{" "}
              月間走行距離ランキング
            </h3>
            <div className="space-y-3">
              {[...submissionStatusList]
                .sort((a, b) => b.monthTotal - a.monthTotal)
                .map((r, index) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 text-center font-black text-sm ${index < 3 ? "text-indigo-600" : "text-slate-400"}`}
                      >
                        {index + 1}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-black text-slate-600 shadow-sm border border-slate-100">
                        {r.lastName.charAt(0)}
                      </div>
                      <span className="font-bold text-sm text-slate-700">
                        {r.lastName} {r.firstName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-indigo-600 text-lg">
                        {r.monthTotal}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 ml-1">
                        km
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 🌟 3. 日誌 (復元) --- */}
        {currentView === "diary" && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm animate-in fade-in">
            <h3 className="font-black text-sm text-slate-700 mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-500" /> チーム日誌
              (最近の記録)
            </h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
              {allLogs.slice(0, 50).map((log) => (
                <div
                  key={log.id}
                  onClick={() => {
                    setSelectedLog(log);
                    setIsDetailOpen(true);
                  }}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition-all cursor-pointer hover:border-indigo-200 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-black text-sm text-slate-800">
                        {log.runnerName}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {log.date.slice(5).replace("-", "/")} · {log.category}
                      </p>
                    </div>
                    <p className="font-black text-indigo-600">
                      {log.distance}km
                    </p>
                  </div>
                  {log.menuDetail && (
                    <p className="text-xs font-bold text-slate-600 line-clamp-2 mt-2 bg-white p-2.5 rounded-xl border border-slate-100">
                      {log.menuDetail}
                    </p>
                  )}
                </div>
              ))}
              {allLogs.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-10 border border-dashed border-slate-200 rounded-2xl">
                  まだ記録がありません
                </p>
              )}
            </div>
          </div>
        )}

        {/* --- 4. 大会記録管理 --- */}
        {currentView === "race" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm">
              <h3 className="font-black text-sm text-slate-700 mb-4 flex items-center gap-2">
                <Flag size={18} className="text-indigo-500" /> Race Management
              </h3>

              {!selectedTourId ? (
                <div className="space-y-3">
                  {tournaments.length === 0 ? (
                    <p className="text-center text-xs text-slate-300 py-10">
                      大会が登録されていません
                    </p>
                  ) : (
                    tournaments.map((tour) => (
                      <button
                        key={tour.id}
                        onClick={() => setSelectedTourId(tour.id)}
                        className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-indigo-300 transition-all text-left"
                      >
                        <div>
                          <p className="font-black text-slate-700">
                            {tour.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {tour.startDate} 〜{tour.endDate || ""}
                          </p>
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                      </button>
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
                    {raceCards.filter((c) => c.tournamentId === selectedTourId)
                      .length === 0 ? (
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
        )}
      </main>

      {/* LAPタイム入力用モーダル */}
      {editingCard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase">
                  Input LAP Times
                </p>
                <h3 className="text-xl font-black text-slate-800">
                  {editingCard.runnerName}
                </h3>
              </div>
              <button
                onClick={() => setEditingCard(null)}
                className="bg-slate-100 p-2 rounded-full text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase">
                <Timer size={12} /> LAP TIME (1km毎など)
              </label>
              <textarea
                className="w-full p-4 bg-indigo-50/50 rounded-2xl font-mono text-sm h-40 outline-none border border-indigo-100 focus:border-indigo-400 resize-none"
                placeholder="1000m: 3'05&#10;2000m: 6'12..."
                value={lapInput}
                onChange={(e) => setLapInput(e.target.value)}
              />
            </div>

            <button
              onClick={saveLapTime}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> タイムを保存して共有
            </button>
            <p className="text-[9px] text-center text-slate-400 font-bold">
              ※保存すると選手の「大会ノート」が自動更新されます
            </p>
          </div>
        </div>
      )}

      {/* 詳細モーダル (復活) */}
      {isDetailOpen && selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsDetailOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Daily Report ({selectedLog.date})
                </p>
                <h3 className="text-xl font-black text-slate-800">
                  {selectedLog.runnerName}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-indigo-50 p-3 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-indigo-400 uppercase">
                  Distance
                </p>
                <p className="text-2xl font-black text-indigo-600">
                  {selectedLog.distance}
                  <span className="text-sm ml-1">km</span>
                </p>
              </div>
              <div className="flex-1 bg-slate-50 p-3 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Type
                </p>
                <p className="text-lg font-black text-slate-600">
                  {selectedLog.category}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-2xl border flex flex-col items-center ${selectedLog.pain >= 3 ? "bg-rose-50 border-rose-200" : "bg-white border-slate-100"}`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Pain
                </span>
                <span
                  className={`text-xl font-black ${selectedLog.pain >= 3 ? "text-rose-500" : "text-slate-700"}`}
                >
                  {selectedLog.pain}{" "}
                  <span className="text-xs text-slate-400">/5</span>
                </span>
              </div>
              <div className="p-3 rounded-2xl border border-slate-100 bg-white flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  RPE
                </span>
                <span className="text-xl font-black text-slate-700">
                  {selectedLog.rpe}{" "}
                  <span className="text-xs text-slate-400">/10</span>
                </span>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Comment / Menu
              </p>
              <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedLog.menuDetail || "（コメントなし）"}
              </p>
            </div>
            <button
              onClick={() => setIsDetailOpen(false)}
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-lg"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
