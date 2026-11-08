/*
 * useAnnouncements — 新機能お知らせの既読管理フック
 *
 * ANNOUNCEMENTS（src/data/announcements.js）から、現在のロール向けの
 * お知らせを取り出し、2種類の既読状態を localStorage で管理する。
 *
 *  - shown : お知らせモーダルを表示済み（= もうモーダルは出さない）
 *  - used  : 実際にその機能画面を開いた（= NEWバッジを消す）
 *
 * モーダルを「あとで」で閉じても used にはならないため、実際に機能を
 * 開くまで ☰ メニュー等の NEW バッジが残り、場所を視覚的に案内できる。
 *
 * localStorage が使えない環境でも落ちないよう、読み書きは try/catch で保護する。
 */
import { useState, useCallback, useMemo } from "react";
import { ANNOUNCEMENTS } from "../data/announcements";

const K_SHOWN = (uid) => `ann_shown_${uid}`;
const K_USED = (uid) => `ann_used_${uid}`;

const readList = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writeList = (key, arr) => {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {
    /* localStorage 不可環境では黙ってスキップ */
  }
};

export const useAnnouncements = ({ role, userId }) => {
  const [shown, setShown] = useState(() => readList(K_SHOWN(userId)));
  const [used, setUsed] = useState(() => readList(K_USED(userId)));

  // 現在のロール向けのお知らせ（role が空なら何も出さない＝プレビュー等を除外）
  const forRole = useMemo(
    () => (role ? ANNOUNCEMENTS.filter((a) => a.roles.includes(role)) : []),
    [role],
  );

  // モーダル未表示のお知らせ（初回ログイン時に出す）
  const pendingModal = useMemo(
    () => forRole.filter((a) => !shown.includes(a.id)),
    [forRole, shown],
  );

  const markShown = useCallback(
    (id) => {
      setShown((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        writeList(K_SHOWN(userId), next);
        return next;
      });
    },
    [userId],
  );

  const markUsed = useCallback(
    (id) => {
      setUsed((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        writeList(K_USED(userId), next);
        return next;
      });
    },
    [userId],
  );

  // 指定した highlight 場所に、まだ使っていないお知らせがあるか（NEWバッジ用）
  const hasUnused = useCallback(
    (target) =>
      forRole.some((a) => a.highlight === target && !used.includes(a.id)),
    [forRole, used],
  );

  // 指定した遷移先画面に対応する、未使用のお知らせがあるか（項目のNEWバッジ用）
  const isUnusedView = useCallback(
    (view) =>
      forRole.some((a) => a.cta?.view === view && !used.includes(a.id)),
    [forRole, used],
  );

  return {
    forRole,
    pendingModal,
    markShown,
    markUsed,
    hasUnused,
    isUnusedView,
  };
};
