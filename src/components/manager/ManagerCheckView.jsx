/*
 * ManagerCheckView — マネージャーの提出状況チェック（check）ビュー（表示専用）
 *
 * ManagerDashboard から check ビューを分離。日付選択と、その日の選手提出状況
 * 一覧を表示する。状態・派生データ・ハンドラは props で受け取る。
 */
import { ArrowLeft, ChevronRight } from "lucide-react";
import SubmissionStatusRow from "../shared/SubmissionStatusRow";

const ManagerCheckView = ({
  shiftDate,
  checkDate,
  setCheckDate,
  submissionStatusList,
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
              <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-slate-100 pb-4">
                {submissionStatusList.map((r) => (
                  <SubmissionStatusRow key={r.id} runner={r} />
                ))}
              </div>
            </div>
          </div>
  );
};

export default ManagerCheckView;
