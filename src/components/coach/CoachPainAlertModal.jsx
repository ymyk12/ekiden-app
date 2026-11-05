/*
 * CoachPainAlertModal — コンディション警告リストのモーダル（表示専用）
 *
 * CoachView から isPainAlertModalOpen のモーダル JSX を分離。痛み・疲労などの
 * アラートが出ている選手の一覧を表示し、各選手の詳細（個別画面）へ遷移する。
 * 状態・ハンドラ・集計データは CoachView 側に残し props で受け取る。
 */
import {
  AlertTriangle,
  X,
  HeartPulse,
  Activity,
  ChevronRight,
} from "lucide-react";

const CoachPainAlertModal = ({
  coachStats,
  setIsPainAlertModalOpen,
  handleCoachEditRunner,
}) => {
  return (
    <div
      className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
      onClick={() => setIsPainAlertModalOpen(false)}
    >
      <div
        className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-black text-lg text-rose-600 flex items-center gap-2">
            <AlertTriangle size={20} /> Condition Alert List
          </h3>
          <button
            onClick={() => setIsPainAlertModalOpen(false)}
            className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
          {coachStats.alertList?.map(
            ({ runner, latestLog, alerts }) => (
              <div
                key={runner.id}
                className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col gap-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-rose-500 shadow-sm text-sm">
                      {runner.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        {runner.lastName} {runner.firstName}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {latestLog
                          ? latestLog.date.slice(5).replace("-", "/")
                          : "記録なし"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {alerts.map((a, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-sm ${a.color}`}
                      >
                        {a.type === "pain" && <HeartPulse size={12} />}
                        {a.type === "fatigue" && <Activity size={12} />}
                        {a.label}
                      </span>
                    ))}
                  </div>
                </div>
                {latestLog && (
                  <div className="bg-white/60 p-2 rounded-xl mt-1">
                    <p className="text-[11px] text-slate-600 font-bold">
                      {latestLog.category}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {latestLog.menuDetail || "（コメントなし）"}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setIsPainAlertModalOpen(false);
                    handleCoachEditRunner(runner);
                  }}
                  className="text-[10px] font-bold text-rose-400 text-right hover:text-rose-600 flex items-center justify-end gap-1 mt-1"
                >
                  詳細・連絡する <ChevronRight size={12} />
                </button>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachPainAlertModal;
