/*
 * RankingList — 月間/期間ランキング（選手・マネージャー・監督 共通）
 *
 * 選手画面のデザインを採用: メダル風の順位バッジ ＋ 氏名 ＋「未入力◯日」＋ 合計km。
 * 旧「今日◯km」は廃止し、代わりに未入力日数を表示する。
 *
 * rankingData: [{ id, name, total, missingCount }]（total 降順で渡す想定）
 *   - missingCount は親側で算出（選手/監督=選択期間、マネージャー=当月、いずれも前日まで基準）
 * title / periodName: 任意。見出しを内蔵したい画面だけ渡す（親で見出しを持つ場合は省略）。
 *
 * 不自然な改行を避けるため、氏名は truncate、数値・単位は whitespace-nowrap。
 */
import { Users } from "lucide-react";

const RankingList = ({ rankingData, title = null, periodName = null }) => (
  <div className="space-y-4">
    {(title || periodName) && (
      <div className="flex justify-between items-end gap-2 px-2">
        {title ? (
          <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
            <Users className="text-blue-500" /> {title}
          </h4>
        ) : (
          <span />
        )}
        {periodName && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
            {periodName}
          </p>
        )}
      </div>
    )}
    <div className="space-y-3">
      {rankingData.map((runner, index) => (
        <div
          key={runner.id}
          className="flex items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
        >
          <div
            className={`absolute top-0 left-0 px-3 py-1 rounded-br-xl text-[10px] font-black ${index === 0 ? "bg-yellow-400 text-yellow-900" : index === 1 ? "bg-slate-300 text-slate-700" : index === 2 ? "bg-orange-300 text-orange-800" : "bg-slate-200 text-slate-500"}`}
          >
            #{index + 1}
          </div>
          <div className="flex items-center gap-3 pl-8 min-w-0">
            <div className="min-w-0">
              <p className="font-bold text-slate-700 text-sm truncate">
                {runner.name}
              </p>
              <p
                className={`text-[10px] font-bold mt-0.5 whitespace-nowrap ${(runner.missingCount ?? 0) > 0 ? "text-rose-400" : "text-emerald-500"}`}
              >
                未入力 {runner.missingCount ?? 0}日
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-black text-slate-800 whitespace-nowrap">
              {runner.total}
              <span className="text-xs ml-0.5 text-slate-400">km</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default RankingList;
