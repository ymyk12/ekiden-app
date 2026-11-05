/*
 * CoachLogEditModal — 監督による練習記録の修正モーダル（表示専用）
 *
 * CoachView から isCoachEditModalOpen のモーダル JSX を分離。選手の練習ログ
 * （日付・距離・メニュー・RPE・Pain）を監督が修正／削除する。
 * 状態・ハンドラは CoachView 側に残し props で受け取る。
 */
import { Edit, Trash2, Loader2 } from "lucide-react";

const CoachLogEditModal = ({
  logInput,
  setLogInput,
  handleCoachDeleteLog,
  handleCoachUpdateLog,
  setIsCoachEditModalOpen,
  setEditingLogId,
  resetForm,
  isSubmitting,
}) => {
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
        <h3 className="font-black text-lg text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Edit className="text-blue-600" size={20} /> 記録の修正 (監督)
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400">
                日付
              </label>
              <input
                type="date"
                className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm"
                value={logInput.date}
                onChange={(e) =>
                  setLogInput({ ...logInput, date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400">
                距離(km)
              </label>
              <input
                type="number"
                step="0.1"
                className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm"
                value={logInput.distance}
                onChange={(e) =>
                  setLogInput({ ...logInput, distance: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400">
              メニュー
            </label>
            <textarea
              className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm h-16 resize-none"
              value={logInput.menuDetail}
              onChange={(e) =>
                setLogInput({ ...logInput, menuDetail: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400">
                RPE
              </label>
              <input
                type="number"
                min="1"
                max="10"
                className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm"
                value={logInput.rpe}
                onChange={(e) =>
                  setLogInput({
                    ...logInput,
                    rpe:
                      e.target.value === ""
                        ? ""
                        : parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400">
                Pain
              </label>
              <input
                type="number"
                min="1"
                max="5"
                className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm"
                value={logInput.pain}
                onChange={(e) =>
                  setLogInput({
                    ...logInput,
                    pain:
                      e.target.value === ""
                        ? ""
                        : parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-4 border-t border-slate-100 mt-2">
          <button
            onClick={handleCoachDeleteLog}
            className="p-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors"
            title="この記録を削除"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={() => {
              setIsCoachEditModalOpen(false);
              setEditingLogId(null);
              resetForm();
            }}
            className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleCoachUpdateLog}
            disabled={isSubmitting}
            className={`flex-1 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> 更新中...
              </>
            ) : (
              "更新して保存"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachLogEditModal;
