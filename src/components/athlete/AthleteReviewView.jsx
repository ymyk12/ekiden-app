/*
 * AthleteReviewView — 選手画面の期間レビュー（review）ビュー（表示専用）
 *
 * AthleteView から review ビューを分離。目標達成率ドーナツ、強度分布、
 * コンディションマップ、セルフレビュー入力、監督フィードバック表示を行う。
 * 状態・ハンドラは props で受け取る。
 */
import {
  ArrowLeft,
  Activity,
  AlertCircle,
  HeartPulse,
  MessageSquare,
  Loader2,
  Save,
} from "lucide-react";
import { ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { getGoalValue, getDatesInRange } from "../../utils/dateUtils";

const AthleteReviewView = ({
  safeChangeView,
  targetPeriod,
  currentProfile,
  personalStats,
  periodLogs,
  currentFeedback,
  setReviewComment,
  handleSaveReview,
  isSubmitting,
}) => {
  return (
          <div className="bg-white rounded-[3rem] shadow-sm animate-in fade-in flex flex-col h-[calc(100dvh-290px)]">
            {/* サブヘッダー（固定） */}
            <div className="flex items-center gap-2 px-6 pt-6 pb-4 flex-shrink-0 border-b border-slate-100">
              <button onClick={() => safeChangeView("diary")} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 tracking-[0.3em]">Period Review</h3>
            </div>
            {/* スクロールエリア */}
            <div className="flex-1 overflow-y-auto px-6 py-6 pb-8 space-y-8">

            <div className="bg-slate-50 p-6 rounded-3xl relative overflow-hidden">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center">
                Goal Achievement ({targetPeriod.name})
              </h4>
              {(() => {
                const goalVal = getGoalValue(
                  currentProfile,
                  targetPeriod.id,
                  targetPeriod.type,
                  "goalPeriod",
                );
                const currentVal = personalStats.period;
                const rate =
                  goalVal > 0 ? Math.round((currentVal / goalVal) * 100) : 0;
                const chartData = [
                  { name: "Achieved", value: currentVal },
                  {
                    name: "Remaining",
                    value: Math.max(0, goalVal - currentVal),
                  },
                ];
                return (
                  <div className="flex flex-col items-center justify-center relative">
                    <div className="w-full h-48 relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#e2e8f0" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-4xl font-black text-slate-800 tracking-tighter">
                          {rate}
                          <span className="text-sm">%</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {currentVal} / {goalVal} km
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} /> Training Intensity
              </h4>
              {(() => {
                const counts = { low: 0, mid: 0, high: 0 };
                periodLogs.forEach((l) => {
                  if (l.rpe >= 8) counts.high++;
                  else if (l.rpe >= 5) counts.mid++;
                  else counts.low++;
                });
                const total = periodLogs.length || 1;
                return (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertCircle size={10} /> Hard (RPE 8-10)
                        </span>
                        <span>
                          {counts.high}回 (
                          {Math.round((counts.high / total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${(counts.high / total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span className="text-orange-400">
                          Moderate (RPE 5-7)
                        </span>
                        <span>
                          {counts.mid}回 (
                          {Math.round((counts.mid / total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-orange-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${(counts.mid / total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                        <span className="text-emerald-500">
                          Easy / Recovery (RPE 1-4)
                        </span>
                        <span>
                          {counts.low}回 (
                          {Math.round((counts.low / total) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${(counts.low / total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <HeartPulse size={16} /> Physical Condition Map
              </h4>
              {(() => {
                const dates = getDatesInRange(
                  targetPeriod.start,
                  targetPeriod.end,
                );
                const painMap = {};
                periodLogs.forEach((l) => {
                  if (!painMap[l.date] || painMap[l.date] < l.pain)
                    painMap[l.date] = l.pain;
                });
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {dates.map((date) => {
                        const pain = painMap[date];
                        const day = parseInt(date.split("-")[2], 10);
                        let bgClass = "bg-slate-100 text-slate-300";
                        if (pain === 1)
                          bgClass = "bg-emerald-300 text-emerald-800";
                        if (pain === 2)
                          bgClass = "bg-yellow-300 text-yellow-800";
                        if (pain === 3) bgClass = "bg-orange-400 text-white";
                        if (pain === 4) bgClass = "bg-rose-500 text-white";
                        if (pain === 5) bgClass = "bg-purple-600 text-white";
                        return (
                          <div
                            key={date}
                            title={`${date}: Pain ${pain || "-"}`}
                            className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center text-[10px] font-black shadow-sm transition-all hover:scale-110`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                          <span className="text-[9px] font-bold text-slate-400">
                            Good
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span className="text-[9px] font-bold text-slate-400">
                            Pain
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                          <span className="text-[9px] font-bold text-slate-400">
                            Danger
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-slate-300">
                        {dates.length} Days
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Self Review
              </label>
              <textarea
                className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500 min-h-[150px] text-sm leading-relaxed resize-none"
                placeholder="今期の振り返り、次期の目標など"
                defaultValue={currentFeedback?.runnerComment || ""}
                onChange={(e) => setReviewComment(e.target.value)}
              />
            </div>
            <button
              onClick={handleSaveReview}
              disabled={isSubmitting}
              className={`w-full py-5 rounded-3xl font-black flex items-center justify-center gap-2 transition-all ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-lg shadow-slate-900/20 active:scale-95"}`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> 保存中...
                </>
              ) : (
                <>
                  <Save size={18} /> 振り返りを保存
                </>
              )}
            </button>

            <div className="bg-emerald-50 p-6 rounded-3xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 bg-white/20 rounded-full -mr-6 -mt-6 blur-2xl"></div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <MessageSquare size={12} /> Coach Feedback
                </p>
                {currentFeedback && currentFeedback.coachComment ? (
                  <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {currentFeedback.coachComment}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic font-bold">
                    まだフィードバックはありません
                  </p>
                )}
              </div>
            </div>
            </div>{/* /スクロールエリア */}
          </div>
  );
};

export default AthleteReviewView;
