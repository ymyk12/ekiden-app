// ==========================================
//   import
// ==========================================

import { useState, useEffect, useMemo } from "react";
import { signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";

import { Toaster, toast } from "react-hot-toast";

// Utilsから読み込む（役割ROLESと練習カテゴリーの定義）
import { ROLES } from "./utils/constants";

// Utilsから読み込む（日付の計算）
import {
  getTodayStr,
  calculateAutoQuartersFixed,
  getDatesInRange,
  getMonthRange,
  getYearRange,
  getGoalValue,
} from "./utils/dateUtils";

// firebaseの情報を読み込む
import { auth, db, appId } from "./firebaseConfig";
import { useTeamData } from "./hooks/useTeamData";

// 初期画面
import WelcomeScreen from "./components/WelcomeScreen";
// login画面
import LoginScreen from "./components/LoginScreen";
// 登録画面
import RegisterScreen from "./components/RegisterScreen";
// コーチ認証
import CoachAuthScreen from "./components/CoachAuthScreen";
// コーチ画面
import CoachView from "./components/CoachView";
// 選手画面
import AthleteView from "./components/AthleteView";
// マネージャー画面
import ManagerDashboard from "./components/ManagerDashboard";

// --- App Version ---
const APP_LAST_UPDATED = "5.1.2";

// --- Print Styles (修正版: 改ページ完全対応) ---
// --- Print Styles (修正版: 学年別テーブル先頭） ---
// --- Print Styles (修正版: 印刷不具合の完全対策) ---
const printStyles = `
  /* 通常画面のカードスタイル */
  .report-card-base { 
    background: white; 
    padding: 20px; 
    border-radius: 20px; 
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
    margin-bottom: 20px; 
    width: 100%; 
  }
  .report-chart-container { 
    height: 400px; 
    width: 100%; 
    overflow-x: auto; 
    display: block; 
  }
  
  /* プレビュー画面のラッパー */
  .preview-mode-wrapper { 
    position: fixed; 
    top: 0; left: 0; right: 0; bottom: 0; 
    background-color: #525659; 
    z-index: 9999; 
    overflow-y: auto; 
    padding: 40px 0; 
    display: block; 
  }
  
  /* プレビュー画面での「紙」 */
  .preview-mode-wrapper .report-card-base { 
    width: 297mm; /* A4横幅 */
    min-height: 210mm; 
    height: auto; 
    padding: 10mm; 
    margin: 0 auto 30px auto; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
    border-radius: 0; 
    box-sizing: border-box; 
    position: relative; 
    display: block; 
    background-color: white;
    overflow: visible; 
  }

  /* テーブル共通設定 */
  .preview-mode-wrapper table, 
  @media print table { 
    width: 100% !important; 
    border-collapse: collapse !important;
    font-size: 9px !important;
    font-family: 'Helvetica Neue', Arial, sans-serif !important;
    margin-bottom: 20px; 
  }

  .preview-mode-wrapper thead,
  @media print thead {
    display: table-header-group !important;
  }
  
  .preview-mode-wrapper tr,
  @media print tr {
    page-break-inside: avoid !important; 
    break-inside: avoid !important;
  }

  .preview-mode-wrapper th, 
  .preview-mode-wrapper td,
  @media print th,
  @media print td { 
    padding: 3px 4px !important; 
    border: 1px solid #94a3b8 !important; 
    white-space: normal !important; 
    word-wrap: break-word !important;
    color: #000 !important; /* 印刷時は文字色を黒に強制 */
  }

  .preview-mode-wrapper th:first-child, 
  .preview-mode-wrapper td:first-child,
  @media print th:first-child,
  @media print td:first-child { 
    width: 60px !important; 
    white-space: nowrap !important; 
    text-align: center !important; 
    background-color: #f8fafc !important;
  }

  /* 強制改ページクラス */
  .page-break {
    page-break-before: always !important;
    break-before: page !important;
    display: block !important;
    clear: both !important;
  }

  /* ▼▼▼ 印刷時の設定（白紙・消滅対策） ▼▼▼ */
  @media print {
    
      @page {
        size: A4 portrait; /* ヨコからタテに変更 */
        margin: 10mm;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background-color: white !important;
      }
      .no-print { display: none !important; }
      .page-break { 
        page-break-before: always; /* 確実に新しいページから開始 */
      }
      .report-card-base {
        box-shadow: none !important;
        border: 1px solid #e2e8f0 !important;
        margin-bottom: 0 !important;
        padding: 10px !important;
        width: 100% !important;
      }
      /* テーブルの文字サイズをタテに収まるよう微調整 */
      table {
        font-size: 9px !important; 
      }
      th, td {
        padding: 4px 2px !important;
      }
      /* ▼▼▼ 追加: グラフの印刷用高さ設定 ▼▼▼ */
      /* ▼▼▼ 修正: 高さ90mm → 140mm に変更 ▼▼▼ */
      /* 折れ線グラフ（上）: A4タテ上半分ほどの面積 */
      .print-chart-line {
        height: 140mm !important; 
        width: 100% !important;
        margin-bottom: 15mm !important;
      }
      /* 棒グラフ（下）: 項目が多いので高さを確保 */
      .print-chart-bar {
        height: 130mm !important; 
        width: 100% !important;
      }
      /* ▲▲▲ 追加ここまで ▲▲▲ */
      
    .no-print, header, nav, .fixed-ui, .coach-menu-bar { display: none !important; 
    }
    
    .preview-mode-wrapper { 
      position: static !important; 
      padding: 0 !important; 
      overflow: visible !important; 
      display: block !important; 
      height: auto !important;
      background: white !important;
    }
    
    /* ★重要：Sticky解除（これが白紙の主原因） */
    th, td {
      position: static !important;
      left: auto !important;
    }

    /* ★重要：スクロール解除 */
    div {
      overflow: visible !important;
    }
    
    .report-card-base,
    .preview-mode-wrapper .report-card-base { 
      width: 100% !important; 
      height: auto !important; 
      min-height: 0 !important; 
      box-shadow: none !important; 
      border-radius: 0 !important; 
      border: none !important; 
      margin: 0 !important; 
      padding: 0 !important; 
      display: block !important; 
      overflow: visible !important; 
      background: transparent !important;
    }
    
    /* 最初の要素の余白を消して1ページ目に入れる */
    .report-card-base:first-child,
    .page-break:first-child {
      margin-top: 0 !important;
      padding-top: 0 !important;
      page-break-before: avoid !important;
    }
    
    .report-chart-container { 
      page-break-inside: avoid !important; 
      break-inside: avoid !important; 
      margin-top: 20px; 
      margin-bottom: 20px;
    }
  }
`;

// --- Global Styles (スクロールバー非表示など) ---
const globalStyles = `
  /* スクロールバーを非表示にする（機能は維持） */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
`;

// ==========================================
//   useState
// ==========================================

const App = () => {
  // 1. State Hooks
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("menu");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // ★追加: 日誌の開閉状態管理用
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);

  // Coach specific states
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [coachEditFormData, setCoachEditFormData] = useState({});
  const [previewRunner, setPreviewRunner] = useState(null);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [checkDate, setCheckDate] = useState(getTodayStr());
  const [isCoachEditModalOpen, setIsCoachEditModalOpen] = useState(false); // 監督用ログ編集モーダル
  // ▼▼▼ 追加: アラートリストの開閉ステート ▼▼▼
  const [isPainAlertModalOpen, setIsPainAlertModalOpen] = useState(false);
  // 監督用: 選手の目標編集ステート
  const [coachGoalInput, setCoachGoalInput] = useState({
    monthly: "",
    period: "",
    q1: "",
    q2: "",
    q3: "",
    q4: "",
  });

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [isPeriodInitialized, setIsPeriodInitialized] = useState(false);

  // デモモード
  const [demoMode, setDemoMode] = useState(null); // "manager" か "admin" か null
  // デモモードを終了して、画面の一番下にスッと戻る関数
  const handleExitDemo = () => {
    setDemoMode(null);
    setView("coach-settings"); // SETTINGに戻る
    // 画面が切り替わってから、一番下（デモボタンの位置）へ滑らかにスクロール！
    setTimeout(() => {
      const target = document.getElementById("demo-buttons-section");
      if (target) {
        // 見つけた的（まと）が画面に入るように、滑らかにスクロール
        target.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  };

  const [reviewComment, setReviewComment] = useState("");
  const [coachFeedbackComment, setCoachFeedbackComment] = useState("");

  const [formData, setFormData] = useState({
    date: getTodayStr(),
    distance: "",
    category: "",
    menuDetail: "",
    rpe: 1,
    pain: 1,
    achieved: true,
    lastName: "",
    firstName: "",
    memberCode: "", // ★追加：選手ID（例：26001）
    teamPass: "",
    personalPin: "",
    isManager: false, // ★追加: マネージャーフラグ
  });

  const [menuInput, setMenuInput] = useState({ date: getTodayStr(), text: "" });
  const [goalInput, setGoalInput] = useState({
    monthly: "",
    period: "",
    q1: "",
    q2: "",
    q3: "",
    q4: "",
  });

  const initialPeriodInput = {
    name: "",
    start: "",
    end: "",
    quarters: [
      { id: 1, start: "", end: "" },
      { id: 2, start: "", end: "" },
      { id: 3, start: "", end: "" },
      { id: 4, start: "", end: "" },
    ],
  };
  const [newPeriodInput, setNewPeriodInput] = useState(initialPeriodInput);
  const [editingPeriodId, setEditingPeriodId] = useState(null);

  // --- Coach specific states --- の下あたりに追加
  const [mergeSourceId, setMergeSourceId] = useState(""); // 消す方（統合元）
  const [mergeTargetId, setMergeTargetId] = useState(""); // 残す方（統合先）

  // 大会新規作成用のデータ
  const [newTournamentInput, setNewTournamentInput] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  // カスタムフックでデータを一括取得！
  const {
    allRunners,
    allLogs,
    practiceMenus,
    allFeedbacks,
    teamLogs,
    appSettings,
    setAppSettings,
    dataLoading,
    tournaments,
    raceCards,
  } = useTeamData(user);

  useEffect(() => {
    if (!selectedPeriod) {
      const current = getMonthRange(getTodayStr());
      setSelectedPeriod({
        id: "current_month",
        name: current.name,
        start: current.start,
        end: current.end,
        type: "month",
      });
    }
  }, [selectedPeriod]);

  // FIX: 監督モードで選択中の選手情報を安全に同期する
  useEffect(() => {
    if (role === ROLES.COACH && selectedRunner && allRunners.length > 0) {
      const updated = allRunners.find((r) => r.id === selectedRunner.id);
      // データの不一致がある場合のみ更新 (JSON.stringifyで比較)
      if (
        updated &&
        JSON.stringify(updated) !== JSON.stringify(selectedRunner)
      ) {
        setSelectedRunner(updated);
      }
    }
  }, [allRunners, role, selectedRunner]);

  useEffect(() => {
    document.title = "KCTF Ekiden Team";
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error("Auth failed", e);
        setLoading(false);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false); // ★ ユーザー確認が終わったらぐるぐるを解除！

      if (!u) {
        signInAnonymously(auth).catch((e) => console.error(e));
      }
    });
    return () => unsub();
  }, []);

  // ★追加：データが更新されたら自分のプロフィールと役割を同期する
  useEffect(() => {
    if (!user || allRunners.length === 0) return;

    // ★修正: IDではなく「最後にログインしたFirebaseUID」で自分を探す
    const myP = allRunners.find((r) => r.lastLoginUid === user.uid);
    if (myP) {
      setProfile(myP);
      // 現在のroleが未定、または一時的な状態でないならrunnerに確定
      if (
        !role ||
        (role !== ROLES.COACH &&
          role !== ROLES.ADMIN &&
          role !== ROLES.COACH_AUTH)
      ) {
        setRole(ROLES.RUNNER);
      }
    } else {
      // データが見つからず、かつ登録/ログイン画面等の操作中でなければリセット
      if (
        ![
          ROLES.COACH,
          ROLES.REGISTERING,
          ROLES.LOGIN,
          ROLES.COACH_AUTH,
          ROLES.ADMIN,
        ].includes(role)
      ) {
        setProfile(null);
        setRole(null);
      }
    }
  }, [allRunners, user, role]);

  // 3. Derived Data
  // ★修正：user.uid(認証ID)ではなく、profile.id(選手番号)を使用する
  // user.uidを使うと、logs内のrunnerId(選手番号)と一致せずデータが出ないため
  const currentUserId = previewRunner ? previewRunner.id : profile?.id;
  const currentProfile = previewRunner || profile;

  const availablePeriods = useMemo(() => {
    const periods = [];

    // 1. チーム指定期間 (Global Period)
    // 設定画面で入力された期間があれば表示（IDは維持）
    const globalStart = appSettings.startDate;
    const globalEnd = appSettings.endDate;

    if (globalStart && globalEnd) {
      periods.push({
        id: "global_period",
        name: "チーム指定期間 (シーズン)",
        start: globalStart,
        end: globalEnd,
        quarters: appSettings.quarters || [],
        type: "global",
      });
    }

    // 2. カスタム期間 (合宿など)
    if (appSettings.customPeriods && appSettings.customPeriods.length > 0) {
      appSettings.customPeriods.forEach((p) => {
        periods.push({ ...p, type: "custom" });
      });
    }

    // 3. ★年度単位を自動生成 (4月始まり)
    const currentYear = new Date().getFullYear();
    // 来年度(i=-1)〜2年前度(i=2)まで生成
    for (let i = -1; i < 3; i++) {
      const y = currentYear - i;
      const yRange = getYearRange(y); // 修正したヘルパーが呼ばれ4/1~3/31になる
      periods.push({
        id: `year_${y}`,
        name: yRange.name, // "2025年度" と表示
        start: yRange.start,
        end: yRange.end,
        type: "year",
      });
    }

    // 4. 月単位 (直近12ヶ月)
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mRange = getMonthRange(d);
      periods.push({
        id: `month_${d.getFullYear()}_${d.getMonth() + 1}`,
        name: mRange.name,
        start: mRange.start,
        end: mRange.end,
        type: "month",
      });
    }

    return periods;
  }, [appSettings]);

  useEffect(() => {
    if (
      !isPeriodInitialized &&
      appSettings.loaded &&
      availablePeriods.length > 0
    ) {
      const defaultId = appSettings.defaultPeriodId || "global_period";
      let target = null;
      if (defaultId === "dynamic_current") {
        const today = new Date();
        const currentMonthId = `month_${today.getFullYear()}_${today.getMonth() + 1}`;
        target = availablePeriods.find((p) => p.id === currentMonthId);
      } else {
        target = availablePeriods.find((p) => p.id === defaultId);
      }
      // ▼ 修正・追加したコード ▼
      // 設定されたIDが見つからない場合の自動選択ロジック
      if (!target) {
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // 1月=1, 2月=2...
        let fiscalYear = today.getFullYear();

        // ★重要: 1月, 2月, 3月の場合、年度は「昨年」になる
        // 例: 2026年2月なら、年度は「2025年度」扱いにする
        if (currentMonth <= 3) {
          fiscalYear = fiscalYear - 1;
        }

        // 計算した年度ID (例: year_2025) を探す
        target = availablePeriods.find((p) => p.id === `year_${fiscalYear}`);
      }

      // それでも見つからなければリストの先頭（カスタム期間など）にする
      if (!target) target = availablePeriods[0];
      // ▲ 修正ここまで ▲

      if (target) {
        setSelectedPeriod(target);
        setIsPeriodInitialized(true);
      }
    }
  }, [
    availablePeriods,
    appSettings.defaultPeriodId,
    appSettings.loaded,
    isPeriodInitialized,
  ]);

  const targetPeriod = useMemo(() => {
    if (selectedPeriod) {
      const found = availablePeriods.find((p) => p.id === selectedPeriod.id);
      return found || selectedPeriod;
    }
    return (
      availablePeriods.find((p) => p.id === "global_period") || {
        id: "fallback",
        name: "Loading...",
        start: "2000-01-01",
        end: "2100-12-31",
        type: "global",
      }
    );
  }, [selectedPeriod, availablePeriods]);

  const activeQuarters = useMemo(() => {
    if (targetPeriod.type === "global" || targetPeriod.type === "custom") {
      // 1. 保存されたquartersがあり、かつ「有効なデータ(日付が入っている)」かチェック
      const hasValidQuarters =
        targetPeriod.quarters &&
        targetPeriod.quarters.length > 0 &&
        targetPeriod.quarters.some((q) => q.start && q.end); // 少なくとも1つは日付があるか

      if (hasValidQuarters) {
        return targetPeriod.quarters;
      }

      // 2. データがない、または無効なら、期間から自動計算して表示する (救済措置)
      if (targetPeriod.start && targetPeriod.end) {
        return calculateAutoQuartersFixed(targetPeriod.start, targetPeriod.end);
      }
    }
    return [];
  }, [targetPeriod]);

  const activeRunners = useMemo(() => {
    return allRunners.filter(
      (r) => r.status !== "retired" && r.lastName !== "admin",
    );
  }, [allRunners]);

  const personalStats = useMemo(() => {
    if (!currentUserId)
      return { daily: [], monthly: 0, period: 0, qs: [0, 0, 0, 0] };
    const myLogs = allLogs.filter((l) => l.runnerId === currentUserId);

    const start = new Date(targetPeriod.start || "2000-01-01");
    const end = new Date(targetPeriod.end || "2100-12-31");
    const periodTotal = myLogs
      .filter((l) => {
        const d = new Date(l.date);
        return d >= start && d <= end;
      })
      .reduce((s, l) => s + (Number(l.distance) || 0), 0);

    const now = new Date();
    const monthlyTotal = myLogs
      .filter((l) => {
        const d = new Date(l.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, l) => s + (Number(l.distance) || 0), 0);

    const qs = activeQuarters.map((q) => {
      if (!q.start || !q.end) return 0;
      const qStart = new Date(q.start);
      const qEnd = new Date(q.end);
      return myLogs
        .filter((l) => {
          const d = new Date(l.date);
          return d >= qStart && d <= qEnd;
        })
        .reduce((s, l) => s + (Number(l.distance) || 0), 0);
    });

    const daily = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("sv-SE");
      const dayLogs = myLogs.filter((l) => l.date === dateStr);
      const dayDist = dayLogs.reduce(
        (acc, log) => acc + (Number(log.distance) || 0),
        0,
      );
      daily.push({
        date: dateStr,
        label: dateStr.split("-")[2],
        distance: Math.round(dayDist * 10) / 10,
      });
    }

    return {
      daily,
      monthly: Math.round(monthlyTotal * 10) / 10,
      period: Math.round(periodTotal * 10) / 10,
      qs: qs.map((v) => Math.round(v * 10) / 10),
    };
  }, [allLogs, currentUserId, targetPeriod, activeQuarters]);

  // ★修正: 選択中の期間内で、今日を含まない過去の未入力日をすべて抽出
  const missingDates = useMemo(() => {
    if (!currentUserId || !targetPeriod || !targetPeriod.start) return [];

    const missing = [];
    const myLogs = allLogs.filter((l) => l.runnerId === currentUserId);
    const logDateSet = new Set(myLogs.map((l) => l.date));

    // 検索の開始日
    const current = new Date(targetPeriod.start);
    current.setHours(0, 0, 0, 0);

    // 検索の「上限」日を決める（ここを修正）
    // 1. 本来の期間終了日
    const periodEnd = new Date(targetPeriod.end);
    periodEnd.setHours(0, 0, 0, 0);

    // 2. 昨日（未来の日付を未入力と言わないため）
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // ★重要: 「期間終了日」と「昨日」のうち、過去の方（早い方）を終了点にする
    // 例: 1月選択中(1/31終了) vs 昨日(2/3) -> 1/31までチェック
    // 例: 2月選択中(2/28終了) vs 昨日(2/3) -> 2/3までチェック
    const checkEndDate = periodEnd < yesterday ? periodEnd : yesterday;

    // 開始日が終了点より未来、または無効な場合は何もしない
    if (isNaN(current.getTime()) || current > checkEndDate) return [];

    let safetyCounter = 0;
    // current が checkEndDate を超えるまでループ
    while (current <= checkEndDate && safetyCounter < 370) {
      const dateStr = current.toLocaleDateString("sv-SE"); // YYYY-MM-DD

      if (!logDateSet.has(dateStr)) {
        missing.push(dateStr);
      }

      current.setDate(current.getDate() + 1);
      safetyCounter++;
    }

    return missing.sort();
  }, [allLogs, currentUserId, targetPeriod]);

  const currentFeedback = useMemo(() => {
    if (!currentUserId || !targetPeriod) return null;
    const feedbackId = `${targetPeriod.id}_${currentUserId}`;
    return allFeedbacks.find((f) => f.id === feedbackId) || { id: feedbackId };
  }, [allFeedbacks, targetPeriod, currentUserId]);

  const periodLogs = useMemo(() => {
    if (!currentUserId || !targetPeriod) return [];
    const start = new Date(targetPeriod.start);
    const end = new Date(targetPeriod.end);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    return allLogs
      .filter((l) => l.runnerId === currentUserId)
      .filter((l) => {
        const d = new Date(l.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allLogs, currentUserId, targetPeriod]);

  const rankingData = useMemo(() => {
    const start = new Date(targetPeriod.start || "2000-01-01");
    const end = new Date(targetPeriod.end || "2100-12-31");
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    return activeRunners
      .filter((r) => r.role !== ROLES.MANAGER)
      .map((r) => {
        const total = allLogs
          .filter(
            (l) =>
              l.runnerId === r.id &&
              new Date(l.date) >= start &&
              new Date(l.date) <= end,
          )
          .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);
        return {
          name: `${r.lastName} ${r.firstName}`,
          id: r.id,
          total: Math.round(total * 10) / 10,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [activeRunners, allLogs, targetPeriod]);

  const reportChartData = useMemo(() => {
    const start = new Date(targetPeriod.start || "2000-01-01");
    const end = new Date(targetPeriod.end || "2100-12-31");
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    // ★修正: マネージャーを除外してから処理を開始
    const athletes = activeRunners.filter((r) => r.role !== ROLES.MANAGER);

    const data = athletes.map((r) => {
      // 1. 期間合計を計算
      const total = allLogs
        .filter(
          (l) =>
            l.runnerId === r.id &&
            new Date(l.date) >= start &&
            new Date(l.date) <= end,
        )
        .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);

      const row = {
        name: `${r.lastName} ${r.firstName}`,
        id: r.id,
        total: Math.round(total * 10) / 10,
      };

      // 2. Q1～Q4の各合計も計算して格納
      if (activeQuarters.length > 0) {
        activeQuarters.forEach((q, idx) => {
          if (!q.start || !q.end) {
            row[`q${idx + 1}`] = 0;
            return;
          }
          const qStart = new Date(q.start);
          const qEnd = new Date(q.end);
          qEnd.setHours(23, 59, 59, 999);

          const qSum = allLogs
            .filter(
              (l) =>
                l.runnerId === r.id &&
                new Date(l.date) >= qStart &&
                new Date(l.date) <= qEnd,
            )
            .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);

          row[`q${idx + 1}`] = Math.round(qSum * 10) / 10;
        });
      }
      return row;
    });

    // 選手ID順に並べ替え
    return data.sort((a, b) => a.id.localeCompare(b.id));
  }, [activeRunners, allLogs, targetPeriod, activeQuarters]);

  const reportDates = useMemo(() => {
    return getDatesInRange(targetPeriod.start, targetPeriod.end);
  }, [targetPeriod]);

  const reportMatrix = useMemo(() => {
    // ★修正: マネージャーを除外し、選手ID順にソート
    const sortedRunners = activeRunners
      .filter((r) => r.role !== ROLES.MANAGER)
      .sort((a, b) =>
        (a.memberCode || a.id).localeCompare(b.memberCode || b.id),
      );
    // ソートしたリストからIDを抽出
    const runnerIds = sortedRunners.map((r) => r.id);

    const matrix = reportDates.map((date) => {
      const row = { date };
      runnerIds.forEach((id) => {
        const logs = allLogs.filter(
          (l) => l.runnerId === id && l.date === date,
        );
        if (logs.length === 0) {
          row[id] = "未";
        } else {
          const total = logs.reduce(
            (sum, l) => sum + (Number(l.distance) || 0),
            0,
          );
          if (logs.some((l) => l.category === "完全休養")) {
            row[id] = "休";
          } else if (total === 0) {
            row[id] = "0";
          } else {
            row[id] = Math.round(total * 10) / 10;
          }
        }
      });
      return row;
    });

    let grandTotal = 0;
    const totals = { date: "TOTAL" };
    runnerIds.forEach((id) => {
      const sum = allLogs
        .filter((l) => l.runnerId === id && reportDates.includes(l.date))
        .reduce((s, l) => s + (Number(l.distance) || 0), 0);
      totals[id] = Math.round(sum * 10) / 10;
      grandTotal += totals[id];
    });
    totals.grandTotal = Math.round(grandTotal * 10) / 10;

    const qTotals = activeQuarters.map((q, idx) => {
      const row = { date: `${idx + 1}期合計` };
      runnerIds.forEach((id) => {
        const sum = allLogs
          .filter(
            (l) => l.runnerId === id && l.date >= q.start && l.date <= q.end,
          )
          .reduce((s, l) => s + (Number(l.distance) || 0), 0);
        row[id] = Math.round(sum * 10) / 10;
      });
      return row;
    });

    return { matrix, totals, qTotals };
  }, [reportDates, activeRunners, allLogs, activeQuarters]);

  const cumulativeData = useMemo(() => {
    const data = [];
    reportDates.forEach((date) => {
      data.push({ date: date.slice(5).replace("-", "/") });
    });

    // ★修正: マネージャーを除外
    const athletes = activeRunners.filter((r) => r.role !== ROLES.MANAGER);

    athletes.forEach((r) => {
      let sum = 0;
      reportDates.forEach((date, idx) => {
        const dayLogs = allLogs.filter(
          (l) => l.runnerId === r.id && l.date === date,
        );
        const dayDist = dayLogs.reduce(
          (acc, log) => acc + (Number(log.distance) || 0),
          0,
        );
        sum += dayDist;
        if (data[idx]) {
          data[idx][r.id] = Math.round(sum * 10) / 10;
        }
      });
    });
    return data;
  }, [reportDates, activeRunners, allLogs]);

  const checkListData = useMemo(() => {
    return activeRunners
      .filter((r) => r.role !== ROLES.MANAGER)
      .map((runner) => {
        // filterでその日の全てのログを取得
        const logs = allLogs.filter(
          (l) => l.runnerId === runner.id && l.date === checkDate,
        );

        let status = "unsubmitted";
        let detail = "-";

        if (logs.length > 0) {
          // 距離を合算する
          const totalDist = logs.reduce(
            (sum, l) => sum + (Number(l.distance) || 0),
            0,
          );
          // 「完全休養」が含まれているかチェック
          const isRest = logs.some((l) => l.category === "完全休養");

          if (totalDist > 0) {
            status = "active";
            // 小数点第1位まで丸める
            detail = `${Math.round(totalDist * 10) / 10}km`;
          } else if (isRest) {
            status = "rest";
            detail = "休み";
          } else {
            // 距離0かつ完全休養タグなし（故障や未実施など）
            status = "rest";
            detail = "0km";
          }
        }
        return { ...runner, status, detail };
      });
  }, [activeRunners, allLogs, checkDate]);

  const coachStats = useMemo(() => {
    const todayStr = getTodayStr();
    // ✨ マネージャーを除外した選手だけのリストを作成
    const athletes = activeRunners.filter((r) => r.role !== ROLES.MANAGER);

    const reportedCount = athletes.filter((r) => {
      return allLogs.some((l) => l.runnerId === r.id && l.date === todayStr);
    }).length;
    const reportRate =
      athletes.length > 0
        ? Math.round((reportedCount / athletes.length) * 100)
        : 0;
    const painAlertCount = athletes.filter((r) => {
      const runnerLogs = allLogs.filter((l) => l.runnerId === r.id);
      if (runnerLogs.length === 0) return false;
      runnerLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      return runnerLogs[0].pain >= 3;
    }).length;
    return { reportRate, painAlertCount, reportedCount };
  }, [activeRunners, allLogs]);

  useEffect(() => {
    if (role === ROLES.COACH && selectedRunner && targetPeriod) {
      // 現在の目標値を取得してフォームにセット
      const monthly =
        getGoalValue(
          selectedRunner,
          targetPeriod.id,
          targetPeriod.type,
          "goalMonthly",
        ) ||
        selectedRunner.goalMonthly || // Customの場合などでHelperが0を返す場合のフォールバック
        "";

      const period =
        getGoalValue(
          selectedRunner,
          targetPeriod.id,
          targetPeriod.type,
          "goalPeriod",
        ) || "";

      const q1 =
        getGoalValue(
          selectedRunner,
          targetPeriod.id,
          targetPeriod.type,
          "goalQ1",
        ) || "";
      const q2 =
        getGoalValue(
          selectedRunner,
          targetPeriod.id,
          targetPeriod.type,
          "goalQ2",
        ) || "";
      const q3 =
        getGoalValue(
          selectedRunner,
          targetPeriod.id,
          targetPeriod.type,
          "goalQ3",
        ) || "";
      const q4 =
        getGoalValue(
          selectedRunner,
          targetPeriod.id,
          targetPeriod.type,
          "goalQ4",
        ) || "";

      setCoachGoalInput({
        monthly: monthly === 0 ? "" : monthly,
        period: period === 0 ? "" : period,
        q1: q1 === 0 ? "" : q1,
        q2: q2 === 0 ? "" : q2,
        q3: q3 === 0 ? "" : q3,
        q4: q4 === 0 ? "" : q4,
      });
    }
  }, [role, selectedRunner, targetPeriod]);

  // FIX: 選手が目標設定画面を開いたときに現在の目標値をセットするEffect
  useEffect(() => {
    if (view === "goal" && currentProfile && targetPeriod) {
      const pType = targetPeriod.type;
      const pId = targetPeriod.id;

      const monthly = getGoalValue(currentProfile, pId, pType, "goalMonthly");
      const period = getGoalValue(currentProfile, pId, pType, "goalPeriod");
      const q1 = getGoalValue(currentProfile, pId, pType, "goalQ1");
      const q2 = getGoalValue(currentProfile, pId, pType, "goalQ2");
      const q3 = getGoalValue(currentProfile, pId, pType, "goalQ3");
      const q4 = getGoalValue(currentProfile, pId, pType, "goalQ4");

      setGoalInput({
        monthly: monthly || "",
        period: period || "",
        q1: q1 || "",
        q2: q2 || "",
        q3: q3 || "",
        q4: q4 || "",
      });
    }
  }, [view, currentProfile, targetPeriod]);

  // 4. Handlers (修正版: ID固定化システム)
  const handleRegister = async () => {
    setErrorMsg("");
    // 入力チェック (IDは5桁必須)
    if (
      !formData.lastName.trim() ||
      !formData.firstName.trim() ||
      formData.memberCode.length !== 5
    ) {
      setErrorMsg("名前と5桁の選手番号を入力してください。");
      return;
    }

    if (formData.teamPass !== appSettings.teamPass) {
      setErrorMsg("チームパスコードが間違っています。");
      return;
    }
    if (!formData.personalPin || !/^\d{4}$/.test(formData.personalPin)) {
      setErrorMsg("個人パスコードは4桁の数字で設定してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = formData.memberCode.trim(); // ID = 選手番号
      const runnersRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "runners",
      );

      const docRef = doc(runnersRef, targetId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setErrorMsg(
          `選手番号 ${targetId} は既に登録されています。「ログイン」してください。`,
        );
        setIsSubmitting(false);
        return;
      }

      const q = query(runnersRef, where("memberCode", "==", targetId));
      const qSnap = await getDocs(q);

      if (!qSnap.empty) {
        setErrorMsg(
          `選手番号 ${targetId} は既に使用されています（旧データ等）。管理者に連絡してください。`,
        );
        setIsSubmitting(false);
        return;
      }

      const newProfile = {
        id: targetId,
        memberCode: targetId,
        lastName: formData.lastName.trim(),
        firstName: formData.firstName.trim(),
        role: formData.isManager ? ROLES.MANAGER : "athlete",
        goalMonthly: 0,
        goalPeriod: 0,
        status: "active",
        pin: formData.personalPin,
        registeredAt: new Date().toISOString(),
        lastLoginUid: user.uid,
      };

      await setDoc(docRef, newProfile);

      setProfile(newProfile);
      setRole(ROLES.RUNNER);
      setView("menu");
      toast.success("登録が完了しました！"); // ✨ toastに変更
    } catch (e) {
      console.error(e);
      setErrorMsg("登録エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setErrorMsg("");
    if (formData.memberCode.length !== 5) {
      setErrorMsg("5桁の選手番号を入力してください。");
      return;
    }
    if (!formData.personalPin) {
      setErrorMsg("パスコードを入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = formData.memberCode.trim();
      const runnersRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "runners",
      );
      const docRef = doc(runnersRef, targetId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const q = query(runnersRef, where("memberCode", "==", targetId));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const oldDoc = qSnap.docs[0];
          const oldData = oldDoc.data();

          if (oldData.pin !== formData.personalPin) {
            setErrorMsg("パスコードが違います。");
            setIsSubmitting(false);
            return;
          }

          await setDoc(docRef, {
            ...oldData,
            id: targetId,
            lastLoginUid: user.uid,
            migratedAt: new Date().toISOString(),
          });

          const logsRef = collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "logs",
          );
          const logsQ = query(logsRef, where("runnerId", "==", oldDoc.id));
          const logsSnap = await getDocs(logsQ);
          const batch = writeBatch(db);

          logsSnap.forEach((l) => {
            batch.update(doc(logsRef, l.id), { runnerId: targetId });
          });

          const fbsRef = collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "feedbacks",
          );
          const fbsQ = query(fbsRef, where("runnerId", "==", oldDoc.id));
          const fbsSnap = await getDocs(fbsQ);

          fbsSnap.forEach((f) => {
            const oldFbId = f.id;
            const newFbId = oldFbId.replace(oldDoc.id, targetId);
            if (oldFbId !== newFbId) {
              batch.set(doc(fbsRef, newFbId), {
                ...f.data(),
                runnerId: targetId,
              });
              batch.delete(doc(fbsRef, oldFbId));
            }
          });

          batch.delete(doc(runnersRef, oldDoc.id));
          await batch.commit();

          setProfile({ ...oldData, id: targetId, lastLoginUid: user.uid });
          setRole(ROLES.RUNNER);
          setView("menu");
          toast.success("システム更新: データを移行しました"); // ✨ toastに変更
          return;
        }

        setErrorMsg("データが見つかりません。");
        setIsSubmitting(false);
        return;
      }

      const profileData = docSnap.data();
      if (profileData.pin !== formData.personalPin) {
        setErrorMsg("パスコードが違います。");
        setIsSubmitting(false);
        return;
      }

      await updateDoc(docRef, {
        lastLoginUid: user.uid,
      });

      setProfile(profileData);
      setRole(ROLES.RUNNER);
      setView("menu");
      toast.success(`ログインしました！`); // ✨ toastに変更
    } catch (e) {
      console.error(e);
      setErrorMsg("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: getTodayStr(),
      distance: "",
      category: "",
      menuDetail: "",
      rpe: 1,
      pain: 1,
      achieved: true,
      lastName: "",
      firstName: "",
      teamPass: "",
      personalPin: "",
    });
    setEditingLogId(null);
  };

  const handleEditLog = (log) => {
    setFormData({
      date: log.date,
      distance: log.distance,
      category: log.category,
      menuDetail: log.menuDetail || "",
      rpe: log.rpe,
      pain: log.pain,
      achieved: log.achieved,
      lastName: "",
      firstName: "",
      teamPass: "",
    });
    setEditingLogId(log.id);
    setView("entry");
  };

  const openCoachEditModal = (log) => {
    setFormData({
      date: log.date,
      distance: log.distance,
      category: log.category,
      menuDetail: log.menuDetail || "",
      rpe: log.rpe,
      pain: log.pain,
      achieved: log.achieved,
      lastName: "",
      firstName: "",
      teamPass: "",
      personalPin: "",
    });
    setEditingLogId(log.id);
    setIsCoachEditModalOpen(true);
  };

  const handleCoachUpdateLog = async () => {
    if (!editingLogId) return;
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "logs", editingLogId),
        {
          date: formData.date,
          distance: parseFloat(formData.distance),
          category: formData.category,
          menuDetail: formData.menuDetail,
          rpe: parseInt(formData.rpe, 10),
          pain: parseInt(formData.pain, 10),
          updatedBy: ROLES.COACH,
        },
      );
      toast.success("記録を修正しました"); // ✨ toastに変更
      setIsCoachEditModalOpen(false);
      setEditingLogId(null);
      resetForm();
    } catch (e) {
      toast.error("エラー: " + e.message); // 🚨 alertをtoastに変更
    }
  };

  const handleCoachDeleteLog = () => {
    if (!editingLogId) return;

    setConfirmDialog({
      isOpen: true,
      message: "この記録を完全に削除しますか？（元に戻せません）",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(db, "artifacts", appId, "public", "data", "logs", editingLogId),
          );
          toast.success("記録を削除しました"); // ✨ toastに変更
          setIsCoachEditModalOpen(false);
          setEditingLogId(null);
          resetForm();
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        } catch (e) {
          toast.error("エラー: " + e.message); // 🚨 alertをtoastに変更
        }
      },
    });
  };

  const handleCoachEditRunner = (runner) => {
    setSelectedRunner(runner);
    setCoachEditFormData({
      lastName: runner.lastName,
      firstName: runner.firstName,
      pin: runner.pin || "",
    });
    setCoachFeedbackComment("");
    setView("coach-runner-detail");
  };

  const handleCoachSaveProfile = async () => {
    if (!selectedRunner) return;
    try {
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "runners",
          selectedRunner.id,
        ),
        {
          lastName: coachEditFormData.lastName,
          firstName: coachEditFormData.firstName,
          pin: coachEditFormData.pin,
        },
      );
      toast.success("プロフィールを更新しました"); // ✨ toastに変更
    } catch (e) {
      toast.error("エラー: " + e.message); // 🚨 alertをtoastに変更
    }
  };

  const handleCoachSaveGoals = async () => {
    if (!selectedRunner) return;

    const updates = {};
    const pType = targetPeriod.type;
    const pId = targetPeriod.id;

    if (pType === "global") {
      if (coachGoalInput.monthly !== "")
        updates.goalMonthly = parseFloat(coachGoalInput.monthly);
      if (coachGoalInput.period !== "")
        updates.goalPeriod = parseFloat(coachGoalInput.period);
      if (coachGoalInput.q1 !== "")
        updates.goalQ1 = parseFloat(coachGoalInput.q1);
      if (coachGoalInput.q2 !== "")
        updates.goalQ2 = parseFloat(coachGoalInput.q2);
      if (coachGoalInput.q3 !== "")
        updates.goalQ3 = parseFloat(coachGoalInput.q3);
      if (coachGoalInput.q4 !== "")
        updates.goalQ4 = parseFloat(coachGoalInput.q4);
    } else if (pType === "custom") {
      if (coachGoalInput.period !== "")
        updates[`periodGoals.${pId}.total`] = parseFloat(coachGoalInput.period);
      if (coachGoalInput.q1 !== "")
        updates[`periodGoals.${pId}.q1`] = parseFloat(coachGoalInput.q1);
      if (coachGoalInput.q2 !== "")
        updates[`periodGoals.${pId}.q2`] = parseFloat(coachGoalInput.q2);
      if (coachGoalInput.q3 !== "")
        updates[`periodGoals.${pId}.q3`] = parseFloat(coachGoalInput.q3);
      if (coachGoalInput.q4 !== "")
        updates[`periodGoals.${pId}.q4`] = parseFloat(coachGoalInput.q4);
      if (coachGoalInput.monthly !== "")
        updates.goalMonthly = parseFloat(coachGoalInput.monthly);
    } else {
      if (coachGoalInput.monthly !== "")
        updates.goalMonthly = parseFloat(coachGoalInput.monthly);
    }

    try {
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "runners",
          selectedRunner.id,
        ),
        updates,
      );
      toast.success("目標値を保存しました"); // ✨ toastに変更
    } catch (e) {
      toast.error("エラー: " + e.message); // 🚨 alertをtoastに変更
    }
  };

  const handleSaveLog = async () => {
    if (!formData.distance) return;
    setIsSubmitting(true);
    try {
      const dataToSave = {
        date: formData.date,
        distance: parseFloat(formData.distance),
        category: formData.category,
        menuDetail: formData.menuDetail,
        rpe: parseInt(formData.rpe, 10),
        pain: parseInt(formData.pain, 10),
        achieved: formData.achieved,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
      };
      if (editingLogId) {
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "logs", editingLogId),
          { ...dataToSave, updatedAt: new Date().toISOString() },
        );
        toast.success("記録を更新しました！"); // ✨ toastに変更
      } else {
        await addDoc(
          collection(db, "artifacts", appId, "public", "data", "logs"),
          { ...dataToSave, createdAt: new Date().toISOString() },
        );
        toast.success("記録を保存しました！"); // ✨ toastに変更
      }
      resetForm();
      setView("menu");
    } catch (e) {
      console.error(e);
      toast.error("エラー: " + e.message); // ✨ toastに変更
    } finally {
      setIsSubmitting(false);
    }
  };

  // 追加: 大会を保存する関数
  const handleSaveTournament = async () => {
    if (
      !newTournamentInput.name ||
      !newTournamentInput.startDate ||
      !newTournamentInput.endDate
    ) {
      toast.error("大会名と期間（開始・終了）をすべて入力してください");
      return;
    }
    if (newTournamentInput.startDate > newTournamentInput.endDate) {
      toast.error("終了日は開始日以降の日付を指定してください");
      return;
    }

    setIsSubmitting(true);
    try {
      // 新しい大会のIDを生成（tour_現在の時刻）
      const tournamentId = `tour_${Date.now()}`;
      const newTournament = {
        id: tournamentId,
        name: newTournamentInput.name,
        startDate: newTournamentInput.startDate,
        endDate: newTournamentInput.endDate,
        createdAt: new Date().toISOString(),
      };

      // Firestoreに保存！
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "tournaments",
          tournamentId,
        ),
        newTournament,
      );

      // 入力欄を空に戻す
      setNewTournamentInput({ name: "", startDate: "", endDate: "" });
      toast.success("新しい大会を登録しました！");
    } catch (error) {
      console.error("Error saving tournament:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 大会を削除する関数
  const handleDeleteTournament = async (tournamentId) => {
    if (
      !window.confirm(
        "この大会を削除しますか？\n※選手の振り返りシートも影響を受けます",
      )
    )
      return;

    try {
      await deleteDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "tournaments",
          tournamentId,
        ),
      );
      toast.success("大会を削除しました");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error("削除に失敗しました");
    }
  };

  // 選手の大会ノート(Race Card)用のStateと関数
  const [editingRaceCardId, setEditingRaceCardId] = useState(null);
  const [raceCardInput, setRaceCardInput] = useState({
    tournamentId: "",
    raceType: "",
    distance: "",
    startTime: "",
    ekidenDistance: "",
    targetTime: "",
    wupPlan: "",
    racePlan: "",
    condition: "",
    weather: "",
    wind: "",
    temp: "",
    humidity: "",
    resultTime: "",
    lapTimes: "",
    goodPoints: "",
    issues: "",
    teammateGoodPoints: "",
    nextGoal: "",
  });

  const handleSaveRaceCard = async () => {
    if (!raceCardInput.tournamentId) {
      toast.error("エラー：大会が選択されていません");
      return;
    }
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...raceCardInput,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
        updatedAt: new Date().toISOString(),
      };

      if (editingRaceCardId) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "raceCards",
            editingRaceCardId,
          ),
          dataToSave,
        );
        toast.success("大会ノートを更新しました！");
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(
          collection(db, "artifacts", appId, "public", "data", "raceCards"),
          dataToSave,
        );
        toast.success("新しい種目シートを作成しました！");
      }
      setEditingRaceCardId(null);
      setView("race"); // 保存後は一覧画面に戻る
    } catch (e) {
      console.error(e);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRaceCard = async (cardId) => {
    if (!window.confirm("このシートを削除しますか？")) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "raceCards", cardId),
      );
      toast.success("シートを削除しました");
    } catch (e) {
      console.error(e);
      toast.error("削除に失敗しました");
    }
  };

  // 監督が大会ノートにフィードバックを保存する関数
  const handleSaveRaceCardFeedback = async (cardId, feedbackText) => {
    setIsSubmitting(true);
    try {
      await updateDoc(
        doc(db, "artifacts", appId, "public", "data", "raceCards", cardId),
        {
          coachFeedback: feedbackText,
          updatedAt: new Date().toISOString(),
        },
      );
      toast.success("フィードバックを送信しました！");
    } catch (e) {
      console.error(e);
      toast.error("送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = (targetId = null) => {
    const idToDelete = targetId || editingLogId;
    if (!idToDelete) return;

    setConfirmDialog({
      isOpen: true,
      message: "この記録を削除しますか？",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(db, "artifacts", appId, "public", "data", "logs", idToDelete),
          );
          toast.success("記録を削除しました"); // ✨ toastに変更
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });

          if (idToDelete === editingLogId) {
            setEditingLogId(null);
            resetForm();
          }
        } catch (e) {
          console.error(e);
          toast.error("エラー: " + e.message); // 🚨 alertをtoastに変更
        }
      },
    });
  };

  const handleRestRegister = async () => {
    setIsSubmitting(true);
    try {
      const dataToSave = {
        date: formData.date,
        distance: 0,
        category: "完全休養",
        menuDetail: "オフ",
        rpe: 1,
        pain: 1,
        achieved: true,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
      };
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "logs"),
        { ...dataToSave, createdAt: new Date().toISOString() },
      );
      toast.success("休養を記録しました"); // ✨ toastに変更
      resetForm();
      setView("menu");
    } catch (e) {
      console.error(e);
      toast.error("エラーが発生しました"); // ✨ toastに変更
    } finally {
      setIsSubmitting(false);
    }
  };

  // Custom Period Helpers
  const updateNewPeriodInputWithAutoQuarters = (field, value) => {
    const updatedInput = { ...newPeriodInput, [field]: value };
    if (updatedInput.start && updatedInput.end) {
      updatedInput.quarters = calculateAutoQuartersFixed(
        updatedInput.start,
        updatedInput.end,
      );
    }
    setNewPeriodInput(updatedInput);
  };

  const handleNewPeriodQuarterChange = (idx, field, value) => {
    const updatedQuarters = [...newPeriodInput.quarters];
    updatedQuarters[idx] = { ...updatedQuarters[idx], [field]: value };
    setNewPeriodInput({ ...newPeriodInput, quarters: updatedQuarters });
  };

  const handleSaveCustomPeriod = async () => {
    if (!newPeriodInput.name || !newPeriodInput.start || !newPeriodInput.end) {
      toast.error("期間名、開始日、終了日は必須です"); // 🚨 alertをtoastに変更
      return;
    }
    let updatedPeriods;
    if (editingPeriodId) {
      updatedPeriods = appSettings.customPeriods.map((p) =>
        p.id === editingPeriodId
          ? { ...newPeriodInput, id: editingPeriodId, type: "custom" }
          : p,
      );
      toast.success("期間を更新しました"); // ✨ toastに変更
    } else {
      const qs = calculateAutoQuartersFixed(
        newPeriodInput.start,
        newPeriodInput.end,
      );
      const newPeriod = {
        id: `custom_${Date.now()}`,
        ...newPeriodInput,
        quarters: qs,
        type: "custom",
      };
      updatedPeriods = [...(appSettings.customPeriods || []), newPeriod];
      toast.success("新しい期間を追加しました"); // ✨ toastに変更
    }
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "settings", "global"),
      { customPeriods: updatedPeriods },
    );
    setNewPeriodInput(initialPeriodInput);
    setEditingPeriodId(null);
  };

  const handleDeleteCustomPeriod = async (periodId) => {
    setConfirmDialog({
      isOpen: true,
      message:
        "この期間設定を削除しますか？（選手が入力した目標値は残りますが、期間選択肢からは消えます）",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        const updatedPeriods = appSettings.customPeriods.filter(
          (p) => p.id !== periodId,
        );
        await updateDoc(
          doc(db, "artifacts", appId, "public", "data", "settings", "global"),
          { customPeriods: updatedPeriods },
        );
        toast.success("期間を削除しました"); // ✨ toastに変更
      },
    });
  };

  const handleEditCustomPeriod = (period) => {
    setNewPeriodInput({
      name: period.name,
      start: period.start,
      end: period.end,
      quarters:
        period.quarters || calculateAutoQuartersFixed(period.start, period.end),
    });
    setEditingPeriodId(period.id);
  };

  const handleCancelEdit = () => {
    setNewPeriodInput(initialPeriodInput);
    setEditingPeriodId(null);
  };

  const handleStartPreview = (runner) => {
    setPreviewRunner(runner);
    setView("menu");
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    if (previewRunner) {
      setPreviewRunner(null);
      return;
    }
    await signOut(auth);
    setRole(null);
    setProfile(null);
    setView("menu");
    setIsMenuOpen(false);
    toast.success("ログアウトしました"); // ✨ toastを追加
  };

  const exportCSV = () => {
    const headers = [
      "日付",
      "名前",
      "区分",
      "メニュー",
      "距離(km)",
      "練習強度(RPE)",
      "痛み",
    ];
    const rows = allLogs.map((l) => [
      l.date,
      l.runnerName,
      l.category,
      l.menuDetail || "",
      l.distance,
      l.rpe,
      l.pain,
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ekiden_team_data.csv`;
    link.click();
    toast.success("CSVをダウンロードしました"); // ✨ toastを追加
  };

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportMatrixCSV = () => {
    const runnerIds = activeRunners.map((r) => r.id);
    const headerRow = [
      "日付",
      ...activeRunners.map((r) => `${r.lastName} ${r.firstName}`),
    ];
    const dataRows = reportMatrix.matrix.map((row) => {
      const rowData = [row.date.slice(5).replace("-", "/")];
      runnerIds.forEach((id) => {
        rowData.push(row[id] !== "-" ? row[id] : "");
      });
      return rowData;
    });
    const totalRow = ["TOTAL"];
    runnerIds.forEach((id) => {
      totalRow.push(reportMatrix.totals[id] || 0);
    });
    const csvContent = [
      headerRow.join(","),
      ...dataRows.map((r) => r.join(",")),
      totalRow.join(","),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ekiden_report_${targetPeriod.name}.csv`;
    link.click();
    toast.success("マトリックスCSVをダウンロードしました"); // ✨ toastを追加
  };

  const updateGoals = async () => {
    const updates = {};
    const pType = targetPeriod.type;
    const pId = targetPeriod.id;
    if (pType === "global") {
      if (goalInput.monthly)
        updates.goalMonthly = parseFloat(goalInput.monthly);
      if (goalInput.period) updates.goalPeriod = parseFloat(goalInput.period);
      if (goalInput.q1) updates.goalQ1 = parseFloat(goalInput.q1);
      if (goalInput.q2) updates.goalQ2 = parseFloat(goalInput.q2);
      if (goalInput.q3) updates.goalQ3 = parseFloat(goalInput.q3);
      if (goalInput.q4) updates.goalQ4 = parseFloat(goalInput.q4);
    } else if (pType === "custom") {
      if (goalInput.period)
        updates[`periodGoals.${pId}.total`] = parseFloat(goalInput.period);
      if (goalInput.q1)
        updates[`periodGoals.${pId}.q1`] = parseFloat(goalInput.q1);
      if (goalInput.q2)
        updates[`periodGoals.${pId}.q2`] = parseFloat(goalInput.q2);
      if (goalInput.q3)
        updates[`periodGoals.${pId}.q3`] = parseFloat(goalInput.q3);
      if (goalInput.q4)
        updates[`periodGoals.${pId}.q4`] = parseFloat(goalInput.q4);
      if (goalInput.monthly)
        updates.goalMonthly = parseFloat(goalInput.monthly);
    } else {
      if (goalInput.monthly)
        updates.goalMonthly = parseFloat(goalInput.monthly);
    }
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "runners", currentUserId),
      updates,
    );
    toast.success("目標を保存しました！"); // ✨ toastに変更
    setView("menu");
  };

  const handleSaveDefaultPeriod = async (e) => {
    const newDefaultId = e.target.value;
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "settings", "global"),
      { defaultPeriodId: newDefaultId },
    );
    toast.success("初期表示期間を変更しました"); // ✨ toastに変更
  };

  const handleSaveReview = async () => {
    if (!reviewComment.trim()) return;
    const feedbackId = `${targetPeriod.id}_${currentUserId}`;
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "feedbacks", feedbackId),
      {
        periodId: targetPeriod.id,
        periodName: targetPeriod.name,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
        runnerComment: reviewComment,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    toast.success("振り返りを保存しました！📝"); // ✨ toastに変更
  };

  const handleSaveCoachFeedback = async (runnerId) => {
    if (!coachFeedbackComment.trim()) return;
    const feedbackId = `${targetPeriod.id}_${runnerId}`;
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "feedbacks", feedbackId),
      {
        coachComment: coachFeedbackComment,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    toast.success("フィードバックを送りました！"); // ✨ toastに変更
    setCoachFeedbackComment("");
  };

  const getRunnerFeedback = (rId) => {
    if (!rId || !targetPeriod) return null;
    const feedbackId = `${targetPeriod.id}_${rId}`;
    return allFeedbacks.find((f) => f.id === feedbackId);
  };

  const handleMergeRunners = async () => {
    if (!mergeTargetId || !mergeSourceId) {
      toast.error("両方の選手を選択してください。"); // 🚨 alertをtoastに変更
      return;
    }
    if (mergeTargetId === mergeSourceId) {
      toast.error("同じ選手は選択できません。"); // 🚨 alertをtoastに変更
      return;
    }

    const targetRunner = allRunners.find((r) => r.id === mergeTargetId);
    const sourceRunner = allRunners.find((r) => r.id === mergeSourceId);

    if (!targetRunner || !sourceRunner) return;

    setConfirmDialog({
      isOpen: true,
      message: `【重要警告】\n「${sourceRunner.lastName} ${sourceRunner.firstName}」の記録をすべて\n「${targetRunner.lastName} ${targetRunner.firstName}」に移動し、元のデータを削除します。\nこの操作は元に戻せません。実行しますか？`,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const batch = writeBatch(db);

          const logsRef = collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "logs",
          );
          const logsQ = query(logsRef, where("runnerId", "==", mergeSourceId));
          const logsSnap = await getDocs(logsQ);
          logsSnap.forEach((l) => {
            batch.update(doc(logsRef, l.id), {
              runnerId: mergeTargetId,
              runnerName: `${targetRunner.lastName} ${targetRunner.firstName}`,
            });
          });

          const fbsRef = collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "feedbacks",
          );
          const fbsQ = query(fbsRef, where("runnerId", "==", mergeSourceId));
          const fbsSnap = await getDocs(fbsQ);
          fbsSnap.forEach((f) => {
            const data = f.data();
            const newFbId = f.id.replace(mergeSourceId, mergeTargetId);
            if (f.id !== newFbId) {
              batch.set(doc(fbsRef, newFbId), {
                ...data,
                runnerId: mergeTargetId,
                runnerName: `${targetRunner.lastName} ${targetRunner.firstName}`,
              });
              batch.delete(doc(fbsRef, f.id));
            }
          });

          batch.delete(
            doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "runners",
              mergeSourceId,
            ),
          );
          await batch.commit();

          toast.success("選手の統合が完了しました"); // ✨ toastに変更
          setMergeSourceId("");
          setMergeTargetId("");
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        } catch (e) {
          console.error(e);
          toast.error("統合エラー: " + e.message); // 🚨 alertをtoastに変更
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  // 5. Render Logic

  // ==========================================
  // 1. 各画面に渡す「小包（Props）」を準備する
  // ==========================================
  const athleteProps = {
    role,
    profile,
    previewRunner,
    setPreviewRunner,
    currentUserId,
    currentProfile,
    view,
    setView,
    isMenuOpen,
    setIsMenuOpen,
    successMsg,
    setSuccessMsg,
    confirmDialog,
    setConfirmDialog,
    availablePeriods,
    selectedPeriod,
    setSelectedPeriod,
    targetPeriod,
    activeQuarters,
    personalStats,
    missingDates,
    currentFeedback,
    periodLogs,
    rankingData,
    checkListData,
    teamLogs,
    practiceMenus,
    allLogs,
    activeRunners,
    formData,
    setFormData,
    isSubmitting,
    editingLogId,
    setEditingLogId,
    expandedDiaryId,
    setExpandedDiaryId,
    goalInput,
    setGoalInput,
    reviewComment,
    setReviewComment,
    handleLogout,
    handleSaveLog,
    handleDeleteLog,
    handleRestRegister,
    handleEditLog,
    resetForm,
    updateGoals,
    handleSaveReview,
    tournaments,
    raceCards,
    editingRaceCardId,
    setEditingRaceCardId,
    raceCardInput,
    setRaceCardInput,
    handleSaveRaceCard,
    handleDeleteRaceCard,
  };

  const coachProps = {
    teamLogs,
    appId,
    confirmDialog,
    handleExportMatrixCSV,
    view,
    setView,
    handleLogout,
    availablePeriods,
    selectedPeriod,
    setSelectedPeriod,
    targetPeriod,
    activeRunners,
    coachStats,
    reportMatrix,
    isPainAlertModalOpen,
    setIsPainAlertModalOpen,
    rankingData,
    exportCSV,
    handlePrint,
    isPrintPreview,
    setIsPrintPreview,
    printStyles,
    reportChartData,
    activeQuarters,
    cumulativeData,
    checkDate,
    setCheckDate,
    checkListData,
    allLogs,
    menuInput,
    setMenuInput,
    setSuccessMsg,
    handleCoachEditRunner,
    handleStartPreview,
    allRunners,
    setConfirmDialog,
    appSettings,
    setAppSettings,
    handleSaveDefaultPeriod,
    editingPeriodId,
    newPeriodInput,
    updateNewPeriodInputWithAutoQuarters,
    handleNewPeriodQuarterChange,
    handleCancelEdit,
    handleSaveCustomPeriod,
    handleEditCustomPeriod,
    handleDeleteCustomPeriod,
    mergeTargetId,
    setMergeTargetId,
    mergeSourceId,
    setMergeSourceId,
    errorMsg,
    isSubmitting,
    handleMergeRunners,
    isCoachEditModalOpen,
    setIsCoachEditModalOpen,
    formData,
    setFormData,
    handleCoachDeleteLog,
    setEditingLogId,
    resetForm,
    handleCoachUpdateLog,
    coachEditFormData,
    setCoachEditFormData,
    handleCoachSaveProfile,
    coachGoalInput,
    setCoachGoalInput,
    handleCoachSaveGoals,
    selectedRunner,
    getRunnerFeedback,
    coachFeedbackComment,
    setCoachFeedbackComment,
    handleSaveCoachFeedback,
    openCoachEditModal,
    setDemoMode,
    tournaments,
    raceCards,
    newTournamentInput,
    setNewTournamentInput,
    handleSaveTournament,
    handleDeleteTournament,
    handleSaveRaceCardFeedback,
  };

  // ==========================================
  // 2. どの画面を表示するかを判定する関数
  // ==========================================
  const renderContent = () => {
    // ロード中画面
    if (loading || (user && dataLoading)) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      );
    }

    // デモモードの割り込み！ ▼▼▼
    if (demoMode === "manager") {
      return (
        <div className="relative min-h-screen">
          {/* デモ用専用ヘッダーバナー */}
          <div className="bg-amber-500 text-white px-4 py-2 flex justify-between items-center sticky top-0 z-50 shadow-md">
            <span className="font-bold text-sm">
              ⚠️ マネージャー画面（デモモード：保存不可）
            </span>
            <button
              onClick={handleExitDemo}
              className="bg-white text-amber-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm active:scale-95"
            >
              監督画面に戻る
            </button>
          </div>
          {/* マネージャーダッシュボードを呼び出す */}
          <ManagerDashboard
            profile={{
              lastName: "デモ",
              firstName: "マネージャー",
              role: ROLES.MANAGER,
            }}
            allRunners={activeRunners}
            allLogs={allLogs}
            teamLogs={teamLogs}
            practiceMenus={practiceMenus}
            handleLogout={handleExitDemo} // ログアウトの代わりにデモ終了
            appId={appId}
            db={db}
            setSuccessMsg={(msg) => toast.success("【デモ】" + msg)}
            menuInput={menuInput}
            setMenuInput={setMenuInput}
            isDemoMode={true} // ★マネージャー画面側で保存を止めるための目印
          />
        </div>
      );
    }

    if (demoMode === "admin") {
      return (
        <div className="relative min-h-screen">
          {/* デモ用専用ヘッダーバナー */}
          <div className="bg-purple-600 text-white px-4 py-2 flex justify-between items-center sticky top-0 z-50 shadow-md">
            <span className="font-bold text-sm">
              ⚠️ 管理者画面（デモモード：保存不可）
            </span>
            <button
              onClick={handleExitDemo}
              className="bg-white text-purple-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm active:scale-95"
            >
              監督画面に戻る
            </button>
          </div>
          {/* AthleteViewを「保存できないダミー関数」にすり替えて呼び出す */}
          <AthleteView
            {...athleteProps}
            profile={{
              lastName: "管理者",
              firstName: "デモ",
              role: ROLES.ADMIN,
              id: "admin_temp",
            }}
            currentProfile={{
              lastName: "管理者",
              firstName: "デモ",
              role: ROLES.ADMIN,
              id: "admin_temp",
            }}
            role={ROLES.ADMIN}
            handleSaveLog={() => toast.success("【デモ】記録を保存しました！")}
            handleDeleteLog={() =>
              toast.success("【デモ】記録を削除しました！")
            }
            handleRestRegister={() =>
              toast.success("【デモ】休養を記録しました！")
            }
            updateGoals={() => toast.success("【デモ】目標を保存しました！")}
            handleSaveReview={() =>
              toast.success("【デモ】振り返りを保存しました！")
            }
          />
        </div>
      );
    }

    // 未ログイン画面
    if (!role) {
      return (
        <>
          <style>{globalStyles}</style>
          <style>{printStyles}</style>
          <WelcomeScreen setRole={setRole} appVersion={APP_LAST_UPDATED} />
        </>
      );
    }

    if (role === ROLES.COACH_AUTH) {
      return (
        <CoachAuthScreen
          appSettings={appSettings}
          setRole={setRole}
          setView={setView}
        />
      );
    }

    if (role === ROLES.REGISTERING) {
      return (
        <RegisterScreen
          formData={formData}
          setFormData={setFormData}
          handleRegister={handleRegister}
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
          setRole={setRole}
        />
      );
    }

    if (role === ROLES.LOGIN) {
      return (
        <LoginScreen
          formData={formData}
          setFormData={setFormData}
          handleLogin={handleLogin}
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
          setRole={setRole}
        />
      );
    }

    if (role === ROLES.RUNNER && profile && profile.role === ROLES.MANAGER) {
      return (
        <ManagerDashboard
          profile={profile}
          allRunners={activeRunners}
          allLogs={allLogs}
          teamLogs={teamLogs}
          practiceMenus={practiceMenus}
          handleLogout={handleLogout}
          appId={appId}
          db={db}
          setSuccessMsg={setSuccessMsg}
          menuInput={menuInput}
          setMenuInput={setMenuInput}
        />
      );
    }

    if (
      (role === ROLES.RUNNER && profile) ||
      (role === ROLES.COACH && previewRunner) ||
      (role === ROLES.ADMIN && profile)
    ) {
      if (role === ROLES.RUNNER && !profile) {
        return (
          <div className="h-screen flex items-center justify-center text-slate-400 font-bold">
            Loading...
          </div>
        );
      }
      return <AthleteView {...athleteProps} />;
    }

    if (role === ROLES.COACH) {
      return <CoachView {...coachProps} />;
    }

    return null;
  };

  // ==========================================
  // 3. 全体をまとめて画面に出力
  // ==========================================
  return (
    <>
      {/* 画面の最前面に通知エリアをセット */}
      <Toaster position="top-center" reverseOrder={false} />
      {/* 判定した画面の中身をここで呼び出す */}
      {renderContent()}
    </>
  );
};

export default App;
