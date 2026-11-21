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
  {
    id: "mylog-race-history-v1",
    roles: ["athlete"],
    since: "6.8.3",
    icon: "Flag",
    title: "自分の大会を振り返れるようになりました",
    body: "My Log の「記録」タブに、出場した大会の一覧（Race History）が加わりました。大会を選ぶと、目標・結果・振り返り・監督コメントが1枚の「大会レポート」にまとまります。印刷やPDF保存もできます。各項目は見出しをタップして折り畳めます。",
    steps: [
      "下のタブの「My Log」→「記録」を開く",
      "Race History から見たい大会をタップ",
      "右上のプリンターボタンで印刷・PDF保存",
    ],
    locationHint: "My Log →「記録」→ Race History",
    highlight: "mylog",
    cta: { label: "さっそく開く", view: "diary" },
  },
  {
    id: "team-race-report-v1",
    roles: ["athlete"],
    since: "6.8.3",
    icon: "Users",
    title: "チームの大会レポートは「Team」タブから",
    body: "チームの大会レポートは、Team タブの「日誌」→「大会レポート」から見られるようになりました（メニューの大会カード欄からは見られなくなりました）。上の「< >」で月も切り替えられます。レポートの下には、みんなが書いた「仲間の良かったところ」が、誰が書いたかわからない形で載ります。",
    steps: [
      "下のタブの「Team」→「日誌」を開く",
      "「大会レポート」に切り替えて、大会をタップ",
      "「< >」で月を切り替える",
    ],
    locationHint: "Team →「日誌」→「大会レポート」",
    highlight: "team",
    cta: { label: "さっそく開く", view: "team_status" },
  },
];
