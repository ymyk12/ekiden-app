/*
 * ManagerStatusView — マネージャーのチーム状況（status）ビュー（表示専用）
 *
 * ManagerDashboard から status ビューを分離。月間ランキングとチーム活動
 * フィードを表示する。状態・派生データ・ハンドラは props で受け取る。
 */
import { Trophy, Activity } from "lucide-react";
import RankingList from "../shared/RankingList";
import TeamActivityFeed from "../shared/TeamActivityFeed";

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
              <div className="max-h-[268px] overflow-y-auto pr-2 custom-scrollbar">
                <RankingList rankingData={rankingData} />
              </div>
            </div>
            <div className="bg-white rounded-[2rem] shadow-sm flex-1 overflow-hidden flex flex-col">
              <div className="px-6 pt-6 pb-3 flex-shrink-0 border-b border-slate-100">
                <h3 className="font-black text-sm text-slate-700 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-500" /> Team
                  Activity
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto pl-8 pr-6 py-4 custom-scrollbar">
                <TeamActivityFeed
                  logs={teamActivityLogs}
                  accent="indigo"
                  onRowClick={(log) => {
                    setSelectedLog(log);
                    setIsDetailOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
  );
};

export default ManagerStatusView;
