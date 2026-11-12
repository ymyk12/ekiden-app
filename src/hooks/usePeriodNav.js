/*
 * usePeriodNav — 月単位の画面（月間レポート・カレンダー）を、ヘッダーの期間選択と連動させる context
 *
 * 値: { viewMonth: "YYYY-MM", stepMonth(delta), period, stepYear(delta) }。
 *   viewMonth : いまヘッダーで選ばれている期間から決まる、表示すべき月
 *   stepMonth : 画面側の「< >」から呼ぶ。ヘッダーの期間そのものを前後の月に切り替える
 *   period    : ヘッダーで選ばれている期間（年度かどうかの判定に使う）
 *   stepYear  : 年度レポートの「< >」から呼ぶ。前後の年度に切り替える
 * Provider の外（ヘッダーの期間選択がない OB 画面・マネージャー画面）では null になり、
 * 各画面は従来どおり自分で月を持つ。
 */
import { createContext, useContext } from "react";

export const PeriodNavContext = createContext(null);

export const usePeriodNav = () => useContext(PeriodNavContext);
