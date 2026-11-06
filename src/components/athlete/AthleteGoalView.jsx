/*
 * AthleteGoalView — 選手画面の目標設定（goal）ビュー（表示専用）
 *
 * AthleteView から goal ビューを分離。選択期間の月間／期間合計／四半期目標を
 * 入力・保存する。状態・ハンドラは props で受け取る。
 */
import { ArrowLeft, Target, Loader2, Save } from "lucide-react";

const AthleteGoalView = ({
  safeChangeView,
  targetPeriod,
  goalInput,
  setGoalInput,
  activeQuarters,
  updateGoals,
  isSubmitting,
}) => {
  return (
          <div className="bg-white p-6 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => safeChangeView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 tracking-[0.3em]">
                Target Setting
              </h3>
              <div className="w-9" />
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-100">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <Target size={18} className="text-blue-500" />{" "}
                  {targetPeriod.name} の目標
                </h4>
                {targetPeriod.type === "month" && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      月間目標走行距離 (km)
                    </label>
                    <input
                      type="number"
                      placeholder="例: 200"
                      className="w-full p-4 bg-white rounded-2xl font-black text-xl text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-sm"
                      value={goalInput.monthly}
                      onChange={(e) =>
                        setGoalInput({ ...goalInput, monthly: e.target.value })
                      }
                    />
                    <p className="text-[10px] text-slate-400 font-bold ml-1">
                      ※この期間の各月の目標値です
                    </p>
                  </div>
                )}
                {/* 期間合計目標の保存対象は custom/global のみ（App.js updateGoals）。
                    year/month では保存されず無言で破棄されるため入力欄を出さない。 */}
                {(targetPeriod.type === "custom" ||
                  targetPeriod.type === "global") && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      期間合計目標 (km)
                    </label>
                    <input
                      type="number"
                      placeholder="例: 1000"
                      className="w-full p-4 bg-white rounded-2xl font-black text-xl text-emerald-600 outline-none border-2 border-transparent focus:border-emerald-500 transition-all shadow-sm"
                      value={goalInput.period}
                      onChange={(e) =>
                        setGoalInput({ ...goalInput, period: e.target.value })
                      }
                    />
                  </div>
                )}
                {activeQuarters.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      期間内訳 (Quarterly Goals)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {activeQuarters.map((q, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="flex items-baseline gap-1.5">
                            <span className="text-[9px] font-bold text-slate-400">
                              Q{idx + 1}
                            </span>
                            {q.start && q.end && (
                              <span className="text-[9px] font-bold text-slate-400">
                                {q.start.slice(5).replace("-", "/")}-
                                {q.end.slice(5).replace("-", "/")}
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            className="w-full p-3 bg-white rounded-xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 shadow-sm"
                            value={goalInput[`q${idx + 1}`]}
                            onChange={(e) =>
                              setGoalInput({
                                ...goalInput,
                                [`q${idx + 1}`]: e.target.value,
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={updateGoals}
                disabled={isSubmitting}
                className={`w-full py-5 rounded-3xl font-black flex items-center justify-center gap-2 transition-all ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 active:scale-95"}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> 保存中...
                  </>
                ) : (
                  <>
                    <Save size={18} /> 目標を保存
                  </>
                )}
              </button>
            </div>
          </div>
  );
};

export default AthleteGoalView;
