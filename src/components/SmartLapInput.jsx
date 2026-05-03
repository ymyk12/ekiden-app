/*
 * SmartLapInput — LAPタイム入力コンポーネント
 *
 * レースの区間タイムを入力するとトータルタイムを自動計算して表示する。
 * 種目・距離に応じて計測ポイント（200m・400m・1000m等）が自動で切り替わる。
 * 公式リザルトを先に入力すると、最終区間のタイムを逆算する機能も持つ。
 */
import React, { useState, useEffect, useMemo } from "react";
import { Timer } from "lucide-react";

const SmartLapInput = ({
  value,
  onChange,
  raceType,
  distance,
  onResultChange,
}) => {
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

  // 3. タイム・秒数変換ロジック
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

  const secondsToTime = (totalSeconds) => {
    if (totalSeconds <= 0) return "";
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    const c = Math.round((totalSeconds % 1) * 100);
    const ss = String(s).padStart(2, "0");
    const cc = String(c).padStart(2, "0");
    return m > 0 ? `${m}'${ss}"${cc}` : `${s}"${cc}`;
  };

  const formatInput = (text) => {
    if (!text) return "";
    let normalized = text.replace(/['"：:]/g, ".");
    const parts = normalized.split(".");
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]}"${parts[1]}`;
    if (parts.length === 3) return `${parts[0]}'${parts[1]}"${parts[2]}`;
    return text;
  };

  // 4. ステート管理
  const [laps, setLaps] = useState({});
  const [officialResult, setOfficialResult] = useState("");

  useEffect(() => {
    if (value && typeof value === "string") {
      const newLaps = {};
      const lines = value.split(/\s+/);
      lines.forEach((line) => {
        const match = line.match(/(\d+)m:(.*?)(?:\(|$)/);
        if (match) newLaps[match[1]] = match[2];
      });
      setLaps(newLaps);

      if (splitPoints.length > 0) {
        const lastDist = splitPoints[splitPoints.length - 1];
        const lastLine = lines.find((l) => l.startsWith(`${lastDist}m:`));
        const resMatch = lastLine?.match(/\((.*?)\)/);
        if (resMatch) setOfficialResult(resMatch[1]);
      }
    }
  }, [value, splitPoints]);

  const updateAll = (nextLaps, nextResult) => {
    let cumulativeSec = 0;
    const finalString = splitPoints
      .map((d, idx) => {
        const isLast = idx === splitPoints.length - 1;
        const segTime = nextLaps[d] || "";
        const segSec = timeToSeconds(segTime);
        cumulativeSec += segSec;

        const totalTimeStr =
          isLast && nextResult
            ? `(${nextResult})`
            : cumulativeSec > 0 && segSec > 0
              ? `(${secondsToTime(cumulativeSec)})`
              : "";

        return `${d}m:${segTime}${totalTimeStr}`;
      })
      .join(" ");

    onChange(finalString);
  };

  const handleResultChange = (rawResult) => {
    const formattedResult = formatInput(rawResult);
    setOfficialResult(formattedResult);

    if (onResultChange) {
      onResultChange(formattedResult);
    }

    if (splitPoints.length === 0) return;

    const resSec = timeToSeconds(formattedResult);
    let nextLaps = { ...laps };

    if (resSec > 0) {
      const lastDist = splitPoints[splitPoints.length - 1];
      let prevTotalSec = 0;
      splitPoints.slice(0, -1).forEach((d) => {
        prevTotalSec += timeToSeconds(nextLaps[d]);
      });

      const adjustedLastLapSec = resSec - prevTotalSec;
      if (adjustedLastLapSec > 0) {
        nextLaps[lastDist] = secondsToTime(adjustedLastLapSec);
      } else {
        nextLaps[lastDist] = "";
      }
    }

    setLaps(nextLaps);
    updateAll(nextLaps, formattedResult);
  };

  const handleLapChange = (dist, rawValue) => {
    const formatted = formatInput(rawValue);
    let nextLaps = { ...laps, [dist]: formatted };
    let currentOfficialResult = officialResult;

    if (splitPoints.length > 0) {
      const lastDist = splitPoints[splitPoints.length - 1];

      if (dist === lastDist) {
        let newTotalSec = 0;
        splitPoints.forEach((d) => {
          newTotalSec += timeToSeconds(nextLaps[d]);
        });

        if (newTotalSec > 0) {
          currentOfficialResult = secondsToTime(newTotalSec);
          setOfficialResult(currentOfficialResult);

          if (onResultChange) {
            onResultChange(currentOfficialResult);
          }
        }
      } else if (officialResult) {
        const resSec = timeToSeconds(officialResult);
        let prevTotalSec = 0;
        splitPoints.slice(0, -1).forEach((d) => {
          prevTotalSec += timeToSeconds(nextLaps[d]);
        });
        const adjustedLastLapSec = resSec - prevTotalSec;
        if (adjustedLastLapSec > 0) {
          nextLaps[lastDist] = secondsToTime(adjustedLastLapSec);
        } else {
          nextLaps[lastDist] = "";
        }
      }
    }

    setLaps(nextLaps);
    updateAll(nextLaps, currentOfficialResult);
  };

  return (
    <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-100 w-full">
      <p className="text-[10px] font-bold text-slate-400 mb-1 px-1">
        💡 区間タイムを入力してください。トータルは自動計算されます。
      </p>

      <div className="space-y-2 w-full">
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

      <div className="pt-3 border-t border-slate-200 mt-2">
        <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1">
          <Timer size={12} /> Official Result (自動調整用)
        </label>
        <div className="flex items-center gap-3 mt-1 bg-indigo-600 p-2.5 rounded-2xl shadow-md">
          <input
            type="text"
            value={officialResult}
            inputMode="decimal"
            placeholder="Result (例: 15.30.00)"
            onChange={(e) => handleResultChange(e.target.value)}
            className="flex-1 bg-transparent border-none text-white font-mono font-black text-lg placeholder:text-white/40 outline-none px-2"
          />
        </div>
      </div>
    </div>
  );
};

export default SmartLapInput;
