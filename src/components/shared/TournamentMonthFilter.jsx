/*
 * TournamentMonthFilter — 大会ビュー共通の月フィルターチップ
 *
 * Athlete / Manager / Coach の各 Race ビューに完全コピペで存在していた
 * 「月（YYYY-MM）で大会を絞り込むチップ列」を 1 コンポーネントに共通化したもの。
 * 大会が 0 件のとき、または月情報が 1 つも無いときは何も描画しない（null）。
 *
 * - tournaments: 大会配列（startDate を "YYYY-MM-DD" 形式で持つ）
 * - value: 選択中の月（"all" または "YYYY-MM"）
 * - onChange: チップ選択時に新しい値を渡すコールバック
 *
 * 表示（チップ列 <div className="flex gap-1.5 ...">）は従来と完全に同一なので、
 * 各親のレイアウト（space-y など）はそのまま維持される。
 */
const TournamentMonthFilter = ({ tournaments, value, onChange }) => {
  if (!tournaments || tournaments.length === 0) return null;

  const months = [
    ...new Set(
      tournaments.map((t) => t.startDate?.slice(0, 7)).filter(Boolean),
    ),
  ]
    .sort()
    .reverse();

  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
      {["all", ...months].map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`flex-none px-3 py-1 rounded-full text-[10px] font-black transition-all ${value === m ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
        >
          {m === "all" ? "すべて" : m.replace("-", "/")}
        </button>
      ))}
    </div>
  );
};

export default TournamentMonthFilter;
