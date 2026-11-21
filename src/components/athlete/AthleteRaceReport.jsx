/*
 * AthleteRaceReport — 大会レポート（表示専用・印刷/PDF対応）
 *
 * 1つの大会カードについて、目標 → 結果 → 当日の計画 → 振り返り → 監督コメント を
 * 1枚にまとめて見返せるようにする。マイログ「記録」タブの大会一覧から開く。
 * 印刷は月間レポートと同じく画面全体を print: 指定で整える方式。
 */
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Printer, Target, MessageSquare } from "lucide-react";
import { analyzeLaps } from "../../utils/lapUtils";
import {
  raceDistLabel,
  raceStatusOf,
  raceStatusLabel,
  raceTargetDiff,
  raceDateOf,
  fmtRaceDate,
  badgeColor,
} from "../../utils/raceCardUtils";

// 見出し付きの文章ブロック。本文が空なら何も出さない
const TextBlock = ({ title, text, tone = "slate" }) => {
  if (!text || !String(text).trim()) return null;
  const tones = {
    slate: "border-slate-200",
    emerald: "border-emerald-100 bg-emerald-50/40",
    rose: "border-rose-100 bg-rose-50/40",
    blue: "border-blue-100 bg-blue-50/40",
    indigo: "border-indigo-100 bg-indigo-50/50",
  };
  return (
    <div
      className={`border rounded-xl p-3 print:p-2 break-inside-avoid ${tones[tone]}`}
    >
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
        {title}
      </p>
      <p className="text-xs print:text-[10px] font-bold text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
        {text}
      </p>
    </div>
  );
};

