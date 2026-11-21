/*
 * AthleteRaceHistory — マイログ「記録」タブの「大会の記録」一覧（表示専用）
 *
 * 自分が出場した大会カードを新しい順に並べる。タップすると大会レポート
 * （目標・結果・振り返り・監督コメントを1枚にまとめたもの）を開く。
 * 削除された大会のカードは対象外。
 */
import { useMemo } from "react";
import { History, ChevronRight, MessageSquare, Target } from "lucide-react";
import CollapsibleSection from "./CollapsibleSection";
import {
  raceDistLabel,
  raceStatusLabel,
  raceTargetDiff,
  raceDateOf,
  fmtRaceDate,
  badgeColor,
} from "../../utils/raceCardUtils";

const AthleteRaceHistory = ({ myCards, tournaments, onOpen }) => {
  const items = useMemo(() => {
    return myCards
      .map((card) => {
        const tour = tournaments.find((t) => t.id === card.tournamentId);
        return tour ? { card, tour, date: raceDateOf(card, tour) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [myCards, tournaments]);

  return (
    <CollapsibleSection icon={<History size={14} />} title="Race History">
      {items.length === 0 ? (
        <p className="text-center text-xs text-slate-300 py-4 font-bold">
          出場した大会の記録がありません
        </p>
      ) : (
        items.map(({ card, tour, date }) => {
          const status = raceStatusLabel(card);
          const diff = raceTargetDiff(card);
          const hasResult = !!card.resultTime;
          return (
            <button
              key={card.id}
              onClick={() => onOpen(card.id)}
              className="w-full text-left bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3 active:scale-[0.98] hover:bg-slate-100 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400">
                    {fmtRaceDate(date)}
                  </p>
                  <p className="text-sm font-black text-slate-700 break-words">
                    {tour.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <span className="bg-slate-800 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                      {card.raceType}
                    </span>
                    <span className="text-[11px] font-black text-slate-500">
                      {raceDistLabel(card)}
                    </span>
                    {(card.badges || []).map((b) => (
                      <span
                        key={b}
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded text-white ${badgeColor(b)}`}
                      >
                        {b}
                      </span>
                    ))}
                    {card.coachFeedback && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-0.5">
                        <MessageSquare size={9} /> コメント
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {status ? (
                    <p className="text-sm font-black text-slate-400">{status}</p>
                  ) : hasResult ? (
                    <p className="text-lg font-black text-slate-800 tracking-tighter leading-tight">
                      {card.resultTime}
                    </p>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">
                      結果なし
                    </span>
                  )}
                  {diff && diff.achieved && (
                    <p className="text-[10px] font-black mt-0.5 flex items-center justify-end gap-0.5 text-emerald-500">
                      <Target size={10} />
                      目標達成
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={18}
                  className="text-slate-300 flex-shrink-0 self-center"
                />
              </div>
            </button>
          );
        })
      )}
    </CollapsibleSection>
  );
};

export default AthleteRaceHistory;
