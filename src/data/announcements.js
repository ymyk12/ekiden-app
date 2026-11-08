/*
 * announcements — 新機能のお知らせ（What's New）レジストリ
 *
 * ★ 新機能を追加したら、この配列に1件追加するだけでOK。
 *   対象ロールのユーザーに、次回ログイン時「新機能のお知らせ」モーダルが出て、
 *   どこから使えるか（場所＋手順）が視覚的に案内される。
 *
 * 各項目のフィールド:
 *  - id         : 一意のID。これが localStorage の既読キーになる。
 *                 （同じ機能を再告知したいときは "-v2" 等にIDを変える）
 *  - roles      : 表示対象ロールの配列（"athlete" / "coach" / "manager"）
 *  - since      : 導入バージョン（表示用の補足。任意）
 *  - icon       : lucide-react のアイコン名（AnnouncementCenter 側でマッピング）
 *  - title      : お知らせの見出し
 *  - body       : 機能の説明文
 *  - steps      : 使い方の手順（チュートリアル。1行ずつ。任意）
 *  - locationHint: どこから使えるかの一文（「ここから使えます」欄に表示）
 *  - highlight  : NEWバッジを光らせる場所のキー（例 "menu"。任意）
 *                 → 対応画面を開くまで、その場所に NEW バッジが残る
 *  - cta        : { label, view } 「さっそく開く」で遷移する画面（任意）
 *                 cta.view の画面を開くと、その機能は「使用済み」になりバッジが消える
 */
export const ANNOUNCEMENTS = [
  {
    id: "monthly-report-v1",
    roles: ["athlete"],
    since: "6.7.37",
    icon: "FileText",
    title: "「月間レポート」が使えるようになりました",
    body: "あなたの1か月の走行距離・練習ログ・大会結果・週別の推移などを、A4 1枚のレポートに自動でまとめます。印刷やPDF保存もできます。",
    steps: [
      "左上の ☰ メニューを開く",
      "「月間レポート」をタップ",
      "見たい月を選ぶ（印刷・PDF保存も可）",
    ],
    locationHint: "メニュー（左上 ☰）→「月間レポート」",
    highlight: "menu",
    cta: { label: "さっそく開く", view: "my-report" },
  },
];
