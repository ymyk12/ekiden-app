/*
 * useLogRange — 過去ログの追加読み込みを、深い階層の画面から呼ぶための共有 context
 *
 * logs は直近3か月だけを基本購読している（useTeamData）。それより前の過去ログを
 * 画面が必要としたときに、各画面が下の関数で追加購読を依頼する。
 *   ensureRunnerLogs(runnerId) : 選手1人の全期間
 *   ensureLogsMonth("YYYY-MM") : チーム全体の指定した1か月
 * 同じ依頼を繰り返しても二重には購読しない（useTeamData 側で判定）。
 * App.js が Provider で値を渡す。Provider の外では何もしない関数になる。
 */
import { createContext, useContext } from "react";

const noop = () => {};

export const LogRangeContext = createContext({
  ensureRunnerLogs: noop,
  ensureLogsMonth: noop,
});

export const useLogRange = () => useContext(LogRangeContext);
