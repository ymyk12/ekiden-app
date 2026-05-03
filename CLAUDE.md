# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# フロントエンド開発サーバー起動
npm start

# ビルド（本番用）
npm run build

# テスト実行
npm test

# Firebase エミュレーター起動（Cloud Functions のローカル実行）
cd functions && npm run serve

# Cloud Functions のデプロイ
cd functions && npm run deploy

# Cloud Functions のリント
cd functions && npm run lint
```

環境変数は `.env` ファイルから `REACT_APP_FIREBASE_*` プレフィックスで読み込む。`functions/.env` に `GEMINI_API_KEY` が必要。

## アーキテクチャ概要

陸上競技チーム（駅伝）向けの練習管理 Web アプリ。React フロントエンド ＋ Firebase バックエンド構成。

### 技術スタック

- **フロントエンド**: React 19 (Create React App), Tailwind CSS, Recharts, lucide-react, react-hot-toast
- **バックエンド**: Firebase Firestore (リアルタイム DB), Firebase Auth (匿名認証), Firebase Cloud Messaging (プッシュ通知)
- **サーバー処理**: Firebase Cloud Functions (Node.js 22) — Gemini API 呼び出しと通知配信のみ

### 画面遷移とロール管理

認証状態は `role` ステートで管理。ロールは `src/utils/constants.js` の `ROLES` 定数で定義。

| role | 意味 |
|------|------|
| `null` | 未ログイン → `WelcomeScreen` |
| `login` | ログイン画面 → `LoginScreen` |
| `registering` | 新規登録画面 → `RegisterScreen` |
| `coach-auth` | 監督パスワード入力 → `CoachAuthScreen` |
| `coach` | 監督ビュー → `CoachView` |
| `runner` | 選手ビュー → `AthleteView` |
| `manager` | マネージャービュー → `ManagerDashboard` |
| `admin-runner` | 管理者選手（監督権限も持つ） |

匿名認証を使い、Firestore の `runners` コレクションの `lastLoginUid` フィールドでユーザーを特定する。`profile.id`（選手番号）が Firestore の各コレクションの `runnerId` に対応する。

### Firestore データ構造

全データのパスは `artifacts/{appId}/public/data/{collection}` の形式。`appId` は `src/firebaseConfig.js` でハードコードされた `"kswc-ekidenteam-distancerecords"`。

Firestore 参照は `src/utils/firestore.js` のヘルパーを使う：

```js
import { colRef, docRef, settingsDocRef } from "../utils/firestore";

colRef("logs")               // コレクション参照
docRef("runners", runnerId)  // ドキュメント参照
settingsDocRef()             // settings/global ドキュメント参照
```

主なコレクション：

- `runners` — 選手プロフィール・目標
- `logs` — 練習記録（`runnerId`, `date` フィールドで検索）
- `tournaments` — 大会情報
- `raceCards` — 大会振り返りノート
- `menus` — 練習メニュー
- `feedbacks` — 監督コメント
- `team_logs` — チーム練習日誌
- `settings/global` — アプリ設定（パスワード、期間設定など）

### データフロー

```
App.js
 └─ useTeamData(user, role, fetchCutoff)  ← 全コレクションをリアルタイム購読
     └─ Firestore onSnapshot
         ├─ allRunners, allLogs, tournaments, raceCards
         ├─ practiceMenus, allFeedbacks, teamLogs
         └─ appSettings（期間・パスワード設定）
```

`App.js` が全データとコールバック関数を props として各ビューコンポーネントに渡す。`fetchCutoff` で選手ロールのデータ取得を直近 3 ヶ月に制限（監督・管理者は全期間）。

### ユーティリティ

- `src/utils/firestore.js` — Firestore パスヘルパー（`colRef` / `docRef` / `settingsDocRef`）
- `src/utils/dateUtils.js` — 日付計算・期間生成・`getGoalValue`・`extractGoalInputs`
- `src/utils/constants.js` — `ROLES` / `CATEGORY` / `RACE_TYPES` などの定数

### コンポーネント構成

`App.js` がルーティング・認証・Firestore 書き込み処理を一手に担う。`src/components/` 以下の大型コンポーネントは表示のみ担当し、データ操作は `App.js` から props で渡されたコールバックを呼ぶ設計。

- `CoachView.jsx` (~137KB) — 監督ダッシュボード
- `AthleteView.jsx` (~101KB) — 選手ダッシュボード
- `ManagerDashboard.jsx` (~59KB) — マネージャー画面
- `CoachReportView.jsx` (~34KB) — 監督レポート
- `RaceCardEntry.jsx` (~31KB) — 大会振り返り入力
- `TeamRaceReport.jsx` (~18KB) — チーム大会レポート

### 印刷・プレビュー

印刷用 CSS は `src/print.css`（`App.js` でグローバル import）。プレビューモードは `isPrintPreview` ステートで切り替え、`.preview-mode-wrapper` クラスで A4 レイアウトを再現する。`usePrint` フック（`src/hooks/usePrint.js`）が印刷ファイル名の制御を担当。

### Cloud Functions

`functions/index.js` に 3 つの関数：

1. `analyzeDiaryImage` — Gemini 2.5 Flash API を呼び出し、日誌画像を解析
2. `queueOrSendNotification` — `raceCards` ドキュメント作成時に FCM 通知（夜間はキューイング）
3. `morningBatchNotification` — 毎朝 8 時（JST）にキューの通知をまとめて配信
