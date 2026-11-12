// マイログの分析・記録で使う集計ヘルパー（練習ログ用）
import { CATEGORY } from "./constants";

const pad = (n) => String(n).padStart(2, "0");
const toStr = (dt) =>
  `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
const parse = (ds) => {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// その日が属する週の月曜日（YYYY-MM-DD）
export const weekStart = (ds) => {
  const dt = parse(ds);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return toStr(dt);
};

// 距離として数える記録（完全休養は除く）
export const isTraining = (l) => l.category !== CATEGORY.REST;
export const distOf = (l) => (isTraining(l) ? Number(l.distance) || 0 : 0);

export const round1 = (v) => Math.round(v * 10) / 10;

// キー関数ごとの距離合計の Map
export const sumBy = (logs, keyFn) => {
  const map = new Map();
  logs.forEach((l) => {
    const d = distOf(l);
    if (d <= 0) return;
    const k = keyFn(l);
    map.set(k, (map.get(k) || 0) + d);
  });
  return map;
};

// 最大値のエントリ { key, value } を返す（無ければ null）
export const maxEntry = (map) => {
  let best = null;
  map.forEach((value, key) => {
    if (!best || value > best.value) best = { key, value };
  });
  return best;
};
