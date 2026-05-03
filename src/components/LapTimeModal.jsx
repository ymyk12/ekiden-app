/*
 * LapTimeModal — LAPタイム入力モーダル
 *
 * 監督が選手の大会振り返りシートに
 * LAPタイムを後から入力・修正するためのポップアップ画面。
 * 内部で SmartLapInput を使用する。
 */
import React from "react";
import { X, Save, Timer } from "lucide-react";
import SmartLapInput from "./SmartLapInput";

const LapTimeModal = ({
  editingCard,
  onClose,
  lapInput,
  setLapInput,
  onSave,
  onResultChange,
}) => {
  if (!editingCard) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-shrink-0">
          <h3 className="font-black text-lg text-indigo-600 flex items-center gap-2">
            <Timer size={20} /> 記録入力
          </h3>
          <button
            onClick={onClose}
            className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-2 flex-shrink-0">
          <p className="text-[10px] font-bold text-slate-400">対象選手</p>
          <p className="font-bold text-slate-700">{editingCard.runnerName}</p>
          <p className="text-xs font-bold text-indigo-500">
            {editingCard.raceType} /{" "}
            {editingCard.distance === "その他"
              ? editingCard.ekidenDistance
              : editingCard.distance}
          </p>
        </div>

        {/* 「その他」の場合は自由記述に切り替える */}
        {editingCard.distance === "その他" ? (
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 ml-1">
                LAP / 試技記録
              </label>
              <textarea
                className="w-full p-4 bg-slate-50 rounded-2xl font-mono text-sm outline-none border border-slate-200 focus:border-indigo-400 min-h-[150px] resize-none"
                placeholder={`例:\n1本目: 6m50\n2本目: F\n3本目: 6m80`}
                value={lapInput}
                onChange={(e) => setLapInput(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 ml-1">
                Official Result
              </label>
              <input
                type="text"
                className="w-full p-4 bg-slate-50 rounded-2xl font-black text-lg text-indigo-600 outline-none border border-slate-200 focus:border-indigo-400"
                placeholder="例: 6m80, 11.50"
                value={editingCard.resultTime || ""}
                onChange={(e) => onResultChange(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <SmartLapInput
              value={lapInput}
              resultValue={editingCard.resultTime || ""}
              onChange={setLapInput}
              raceType={editingCard.raceType}
              distance={
                editingCard.raceType === "駅伝"
                  ? editingCard.ekidenDistance
                  : editingCard.distance
              }
              onResultChange={onResultChange}
            />
          </div>
        )}

        <div className="flex gap-2 pt-4 flex-shrink-0 border-t border-slate-100 mt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onSave}
            className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} /> 保存する
          </button>
        </div>
      </div>
    </div>
  );
};

export default LapTimeModal;
