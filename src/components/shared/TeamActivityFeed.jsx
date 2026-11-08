/*
 * TeamActivityFeed — チーム活動フィード（タイムライン型・共通）
 *
 * 選手・マネージャー・監督の「活動（タイムライン）」を1本化。縦線つきタイムラインに
 * 統一し、各画面はデータ（logs）だけ渡す。権限は「編集・削除は監督のみ」:
 *   - canEdit（監督）: 各行に「監督修正」ボタンを表示（onEdit を呼ぶ）
 *   - onRowClick（任意）: 行タップで詳細を開く（マネージャーの閲覧用）。閲覧は誰でも可。
 *
 * accent: アバター色（"blue"=選手/監督, "indigo"=マネージャー）。完全休養は緑。
 */
import { Edit } from "lucide-react";

const TeamActivityFeed = ({
  logs,
  accent = "blue",
  canEdit = false,
  onEdit,
  onRowClick,
  emptyText = "直近の活動記録はありません",
}) => {
  const avatarActive = accent === "indigo" ? "bg-indigo-500" : "bg-blue-500";

  if (!logs || logs.length === 0) {
    return (
      <p className="text-center text-xs text-slate-300 py-8 font-bold">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const isRest = log.category === "完全休養";
        const clickable = typeof onRowClick === "function";
        return (
          <div key={log.id} className="flex items-start gap-3 relative pl-2">
            <div className="absolute left-[19px] top-8 bottom-[-16px] w-0.5 bg-slate-100 last:hidden"></div>
            <div
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm z-10 ${isRest ? "bg-emerald-400" : avatarActive}`}
            >
              {log.runnerName ? log.runnerName.charAt(0) : "?"}
            </div>
            <div
              onClick={clickable ? () => onRowClick(log) : undefined}
              className={`bg-slate-50 p-3 rounded-2xl w-full border border-slate-100 relative ${clickable ? "cursor-pointer hover:border-indigo-200" : ""}`}
            >
              {canEdit && onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(log);
                  }}
                  className="absolute right-2 top-2 bg-white border border-slate-200 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-colors z-10"
                  title="監督修正"
                >
                  <Edit size={14} />
                </button>
              )}
              <div className={canEdit ? "pr-8" : ""}>
                <p className="text-[10px] font-bold text-slate-400">
                  {log.date.slice(5).replace("-", "/")}{" "}
                  <span className="text-slate-300">·</span> {log.runnerName}
                </p>
                <p
                  className={`text-sm font-black mt-0.5 ${isRest ? "text-emerald-600" : "text-slate-700"}`}
                >
                  {isRest ? "完全休養" : `${log.distance}km`}
                  {!isRest && log.category && (
                    <span className="text-[10px] font-bold text-slate-400 ml-2 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {log.category}
                    </span>
                  )}
                </p>
              </div>
              {log.menuDetail && (
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed bg-white/50 p-1.5 rounded-lg line-clamp-2">
                  {log.menuDetail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TeamActivityFeed;
