import React from "react";
import {
  ArrowLeft,
  Printer,
  Thermometer,
  Droplets,
  Users,
  Timer,
} from "lucide-react";

const TeamRaceReport = ({ reportTour, reportCards, onClose, handlePrint }) => {
  if (!reportTour) return null;

  // 代表のカード（天気などの情報が入っているもの）を探す
  const repCard = reportCards.find((c) => c.weather || c.temp || c.humidity);

  // 🌟 距離をメートル換算して短い順に並び替える賢い関数
  const parseMeters = (d) => {
    if (!d) return 0;
    const s = String(d).toLowerCase();
    if (s.includes("ハーフ")) return 21097.5;
    if (s.includes("フル")) return 42195;
    // 数字部分だけを抜き出す
    const val = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (isNaN(val)) return 0;
    if (s.includes("km")) return val * 1000;
    // 単位がない場合、100未満ならkm、それ以上ならmと推測する (例: 5 -> 5000)
    if (val < 100) return val * 1000;
    return val;
  };

  // 距離の短い順（昇順）に並び替え
  const sortedCards = [...reportCards].sort(
    (a, b) => parseMeters(a.distance) - parseMeters(b.distance),
  );

  return (
    // 🌟 印刷時(print:)は画面固定(fixed)を解除し、下まで全部展開させる魔法のクラス
    <div className="fixed inset-0 z-[120] bg-slate-50 flex flex-col animate-in fade-in print:absolute print:inset-auto print:top-0 print:left-0 print:w-full print:h-auto print:bg-white print:overflow-visible">
      {/* ヘッダー */}
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

        {/* 🌟 印刷ボタン */}
        <button
          onClick={() => {
            const d = new Date();
            const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
            // 呼び出し元の handlePrint を実行
            if (handlePrint) {
              handlePrint(`${yyyymmdd}_${reportTour.name || "大会"}_result`);
            } else {
              window.print(); // handlePrintが渡されなかった時の予備
            }
          }}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          title="レポートを印刷（PDF保存）"
        >
          <Printer size={20} />
        </button>
      </div>

      {/* スクロールエリア */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-20 max-w-7xl mx-auto w-full print:p-0 print:overflow-visible print:block print:h-auto">
        {/* 大会概要と気象条件 */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-2">
          <h1 className="text-2xl font-black text-slate-800 mb-2">
            {reportTour.name}
          </h1>
          <p className="text-sm font-bold text-slate-400 mb-4">
            {reportTour.startDate.replace(/-/g, "/")} 〜{" "}
            {reportTour.endDate?.replace(/-/g, "/") || ""}
          </p>

          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl print:bg-white print:border print:border-slate-200">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">
                Weather
              </p>
              <p className="font-bold text-slate-700">
                {repCard?.weather || "-"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 flex items-center justify-center gap-1">
                <Thermometer size={10} className="text-rose-400" /> Temp
              </p>
              <p className="font-bold text-slate-700">
                {repCard?.temp ? `${repCard.temp}℃` : "-"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 flex items-center justify-center gap-1">
                <Droplets size={10} className="text-blue-400" /> Humid
              </p>
              <p className="font-bold text-slate-700">
                {repCard?.humidity ? `${repCard.humidity}%` : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* 選手記録一覧 */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2 mb-4 flex items-center gap-2">
            <Users size={16} /> 選手記録一覧 (距離順)
          </h3>

          {sortedCards.length === 0 ? (
            <p className="text-center py-10 text-slate-300 font-bold bg-white rounded-3xl border border-slate-100">
              まだ記録がありません
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
              {sortedCards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col print:shadow-none print:break-inside-avoid"
                >
                  <div className="flex justify-between items-start border-b border-slate-50 pb-3 mb-3">
                    <div>
                      <p className="font-black text-xl text-slate-800">
                        {card.runnerName}
                      </p>
                      {/* 🌟 達成バッジの表示 */}
                      <div className="flex flex-wrap gap-1 mt-1 mb-1">
                        {(card.badges || []).map((badge) => (
                          <span
                            key={badge}
                            className={`text-[8px] font-black px-2 py-0.5 rounded-md text-white ${
                              badge === "自己ベスト"
                                ? "bg-orange-500"
                                : badge === "組1位"
                                  ? "bg-blue-500"
                                  : "bg-emerald-500"
                            }`}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] font-bold text-indigo-500 ..."></p>
                      <p className="text-[10px] font-bold text-indigo-500 mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded-md">
                        {card.raceType} /{" "}
                        {card.raceType === "駅伝"
                          ? `${card.distance}(${card.ekidenDistance}km)`
                          : card.distance}
                      </p>
                    </div>
                    {/* 🌟 チームレポートのRESULT表示部分 */}
                    <div className="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 mb-0.5">
                        RESULT
                      </p>
                      <p
                        className={`text-xl font-black tracking-tighter whitespace-nowrap ${
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

                  {card.lapTimes && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1">
                      <p className="text-[9px] font-black text-slate-400 flex items-center gap-1 mb-2">
                        <Timer size={10} /> LAP TIMES
                      </p>
                      <p className="text-sm font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {card.lapTimes}
                      </p>
                    </div>
                  )}
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
