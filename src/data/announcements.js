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
    id: "mylog-renewal-v1",
    roles: ["athlete"],
    since: "6.8.0",
    icon: "BarChart2",
    title: "「My Log」がリニューアルしました",
    body: "My Log が「ログ・レポート・記録」の3つのタブになりました。レポートはメニュー（☰）からここへ移り、月間・年間・鍛錬期・合宿を切り替えて見られます。上で選んだ期間と表示が連動します。",
    steps: [
      "下のタブの「My Log」を開く",
      "上のタブで「ログ／レポート／記録」を切り替える",
      "レポートの左のメニューで、月間・年間・鍛錬期・合宿を選ぶ",
    ],
    locationHint: "My Log →「ログ」「レポート」「記録」",
    highlight: "mylog",
    cta: { label: "さっそく開く", view: "diary" },
  },
];
