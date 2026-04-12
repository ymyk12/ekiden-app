import React, { useState, useEffect, useMemo } from "react";
import { X, Timer, Save, Calculator, FileText, Check } from "lucide-react";

const LapTimeModal = ({
  editingCard,
  onClose,
  lapInput,
  setLapInput,
  onSave,
}) => {
  const [mode, setMode] = useState("grid");
  const [gridData, setGridData] = useState({});

  // 🌟 入力する「区間（LAP）」を自動生成するロジック
  const segments = useMemo(() => {
    if (!editingCard) return [];

    let distStr = editingCard.distance;
    if (editingCard.raceType === "駅伝" && editingCard.ekidenDistance) {
      const km = parseFloat(editingCard.ekidenDistance);
      if (!isNaN(km)) distStr = `${Math.round(km * 1000)}m`;
    }
    if (!distStr) return [];

    let marksArray = [];
    if (distStr === "800m") {
      marksArray = [200, 400, 600, 800];
    } else if (distStr === "3000mSC") {
      marksArray = [1000, 2000, 3000];
    } else {
      const num = parseInt(distStr.replace(/[^0-9]/g, ""), 10);
      if (isNaN(num) || num <= 0) return [];
      const marks = new Set();
      for (let i = 400; i < num; i += 400) marks.add(i);
      for (let i = 1000; i <= num; i += 1000) marks.add(i);
      marks.add(num);
      marksArray = Array.from(marks).sort((a, b) => a - b);
    }

    const segs = [];
    let prev = 0;
    marksArray.forEach((m) => {
      segs.push({ start: prev, end: m, key: m, label: `${m}m` });
      prev = m;
    });
    return segs;
  }, [editingCard]);

  // 初回起動時のみ復元
  useEffect(() => {
    if (!editingCard) return;
    if (segments.length === 0) {
      setMode("text");
      return;
    }
    if (Object.keys(gridData).length === 0 && lapInput) {
      const newGrid = {};
      const lines = lapInput.split("\n");
      lines.forEach((line) => {
        const match = line.match(/(?:(\d+)-)?(\d+)m:\s*(.+)$/);
        if (match) {
          const endDist = parseInt(match[2], 10);
          newGrid[endDist] = match[3].trim();
        }
      });
      setGridData(newGrid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCard]);

  // ⏱️ どんな形式でも「秒」に変換する最強のパーサー！
  const timeToSeconds = (str) => {
    if (!str) return null;
    // 1. 全角を半角に変換
    let clean = str
      .replace(/[０-９：’”．]/g, function (s) {
        return String.fromCharCode(s.charCodeAt(0) - 0xfee0);
      })
      .trim();

    // 2. 記号を除去して「数字のカタマリ」の配列にする
    // 例: "1.30.00" -> ["1", "30", "00"]
    // 例: "90"00" -> ["90", "00"]
    const parts = clean.split(/[^0-9]+/).filter(Boolean);

    if (parts.length === 0) return null;

    let sec = null;

    if (parts.length === 1) {
      // 例: "90" -> 90秒
      sec = parseInt(parts[0], 10);
    } else if (parts.length === 2) {
      // 要素が2つの場合 ("1:30" なのか "90.50" なのかを判定)
      if (clean.includes(".") || clean.includes('"')) {
        // ピリオドやダブルクォーテーションが含まれていれば「秒とミリ秒」と解釈
        sec =
          parseInt(parts[0], 10) +
          parseInt(parts[1], 10) / Math.pow(10, parts[1].length);
      } else {
        // それ以外（コロンやシングルクォーテーション）は「分と秒」と解釈
        sec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      }
    } else if (parts.length >= 3) {
      // 要素が3つ以上なら「分・秒・ミリ秒」と解釈
      // 例: "1:30.00" や "1'30"00" や "1.30.00"
      sec =
        parseInt(parts[0], 10) * 60 +
        parseInt(parts[1], 10) +
        parseInt(parts[2], 10) / Math.pow(10, parts[2].length);
    }

    return isNaN(sec) ? null : sec;
  };

  // ⏱️ 「秒」を美しいタイム文字列に戻す
  const formatSeconds = (sec) => {
    if (sec == null || isNaN(sec)) return "";
    const m = Math.floor(sec / 60);
    let sNum = sec % 60;
    sNum = Math.round(sNum * 100) / 100;

    let sStr = sNum.toString();
    if (sStr.includes(".")) {
      const parts = sStr.split(".");
      if (parts[1].length === 1) parts[1] += "0";
      sStr = parts[0].padStart(2, "0") + "." + parts[1];
    } else {
      sStr = sStr.padStart(2, "0");
    }

    if (m > 0) return `${m}'${sStr}`;
    return sStr;
  };

  // 🌟 足し算で1000m等の大きなLAPを自動計算するロジック
  useEffect(() => {
    if (mode !== "grid") return;

    let text = "";
    segments.forEach((seg) => {
      if (gridData[seg.key]) text += `${seg.label}: ${gridData[seg.key]}\n`;
    });

    const splits = [];
    let distStr = editingCard?.distance || "";
    if (editingCard?.raceType === "駅伝" && editingCard?.ekidenDistance) {
      distStr = "駅伝";
    }

    const getSum = (start, end) => {
      let total = 0;
      let complete = true;
      let hasAny = false;

      segments.forEach((seg) => {
        if (seg.start >= start && seg.end <= end) {
          const sec = timeToSeconds(gridData[seg.key]);
          if (sec !== null) {
            total += sec;
            hasAny = true;
          } else {
            complete = false; // その区間のLAPが空っぽ、または解読不能なら計算を止める
          }
        }
      });
      return complete && hasAny ? total : null;
    };

    if (distStr === "800m") {
      const s400 = getSum(0, 400);
      const s800 = getSum(400, 800);
      if (s400 !== null) splits.push(`0-400m: ${formatSeconds(s400)}`);
      if (s800 !== null) splits.push(`400-800m: ${formatSeconds(s800)}`);
    } else if (distStr !== "3000mSC") {
      const maxNum =
        segments.length > 0 ? segments[segments.length - 1].end : 0;
      for (let i = 0; i < maxNum; i += 1000) {
        const start = i;
        const end = Math.min(i + 1000, maxNum);
        const sum = getSum(start, end);
        if (sum !== null) {
          splits.push(`${start}-${end}m: ${formatSeconds(sum)}`);
        }
      }
    }

    if (splits.length > 0) {
      text += `\n【区間LAP (自動計算)】\n` + splits.join("\n");
    }

    setLapInput(text.trim());
  }, [gridData, segments, mode, setLapInput, editingCard]);

  if (!editingCard) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div
        className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start border-b border-slate-100 pb-3 flex-shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">
              Input LAP Times
            </p>
            <h3 className="text-xl font-black text-slate-800">
              {editingCard.runnerName}
            </h3>
            <p className="text-[10px] font-bold text-indigo-500 bg-indigo-50 inline-block px-2 py-0.5 rounded-md mt-1">
              {editingCard.raceType} /{" "}
              {editingCard.raceType === "駅伝"
                ? `${editingCard.distance}(${editingCard.ekidenDistance}km)`
                : editingCard.distance}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-xl flex-shrink-0">
          <button
            onClick={() => setMode("grid")}
            disabled={segments.length === 0}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-all ${
              mode === "grid"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600 disabled:opacity-50"
            }`}
          >
            <Calculator size={14} /> スマート入力
          </button>
          <button
            onClick={() => setMode("text")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-all ${
              mode === "text"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <FileText size={14} /> テキスト入力
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px]">
          {mode === "grid" ? (
            <div className="space-y-3 pb-2">
              <p className="text-[10px] font-bold text-slate-400 text-center leading-relaxed">
                ⏱️ 各区間の<span className="text-indigo-500">LAPタイム</span>
                をそのまま入力してください
                <br />
                （1.30.00 や 90"00 など、色々な打ち方に対応！）
              </p>
              {segments.map((seg) => (
                <div
                  key={seg.key}
                  className={`flex items-center gap-3 p-2 rounded-xl border ${
                    seg.end % 1000 === 0 ||
                    seg.end === segments[segments.length - 1].end
                      ? "bg-indigo-50/30 border-indigo-100"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <label className="w-16 text-right text-xs font-black text-slate-500">
                    {seg.label}
                  </label>
                  <input
                    type="text"
                    placeholder="LAP"
                    className="flex-1 p-2.5 bg-white rounded-lg font-bold text-sm outline-none border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    value={gridData[seg.key] || ""}
                    onChange={(e) =>
                      setGridData({ ...gridData, [seg.key]: e.target.value })
                    }
                  />
                </div>
              ))}

              {lapInput.includes("【区間LAP") && (
                <div className="mt-4 p-4 bg-slate-800 rounded-xl shadow-inner animate-in fade-in">
                  <p className="text-[10px] font-black text-emerald-400 mb-2 flex items-center gap-1">
                    <Check size={12} /> 自動計算プレビュー
                  </p>
                  <p className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {lapInput
                      .split("【区間LAP")[1]
                      .replace("(自動計算)】\n", "")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col space-y-2">
              <label className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase">
                <Timer size={12} /> 自由テキスト入力
              </label>
              <textarea
                className="flex-1 w-full p-4 bg-indigo-50/50 rounded-2xl font-mono text-sm outline-none border border-indigo-100 focus:border-indigo-400 resize-none leading-relaxed"
                placeholder="1000m: 3'05&#10;2000m: 6'12..."
                value={lapInput}
                onChange={(e) => setLapInput(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="pt-2 flex-shrink-0 space-y-3">
          <button
            onClick={onSave}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} /> タイムを保存して共有
          </button>
          <p className="text-[9px] text-center text-slate-400 font-bold">
            ※保存すると選手の「大会ノート」が自動更新されます
          </p>
        </div>
      </div>
    </div>
  );
};

export default LapTimeModal;
