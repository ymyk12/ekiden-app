/*
 * チームで共有する資料（しおり・配布物など）の一覧。
 *
 * 各資料は public/docs/ に静的HTML/PDFとして置き、Firebase Hosting で配信する。
 * 追加するときはファイルを public/docs/ に置き、この配列に1件足すだけ。
 * url はアプリと同じドメインの絶対パス（例: "/docs/xxx.html"）または外部URL。
 */
export const DOCUMENTS = [
  {
    id: "2026-summer-camp",
    emoji: "🏔️",
    title: "2026 夏季強化合宿 しおり",
    subtitle: "菅平高原（長野県上田市）",
    dateLabel: "8/3〜8/6",
    // 新しい順に並べるための基準日
    date: "2026-08-03",
    url: "/docs/2026-summer-camp.html",
  },
];