const AthleteRaceReport = ({
  card,
  tour,
  runnerName,
  onBack,
  handlePrint,
}) => {
  useEffect(() => {
    document.body.classList.add("team-report-open");
    return () => document.body.classList.remove("team-report-open");
  }, []);
  const status = raceStatusOf(card);
  const statusLabel = raceStatusLabel(card);
  const diff = raceTargetDiff(card);
  const date = raceDateOf(card, tour);
  const laps =
    status === "finish" && card.lapTimes
      ? analyzeLaps(
          card.lapTimes,
          card.raceType,
          card.distance,
          card.ekidenDistance,
        )
      : null;
  const hasCondition =
    card.condition > 0 || card.weather || card.wind || card.temp || card.humidity;
  const printName = `大会レポート_${runnerName ? `${runnerName}_` : ""}${tour.name}_${raceDistLabel(card)}`;

  // 印刷時はアプリ本体(#root)を除外し、body 直下へ portal したこのレポートだけを
  // 印刷する（チーム大会レポートと同じ方式。他画面の一覧が混入するのを防ぐ）。
  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-50 overflow-y-auto print:absolute print:inset-auto print:top-0 print:left-0 print:w-[190mm] print:h-auto print:bg-white print:overflow-visible">
    <div className="max-w-md mx-auto px-5 py-6 space-y-4 print:max-w-none print:p-0 print:space-y-0 animate-in fade-in">
      {/* 操作バー（印刷時は非表示）: 左=戻る / 右=印刷 */}
      <div className="no-print bg-white px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          aria-label="大会の一覧へ戻る"
          className="flex items-center gap-1 p-2 pr-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all text-xs font-black"
        >
          <ArrowLeft size={16} /> 一覧
        </button>
        <button
          onClick={() => handlePrint(printName)}
          aria-label="印刷 / PDF保存"
          title="印刷 / PDF保存"
          className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md shadow-blue-200"
        >
          <Printer size={18} />
        </button>
      </div>

      <div className="bg-white rounded-[2rem] print:rounded-none shadow-sm print:shadow-none p-6 print:p-0 space-y-4 print:space-y-3">
        {/* ヘッダー */}
        <div className="border-b-2 border-slate-800 pb-2 print:pb-1">
          <p className="text-[10px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest">
            Race Report{runnerName ? `　${runnerName}` : ""}
          </p>
          <h2 className="text-xl max-sm:text-base print:text-base font-black text-slate-800 break-words text-center">
            {tour.name}
          </h2>
          <p className="text-[11px] font-bold text-slate-400 mt-0.5 text-right">
            {fmtRaceDate(date)}
          </p>
        </div>

        {/* 種目・目標と結果 */}
        <div className="border border-slate-200 rounded-xl p-3 print:p-2 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded">
              {card.raceType}
            </span>
            <span className="text-sm font-black text-slate-700">
              {raceDistLabel(card)}
            </span>
            {(card.badges || []).map((b) => (
              <span
                key={b}
                className={`text-[9px] font-black px-2 py-0.5 rounded text-white ${badgeColor(b)}`}
              >
                {b}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-lg p-2 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                <Target size={10} /> 目標
              </p>
              <p className="text-lg print:text-base font-black text-slate-700 tracking-tighter">
                {card.targetTime || "未設定"}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2 text-center">
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                結果
              </p>
              <p className="text-lg print:text-base font-black text-emerald-600 tracking-tighter">
                {statusLabel || card.resultTime || "—"}
              </p>
            </div>
          </div>
          {diff && (
            <p
              className={`text-center text-xs font-black ${diff.achieved ? "text-emerald-600" : "text-slate-500"}`}
            >
              {diff.achieved ? "目標達成　" : ""}
              {diff.label}
            </p>
          )}
          {status === "dns" && card.dnsReason && (
            <p className="text-center text-xs font-bold text-slate-500">
              欠場の理由: {card.dnsReason}
            </p>
          )}
          {status === "dnf" && card.dnfPoint && (
            <p className="text-center text-xs font-bold text-slate-500">
              棄権した地点: {card.dnfPoint}
            </p>
          )}
        </div>

        {/* LAP / コンディション */}
        {(laps || hasCondition) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 print:gap-2">
            {laps && (
              <div className="border border-slate-200 rounded-xl p-3 print:p-2 break-inside-avoid">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Lap
                </p>
                <div className="space-y-0.5">
                  {laps.formattedLines.map((line, i) => (
                    <p
                      key={i}
                      className="text-[11px] print:text-[9px] font-bold text-slate-700 tabular-nums break-words"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {hasCondition && (
              <div className="border border-slate-200 rounded-xl p-3 print:p-2 break-inside-avoid space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Condition
                </p>
                {card.condition > 0 && (
                  <p className="font-black text-base text-amber-400 leading-none">
                    {"★".repeat(card.condition)}
                    <span className="text-slate-200">
                      {"★".repeat(5 - card.condition)}
                    </span>
                  </p>
                )}
                <p className="text-[11px] print:text-[9px] font-bold text-slate-600 break-words">
                  {[
                    card.weather,
                    card.wind && `風: ${card.wind}`,
                    card.temp && `${card.temp}℃`,
                    card.humidity && `湿度 ${card.humidity}%`,
                  ]
                    .filter(Boolean)
                    .join(" ／ ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 当日の計画 → 振り返り → 監督コメント */}
        <TextBlock title="ウォームアップの計画" text={card.wupPlan} />
        <TextBlock title="レースプラン" text={card.racePlan} />
        <TextBlock title="良かった点" text={card.goodPoints} tone="emerald" />
        <TextBlock title="課題・反省" text={card.issues} tone="rose" />
        <TextBlock
          title="仲間の良かった点"
          text={card.teammateGoodPoints}
        />
        <TextBlock title="次の目標" text={card.nextGoal} tone="blue" />

        {card.coachFeedback ? (
          <div className="border border-indigo-200 bg-indigo-50/60 rounded-xl p-3 print:p-2 break-inside-avoid">
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <MessageSquare size={11} /> 監督コメント
            </p>
            <p className="text-xs print:text-[10px] font-bold text-slate-700 whitespace-pre-wrap leading-relaxed break-words">
              {card.coachFeedback}
            </p>
          </div>
        ) : (
          <p className="text-center text-[10px] font-bold text-slate-300">
            監督コメントはまだありません
          </p>
        )}
      </div>
    </div>
    </div>,
    document.body,
  );
};

export default AthleteRaceReport;
