import React, { useState, useEffect, useMemo } from "react";

const SmartLapInput = ({ value, onChange, raceType, distance }) => {
  // 1. 距離を数値化
  const totalDist = useMemo(() => {
    if (!distance) return 0;
    let dist = parseInt(distance.replace(/[^0-9]/g, ""));
    if (distance.toLowerCase().includes("km")) dist *= 1000;
    return dist;
  }, [distance]);

  // 2. 種目・距離から区間リストを作成
  const splitPoints = useMemo(() => {
    if (!raceType || totalDist === 0) return [];
    let splits = [];
    const t = raceType.toLowerCase();

    if (t.includes("駅伝") || t.includes("ロード") || t.includes("3000msc")) {
      for (let i = 1000; i <= totalDist; i += 1000) splits.push(i);
      if (totalDist % 1000 !== 0) splits.push(totalDist);
    } else if (totalDist === 800) {
      splits = [200, 400, 600, 800];
    } else if (totalDist === 1500) {
      splits = [400, 800, 1000, 1200, 1500];
    } else if (totalDist >= 3000) {
      for (let i = 400; i <= totalDist; i += 400) {
        splits.push(i);
        let nextK = Math.ceil(i / 1000) * 1000;
        if (nextK > i && nextK < i + 400 && nextK <= totalDist)
          splits.push(nextK);
      }
      if (splits[splits.length - 1] !== totalDist) splits.push(totalDist);
    }
    return splits;
  }, [raceType, totalDist]);

  // 3. タイム（M'SS"CC）を秒数（float）に変換
  const timeToSeconds = (str) => {
    if (!str) return 0;
    const cleanStr = str.replace(/[()（）]/g, "");
    const match = cleanStr.match(/(?:(\d+)')?(?:(\d+)")?(\d+)?/);
    if (!match) return 0;
    const m = parseFloat(match[1] || 0);
    const s = parseFloat(match[2] || 0);
    const c = parseFloat(match[3] || 0) / 100;
    return m * 60 + s + c;
  };

  // 4. 秒数を M'SS"CC 形式に変換
  const secondsToTime = (totalSeconds) => {
    if (totalSeconds <= 0) return "";
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    const c = Math.round((totalSeconds % 1) * 100);
    const ss = String(s).padStart(2, "0");
    const cc = String(c).padStart(2, "0");
    return m > 0 ? `${m}'${ss}"${cc}` : `${s}"${cc}`;
  };

  // 5. 入力された「.」を「'」や「"」に自動変換
  const formatInput = (text) => {
    if (!text) return "";
    let normalized = text.replace(/['"：:]/g, ".");
    const parts = normalized.split(".");
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]}"${parts[1]}`;
    if (parts.length === 3) return `${parts[0]}'${parts[1]}"${parts[2]}`;
    return text;
  };

  // 6. ステート管理
  const [laps, setLaps] = useState({});

  useEffect(() => {
    if (value && typeof value === "string") {
      const newLaps = {};
      const lines = value.split(/\s+/);
      lines.forEach((line) => {
        const match = line.match(/(\d+)m:(.*?)(?:\(|$)/);
        if (match) newLaps[match[1]] = match[2];
      });
      setLaps(newLaps);
    }
  }, [value]);

  const handleLapChange = (dist, rawValue) => {
    const formatted = formatInput(rawValue);
    const nextLaps = { ...laps, [dist]: formatted };
    setLaps(nextLaps);

    let cumulativeSec = 0;
    const finalString = splitPoints
      .map((d) => {
        const segTime = nextLaps[d] || "";
        const segSec = timeToSeconds(segTime);
        cumulativeSec += segSec;
        const totalTimeStr =
          cumulativeSec > 0 && segSec > 0
            ? `(${secondsToTime(cumulativeSec)})`
            : "";
        return `${d}m:${segTime}${totalTimeStr}`;
      })
      .join(" ");

    onChange(finalString);
  };

  // 🌟🌟 リアルタイム分析（1000m毎 / 400m毎 の全LAP抽出） 🌟🌟
  const summary = useMemo(() => {
    let totalSec = 0;
    let totalEnteredDist = 0;
    let currentCumul = 0;

    const kiloLaps = [];
    let currentKilo = 1000;
    let lastKiloCumul = 0;

    const lap400s = [];
    let current400 = 400;
    let last400Cumul = 0;

    for (let i = 0; i < splitPoints.length; i++) {
      const currentDist = splitPoints[i];
      const prevDist = i === 0 ? 0 : splitPoints[i - 1];
      const segmentDist = currentDist - prevDist;
      const sec = timeToSeconds(laps[currentDist]);

      currentCumul += sec;

      if (sec > 0) {
        totalSec += sec;
        totalEnteredDist += segmentDist;
      }

      // 1000mごとのLAP計算（1500m以上の種目用）
      if (currentDist === currentKilo) {
        if (currentCumul > lastKiloCumul) {
          kiloLaps.push({
            mark: currentKilo,
            time: currentCumul - lastKiloCumul,
          });
          lastKiloCumul = currentCumul;
        }
        currentKilo += 1000;
      }

      // 400mごとのLAP計算（800m種目用）
      if (currentDist === current400) {
        if (currentCumul > last400Cumul) {
          lap400s.push({ mark: current400, time: currentCumul - last400Cumul });
          last400Cumul = currentCumul;
        }
        current400 += 400;
      }
    }

    return { totalSec, totalEnteredDist, kiloLaps, lap400s };
  }, [laps, splitPoints]);

  const avgPace =
    summary.totalEnteredDist > 0
      ? summary.totalSec /
        (summary.totalEnteredDist / (totalDist === 800 ? 400 : 1000))
      : 0;

  return (
    <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-100 w-full overflow-hidden flex flex-col h-[400px]">
      <p className="text-[10px] font-bold text-slate-400 mb-1 px-1 flex-shrink-0">
        💡 区間タイムを入力してください。トータルは自動計算されます。
      </p>

      {/* LAP入力リスト */}
      <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar w-full">
        {splitPoints.map((dist, index) => {
          let totalUntilNow = 0;
          for (let i = 0; i <= index; i++)
            totalUntilNow += timeToSeconds(laps[splitPoints[i]]);

          return (
            <div
              key={dist}
              className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-full"
            >
              <div className="w-12 flex-shrink-0 text-right font-black text-xs text-slate-400">
                {dist}m
              </div>

              <input
                type="text"
                value={laps[dist] || ""}
                onChange={(e) => handleLapChange(dist, e.target.value)}
                inputMode="decimal"
                placeholder="0.00.00"
                className="flex-1 min-w-0 bg-slate-50 p-2.5 rounded-xl font-mono font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500 text-sm"
              />

              <div className="min-w-[4.5rem] flex-shrink-0 text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1.5 rounded-lg text-center whitespace-nowrap">
                {totalUntilNow > 0 ? secondsToTime(totalUntilNow) : "--"}
              </div>
            </div>
          );
        })}
      </div>

      {/* 🌟🌟 リアルタイム分析ボード (横スクロール対応ラップ一覧) 🌟🌟 */}
      {summary.totalEnteredDist > 0 && (
        <div className="flex-shrink-0 bg-slate-800 text-white p-3 rounded-2xl flex flex-col gap-2 shadow-lg animate-in slide-in-from-bottom-2">
          {/* 1500m以上の場合：1000mごとの全ラップ一覧 */}
          {totalDist >= 1500 && (
            <>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-slate-400">
                  1000mごとのLAP
                </span>
                <span className="text-xs font-black text-indigo-300 bg-indigo-900/50 px-2 py-1 rounded-lg">
                  AVG: {secondsToTime(avgPace)} /km
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {summary.kiloLaps.map((kl, idx) => (
                  <div
                    key={kl.mark}
                    className="flex-shrink-0 bg-slate-700/50 border border-slate-600 px-3 py-1.5 rounded-xl flex items-center gap-2"
                  >
                    <span className="text-[9px] font-black text-slate-400">
                      {idx + 1}k
                    </span>
                    <span className="text-sm font-black text-white">
                      {secondsToTime(kl.time)}
                    </span>
                  </div>
                ))}
                {summary.kiloLaps.length === 0 && (
                  <span className="text-[10px] text-slate-500 px-2 py-1">
                    1000m通過データ待ち...
                  </span>
                )}
              </div>
            </>
          )}

          {/* 800mの場合：400mごとの全ラップ一覧 */}
          {totalDist === 800 && (
            <>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-slate-400">
                  400mごとのLAP
                </span>
                <span className="text-xs font-black text-indigo-300 bg-indigo-900/50 px-2 py-1 rounded-lg">
                  AVG: {secondsToTime(avgPace)} /400m
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                {summary.lap400s.map((l4, idx) => (
                  <div
                    key={l4.mark}
                    className="flex-shrink-0 bg-slate-700/50 border border-slate-600 px-3 py-1.5 rounded-xl flex items-center gap-2"
                  >
                    <span className="text-[9px] font-black text-slate-400">
                      {l4.mark}m
                    </span>
                    <span className="text-sm font-black text-white">
                      {secondsToTime(l4.time)}
                    </span>
                  </div>
                ))}
                {summary.lap400s.length === 0 && (
                  <span className="text-[10px] text-slate-500 px-2 py-1">
                    400m通過データ待ち...
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartLapInput;
