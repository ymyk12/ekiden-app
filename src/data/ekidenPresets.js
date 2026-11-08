/*
 * ekidenPresets — 駅伝プリセット（区間距離）
 *
 * ・組み込みプリセット（全国高校駅伝）はコードで保持（削除不可）。
 * ・監督が追加したカスタムプリセットは appSettings.ekidenPresets（設定ドキュメント）
 *   に保存され、組み込みとマージして選択肢になる。
 * ・大会(tournament)にプリセットを設定すると、その区間距離(legs)を大会に
 *   「非正規化」して保存する（tournament.ekidenLegs）。カード入力/レポートは
 *   大会の ekidenLegs を直接読むので、プリセット一覧に依存しない。
 *
 * legs は { 男: number[], 女: number[] }（区間距離km。配列長＝区間数）。
 * 性別キーは選手プロフィールの gender 値（"男"/"女"）に一致させる。
 */

// 組み込みプリセット
export const BUILTIN_EKIDEN_PRESETS = {
  hs_ekiden: {
    id: "hs_ekiden",
    label: "高校駅伝",
    builtin: true,
    legs: {
      男: [10.0, 3.0, 8.1075, 8.0875, 3.0, 5.0, 5.0], // 7区 計42.195km
      女: [6.0, 4.0975, 3.0, 3.0, 5.0], // 5区 計21.0975km
    },
  },
};

// 区間ラベル（"3区"）→ 0始まりインデックス。該当なしは -1。
export const legIndexFromLabel = (label) => {
  const m = /^(\d+)区$/.exec(label || "");
  return m ? parseInt(m[1], 10) - 1 : -1;
};

// legs オブジェクト＋性別 → 区間ラベル配列（"1区"〜）。無ければ null。
export const legsLabels = (legs, gender) => {
  const arr = legs && legs[gender];
  return Array.isArray(arr) && arr.length ? arr.map((_, i) => `${i + 1}区`) : null;
};

// legs オブジェクト＋性別＋区間ラベル → 区間距離(km)。無ければ null。
export const legsDistance = (legs, gender, label) => {
  const arr = legs && legs[gender];
  if (!Array.isArray(arr)) return null;
  const idx = legIndexFromLabel(label);
  return idx >= 0 && idx < arr.length ? arr[idx] : null;
};

// 大会から区間距離(legs)を解決する。
// 1) 大会に非正規化された ekidenLegs があればそれを使う
// 2) 無ければ組み込みプリセットID(ekidenPreset)から引く（旧データ互換）
export const getTournamentLegs = (tour) => {
  if (!tour) return null;
  const el = tour.ekidenLegs;
  if (el && ((el.男 && el.男.length) || (el.女 && el.女.length))) return el;
  if (tour.ekidenPreset && BUILTIN_EKIDEN_PRESETS[tour.ekidenPreset]) {
    return BUILTIN_EKIDEN_PRESETS[tour.ekidenPreset].legs;
  }
  return null;
};

// 選択肢（組み込み＋カスタム）を作る。customPresets は appSettings.ekidenPresets。
export const buildPresetList = (customPresets) => [
  ...Object.values(BUILTIN_EKIDEN_PRESETS),
  ...(Array.isArray(customPresets) ? customPresets : []),
];

// セレクト用の {value,label} 配列（先頭に「なし」）。
export const buildPresetOptions = (customPresets) => [
  { value: "", label: "なし（通常の大会）" },
  ...buildPresetList(customPresets).map((p) => ({ value: p.id, label: p.label })),
];

// id からプリセット定義を得る（組み込み＋カスタム）。
export const findPreset = (id, customPresets) =>
  buildPresetList(customPresets).find((p) => p.id === id) || null;
