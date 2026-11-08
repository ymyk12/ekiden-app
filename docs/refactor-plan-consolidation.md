# ロール間の重複コード 整理計画

作成日: 2026-11-07 / 対象バージョン: 6.7.34

選手（Athlete）/ マネージャー（Manager）/ 監督（Coach）の3ロールで、
**同じ画面・機能なのにコードが別々に実装されているもの**を調査し、
今後の共通化計画としてまとめたもの。実装はまだ行っていない（調査のみ）。

> 方針は従来どおり「**挙動を変えない安全な共通化**」。各項目は独立して着手でき、
> 1項目ごとに `CI=true` ビルド + テスト + 実機確認で検証する。

---

## サマリ（優先度順）

| # | 重複している機能 | 関係ファイル | 重複規模 | 優先度 |
|---|---|---|---|---|
| 1 | チーム練習日誌（一覧＋編集＋AI読取） | CoachDiaryView ↔ ManagerDiaryView ＋ 両親のハンドラ | 約700行 | ★★★ |
| 2 | 大会（Race）ビューの共通部品 | Athlete/Manager/CoachRaceView | 月フィルタ等が3重 | ★★ |
| 3 | 提出状況チェック | CoachHomeView ↔ ManagerCheckView | 約100行 | ★★ |
| 4 | ランキング／活動フィード（ランキングは**選手版を採用**＋仕様変更） | Athlete/Manager/Coach の各所 | 描画ロジック重複 | ★ |
| 5 | 選手別 月間レポートを選手にも公開（**新機能**） | MonthlyReportView を Athlete にも | 追加実装 | ★★ |

すでに共通化できている良い例（＝触らない）: `TeamRaceReport` / `LapTimeModal` /
`SmartLapInput` / `DiaryListItem` / `CalendarView`。
`MonthlyReportView` も単一コンポーネントだが、現状は監督しか開けない（#5で選手にも開放する）。

---

## ◎ 全体をつらぬく権限の原則（共通化の前提）

共通コンポーネント化で画面を3ロールに共有しても、**各選手の入力内容（練習ログ・
レースカード・振り返り等）を加除訂正できるのは監督（Coach）のみ**とする。

- 共有する一覧・フィード・詳細モーダルでは、**編集／削除のUIは `role === COACH` のときだけ**
  表示する（選手・マネージャーは閲覧のみ）。
- 共通コンポーネントには `canEdit`（または `role`）を props で渡し、編集系ボタンを出し分ける。
- 既存の「選手が自分のログを直す」導線（`handleAthleteUpdateLog`）はこの原則の対象外
  （＝本人が自分の記録を直すのは従来どおり可）。あくまで「**他者の入力を直せるのは監督だけ**」。

---

## 1. チーム練習日誌 ★★★（最優先・最大の重複）

監督とマネージャーが**まったく同じ機能**（その日のチーム練習メニューを一覧表示・
編集・AI画像読み取りで自動入力）を、別々のコンポーネント＋別々のハンドラで持っている。

### 重複箇所
- **ビュー**: `components/coach/CoachDiaryView.jsx`(533行) ≈
  `components/manager/ManagerDiaryView.jsx`(428行)
  - 同じ `DiaryListItem`、同じ補強オプション、同じ編集フォーム（DATE/天気/気温/湿度/
    メニュー/補強/結果）、同じAI読取モーダル。
- **ハンドラ**（親に重複実装）:
  | 監督（CoachView.jsx） | マネージャー（ManagerDashboard.jsx） |
  |---|---|
  | `saveCoachDiary` | `saveDiary` |
  | `handleCoachRestRegister` | `handleRestRegister` |
  | `deleteCoachDiary` | `deleteDiary` |
  | `toggleCoachReinforcement` | `toggleReinforcement` |
  | `generateCoachDiaryWithAI` | `generateDiaryWithAI` |

### 処理はほぼ同一（確認済み）
両方とも Firestore の `team_logs/{date}` と `menus/{date}` に同じ形で書き込む。
**差分はごくわずか**:
- 保存対象日の変数名（監督 `menuInput.date` / マネージャー `checkDate`）
- `updatedBy` のラベル（`"監督"` / `"{姓} (MG)"`）
- マネージャー側のみ `isDemoMode` ガードがある
- toast の import 作法（監督は動的 import、マネージャーは静的）

### 計画
1. `useTeamDiary({ role, dateKey, isDemoMode })` フックを新設し、5つのハンドラを1本化。
   - `updatedBy` と `isDemoMode` は引数で吸収。
2. 表示を `components/shared/TeamDiaryView.jsx` に統合（props でロール差を吸収）。
3. CoachView / ManagerDashboard は新フック＋新ビューを呼ぶだけにする。
- **見込み**: 約700〜800行 → 約400行。重複ハンドラ5×2本 → 5本。

---

## 2. 大会（Race）ビューの共通部品 ★★

3ロールすべてに Race ビューがあり、**土台は同じだが操作が異なる**。

| ファイル | 役割 | 固有の操作 |
|---|---|---|
| `athlete/AthleteRaceView.jsx` | 自分のレースカード一覧 | カード追加・編集（race-entry へ） |
| `manager/ManagerRaceView.jsx` | 大会→エントリー選手ドリルダウン | LAP入力 |
| `coach/CoachRaceView.jsx` | 大会の登録・編集・削除 | FB状況表示 |

### 重複箇所
- **月フィルターチップ**: 3ファイルで**完全コピペ**（`[...new Set(tournaments.map(
  t => t.startDate?.slice(0,7)))].sort().reverse()` → チップ描画）。
- 大会カードのガワ（大会名 + `startDate 〜 endDate` の整形表示）。
- 「チームレポートを見る」導線（`setShowTeamReportId(tour.id)`）。

