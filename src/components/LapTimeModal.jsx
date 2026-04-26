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
      {/* 🌟 修正ポイント：ここに max-h-[90vh] と overflow-y-auto を追加し、はみ出しを防ぎます！ */}
      <div
        className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-shrink-0">
          <h3 className="font-black text-lg text-indigo-600 flex items-center gap-2">
            <Timer size={20} /> LAPタイム入力
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
            {editingCard.raceType} / {editingCard.distance}
          </p>
        </div>

        {/* LAP入力コンポーネント（制限なしで自然に伸びます） */}
        <div className="flex-1">
          <SmartLapInput
            value={lapInput}
            onChange={setLapInput}
            raceType={editingCard.raceType}
            distance={editingCard.distance}
            onResultChange={onResultChange}
          />
        </div>

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
