/*
 * ManagerStatusView — マネージャーのチーム状況（status）ビュー（表示専用）
 *
 * ManagerDashboard から status ビューを分離。月間ランキングとチーム活動
 * フィードを表示する。状態・派生データ・ハンドラは props で受け取る。
 */
import { Trophy, Activity } from "lucide-react";

const ManagerStatusView = ({
  checkDate,
  rankingData,
  teamActivityLogs,
  setSelectedLog,
  setIsDetailOpen,
}) => {
  return (
          <div className="h-full flex flex-col gap-4 animate-in fade-in">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-sm text-slate-700 flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" /> 月間ランキング
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                  {new Date(checkDate).getMonth() + 1}月度
                </span>
              </div>
              <div className="space-y-3 max-h-[268px] overflow-y-auto pr-2 custom-scrollbar">
                {rankingData.map((runner, idx) => (
                  <div
                    key={runner.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl relative overflow-hidden"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-slate-300" : idx === 2 ? "bg-orange-300" : "bg-transparent"}`}
                    ></div>
                    <div className="flex items-center gap-3 pl-2">
                      <span className="text-xs font-black text-slate-400 w-4">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {runner.name}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-700">
                      {runner.total}
                      <span className="text-[10px] text-slate-400 ml-0.5">
                        km
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="px-6 pt-6 pb-3 flex-shrink-0 border-b border-slate-100">
                <h3 className="font-black text-sm text-slate-700 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-500" /> Team
                  Activity
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto pl-8 pr-6 py-4 space-y-4 custom-scrollbar">
                {teamActivityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 relative"
                    onClick={() => {
                      setSelectedLog(log);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="absolute left-[19px] top-8 bottom-[-16px] w-0.5 bg-slate-100 last:hidden"></div>
                    <div
                      className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm z-10 ${log.category === "完全休養" ? "bg-emerald-400" : "bg-indigo-500"}`}
                    >
                      {log.runnerName ? log.runnerName.charAt(0) : "?"}
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl w-full border border-slate-100 cursor-pointer hover:border-indigo-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400">
                            {log.date.slice(5).replace("-", "/")}{" "}
                            <span className="text-slate-300">·</span>{" "}
                            {log.runnerName}
                          </p>
                          <p className="text-sm font-black mt-0.5 text-slate-700">
                            {log.category === "完全休養"
                              ? "完全休養"
                              : `${log.distance}km`}
                          </p>
                        </div>
                      </div>
                      {log.menuDetail && (
                        <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-2">
                          {log.menuDetail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
  );
};

export default ManagerStatusView;