### 計画（小さく安全に）
1. `components/shared/TournamentMonthFilter.jsx` を抽出（**即効・最低リスク**。まずこれだけでも可）。
2. 大会カードのガワを `TournamentCard` にし、ロール別アクションは `children`/slot で差し込む。
- 月フィルタだけなら 3ロール同時に置換してもリスクは小さい。

---

## 3. 提出状況チェック ★★

「指定した日に誰が練習記録を提出したか」を、監督とマネージャーが別実装で持っている。

- `components/coach/CoachHomeView.jsx` … 日付指定の 提出済／未提出 一覧＋アラート
- `components/manager/ManagerCheckView.jsx` … `submissionStatusList` を `checkDate` で表示

### 計画
- `components/shared/SubmissionStatusList.jsx` に共通化（提出済／未提出の判定と行描画）。
- 監督ホームの「アラート」部分はロール固有なので残す。

---

## 4. ランキング／活動フィード ★

- **月間ランキング**の行描画が重複:
  `athlete/AthleteTeamStatusView.jsx`（今日の距離つき）と
  `manager/ManagerStatusView.jsx`（メダルバーつき）。監督側もホームで `rankingData` を使用。
- **チーム活動フィード**（タイムライン）が
  `ManagerStatusView` / `CoachHomeView` / `AthleteTeamStatusView` に点在。
- 日誌詳細の展開表示（補強バッジ・結果欄）も AthleteTeamStatusView と日誌ビューで類似。

### 計画
- `RankingList` / `TeamActivityFeed` を共通化し、**ランキングは選手（Athlete）版の
  デザインを採用**（メダル風の順位バッジ＋名前＋合計km）。マネージャー版・監督側の表示も
  これに寄せる。
- **ランキング行の仕様変更**:
  - 既存の「今日: ◯km」行は**廃止**。
  - 代わりに各選手の「**未入力 ◯日**」を表示する。
  - 未入力日数の定義: **選択中の期間（targetPeriod）内で、期間開始日〜「前日まで」の各日の
    うち、その選手のログが1件も無い日の数**。完全休養はログ扱い（＝入力済み）なので数えない。
    - 境界は **前日まで（＝当日は未入力に数えない／入力猶予あり）で確定**。
      既存の本人用 `missingDates` と同じ基準。
  - 期間終了日が今日より前なら、範囲は期間終了日まで（未来は数えない）。
- **実装方法（低リスク）**: `hooks/useStats.js` の `rankingData`（現状 `{name, id, total}`）に
  `missingCount` を追加するだけ。判定ロジックは既存 `missingDates`（本人用）を全選手へ
  一般化して流用できる。UI 側はその値を表示するだけ。
- **権限**: 活動フィードの各ログをタップ → 詳細モーダルで、
  **加除訂正（編集・削除）ができるのは監督のみ**。選手・マネージャーは閲覧専用。
  - 共通コンポーネントに `canEdit={role === COACH}` を渡して編集UIを出し分ける。
- 優先度は中（デザイン調整＋集計追加が入るぶん、#1〜#3 の後が無難）。

---

## 5. 選手別 月間レポートを選手にも公開 ★★（新機能）

現状 `components/MonthlyReportView.jsx`（727行）は**監督だけ**が開ける。
「月 × 選手」を選ぶと、その選手の月間走行距離・練習日数・週別推移・区分内訳・
大会結果・日々のログを A4 1枚に集計し、印刷/PDF配布できる画面。
→ これを**各選手が自分の分だけ**閲覧・印刷できるようにする。

### 現状の作り（確認済み）
- props: `handlePrint` / `activeRunners` / `allLogs` / `raceCards` / `tournaments`。
- 内部に `runnerId`（既定 `"all"`）の選手セレクタと `month` セレクタを持つ。
  `"all"` は全選手一括（1人1ページ改ページ印刷）。
- 必要なデータ（`allLogs` / `raceCards` / `tournaments`）は **AthleteView にも既に来ている**。
  印刷は `usePrint` フックの `handlePrint` で供給可能。

### 計画（低リスク・加算的）
1. `MonthlyReportView` に props を追加（既定は現状維持）:
   - `lockedRunnerId`（指定時はこの選手に固定）＋ `allowAll={false}`
     → 選手セレクタと「全選手」オプションを隠し、本人の月間レポートだけ表示。
   - 既存の監督フロー（セレクタあり・全員一括）は props 未指定で**従来どおり**。
2. 選手画面に新ビュー（例 `my-report` / 「月間レポート」）を追加し、
   `MonthlyReportView` を `lockedRunnerId={currentUserId}` で描画。メニュー導線を1つ足す。
3. 権限: 選手版は**閲覧・印刷のみ**（◎の原則どおり、他者データは出さない＝本人固定で担保）。

- **効果**: 新規コンポーネントを作らず、既存を1つ拡張するだけで選手に開放できる。
  重複を増やさない（＝本計画の方針と整合）。

---

## 進め方の推奨順

1. **#2 の月フィルターだけ**を共通化（ウォームアップ、ほぼ無リスク）
2. **#5 月間レポートの選手公開**（新機能・加算的で独立。喜ばれやすい）
3. **#3 提出状況**（中規模・ロジック明快）
4. **#1 チーム練習日誌**（最大の効果。腰を据えて）
5. **#4 ランキング／フィード**（ランキングは選手デザイン採用＋「未入力◯日」へ仕様変更、
   フィードは権限出し分け。調整多めなので後半）

※ 共通化で画面を共有しても **◎の権限原則**（他者の入力を直せるのは監督だけ）を必ず守る。
※ TeamRaceReport.jsx（1417行）のファイル分割は本計画とは別軸。先にそちらを片付けると、
  #2 の大会まわりが見通しやすくなる可能性がある。
