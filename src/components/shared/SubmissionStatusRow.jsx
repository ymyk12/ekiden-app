/*
 * SubmissionStatusRow — 提出状況の1行（監督・マネージャー共通）
 *
 * デザインは監督(CoachHomeView)基準に統一。付加情報は任意で出し分ける:
 *  - monthTotal: 数値を渡すと「月間: 〇km」を表示（渡さなければ非表示）
 *  - log       : その日のログを渡すと Pain3以上で Pain バッジを表示
 *  - onClick   : 渡すと行をクリック可能にし、log があるとき onClick(log) を呼ぶ
 *
 * 監督は付加情報ON（クリックで編集モーダル）、マネージャーはOFF（素の一覧）。
 *
 * runner: { id, lastName, firstName, status: "active"|"rest"|"unsubmitted", detail }
 */
import { AlertTriangle, Check, HeartPulse } from "lucide-react";

const avatarClass = (status) =>
  status === "active"
    ? "bg-blue-500"
    : status === "rest"
      ? "bg-emerald-400"
      : "bg-rose-400";

const SubmissionStatusRow = ({
  runner: r,
  monthTotal = null,
  log = null,
  onClick = null,
}) => {
  const clickable = typeof onClick === "function" && !!log;
  const hasSub = monthTotal !== null || (log && log.pain >= 3);

  return (
    <div
      onClick={clickable ? () => onClick(log) : undefined}
      className={`py-3 flex items-center justify-between gap-2 ${
        clickable
          ? "cursor-pointer hover:bg-blue-50 rounded-xl px-2 transition-all"
          : ""
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm flex-shrink-0 ${avatarClass(r.status)}`}
        >
          {r.lastName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">
            {r.lastName} {r.firstName}
          </p>
          {hasSub && (
            <div className="flex gap-2 items-center mt-0.5">
              {monthTotal !== null && (
                <span className="text-[11px] text-slate-500 font-bold bg-slate-100 px-1.5 rounded whitespace-nowrap">
                  月間: {monthTotal}km
                </span>
              )}
              {log && log.pain >= 3 && (
                <span className="text-[11px] text-rose-500 font-bold flex items-center gap-0.5 animate-pulse whitespace-nowrap">
                  <HeartPulse size={10} /> Pain
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">
        {r.status === "active" && (
          <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 whitespace-nowrap">
            <Check size={12} /> {r.detail}
          </span>
        )}
        {r.status === "rest" && (
          <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">
            {r.detail}
          </span>
        )}
        {r.status === "unsubmitted" && (
          <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 whitespace-nowrap">
            <AlertTriangle size={12} /> 未提出
          </span>
        )}
      </div>
    </div>
  );
};

export default SubmissionStatusRow;
