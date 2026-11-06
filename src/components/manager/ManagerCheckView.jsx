/*
 * ManagerCheckView — マネージャーの提出状況チェック（check）ビュー（表示専用）
 *
 * ManagerDashboard から check ビューを分離。日付選択と、その日の選手提出状況
 * 一覧を表示する。状態・派生データ・ハンドラは props で受け取る。
 */
import { ArrowLeft, ChevronRight, HeartPulse, Check } from "lucide-react";

const ManagerCheckView = ({
  shiftDate,
  checkDate,
  setCheckDate,
  submissionStatusList,
  allLogs,
  setSelectedLog,
  setIsDetailOpen,
}) => {
  return (
          <div className="h-full flex flex-col gap-4 animate-in fade-in">
            <div className="bg-white px-5 py-4 rounded-[2rem] shadow-sm flex-shrink-0">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Select Date
                  </span>
                  <span className="text-[11px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                    {checkDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:bg-indigo-50"
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
                    className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:bg-indigo-50"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="px-5 pt-5 pb-3 flex-shrink-0 border-b border-slate-100">
                <h3 className="font-black text-sm text-slate-700">提出状況</h3>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1 pb-4">
                {submissionStatusList.map((r) => {
                  const targetLog = allLogs.find(
                    (l) => l.runnerId === r.id && l.date === checkDate,
                  );
                  return (
                    <div
                      key={r.id}
                      onClick={() => {
                        if (targetLog) {
                          setSelectedLog(targetLog);
                          setIsDetailOpen(true);
                        }
                      }}
                      className={`py-3 flex items-center justify-between px-2 rounded-xl transition-all ${targetLog ? "cursor-pointer hover:bg-indigo-50" : "opacity-70"}`}
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
                          <div className="flex gap-2 items-center">
                            <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-1.5 rounded">
                              月間: {r.monthTotal}km
                            </span>
                            {targetLog && targetLog.pain >= 3 && (
                              <span className="text-[11px] text-rose-500 font-bold flex items-center gap-0.5 animate-pulse">
                                <HeartPulse size={10} /> Pain
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        {r.status === "unsubmitted" ? (
                          <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                            未提出
                          </span>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-[11px] font-black border flex items-center gap-1 ${r.status === "rest" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}
                          >
                            <Check size={10} /> {r.label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
  );
};

export default ManagerCheckView;
