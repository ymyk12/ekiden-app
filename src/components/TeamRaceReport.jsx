/*
 * TeamRaceReport — チーム大会レポート画面
 *
 * チーム全員の大会振り返りシートを一覧で表示する画面。
 * 日付ごとにグループ化して並べ、印刷・PDF出力にも対応している。
 */
import React from "react";
import {
  ArrowLeft,
  Printer,
  Thermometer,
  Droplets,
  Timer,
  Calendar,
} from "lucide-react";

const TeamRaceReport = ({ reportTour, reportCards, onClose, handlePrint }) => {
  if (!reportTour) return null;

  // コンディション表示用のグループ化
  const conditionsMap = {};
  reportCards.forEach((c) => {
    const actualDate = c.date || reportTour.startDate;
    const actualWeather = c.weather || "晴れ";
    const actualWind = c.wind || "無風";

    let score = 0;
    if (c.temp) score += 10;
    if (c.humidity) score += 10;
    if (c.weather) score += 1;
    if (c.wind) score += 1;

    const key = actualDate || "single";
    if (!conditionsMap[key] || score > conditionsMap[key].score) {
      conditionsMap[key] = {
        date: actualDate,
        weather: actualWeather,
        wind: actualWind,
        temp: c.temp,
        humidity: c.humidity,
        score: score,
      };
    }
  });

  const conditionList = Object.values(conditionsMap).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date > b.date ? 1 : -1;
  });

  const parseMeters = (d) => {
    if (!d) return 0;
    const s = String(d).toLowerCase();
    if (s.includes("ハーフ")) return 21097.5;
    if (s.includes("フル")) return 42195;
    const val = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (isNaN(val)) return 0;
    if (s.includes("km")) return val * 1000;
    if (val < 100) return val * 1000;
    return val;
  };

  // 1. まずは距離順に全カードをソートする
  const sortedCards = [...reportCards].sort(
    (a, b) => parseMeters(a.distance) - parseMeters(b.distance),
  );

  const cardsByDate = {};
  sortedCards.forEach((card) => {
    // 日付が未入力の場合は大会開始日を代入
    const cardDate = card.date || reportTour.startDate || "日付不明";
    if (!cardsByDate[cardDate]) {
      cardsByDate[cardDate] = [];
    }
    cardsByDate[cardDate].push(card);
  });

  // 日付を昇順（古い順）に並び替える
  const sortedDates = Object.keys(cardsByDate).sort((a, b) => (a > b ? 1 : -1));

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

  const analyzeLaps = (lapStr, raceType, distanceStr, ekidenDist) => {
    if (!lapStr) return null;
    let targetDistStr = ekidenDist ? String(ekidenDist) + "km" : distanceStr;
    let totalDist = parseInt((targetDistStr || "").replace(/[^0-9]/g, ""));
    if ((targetDistStr || "").toLowerCase().includes("km")) totalDist *= 1000;

    const lines = lapStr.replace(/\s+(?=\d+(?:km|m):)/g, "\n").split("\n");
    let currentKilo = 1000;
    let current400 = 400;
    let lastKiloCumul = 0;
    let last400Cumul = 0;

    let totalSec = 0;
    let totalEnteredDist = 0;

    const formattedLines = [];

    const isLongDistance =
      totalDist >= 1500 ||
      (raceType && (raceType.includes("駅伝") || raceType.includes("ロード")));

    lines.forEach((line) => {
      const cleanLine = line.trim().replace(/\s/g, "").replace(/km:/g, "000m:");
      const match = cleanLine.match(/(\d+)m:(.*?)(?:\((.*?)\))?$/);
      if (!match) {
        if (line.trim()) formattedLines.push(line.trim());
        return;
      }

      const dist = parseInt(match[1]);
      const segTime = match[2];
      const cumulTimeStr = match[3] || match[2];

      const cumulSec = timeToSeconds(cumulTimeStr);
      if (cumulSec <= 0) {
        formattedLines.push(`${dist}m: ${segTime}`);
        return;
      }

      totalSec = cumulSec;
      totalEnteredDist = dist;

      let displayLine = `${dist}m: ${segTime}`;

      if (cumulTimeStr !== segTime) {
        displayLine += ` ${cumulTimeStr}`;
      }

      if (dist === currentKilo) {
        const splitSec = cumulSec - lastKiloCumul;
        if (isLongDistance) {
          displayLine += `(${secondsToTime(splitSec)})`;
        }
        lastKiloCumul = cumulSec;
        currentKilo += 1000;
      }

      if (dist === current400) {
        const splitSec = cumulSec - last400Cumul;
        if (!isLongDistance) {
          displayLine += `(${secondsToTime(splitSec)})`;
        }
        last400Cumul = cumulSec;
        current400 += 400;
      }

      formattedLines.push(displayLine);
    });

    if (totalEnteredDist === 0) return null;

    const avgPace = isLongDistance
      ? totalSec / (totalEnteredDist / 1000)
      : totalSec / (totalEnteredDist / 400);

    formattedLines.push(`AVG ${secondsToTime(avgPace)}`);

    return { formattedLines };
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-50 flex flex-col animate-in fade-in print:absolute print:inset-auto print:top-0 print:left-0 print:w-full print:h-auto print:bg-white print:overflow-visible">
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md pt-12 pb-6 print:hidden">
        <button
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            Team Race Report
          </p>
          <h2 className="font-bold text-sm">今大会チームレポート</h2>
        </div>

        <button
          onClick={() => {
            const d = new Date();
            const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            if (handlePrint) {
              handlePrint(`${yyyymmdd}_${reportTour.name || "大会"}_result`);
            } else {
              window.print();
            }
          }}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          title="レポートを印刷（PDF保存）"
        >
          <Printer size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-20 max-w-7xl mx-auto w-full print:p-0 print:overflow-visible print:block print:h-auto">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-2">
          <h1 className="text-2xl font-black text-slate-800 mb-2">
            {reportTour.name}
          </h1>
          <p className="text-sm font-bold text-slate-400 mb-4">
            {reportTour.startDate.replace(/-/g, "/")} 〜{" "}
            {reportTour.endDate?.replace(/-/g, "/") || ""}
          </p>

          {/* コンディション表示部 */}
          {conditionList.length === 0 ? (
            <div className="bg-slate-50 p-4 rounded-2xl text-center print:bg-white print:border print:border-slate-200">
              <p className="text-xs font-bold text-slate-400">
                コンディション未入力
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conditionList.map((cond, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl print:bg-white print:border print:border-slate-200"
                >
                  {cond.date && (
                    <div className="font-black text-slate-500 w-12 text-center border-r border-slate-200 pr-2">
                      <p className="text-[10px] leading-tight">
                        {cond.date.slice(5).replace("-", "/")}
                      </p>
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Weather
                      </p>
                      <p className="font-bold text-slate-700 text-sm">
                        {cond.weather || "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Wind
                      </p>
                      <p className="font-bold text-slate-700 text-sm">
                        {cond.wind || "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 flex items-center justify-center gap-0.5">
                        <Thermometer size={10} className="text-rose-400" /> Temp
                      </p>
                      <p className="font-bold text-slate-700 text-sm">
                        {cond.temp ? `${cond.temp}℃` : "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 flex items-center justify-center gap-0.5">
                        <Droplets size={10} className="text-blue-400" /> Humid
                      </p>
                      <p className="font-bold text-slate-700 text-sm">
                        {cond.humidity ? `${cond.humidity}%` : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 選手記録一覧（日付ごとグループ化） */}
        <div>
          {sortedDates.length === 0 ? (
            <p className="text-center py-10 text-slate-300 font-bold bg-white rounded-3xl border border-slate-100">
              まだ記録がありません
            </p>
          ) : (
            <div className="space-y-12">
              {sortedDates.map((dateStr) => (
                <div key={dateStr} className="space-y-4">
                  {/* 日付ごとの美しい見出しバー */}
                  <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest ml-2 flex items-center gap-2 border-b-2 border-indigo-100 pb-2 print:text-slate-800 print:border-slate-800">
                    <Calendar size={18} />
                    {dateStr === "日付不明"
                      ? dateStr
                      : `${dateStr.replace(/-/g, "/")} `}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
                    {cardsByDate[dateStr].map((card) => {
                      const analysis = analyzeLaps(
                        card.lapTimes,
                        card.raceType,
                        card.distance,
                        card.ekidenDistance,
                      );

                      return (
                        <div
                          key={card.id}
                          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col print:shadow-none print:break-inside-avoid print:border print:p-4 w-full overflow-hidden"
                        >
                          <div className="flex justify-between items-start border-b border-slate-50 pb-3 mb-3 print:border-slate-200">
                            <div>
                              <p className="font-black text-xl text-slate-800">
                                {card.runnerName}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1 mb-1">
                                {(card.badges || []).map((badge) => (
                                  <span
                                    key={badge}
                                    className={`text-[8px] font-black px-2 py-0.5 rounded-md text-white print:border print:text-slate-700 ${
                                      badge === "自己ベスト"
                                        ? "bg-orange-500 print:border-orange-500"
                                        : badge === "組1位"
                                          ? "bg-blue-500 print:border-blue-500"
                                          : "bg-emerald-500 print:border-emerald-500"
                                    }`}
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] font-bold text-indigo-500 mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded-md print:bg-transparent print:px-0">
                                {card.raceType} /{" "}
                                {card.distance === "その他"
                                  ? card.ekidenDistance
                                  : card.raceType === "駅伝"
                                    ? `${card.distance}(${card.ekidenDistance}km)`
                                    : card.distance}
                              </p>
                            </div>
                            <div className="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 print:bg-transparent print:border-none print:p-0">
                              <p className="text-[10px] font-black text-slate-400 mb-0.5">
                                RESULT
                              </p>
                              <p
                                className={`text-xl font-black tracking-tighter whitespace-nowrap print:text-slate-800 ${
                                  card.status === "dns"
                                    ? "text-rose-400"
                                    : card.status === "dnf"
                                      ? "text-amber-500"
                                      : "text-indigo-600"
                                }`}
                              >
                                {card.status === "dns"
                                  ? `DNS (${card.dnsReason || "棄権"})`
                                  : card.status === "dnf"
                                    ? `DNF (${card.dnfPoint || "途中棄権"})`
                                    : card.resultTime || "未入力"}
                              </p>
                            </div>
                          </div>

                          {card.lapTimes ? (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 print:bg-white print:p-2 print:border-none w-full">
                              <p className="text-[9px] font-black text-slate-400 flex items-center gap-1 mb-2">
                                <Timer size={10} /> LAP TIMES
                              </p>
                              <div className="flex flex-col gap-0.5">
                                {analysis && analysis.formattedLines
                                  ? analysis.formattedLines.map((lap, idx) => (
                                      <span
                                        key={idx}
                                        className={`text-xs font-mono font-bold block tracking-tight ${
                                          lap.startsWith("AVG")
                                            ? "text-indigo-500 mt-1"
                                            : "text-slate-600"
                                        }`}
                                      >
                                        {lap}
                                      </span>
                                    ))
                                  : card.lapTimes
                                      .split(/\n/)
                                      .map((lap, idx) => (
                                        <span
                                          key={idx}
                                          className="text-xs font-mono text-slate-600 font-bold block tracking-tight"
                                        >
                                          {lap}
                                        </span>
                                      ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-center">
                              <p className="text-xs text-slate-300 font-bold bg-slate-50 px-4 py-2 rounded-xl">
                                LAP未入力
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamRaceReport;
