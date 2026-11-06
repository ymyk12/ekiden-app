/*
 * AthleteEntryView — 選手画面の練習記録入力（entry）ビュー（表示専用）
 *
 * AthleteView から entry ビューを分離。日付・区分・距離・メニュー・RPE・Pain の
 * 入力、保存／更新／完全休養の記録を行う。状態・ハンドラは props で受け取る。
 */
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { CATEGORY } from "../../utils/constants";

const AthleteEntryView = ({
  safeChangeView,
  logInput,
  setLogInput,
  handleSaveLog,
  isSubmitting,
  editingLogId,
  setEditingLogId,
  resetForm,
  handleRestRegister,
}) => {
  return (
          <div className="bg-white p-4 rounded-[3rem] shadow-sm space-y-3 animate-in fade-in">
            {/* ヘッダー */}
            <div className="flex items-center gap-2 pb-1">
              <button
                onClick={() => safeChangeView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft size={18} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400">
                Daily Entry
              </h3>
            </div>

            {/* 今日・昨日クイック選択 */}
            <div className="flex gap-2">
              {[
                { label: "今日", offset: 0 },
                { label: "昨日", offset: 1 },
              ].map(({ label, offset }) => {
                const d = new Date();
                d.setDate(d.getDate() - offset);
                const dateStr = d.toLocaleDateString("sv-SE");
                const isSelected = logInput.date === dateStr;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setLogInput({ ...logInput, date: dateStr })}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${isSelected ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Date + Type */}
            {/* フォントは16px(text-base)未満にしない: iOS Safariがフォーカス時に自動ズームするため */}
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500 text-base"
                value={logInput.date}
                onChange={(e) => setLogInput({ ...logInput, date: e.target.value })}
              />
              <select
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500 text-base appearance-none"
                value={logInput.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  const next = { ...logInput, category: cat };
                  if (cat === CATEGORY.REST) {
                    next.distance = "0";
                  } else if (
                    logInput.category === CATEGORY.REST &&
                    logInput.distance === "0"
                  ) {
                    next.distance = "";
                  }
                  setLogInput(next);
                }}
              >
                <option value="" disabled>
                  区分を選択
                </option>
                {Object.values(CATEGORY).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Distance */}
            <div className="space-y-1">
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="0.0"
                  disabled={logInput.category === CATEGORY.REST}
                  className="w-full p-3 pr-14 bg-blue-50/40 border border-blue-100 rounded-2xl font-black text-3xl text-blue-600 text-center outline-none focus:ring-2 ring-blue-500 disabled:bg-slate-50 disabled:border-slate-200 disabled:text-slate-300"
                  value={logInput.distance}
                  onChange={(e) => setLogInput({ ...logInput, distance: e.target.value })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-blue-400">km</span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold text-center">
                {logInput.category === CATEGORY.REST
                  ? "完全休養日として 0km で記録されます"
                  : "アップ・ダウンを含めた距離を入力してください"}
              </p>
            </div>

            {/* Menu Detail */}
            <textarea
              placeholder="メニューの内容、タイムなど"
              className="w-full p-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 outline-none focus:ring-2 ring-blue-500 text-base resize-none min-h-[120px]"
              value={logInput.menuDetail}
              onChange={(e) => setLogInput({ ...logInput, menuDetail: e.target.value })}
            />

            {/* RPE + Pain 横並び */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 px-3 py-2.5 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">RPE 強度</label>
                  <span className={`text-lg font-black ${logInput.rpe >= 7 ? "text-rose-500" : logInput.rpe >= 4 ? "text-amber-500" : "text-emerald-600"}`}>{logInput.rpe}</span>
                </div>
                <input
                  type="range" min="1" max="10" step="1"
                  className={`w-full ${logInput.rpe >= 7 ? "accent-rose-500" : logInput.rpe >= 4 ? "accent-amber-500" : "accent-emerald-500"}`}
                  value={logInput.rpe}
                  onChange={(e) => setLogInput({ ...logInput, rpe: parseInt(e.target.value, 10) })}
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 leading-none">
                  <span>楽</span>
                  <span>限界</span>
                </div>
              </div>
              <div className="bg-slate-50 px-3 py-2.5 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Pain 痛み</label>
                  <span className={`text-lg font-black ${logInput.pain >= 3 ? "text-rose-500" : "text-slate-700"}`}>{logInput.pain}</span>
                </div>
                <input
                  type="range" min="1" max="5" step="1"
                  className="w-full accent-rose-500"
                  value={logInput.pain}
                  onChange={(e) => setLogInput({ ...logInput, pain: parseInt(e.target.value, 10) })}
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 leading-none">
                  <span>なし</span>
                  <span>強い</span>
                </div>
              </div>
            </div>

            {/* ボタン群 */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSaveLog}
                disabled={isSubmitting || !logInput.distance}
                className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isSubmitting || !logInput.distance ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 active:scale-95"}`}
              >
                {isSubmitting ? (
                  <><Loader2 size={16} className="animate-spin" /> {editingLogId ? "更新中..." : "保存中..."}</>
                ) : (
                  <><Save size={16} /> {editingLogId ? "更新する" : "保存する"}</>
                )}
              </button>
              {editingLogId && (
                <button
                  onClick={() => { setEditingLogId(null); resetForm(); }}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                >
                  キャンセル
                </button>
              )}
              {!logInput.distance && !editingLogId && (
                <button
                  onClick={handleRestRegister}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                >
                  完全休養として記録
                </button>
              )}
            </div>
          </div>
  );
};

export default AthleteEntryView;
