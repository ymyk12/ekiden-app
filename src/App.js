import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import {
  Home,
  Plus,
  BarChart2,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Activity,
  AlertCircle,
  Download,
  Trash2,
  Calendar,
  Clock,
  Trophy,
  BookOpen,
  Flag,
  Target,
  RefreshCw,
  Edit,
  Medal,
  FileText,
  Printer,
  FileSpreadsheet,
  Lock,
  UserCheck,
  Archive,
  Menu,
  LogIn,
  UserPlus,
  AlertTriangle,
  Check,
  KeyRound,
  ArrowLeft,
  Save,
  LayoutDashboard,
  ClipboardList,
  Eye,
  X,
  Filter,
  RotateCcw,
  MessageSquare,
  HeartPulse,
  User,
  UserMinus,
} from "lucide-react";

// --- App Version ---
const APP_LAST_UPDATED = "3.4";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAVvrlLTsioEuloE11hzykIz8rSk6qMJrk",
  authDomain: "kswc-tf-distancerecords.firebaseapp.com",
  projectId: "kswc-tf-distancerecords",
  storageBucket: "kswc-tf-distancerecords.firebasestorage.app",
  messagingSenderId: "633417183098",
  appId: "1:633417183098:web:18c8c96359ebec0651f0c3",
  measurementId: "G-7TB3N5GBMZ",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kswc-ekidenteam-distancerecords";

// --- Colors for Charts ---
const COLORS = [
  "#2563eb",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#6366f1",
  "#14b8a6",
];

// --- Helper: Date & Period Utilities ---
const getTodayStr = () => new Date().toLocaleDateString("sv-SE");

const calculateAutoQuarters = (startStr, endStr) => {
  const s = new Date(startStr);
  const e = new Date(endStr);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return [
      { id: 1, start: "", end: "" },
      { id: 2, start: "", end: "" },
      { id: 3, start: "", end: "" },
      { id: 4, start: "", end: "" },
    ];
  }

  const totalTime = e - s;
  const totalDays = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;

  if (totalDays <= 0)
    return [
      { id: 1, start: "", end: "" },
      { id: 2, start: "", end: "" },
      { id: 3, start: "", end: "" },
      { id: 4, start: "", end: "" },
    ];

  const quarters = [];
  for (let i = 0; i < 4; i++) {
    const qStart = new Date(s);
    qStart.setDate(s.getDate() + Math.floor((totalDays / 4) * i));

    const qEnd = new Date(s);
    if (i === 3) {
      qEnd.setTime(e.getTime());
    } else {
      qEnd.setDate(s.getDate() + Math.floor((totalDays / 4) * (i + 1)) - 1);
    }
    quarters.push({
      id: i + 1,
      start: qStart.toLocaleDateString("sv-SE"),
      end: qEnd.toLocaleDateString("sv-SE"),
    });
  }
  return quarters;
};

// calculateAutoQuartersFixed: 編集用など
const calculateAutoQuartersFixed = (startStr, endStr) =>
  calculateAutoQuarters(startStr, endStr);

const getDatesInRange = (startDate, endDate) => {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];

  // ★安全装置: 期間が長すぎる場合（370日を超える場合）は空配列を返してフリーズを防ぐ
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays > 370) {
    console.warn("期間が長すぎるため、日別レポートの生成をスキップしました。");
    return [];
  }

  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current).toLocaleDateString("sv-SE"));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const getMonthRange = (dateStr) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const start = new Date(year, month, 1).toLocaleDateString("sv-SE");
  const end = new Date(year, month + 1, 0).toLocaleDateString("sv-SE");
  return { start, end, name: `${year}年${month + 1}月` };
};

const getYearRange = (year) => {
  // ★年度対応: その年の4月1日 〜 翌年の3月31日
  return {
    start: `${year}-04-01`,
    end: `${year + 1}-03-31`,
    name: `${year}年度`,
  };
};

const getGoalValue = (runner, periodId, periodType, key) => {
  if (!runner) return 0;
  if (periodType === "global") return runner[key] || 0;
  if (periodType === "custom") {
    let fieldKey = key;
    if (key === "goalPeriod") fieldKey = "total";
    else if (key.startsWith("goalQ"))
      fieldKey = key.replace("goal", "").toLowerCase();
    return runner.periodGoals?.[periodId]?.[fieldKey] || 0;
  }
  if (periodType === "month") {
    if (key === "goalPeriod") return runner.goalMonthly || 0;
    return 0;
  }
  return 0;
};

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
    @page { size: A4 landscape; margin: 10mm; }
    
    html, body, #root, .min-h-screen, main {
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      display: block !important;
      background-color: white !important;
    }
    
    .no-print, header, nav, .fixed-ui, .coach-menu-bar { display: none !important; }
    
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

const App = () => {
  // 1. State Hooks
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [allRunners, setAllRunners] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [practiceMenus, setPracticeMenus] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState([]);

  const [appSettings, setAppSettings] = useState({
    coachPass: "1234",
    teamPass: "run2025",
    startDate: "",
    endDate: "",
    quarters: [],
    customPeriods: [],
    defaultPeriodId: "global_period",
    loaded: false,
  });

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

  const [reviewComment, setReviewComment] = useState("");
  const [coachFeedbackComment, setCoachFeedbackComment] = useState("");

  const [formData, setFormData] = useState({
    date: getTodayStr(),
    distance: "",
    category: "午後練",
    menuDetail: "",
    rpe: 1,
    pain: 1,
    achieved: true,
    lastName: "",
    firstName: "",
    memberCode: "", // ★追加：選手ID（例：26001）
    teamPass: "",
    personalPin: "",
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

  const [chartWidthFactor, setChartWidthFactor] = useState(
    window.innerWidth >= 768 ? 8 : 20,
  );

  // 2. Effects & Data Loading
  useEffect(() => {
    const handleResize = () =>
      setChartWidthFactor(window.innerWidth >= 768 ? 8 : 20);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    if (role === "coach" && selectedRunner && allRunners.length > 0) {
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
      if (u) {
        setUser(u);
      } else {
        setUser(null);
        setLoading(false);
        signInAnonymously(auth).catch((e) => console.error(e));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(() => setLoading(false), 5000);

    const settingsDoc = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "settings",
      "global",
    );
    getDoc(settingsDoc)
      .then((snap) => {
        if (!snap.exists()) {
          // ▼ 修正・追加したコード ▼
          const todayDate = new Date();
          // 今日の日付から「今年度」の開始・終了を作る
          const currentMonth = todayDate.getMonth() + 1;
          let fiscalYear = todayDate.getFullYear();

          // 1~3月なら年度はマイナス1
          if (currentMonth <= 3) fiscalYear -= 1;

          const startStr = `${fiscalYear}-04-01`;
          const endStr = `${fiscalYear + 1}-03-31`;
          // ▲ ここまで ▲

          setDoc(settingsDoc, {
            coachPass: "1234",
            teamPass: "run2025",
            startDate: startStr, // ★今年度の4/1が入る
            endDate: endStr, // ★翌年の3/31が入る
            quarters: [],
            customPeriods: [],
            defaultPeriodId: "global_period",
          });
        }
      })
      .catch((e) => console.log("Settings init error", e));

    const runnersRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "runners",
    );
    const logsRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "logs",
    );
    const menusRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "menus",
    );
    const feedbacksRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "feedbacks",
    );

    const unsubRunners = onSnapshot(runnersRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllRunners(list);
      setLoading(false);
      clearTimeout(timeout);
    });

    const unsubLogs = onSnapshot(logsRef, (snap) => {
      setAllLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(settingsDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAppSettings((prev) => ({
          ...prev,
          ...data,
          customPeriods: data.customPeriods || [],
          defaultPeriodId: data.defaultPeriodId || "global_period",
          loaded: true,
        }));
      }
    });

    const unsubMenus = onSnapshot(menusRef, (snap) => {
      setPracticeMenus(snap.docs.map((d) => d.data()));
    });

    const unsubFeedbacks = onSnapshot(feedbacksRef, (snap) => {
      setAllFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubRunners();
      unsubLogs();
      unsubSettings();
      unsubMenus();
      unsubFeedbacks();
      clearTimeout(timeout);
    };
  }, [user, role]);
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
        (role !== "coach" && role !== "admin-runner" && role !== "coach-auth")
      ) {
        setRole("runner");
      }
    } else {
      // データが見つからず、かつ登録/ログイン画面等の操作中でなければリセット
      if (
        ![
          "coach",
          "registering",
          "login",
          "coach-auth",
          "admin-runner",
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
      if (targetPeriod.quarters && targetPeriod.quarters.length > 0) {
        return targetPeriod.quarters;
      }
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

  const periodSummary = useMemo(() => {
    if (periodLogs.length === 0)
      return { days: 0, avgDist: 0, avgRpe: 0, painData: [] };
    const dailyMap = {};
    periodLogs.forEach((l) => {
      if (!dailyMap[l.date])
        dailyMap[l.date] = { dist: 0, rpeSum: 0, count: 0, painMax: 0 };
      dailyMap[l.date].dist += Number(l.distance) || 0;
      dailyMap[l.date].rpeSum += l.rpe || 0;
      dailyMap[l.date].count += 1;
      dailyMap[l.date].painMax = Math.max(
        dailyMap[l.date].painMax,
        l.pain || 0,
      );
    });
    const days = Object.keys(dailyMap).length;
    const totalDist = periodLogs.reduce(
      (s, l) => s + (Number(l.distance) || 0),
      0,
    );
    const totalRpe = periodLogs.reduce((s, l) => s + (l.rpe || 0), 0);
    const painData = Object.keys(dailyMap)
      .sort()
      .map((date) => ({
        date: date.slice(5).replace("-", "/"),
        pain: dailyMap[date].painMax,
      }));
    return {
      days,
      avgDist: days > 0 ? Math.round((totalDist / days) * 10) / 10 : 0,
      avgRpe:
        periodLogs.length > 0
          ? Math.round((totalRpe / periodLogs.length) * 10) / 10
          : 0,
      painData,
    };
  }, [periodLogs]);

  const rankingData = useMemo(() => {
    const start = new Date(targetPeriod.start || "2000-01-01");
    const end = new Date(targetPeriod.end || "2100-12-31");
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    return activeRunners
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

    const data = activeRunners.map((r) => {
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

    // ★修正: 選手ID（memberCode）順に並べ替え
    return data.sort((a, b) => a.id.localeCompare(b.id));
  }, [activeRunners, allLogs, targetPeriod, activeQuarters]);

  const reportDates = useMemo(() => {
    return getDatesInRange(targetPeriod.start, targetPeriod.end);
  }, [targetPeriod]);

  const reportMatrix = useMemo(() => {
    // ★修正: 選手リストをID順にソートして使用する
    const sortedRunners = [...activeRunners].sort((a, b) =>
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
    activeRunners.forEach((r) => {
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
    return activeRunners.map((runner) => {
      // ★ 修正：filterでその日の全てのログを取得
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
    const reportedCount = activeRunners.filter((r) => {
      return allLogs.some((l) => l.runnerId === r.id && l.date === todayStr);
    }).length;
    const reportRate =
      activeRunners.length > 0
        ? Math.round((reportedCount / activeRunners.length) * 100)
        : 0;
    const painAlertCount = activeRunners.filter((r) => {
      const runnerLogs = allLogs.filter((l) => l.runnerId === r.id);
      if (runnerLogs.length === 0) return false;
      runnerLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
      return runnerLogs[0].pain >= 3;
    }).length;
    return { reportRate, painAlertCount, reportedCount };
  }, [activeRunners, allLogs]);

  useEffect(() => {
    if (role === "coach" && selectedRunner && targetPeriod) {
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

      // 重複チェック: IDで直接ドキュメントを探す
      const docRef = doc(runnersRef, targetId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setErrorMsg(
          `選手番号 ${targetId} は既に登録されています。「ログイン」してください。`,
        );
        setIsSubmitting(false);
        return;
      }

      // 新規保存
      const newProfile = {
        id: targetId, // IDを明示的に保存
        memberCode: targetId,
        lastName: formData.lastName.trim(),
        firstName: formData.firstName.trim(),
        goalMonthly: 0,
        goalPeriod: 200,
        status: "active",
        pin: formData.personalPin,
        registeredAt: new Date().toISOString(),
        lastLoginUid: user.uid, // ★現在の端末情報を紐付ける
      };

      await setDoc(docRef, newProfile);

      setProfile(newProfile);
      setRole("runner");
      setView("menu");
      setSuccessMsg("登録完了！");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (e) {
      console.error(e);
      setErrorMsg("登録エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setErrorMsg("");

    // ▼▼▼ 修正: 管理者コードを "99999" に変更 ▼▼▼
    if (formData.memberCode === "99999") {
      setIsSubmitting(true);
      try {
        setProfile({
          lastName: "管理者",
          firstName: "モード",
          memberCode: "99999", // 表示用IDも変更
          status: "active",
          pin: "0000",
          id: "admin_temp",
          lastLoginUid: user.uid,
        });
        setRole("admin-runner");
        setView("menu");
        setSuccessMsg("管理者モード");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (e) {
        setErrorMsg(e.message);
      }
      setIsSubmitting(false);
      return;
    }
    // ▲▲▲ 修正ここまで ▲▲▲

    // 通常ログインチェック
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
        // ★重要: 古いデータ形式(ランダムID)からの移行ロジック
        // ID検索で見つからない場合、memberCodeフィールドで検索する
        const q = query(runnersRef, where("memberCode", "==", targetId));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          // 旧データ発見！ -> 新方式(ID=memberCode)へ移行・統合する
          const oldDoc = qSnap.docs[0];
          const oldData = oldDoc.data();

          if (oldData.pin !== formData.personalPin) {
            setErrorMsg("パスコードが違います。");
            setIsSubmitting(false);
            return;
          }

          // 1. 新しいID(選手番号)で保存
          await setDoc(docRef, {
            ...oldData,
            id: targetId,
            lastLoginUid: user.uid, // 端末紐付け更新
            migratedAt: new Date().toISOString(),
          });

          // 2. ログデータの紐付けを更新 (バッチ処理)
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

          // 3. フィードバックデータの紐付け更新 (バッチ処理)
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
            // ID自体を作り直す必要がある (ex: global_period_oldId -> global_period_newId)
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

          // 4. 旧プロフィールの削除
          batch.delete(doc(runnersRef, oldDoc.id));

          // コミット実行
          await batch.commit();

          // 完了
          setProfile({ ...oldData, id: targetId, lastLoginUid: user.uid });
          setRole("runner");
          setView("menu");
          setSuccessMsg("システム更新: データを移行しました");
          return;
        }

        setErrorMsg("データが見つかりません。");
        setIsSubmitting(false);
        return;
      }

      // 通常ログイン（IDが見つかった場合）
      const profileData = docSnap.data();
      if (profileData.pin !== formData.personalPin) {
        setErrorMsg("パスコードが違います。");
        setIsSubmitting(false);
        return;
      }

      // ★端末紐付けを更新（これがログイン状態の維持になる）
      await updateDoc(docRef, {
        lastLoginUid: user.uid,
      });

      setProfile(profileData);
      setRole("runner");
      setView("menu");
      setSuccessMsg("ログイン完了");
      setTimeout(() => setSuccessMsg(""), 3000);
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
      category: "午後練",
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

  const changeView = (newView) => {
    if (newView !== "entry") resetForm();
    setView(newView);
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
      // 以下は使用しないが型維持のため
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
          rpe: parseInt(formData.rpe, 10), // ★修正: 整数(Integer)に変換
          pain: parseInt(formData.pain, 10), // ★修正: 整数(Integer)に変換
          updatedBy: "coach",
        },
      );
      setSuccessMsg("修正しました");
      setIsCoachEditModalOpen(false);
      setEditingLogId(null);
      resetForm();
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e) {
      alert("エラー: " + e.message);
    }
  };

  const handleCoachDeleteLog = () => {
    if (!editingLogId) return;

    // 確認ダイアログを表示
    setConfirmDialog({
      isOpen: true,
      message: "この記録を完全に削除しますか？（元に戻せません）",
      onConfirm: async () => {
        try {
          // 1. Firestoreから削除
          await deleteDoc(
            doc(db, "artifacts", appId, "public", "data", "logs", editingLogId),
          );

          // 2. 成功メッセージとモーダル閉じる処理
          setSuccessMsg("記録を削除しました");
          setIsCoachEditModalOpen(false);
          setEditingLogId(null);
          resetForm();

          // 3. 確認ダイアログを閉じる
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });

          setTimeout(() => setSuccessMsg(""), 2000);
        } catch (e) {
          alert("エラー: " + e.message);
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
      setSuccessMsg("更新しました");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e) {
      alert("エラー: " + e.message);
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
      // Month
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
      setSuccessMsg("目標を修正しました");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (e) {
      alert("エラー: " + e.message);
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
        // ★修正：確実に数値として保存する（計算やグラフ表示でのバグ防止）
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
        setSuccessMsg("更新しました");
      } else {
        await addDoc(
          collection(db, "artifacts", appId, "public", "data", "logs"),
          { ...dataToSave, createdAt: new Date().toISOString() },
        );
        setSuccessMsg("保存しました");
      }
      resetForm();
      setTimeout(() => {
        setSuccessMsg("");
        setView("menu");
      }, 1500);
    } catch (e) {
      console.error(e);
      setSuccessMsg("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ▼▼▼ 修正: 引数(targetId)を受け取れるように変更 ▼▼▼
  // default引数をnullに設定
  const handleDeleteLog = (targetId = null) => {
    // 1. 引数でIDが渡されたらそれを、なければ現在編集中のID(editingLogId)を使う
    // ※ここが重要！この行がないとリストからの削除が動きません
    const idToDelete = targetId || editingLogId;

    // 削除対象がなければ何もしない
    if (!idToDelete) return;

    setConfirmDialog({
      isOpen: true,
      message: "この記録を削除しますか？",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(db, "artifacts", appId, "public", "data", "logs", idToDelete),
          );
          setSuccessMsg("削除しました");
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });

          // もし「現在編集中のデータ」を削除した場合は、フォームもクリアする
          if (idToDelete === editingLogId) {
            setEditingLogId(null);
            resetForm();
          }

          setTimeout(() => setSuccessMsg(""), 2000);
        } catch (e) {
          console.error(e);
          alert("エラー: " + e.message);
        }
      },
    });
  };
  // ▲▲▲ 修正ここまで ▲▲▲

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
      setSuccessMsg("休養を記録しました");
      resetForm();
      setTimeout(() => {
        setSuccessMsg("");
        setView("menu");
      }, 1500);
    } catch (e) {
      console.error(e);
      setSuccessMsg("エラー");
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
      alert("期間名、開始日、終了日は必須です");
      return;
    }
    let updatedPeriods;
    if (editingPeriodId) {
      updatedPeriods = appSettings.customPeriods.map((p) =>
        p.id === editingPeriodId
          ? { ...newPeriodInput, id: editingPeriodId, type: "custom" }
          : p,
      );
      setSuccessMsg("期間を更新しました");
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
      setSuccessMsg("期間を追加しました");
    }
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "settings", "global"),
      { customPeriods: updatedPeriods },
    );
    setNewPeriodInput(initialPeriodInput);
    setEditingPeriodId(null);
    setTimeout(() => setSuccessMsg(""), 2000);
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
        setSuccessMsg("期間を削除しました");
        setTimeout(() => setSuccessMsg(""), 2000);
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
    setSuccessMsg("目標を保存しました");
    setTimeout(() => setSuccessMsg(""), 2000);
    setView("menu");
  };

  const handleSaveDefaultPeriod = async (e) => {
    const newDefaultId = e.target.value;
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "settings", "global"),
      { defaultPeriodId: newDefaultId },
    );
    setSuccessMsg("初期表示期間を変更しました");
    setTimeout(() => setSuccessMsg(""), 2000);
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
    setSuccessMsg("振り返りを保存しました");
    setTimeout(() => setSuccessMsg(""), 2000);
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
    setSuccessMsg("フィードバックを送りました");
    setCoachFeedbackComment("");
    setTimeout(() => setSuccessMsg(""), 2000);
  };

  const getRunnerFeedback = (rId) => {
    if (!rId || !targetPeriod) return null;
    const feedbackId = `${targetPeriod.id}_${rId}`;
    return allFeedbacks.find((f) => f.id === feedbackId);
  };

  // 5. Render Logic
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );

  if (!role) {
    // ... existing login logic ...
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* ▼▼▼ 追加: スタイル定義の読み込み ▼▼▼ */}
        <style>{globalStyles}</style>
        <style>{printStyles}</style>
        {/* ... existing code ... */}
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-blue-50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="mb-16 relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
          <div className="w-48 h-48 mb-6 relative">
            <img
              src="team-logo.png"
              alt="Team Logo"
              className="w-full h-full object-contain drop-shadow-md"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = "none";
                document.getElementById("logo-placeholder").style.display =
                  "flex";
              }}
            />
            <div
              id="logo-placeholder"
              className="hidden absolute inset-0 w-full h-full bg-blue-50 rounded-full flex items-center justify-center text-blue-600"
            >
              <Trophy size={80} />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-blue-900 text-center">
            KCTF Ekiden Team
          </h1>
          <p className="text-sm font-bold text-slate-400 tracking-widest uppercase mt-2">
            Distance Records
          </p>
        </div>
        <div className="w-full max-w-xs space-y-4 relative z-10">
          <button
            onClick={() => setRole("registering")}
            className="w-full bg-white hover:bg-blue-50 text-blue-600 py-5 rounded-2xl font-bold text-lg shadow-lg shadow-slate-100 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-blue-100"
          >
            <UserPlus size={22} /> 新規登録{" "}
            <span className="text-xs font-normal opacity-60">(初めての方)</span>
          </button>
          <button
            onClick={() => setRole("login")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <LogIn size={22} /> ログイン{" "}
            <span className="text-xs font-normal opacity-80">(2回目以降)</span>
          </button>
          <div className="pt-10 pb-12">
            <button
              onClick={() => setRole("coach-auth")}
              className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center gap-1 mx-auto"
            >
              <Lock size={12} /> Coach Login
            </button>
          </div>
        </div>
        <div className="absolute bottom-6 flex flex-col items-center">
          <p className="text-[10px] text-slate-300 font-mono">
            © 2026 KCTF EKIDEN TEAM
          </p>
          <p className="text-[8px] text-slate-200 font-mono mt-1">
            ver.{APP_LAST_UPDATED}
          </p>
        </div>
      </div>
    );
  }

  // ... (auth/register screens remain the same) ...
  if (role === "coach-auth") {
    // ... existing coach auth ...
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-xs text-center">
          <h2 className="text-white font-bold mb-8 uppercase tracking-widest text-xs opacity-50">
            Coach Passcode
          </h2>
          <input
            type="password"
            maxLength={4}
            className="w-full bg-slate-800 text-white text-center text-5xl p-4 rounded-3xl outline-none border-2 border-transparent focus:border-blue-500 tracking-widest"
            onChange={(e) => {
              if (e.target.value === appSettings.coachPass) {
                setRole("coach");
                setView("coach-stats");
              }
            }}
          />
          <button
            onClick={() => setRole(null)}
            className="text-slate-500 mt-8 text-sm font-bold uppercase"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (role === "registering") {
    const isReady =
      formData.lastName &&
      formData.firstName &&
      formData.memberCode &&
      formData.teamPass &&
      formData.personalPin.length === 4;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl space-y-6">
          <h2 className="text-2xl font-black text-slate-900 text-center uppercase italic">
            New Member
          </h2>

          <div className="space-y-5">
            {" "}
            {/* 間隔を少し広げました */}
            {/* 名前入力エリア */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 ml-1">氏名</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="苗字 (例: 佐藤)"
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
                <input
                  placeholder="名前 (例: 太郎)"
                  className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </div>
            </div>
            {/* 選手番号（ID）入力欄 */}
            <div className="space-y-1">
              {/* ★ここ！長い説明を外に出しました */}
              <p className="text-[10px] font-bold text-slate-500 ml-1">
                個人ID（kswc〇〇.△△△の数字5ｹﾀ）
              </p>
              {/* ▼▼▼ 修正: 選手番号入力欄 (5桁制限・数字のみ) ▼▼▼ */}
              <div className="relative">
                <input
                  type="tel" // スマホで数字キーボード
                  maxLength={5} // 5文字制限
                  placeholder="例:26001"
                  className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500 text-lg tracking-wider"
                  value={formData.memberCode}
                  onChange={(e) => {
                    // 数字以外を削除し、先頭5文字だけをセット
                    const val = e.target.value
                      .replace(/[^0-9]/g, "")
                      .slice(0, 5);
                    setFormData({ ...formData, memberCode: val });
                  }}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                  #
                </div>
              </div>
            </div>
            {/* チームパスコード */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              {/* ★ここ！長い説明を外に出しました */}
              <p className="text-[10px] font-bold text-slate-500 ml-1">
                チームPASS（顧問に確認してください）
              </p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="チームパスコード"
                  className={`w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 text-sm ${errorMsg ? "ring-rose-500" : "ring-blue-500"}`}
                  value={formData.teamPass}
                  onChange={(e) =>
                    setFormData({ ...formData, teamPass: e.target.value })
                  }
                />
                <Lock
                  className={`absolute left-4 top-1/2 -translate-y-1/2 ${errorMsg ? "text-rose-500" : "text-slate-400"}`}
                  size={20}
                />
              </div>
            </div>
            {/* 個人パスコード */}
            <div className="space-y-1">
              {/* ★ここ！長い説明を外に出しました */}
              <p className="text-[10px] font-bold text-slate-500 ml-1">
                個人PASS（4桁の数字を設定してください）
              </p>
              <div className="relative">
                <input
                  type="tel"
                  maxLength={4}
                  placeholder="0000"
                  className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500 text-lg tracking-widest" // 入力文字を大きく
                  value={formData.personalPin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalPin: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                />
                <KeyRound
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-rose-500 px-2 animate-in slide-in-from-left-2 mt-2">
                  <AlertCircle size={14} />
                  <span className="text-xs font-bold">{errorMsg}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleRegister}
              disabled={!isReady || isSubmitting}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all ${isReady ? "bg-blue-600 text-white active:scale-95" : "bg-slate-200 text-slate-400"}`}
            >
              {isSubmitting ? "登録中..." : "登録"}
            </button>
            <button
              onClick={() => setRole(null)}
              className="w-full text-slate-400 font-bold uppercase text-xs text-center"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === "login") {
    // ボタンを押せる条件：IDがあり、PASSが4桁であること
    const isReady =
      (formData.memberCode && formData.personalPin.length === 4) ||
      formData.memberCode === "admin"; // 管理者用

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl space-y-6">
          <h2 className="text-2xl font-black text-slate-900 text-center uppercase italic">
            Login
          </h2>

          <div className="space-y-5">
            {" "}
            {/* 間隔を少し広げました */}
            {/* 選手番号入力 */}
            <div className="space-y-4">
              {/* ★説明文を外に出しました */}
              <p className="text-[10px] font-bold text-slate-500 ml-1">
                個人ID;kswc〇〇.△△△の数字5ｹﾀ
              </p>
              <div className="relative">
                <input
                  type="tel" // スマホで数字キーボードを出す
                  inputmode="numeric" // ★【追加】スマホで「数字キーボード」を出す
                  pattern="[0-9]*" // ★【追加】念の為のiOS対策
                  maxLength={5}
                  placeholder="選手番号 (例: 26001)"
                  className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-emerald-500 text-lg tracking-wider"
                  value={formData.memberCode}
                  onChange={(e) => {
                    // 数字以外を削除し、5文字制限
                    const val = e.target.value
                      .replace(/[^0-9]/g, "")
                      .slice(0, 5);
                    setFormData({ ...formData, memberCode: val });
                  }}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                  #
                </div>
              </div>
            </div>
            {/* 暗証番号入力 */}
            <div className="space-y-1">
              {/* ★説明文を外に出しました */}
              <p className="text-[10px] font-bold text-slate-500 ml-1">
                個人PASS;登録時に設定した4桁の数字
              </p>
              <div className="relative">
                <input
                  type="password" // 入力値を隠す
                  maxLength={4}
                  placeholder="0000"
                  className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-emerald-500 text-lg tracking-widest" // 文字サイズUP
                  value={formData.personalPin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      personalPin: e.target.value.replace(/[^0-9]/g, ""),
                    })
                  }
                />
                <KeyRound
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={20}
                />
              </div>

              {/* エラーメッセージ表示エリア */}
              {errorMsg && (
                <div className="flex items-center gap-2 text-rose-500 px-2 animate-in slide-in-from-left-2 mt-2">
                  <AlertCircle size={14} />
                  <span className="text-xs font-bold">{errorMsg}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogin}
              disabled={!isReady || isSubmitting}
              className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all ${isReady ? "bg-emerald-600 text-white active:scale-95" : "bg-slate-200 text-slate-400"}`}
            >
              {isSubmitting ? "検索中..." : "開始"}
            </button>
            <button
              onClick={() => setRole(null)}
              className="w-full text-slate-400 font-bold uppercase text-xs text-center"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RUNNER VIEW OR PREVIEW ---
  if (
    (role === "runner" && profile) ||
    (role === "coach" && previewRunner) ||
    (role === "admin-runner" && profile)
  ) {
    if (role === "runner" && !profile)
      return (
        <div className="h-screen flex items-center justify-center text-slate-400 font-bold">
          Loading...
        </div>
      );
    const isPreview = role === "coach" && previewRunner;

    // ... (Runner UI rendering) ...
    return (
      <div
        className={`min-h-screen bg-slate-50 pb-28 ${isPreview ? "border-4 border-amber-400" : ""}`}
      >
        {successMsg && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-blue-600 text-white px-8 py-4 rounded-full shadow-2xl font-bold animate-in fade-in slide-in-from-top-4">
            {successMsg}
          </div>
        )}

        {isPreview && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-400 text-slate-900 py-2 px-4 flex justify-between items-center shadow-lg">
            <span className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Eye size={14} /> Preview Mode
            </span>
            <button
              onClick={() => setPreviewRunner(null)}
              className="bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              終了する
            </button>
          </div>
        )}

        {isMenuOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in"
            onClick={() => setIsMenuOpen(false)}
          >
            <div
              className="bg-white w-full max-w-sm p-6 rounded-[2.5rem] space-y-4 shadow-2xl animate-in slide-in-from-bottom-10"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-black text-center text-slate-400 uppercase tracking-widest text-xs">
                Menu
              </h3>
              <button
                onClick={() => {
                  setView("goal");
                  setIsMenuOpen(false);
                }}
                className="w-full py-4 bg-slate-100 rounded-2xl font-bold text-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Target size={20} /> 目標設定
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <LogOut size={20} />{" "}
                {isPreview ? "プレビュー終了" : "ログアウト"}
              </button>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <header
          className={`bg-blue-600 text-white pt-14 pb-28 px-8 rounded-b-[4rem] relative overflow-hidden ${isPreview ? "mt-8" : ""}`}
        >
          {/* ... header content ... */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="flex justify-between items-center relative z-10 max-w-md mx-auto">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="bg-white/20 p-2.5 rounded-2xl active:scale-90 transition-all text-white"
            >
              <Menu size={20} />
            </button>

            <div className="text-center">
              <p className="text-blue-100 text-[10px] font-black tracking-widest uppercase mb-1">
                Athlete Dashboard
              </p>
              <h1 className="text-2xl font-black tracking-tighter">
                {currentProfile.lastName} {currentProfile.firstName}
              </h1>
            </div>
            <div className="w-10"></div>
          </div>
        </header>

        {availablePeriods.length > 0 && selectedPeriod && (
          <div className="px-5 -mt-24 relative z-30 max-w-md mx-auto mb-6">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-2xl flex items-center gap-2 shadow-sm border border-white/30">
              <Filter size={16} className="text-white ml-2 opacity-80" />
              <select
                className="bg-transparent text-white font-bold text-sm w-full outline-none appearance-none"
                value={selectedPeriod.id}
                onChange={(e) => {
                  const period = availablePeriods.find(
                    (p) => p.id === e.target.value,
                  );
                  if (period) setSelectedPeriod(period);
                }}
                style={{ color: "white", fontWeight: "bold" }}
              >
                {/* 1. 特別期間・カスタム */}
                <optgroup
                  label="🚩 指定期間"
                  className="text-slate-900 font-bold bg-slate-100"
                >
                  {availablePeriods
                    .filter((p) => p.type === "global" || p.type === "custom")
                    .map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="text-slate-900 bg-white"
                      >
                        {/* ▼▼▼ 修正: 年を削って「月/日」だけにしました ▼▼▼ */}
                        {p.name} ({p.start.slice(5).replace("-", "/")}~
                        {p.end.slice(5).replace("-", "/")})
                      </option>
                    ))}
                </optgroup>

                {/* 2. 年度 */}
                <optgroup
                  label="📂 年度アーカイブ"
                  className="text-slate-900 font-bold bg-slate-100"
                >
                  {availablePeriods
                    .filter((p) => p.type === "year")
                    .map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="text-slate-900 bg-white"
                      >
                        {p.name}
                      </option>
                    ))}
                </optgroup>

                {/* 3. 月間 */}
                <optgroup
                  label="📅 月次レポート"
                  className="text-slate-900 font-bold bg-slate-100"
                >
                  {availablePeriods
                    .filter((p) => p.type === "month")
                    .map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="text-slate-900 bg-white"
                      >
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          </div>
        )}

        <main className="px-5 space-y-6 relative z-20 max-w-md mx-auto">
          {view === "menu" && (
            <>
              {/* ▼▼▼ 追加: 目標未設定時のアラートバナー ▼▼▼ */}
              {(() => {
                // 現在の期間の目標値を取得
                const currentGoal = getGoalValue(
                  currentProfile,
                  targetPeriod.id,
                  targetPeriod.type,
                  "goalPeriod", // 期間合計目標、または月間目標
                );

                // 目標が 0 または 未設定の場合に表示
                if (!currentGoal || currentGoal === 0) {
                  return (
                    <div
                      onClick={() => setView("goal")} // タップで目標設定へ
                      className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg mb-6 flex items-center justify-between cursor-pointer active:scale-95 transition-transform animate-in slide-in-from-top-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                          <Target size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-black text-xs uppercase tracking-widest opacity-90">
                            Action Required
                          </p>
                          <p className="font-bold text-sm">
                            目標が設定されていません
                          </p>
                        </div>
                      </div>
                      <div className="bg-white text-rose-600 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm">
                        設定する
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              {/* ▲▲▲ 追加ここまで ▲▲▲ */}

              {/* ▼▼▼ 追加: 未入力日の警告 (Missing Report Alert) ▼▼▼ */}
              {missingDates.length > 0 && (
                <div className="mb-6 animate-in slide-in-from-top-4">
                  {/* ヘッダー部分：何件あるか表示 */}
                  <div className="flex items-center justify-between mb-2 px-2">
                    <p className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} /> Missing Reports (
                      {missingDates.length})
                    </p>
                  </div>

                  {/* スクロールエリア */}
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {missingDates.map((dateStr) => {
                      const d = new Date(dateStr);
                      return (
                        <div
                          key={dateStr}
                          onClick={() => {
                            setFormData({ ...formData, date: dateStr });
                            setView("entry");
                          }}
                          // ★高さ（padding）を py-2 に減らし、角丸を rounded-xl に縮小
                          className="bg-amber-400 text-slate-900 py-2 px-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-transform border border-slate-900/10"
                        >
                          <div className="flex items-center gap-3">
                            {/* アイコンも小さくシンプルに */}
                            <AlertTriangle
                              size={16}
                              className="text-slate-800"
                            />

                            {/* 日付とテキストを1行にまとめる */}
                            <div className="flex items-baseline gap-2">
                              <span className="font-black text-sm">
                                {d.getMonth() + 1}/{d.getDate()}
                              </span>
                              <span className="text-[10px] font-bold opacity-70">
                                未入力
                              </span>
                            </div>
                          </div>

                          {/* ボタンも小さく */}
                          <div className="bg-white/90 text-slate-900 px-2 py-1 rounded text-[10px] font-black min-w-[40px] text-center">
                            入力
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {missingDates.length > 3 && (
                    <p className="text-center text-[10px] text-slate-400 font-bold mt-2">
                      ↑ スクロールして過去分も確認できます
                    </p>
                  )}

                  {/* ▲▲▲ 修正ここまで ▲▲▲ */}
                  {/* 未入力が多い場合の励ましメッセージ（オプション） */}
                  {missingDates.length >= 2 && (
                    <p className="text-center text-[10px] text-slate-400 font-bold">
                      休みだった場合も「完全休養」として記録しましょう！
                    </p>
                  )}
                </div>
              )}
              {/* ▲▲▲ 追加ここまで ▲▲▲ */}

              {/* Dual Goal Status Card */}
              <div className="bg-white p-7 rounded-[2.5rem] shadow-xl shadow-blue-900/5 space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">
                      {targetPeriod.type === "year"
                        ? "Yearly Mileage"
                        : targetPeriod.type === "custom"
                          ? "Period Mileage"
                          : "Monthly Mileage"}
                    </h3>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-3xl font-black text-blue-600 tracking-tighter">
                      {targetPeriod.type === "month"
                        ? personalStats.monthly
                        : personalStats.period}
                      <span className="text-xs font-normal text-slate-400">
                        km
                      </span>
                    </span>
                    <span className="text-xs font-bold text-slate-400 pb-1">
                      /{" "}
                      {getGoalValue(
                        currentProfile,
                        targetPeriod.id,
                        targetPeriod.type,
                        "goalPeriod",
                      )}{" "}
                      km
                    </span>
                  </div>

                  {getGoalValue(
                    currentProfile,
                    targetPeriod.id,
                    targetPeriod.type,
                    "goalPeriod",
                  ) > 0 && (
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(
                            100,
                            ((targetPeriod.type === "month"
                              ? personalStats.monthly
                              : personalStats.period) /
                              getGoalValue(
                                currentProfile,
                                targetPeriod.id,
                                targetPeriod.type,
                                "goalPeriod",
                              )) *
                              100,
                          )}%`,
                        }}
                      ></div>
                    </div>
                  )}

                  <p className="text-[9px] text-right text-slate-400 font-bold mt-1">
                    {targetPeriod.name}
                  </p>
                </div>

                {/* Q1-Q4 */}
                {activeQuarters.length > 0 &&
                  (targetPeriod.type === "custom" ||
                    targetPeriod.type === "global") && (
                    <div className="pt-5 border-t border-slate-50">
                      <h3 className="font-black text-emerald-500 text-[10px] uppercase tracking-widest mb-3 flex items-center gap-1">
                        <Flag size={12} /> Focus Period Breakdown
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {activeQuarters.map((q, idx) => {
                          const goal = getGoalValue(
                            currentProfile,
                            targetPeriod.id,
                            targetPeriod.type,
                            `goalQ${idx + 1}`,
                          );
                          const actual = personalStats.qs[idx] || 0;
                          return (
                            <div
                              key={idx}
                              className={`p-2 rounded-xl flex flex-col items-center bg-slate-50`}
                            >
                              <span
                                className={`text-[8px] font-black uppercase mb-1 text-slate-400`}
                              >
                                Q{idx + 1}
                              </span>
                              <div className="w-full h-12 bg-slate-200 rounded-lg relative overflow-hidden flex flex-col justify-end">
                                <div
                                  className={`w-full absolute bottom-0 transition-all duration-500 bg-emerald-400`}
                                  style={{
                                    height: `${goal > 0 ? Math.min(100, (actual / goal) * 100) : 0}%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-[9px] font-black mt-1 text-slate-600">
                                {actual}
                              </span>
                              <span className="text-[7px] font-bold text-slate-400">
                                / {goal || "-"}
                              </span>
                              {q.start && (
                                <span className="text-[6px] text-slate-300 mt-0.5">
                                  {q.start.slice(5).replace("-", "/")}~
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>

              {/* ... today's menu ... */}
              <div className="bg-slate-900 p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Calendar size={12} /> Today's Menu
                </p>
                {practiceMenus.find((m) => m.date === getTodayStr()) ? (
                  <p className="font-bold text-lg leading-snug">
                    {practiceMenus.find((m) => m.date === getTodayStr()).text}
                  </p>
                ) : (
                  <p className="text-slate-500 italic text-sm">
                    指示はありません
                  </p>
                )}
              </div>

              {/* ▼▼▼ 追加: チーム活動ログ (直近7日間) ▼▼▼ */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} /> Team Activity (Last 7 Days)
                  </h3>
                </div>

                <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                  {(() => {
                    // 1. 直近7日間の日付文字列を生成
                    const today = new Date();
                    const pastDate = new Date();
                    pastDate.setDate(today.getDate() - 6); // 今日含めて7日間
                    const minDateStr = pastDate.toLocaleDateString("sv-SE"); // YYYY-MM-DD形式

                    // 2. フィルタリングとソート
                    const teamLogs = allLogs
                      .filter((l) => l.date >= minDateStr) // 7日前以降
                      // ★追加：現役選手リストに含まれるIDのログだけを通す
                      .filter((l) =>
                        activeRunners.some((r) => r.id === l.runnerId),
                      )
                      .sort((a, b) => {
                        // 日付の新しい順 > 作成日時の新しい順
                        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
                        return (b.createdAt || "").localeCompare(
                          a.createdAt || "",
                        );
                      })
                      .slice(0, 10); // 表示が多くなりすぎないよう最新10件に制限

                    if (teamLogs.length === 0) {
                      return (
                        <p className="text-center text-xs text-slate-300 py-4 font-bold">
                          直近の活動記録はありません
                        </p>
                      );
                    }

                    return teamLogs.map((log) => {
                      const isRest = log.category === "完全休養";

                      return (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 relative pl-2"
                        >
                          {/* タイムラインの線 */}
                          <div className="absolute left-[19px] top-8 bottom-[-16px] w-0.5 bg-slate-100 last:hidden"></div>

                          {/* アバター */}
                          <div
                            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm z-10 ${
                              isRest ? "bg-emerald-400" : "bg-blue-500"
                            }`}
                          >
                            {log.runnerName ? log.runnerName.charAt(0) : "?"}
                          </div>

                          {/* 内容 */}
                          <div className="bg-slate-50 p-3 rounded-2xl w-full border border-slate-100">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400">
                                  {log.date.slice(5).replace("-", "/")} ·{" "}
                                  {log.runnerName}
                                </p>
                                <p
                                  className={`text-sm font-black ${isRest ? "text-emerald-600" : "text-slate-700"}`}
                                >
                                  {isRest ? "完全休養" : `${log.distance}km`}
                                  {!isRest && (
                                    <span className="text-[10px] font-bold text-slate-400 ml-2 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                      {log.category}
                                    </span>
                                  )}
                                </p>
                              </div>
                              {/* ★RPE表示ブロックを削除しました */}
                            </div>

                            {/* 一言コメントがあれば表示 */}
                            {log.menuDetail && (
                              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed bg-white/50 p-1.5 rounded-lg">
                                "{log.menuDetail}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </>
          )}

          {/* ADDED: Entry View */}
          {view === "entry" && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setView("menu")}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                  Daily Entry
                </h3>
              </div>

              <div className="space-y-4">
                {/* Date and Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500 text-sm"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Type
                    </label>
                    <select
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500 text-sm appearance-none"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                    >
                      <option value="朝練">朝練</option>
                      <option value="午後練">午後練</option>
                      <option value="自主練">自主練</option>
                      <option value="試合">試合</option>
                      <option value="合宿">合宿</option>
                      <option value="完全休養">完全休養</option>
                    </select>
                  </div>
                </div>

                {/* Distance */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Distance (km)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full p-6 bg-blue-50/50 rounded-3xl font-black text-4xl text-blue-600 text-center outline-none focus:ring-2 ring-blue-500"
                    value={formData.distance}
                    onChange={(e) =>
                      setFormData({ ...formData, distance: e.target.value })
                    }
                  />
                </div>

                {/* Menu Detail */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                    Menu Detail
                  </label>
                  <textarea
                    placeholder="メニューの内容、タイム、感想など"
                    className="w-full p-4 bg-slate-50 rounded-3xl font-bold text-slate-600 outline-none focus:ring-2 ring-blue-500 min-h-[100px] text-sm resize-none"
                    value={formData.menuDetail}
                    onChange={(e) =>
                      setFormData({ ...formData, menuDetail: e.target.value })
                    }
                  />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      RPE (1-10)
                    </label>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-slate-700">
                        {formData.rpe}
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        className="w-20"
                        value={formData.rpe}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            rpe: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-3xl space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Pain (1-5)
                    </label>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-2xl font-black ${formData.pain >= 3 ? "text-rose-500" : "text-slate-700"}`}
                      >
                        {formData.pain}
                      </span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        className="w-20 accent-rose-500"
                        value={formData.pain}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pain: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  {/* ▼▼▼ 保存/更新ボタン ▼▼▼ */}
                  <button
                    onClick={handleSaveLog}
                    disabled={isSubmitting || !formData.distance}
                    className={`w-full py-5 rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all ${
                      isSubmitting || !formData.distance
                        ? "bg-slate-200 text-slate-400"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <Save size={20} /> {editingLogId ? "更新する" : "保存する"}
                  </button>

                  {/* ▼▼▼ 追加: 編集モード時のボタン（削除 & キャンセル） ▼▼▼ */}
                  {editingLogId && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingLogId(null);
                          resetForm();
                        }}
                        disabled={isSubmitting}
                        className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-3xl font-bold text-sm shadow-md active:scale-95 transition-all"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}

                  {/* ▼▼▼ 完全休養ボタン（新規作成時のみ表示） ▼▼▼ */}
                  {!formData.distance && !editingLogId && (
                    <button
                      onClick={handleRestRegister}
                      disabled={isSubmitting}
                      className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-3xl font-bold text-sm shadow-md active:scale-95 transition-all"
                    >
                      完全休養として記録
                    </button>
                  )}
                </div>
                {/* ▼▼▼ 追加: 個人の活動履歴 (My Recent Activity) ▼▼▼ */}
                {/* ▼▼▼ 修正: My Activity (期間内全表示・スクロール対応) ▼▼▼ */}
                <div className="pt-8 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={14} /> My Activity
                    </h4>
                    {/* 現在の期間名を表示 */}
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      {targetPeriod.name}
                    </span>
                  </div>

                  {/* スクロールエリア (最大高さ400px) */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {(() => {
                      // 1. 期間の範囲を定義
                      const start = new Date(targetPeriod.start);
                      const end = new Date(targetPeriod.end);
                      end.setHours(23, 59, 59, 999); // 終了日の23:59まで含める

                      // 2. 自分のログを抽出・期間でフィルタリング・日付順ソート
                      const myPeriodLogs = allLogs
                        .filter((l) => l.runnerId === currentUserId)
                        .filter((l) => {
                          const d = new Date(l.date);
                          // 日付が無効な場合は弾く、有効なら範囲チェック
                          return !isNaN(d) && d >= start && d <= end;
                        })
                        .sort((a, b) => new Date(b.date) - new Date(a.date));

                      if (myPeriodLogs.length === 0) {
                        return (
                          <p className="text-center text-xs text-slate-300 py-8 font-bold">
                            この期間の記録はありません
                          </p>
                        );
                      }

                      return myPeriodLogs.map((log) => {
                        const isRest = log.category === "完全休養";
                        return (
                          <div
                            key={log.id}
                            onClick={() => handleEditLog(log)} // タップで編集モードへ
                            className="bg-slate-50 p-4 rounded-2xl border border-slate-100 cursor-pointer active:scale-95 transition-transform hover:border-blue-200 group relative"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                                  {log.date.slice(5).replace("-", "/")}
                                  <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                                    {log.category}
                                  </span>
                                </p>
                                <p className="text-sm font-bold text-slate-700 mt-1 line-clamp-1">
                                  {log.menuDetail || "メニュー記録なし"}
                                </p>
                              </div>
                              <p
                                className={`text-lg font-black ${
                                  isRest ? "text-emerald-500" : "text-blue-600"
                                }`}
                              >
                                {isRest ? "Rest" : log.distance}
                                {!isRest && (
                                  <span className="text-xs text-slate-400 ml-0.5">
                                    km
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="flex items-center justify-between">
                              {/* 左側: RPE & Pain バッジ */}
                              <div className="flex gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${
                                    log.rpe >= 8
                                      ? "bg-rose-100 text-rose-600 border-rose-200"
                                      : log.rpe >= 5
                                        ? "bg-orange-100 text-orange-600 border-orange-200"
                                        : "bg-blue-50 text-blue-600 border-blue-100"
                                  }`}
                                >
                                  RPE {log.rpe}
                                </span>
                                {log.pain > 1 && (
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[9px] font-black border flex items-center gap-1 ${
                                      log.pain >= 4
                                        ? "bg-purple-100 text-purple-600 border-purple-200 animate-pulse"
                                        : log.pain === 3
                                          ? "bg-rose-100 text-rose-600 border-rose-200"
                                          : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                    }`}
                                  >
                                    <HeartPulse size={10} /> Pain {log.pain}
                                  </span>
                                )}
                              </div>

                              {/* 右側: 操作アイコンエリア */}
                              <div className="flex items-center gap-4">
                                {/* ゴミ箱ボタン */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // 編集画面への移動を阻止
                                    handleDeleteLog(log.id);
                                  }}
                                  className="text-slate-300 hover:text-rose-500 transition-colors p-2 -mr-2"
                                  title="削除する"
                                >
                                  <Trash2 size={18} />
                                </button>

                                {/* 編集アイコン */}
                                <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                                  <Edit size={16} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                {/* ▲▲▲ 修正ここまで ▲▲▲ */}
              </div>
            </div>
          )}

          {/* ▼▼▼ 修正: 振り返り画面 (Review View) ▼▼▼ */}
          {view === "review" && (
            <div className="bg-white p-6 rounded-[3rem] shadow-sm space-y-8 animate-in fade-in">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setView("menu")}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                  Period Review
                </h3>
              </div>

              {/* 1. 達成度円グラフエリア */}
              <div className="bg-slate-50 p-6 rounded-3xl relative overflow-hidden">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center">
                  Goal Achievement ({targetPeriod.name})
                </h4>

                {(() => {
                  const goalVal = getGoalValue(
                    currentProfile,
                    targetPeriod.id,
                    targetPeriod.type,
                    "goalPeriod",
                  );
                  const currentVal = personalStats.period;
                  const rate =
                    goalVal > 0 ? Math.round((currentVal / goalVal) * 100) : 0;
                  const chartData = [
                    { name: "Achieved", value: currentVal },
                    {
                      name: "Remaining",
                      value: Math.max(0, goalVal - currentVal),
                    },
                  ];

                  return (
                    <div className="flex flex-col items-center justify-center relative">
                      <div className="w-full h-48 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              startAngle={90}
                              endAngle={-270}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill="#3b82f6" /> {/* 青: 達成 */}
                              <Cell fill="#e2e8f0" /> {/* グレー: 残り */}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        {/* 中央の％表示 */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-4xl font-black text-slate-800 tracking-tighter">
                            {rate}
                            <span className="text-sm">%</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {currentVal} / {goalVal} km
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* ▼▼▼ 追加提案: 練習強度バランス ▼▼▼ */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} /> Training Intensity
                </h4>

                {(() => {
                  // 強度別の回数を集計
                  const counts = { low: 0, mid: 0, high: 0 };
                  periodLogs.forEach((l) => {
                    if (l.rpe >= 8) counts.high++;
                    else if (l.rpe >= 5) counts.mid++;
                    else counts.low++;
                  });
                  const total = periodLogs.length || 1; // 0除算防止

                  return (
                    <div className="space-y-3">
                      {/* High Intensity */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span className="text-rose-500 flex items-center gap-1">
                            <AlertCircle size={10} /> Hard (RPE 8-10)
                          </span>
                          <span>
                            {counts.high}回 (
                            {Math.round((counts.high / total) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(counts.high / total) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Mid Intensity */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span className="text-orange-400">
                            Moderate (RPE 5-7)
                          </span>
                          <span>
                            {counts.mid}回 (
                            {Math.round((counts.mid / total) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-orange-400 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(counts.mid / total) * 100}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Low Intensity */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span className="text-emerald-500">
                            Easy / Recovery (RPE 1-4)
                          </span>
                          <span>
                            {counts.low}回 (
                            {Math.round((counts.low / total) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                            style={{ width: `${(counts.low / total) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* ▼▼▼ 追加: 痛みのヒートマップ (Pain Heatmap) ▼▼▼ */}
              <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <HeartPulse size={16} /> Physical Condition Map
                </h4>

                {(() => {
                  // 1. 期間内の全日付を取得（ヘルパー関数を使用）
                  const dates = getDatesInRange(
                    targetPeriod.start,
                    targetPeriod.end,
                  );

                  // 2. ログを辞書形式に変換 (検索高速化 & 1日複数ログの場合は「最大の痛み」を採用)
                  const painMap = {};
                  periodLogs.forEach((l) => {
                    if (!painMap[l.date] || painMap[l.date] < l.pain) {
                      painMap[l.date] = l.pain;
                    }
                  });

                  return (
                    <div className="space-y-3">
                      {/* ヒートマップ本体 (日付入り) */}
                      <div className="flex flex-wrap gap-2">
                        {dates.map((date) => {
                          const pain = painMap[date];
                          const day = parseInt(date.split("-")[2], 10); // 日付の数字を取り出す

                          // 色分け設定
                          let bgClass = "bg-slate-100 text-slate-300"; // 記録なし
                          if (pain === 1)
                            bgClass = "bg-emerald-300 text-emerald-800"; // Good
                          if (pain === 2)
                            bgClass = "bg-yellow-300 text-yellow-800"; // 違和感
                          if (pain === 3) bgClass = "bg-orange-400 text-white"; // 痛み
                          if (pain === 4) bgClass = "bg-rose-500 text-white"; // 強い痛み
                          if (pain === 5) bgClass = "bg-purple-600 text-white"; // 激痛

                          return (
                            <div
                              key={date}
                              title={`${date}: Pain ${pain || "-"}`}
                              className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center text-[10px] font-black shadow-sm transition-all hover:scale-110`}
                            >
                              {day}
                            </div>
                          );
                        })}
                      </div>

                      {/* 簡易凡例 (Legend) */}
                      <div className="flex justify-between items-center px-2 pt-2 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-emerald-300 rounded-full"></div>
                            <span className="text-[9px] font-bold text-slate-400">
                              Good
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                            <span className="text-[9px] font-bold text-slate-400">
                              Pain
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                            <span className="text-[9px] font-bold text-slate-400">
                              Danger
                            </span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-300">
                          {dates.length} Days
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 2. 自分の振り返り入力 (既存) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Self Review
                </label>
                <textarea
                  className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500 min-h-[150px] text-sm leading-relaxed resize-none"
                  placeholder="今期の振り返り、次期の目標など"
                  defaultValue={currentFeedback?.runnerComment || ""}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <button
                onClick={handleSaveReview}
                className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> 振り返りを保存
              </button>

              {/* 3. コーチからのフィードバック (既存) */}
              <div className="bg-emerald-50 p-6 rounded-3xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 bg-white/20 rounded-full -mr-6 -mt-6 blur-2xl"></div>
                <div className="relative z-10">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <MessageSquare size={12} /> Coach Feedback
                  </p>
                  {currentFeedback && currentFeedback.coachComment ? (
                    <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {currentFeedback.coachComment}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic font-bold">
                      まだフィードバックはありません
                    </p>
                  )}
                </div>
              </div>

              {/* 4. 期間内の練習ログ詳細リスト (新規追加) */}
              <div className="pt-8 border-t border-slate-100 space-y-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center">
                  Daily History
                </h4>
                <div className="space-y-3">
                  {periodLogs.length === 0 ? (
                    <p className="text-center text-xs text-slate-300 py-4">
                      記録がありません
                    </p>
                  ) : (
                    periodLogs.map((log) => (
                      <div
                        key={log.id}
                        className="bg-slate-50 p-4 rounded-2xl border border-slate-100"
                      >
                        {/* 日付・距離・種別 */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[10px] font-black text-slate-400">
                              {log.date}{" "}
                              <span className="bg-white px-1 rounded border border-slate-200 text-slate-500 ml-1">
                                {log.category}
                              </span>
                            </p>
                            <p className="text-sm font-bold text-slate-600 mt-1">
                              {log.menuDetail || "メニュー記録なし"}
                            </p>
                          </div>
                          <p className="text-lg font-black text-blue-600">
                            {log.distance}
                            <span className="text-xs text-slate-400 ml-0.5">
                              km
                            </span>
                          </p>
                        </div>

                        {/* 強度(RPE)と痛み(Pain)の可視化 */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          {/* RPE Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-slate-400">
                              <span>RPE (強度)</span>
                              <span>{log.rpe}/10</span>
                            </div>
                            <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  log.rpe >= 8
                                    ? "bg-rose-500"
                                    : log.rpe >= 5
                                      ? "bg-orange-400"
                                      : "bg-blue-400"
                                }`}
                                style={{ width: `${log.rpe * 10}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Pain Indicator */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-bold text-slate-400">
                              <span>Pain (痛み)</span>
                              <span>{log.pain}/5</span>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <div
                                  key={lvl}
                                  className={`h-2 flex-1 rounded-full ${
                                    lvl <= log.pain
                                      ? log.pain >= 3
                                        ? "bg-rose-500"
                                        : "bg-emerald-400"
                                      : "bg-white"
                                  }`}
                                ></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ADDED: Goal View (Requested Fix) */}
          {view === "goal" && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em] mb-4">
                Target Setting
              </h3>

              <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-100">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <Target size={18} className="text-blue-500" />
                    {targetPeriod.name} の目標
                  </h4>

                  {/* Monthly Goal - Always relevant */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      月間目標走行距離 (km)
                    </label>
                    <input
                      type="number"
                      placeholder="例: 200"
                      className="w-full p-4 bg-white rounded-2xl font-black text-xl text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 transition-all shadow-sm"
                      value={goalInput.monthly}
                      onChange={(e) =>
                        setGoalInput({ ...goalInput, monthly: e.target.value })
                      }
                    />
                    <p className="text-[10px] text-slate-400 font-bold ml-1">
                      ※この期間の各月の目標値です
                    </p>
                  </div>

                  {/* Period Total Goal - Only if not month type */}
                  {targetPeriod.type !== "month" && (
                    <div className="space-y-2 pt-4 border-t border-slate-200">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        期間合計目標 (km)
                      </label>
                      <input
                        type="number"
                        placeholder="例: 1000"
                        className="w-full p-4 bg-white rounded-2xl font-black text-xl text-emerald-600 outline-none border-2 border-transparent focus:border-emerald-500 transition-all shadow-sm"
                        value={goalInput.period}
                        onChange={(e) =>
                          setGoalInput({ ...goalInput, period: e.target.value })
                        }
                      />
                    </div>
                  )}

                  {/* Quarterly Goals - If quarters exist */}
                  {activeQuarters.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        期間内訳 (Quarterly Goals)
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {activeQuarters.map((q, idx) => (
                          <div key={idx} className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400">
                              Q{idx + 1}
                            </label>
                            <input
                              type="number"
                              className="w-full p-3 bg-white rounded-xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500 shadow-sm"
                              value={goalInput[`q${idx + 1}`]}
                              onChange={(e) =>
                                setGoalInput({
                                  ...goalInput,
                                  [`q${idx + 1}`]: e.target.value,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={updateGoals}
                  className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> 目標を保存
                </button>
                <button
                  onClick={() => setView("menu")}
                  className="w-full py-4 text-slate-400 font-bold text-xs uppercase tracking-widest"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* チーム状況画面 (Team Status View)  */}
          {view === "team_status" && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setView("menu")}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                  Team Status
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end px-2">
                  <h4 className="font-black text-xl text-slate-800 flex items-center gap-2">
                    <Users className="text-blue-500" /> ランキング
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {targetPeriod.name}
                  </p>
                </div>

                {/* ランキングリスト */}
                <div className="space-y-3">
                  {rankingData.map((runner, index) => {
                    // 今日のログがあるか確認
                    const todayLog = allLogs.find(
                      (l) =>
                        l.runnerId === runner.id && l.date === getTodayStr(),
                    );

                    return (
                      <div
                        key={runner.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                      >
                        {/* 順位バッジ */}
                        <div
                          className={`absolute top-0 left-0 px-3 py-1 rounded-br-xl text-[10px] font-black ${
                            index === 0
                              ? "bg-yellow-400 text-yellow-900"
                              : index === 1
                                ? "bg-slate-300 text-slate-700"
                                : index === 2
                                  ? "bg-orange-300 text-orange-800"
                                  : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          #{index + 1}
                        </div>

                        <div className="flex items-center gap-3 pl-8">
                          <div>
                            <p className="font-bold text-slate-700 text-sm">
                              {runner.name}
                            </p>
                            {/* 今日の練習状況を表示 */}
                            {todayLog ? (
                              <p className="text-[10px] font-bold text-blue-500 flex items-center gap-1 mt-0.5">
                                <Check size={10} /> 今日: {todayLog.distance}km
                              </p>
                            ) : (
                              <p className="text-[10px] font-bold text-slate-300 mt-0.5">
                                今日: -
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-black text-slate-800">
                            {runner.total}
                            <span className="text-xs ml-0.5 text-slate-400">
                              km
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ▼▼▼ 下部ナビゲーションバー（ここから書き換え） ▼▼▼ */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto pointer-events-none">
          <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-8 pt-2 px-6 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-between items-end h-24 pointer-events-auto">
            {/* 1. Home */}
            <button
              onClick={() => setView("menu")}
              className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-14 ${
                view === "menu"
                  ? "text-blue-600 -translate-y-1"
                  : "text-slate-300 hover:text-slate-400"
              }`}
            >
              <Home size={24} strokeWidth={view === "menu" ? 3 : 2} />
              <span className="text-[8px] font-black uppercase tracking-widest">
                Home
              </span>
            </button>

            {/* 2. Team (New!) */}
            <button
              onClick={() => setView("team_status")}
              className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-14 ${
                view === "team_status"
                  ? "text-indigo-500 -translate-y-1"
                  : "text-slate-300 hover:text-slate-400"
              }`}
            >
              <Users size={24} strokeWidth={view === "team_status" ? 3 : 2} />
              <span className="text-[8px] font-black uppercase tracking-widest">
                Team
              </span>
            </button>

            {/* 3. Entry (Center) */}
            <div className="relative mx-1">
              <button
                onClick={() => {
                  resetForm();
                  setView("entry");
                }}
                className="bg-blue-600 text-white p-4 rounded-full shadow-xl shadow-blue-200 active:scale-95 transition-all -mb-8 border-[6px] border-slate-50 group hover:bg-blue-700"
              >
                <Plus
                  size={30}
                  strokeWidth={3}
                  className="group-hover:rotate-90 transition-transform duration-300"
                />
              </button>
            </div>

            {/* 4. Review */}
            <button
              onClick={() => setView("review")}
              className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-14 ${
                view === "review"
                  ? "text-emerald-500 -translate-y-1"
                  : "text-slate-300 hover:text-slate-400"
              }`}
            >
              <MessageSquare
                size={24}
                strokeWidth={view === "review" ? 3 : 2}
              />
              <span className="text-[8px] font-black uppercase tracking-widest">
                Review
              </span>
            </button>
          </div>
        </nav>
        {/* ▼▼▼ 追加: 選手画面用の削除確認ダイアログ ▼▼▼ */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs w-full animate-in zoom-in-95">
              <p className="font-bold text-slate-800 mb-6 text-center leading-relaxed text-sm">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setConfirmDialog({ ...confirmDialog, isOpen: false })
                  }
                  className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ▲▲▲ 追加ここまで ▲▲▲ */}
      </div>
    );
  }

  // --- COACH VIEW ---
  if (role === "coach") {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 print:bg-white print:pb-0 print:h-auto md:flex">
        {/* Header / Sidebar for PC */}
        {/* ... (sidebar remains same) ... */}
        <header className="bg-slate-950 text-white p-5 sticky top-0 z-50 md:h-screen md:w-64 md:flex md:flex-col md:justify-between shadow-xl print:hidden">
          <div>
            <h1 className="font-black italic text-xl flex items-center gap-2 tracking-tighter mb-8 md:mb-10">
              <Users size={20} className="text-blue-400" /> COACH TERMINAL
            </h1>

            {/* PC Navigation */}
            <nav className="hidden md:flex flex-col gap-2">
              {["stats", "report", "check", "menu", "roster", "settings"].map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setView(`coach-${t}`)}
                    className={`flex items-center gap-3 py-3 px-4 rounded-xl font-bold uppercase tracking-widest transition-all ${view === `coach-${t}` ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800"}`}
                  >
                    {t === "stats" && <LayoutDashboard size={18} />}
                    {t === "report" && <FileText size={18} />}
                    {t === "check" && <ClipboardList size={18} />}
                    {t === "menu" && <Calendar size={18} />}
                    {t === "roster" && <Users size={18} />}
                    {t === "settings" && <Settings size={18} />}
                    {t}
                  </button>
                ),
              )}
            </nav>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-60 hover:opacity-100 flex items-center gap-2 font-bold text-sm"
          >
            <LogOut size={18} /> Logout
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-5 md:p-8 w-full max-w-md mx-auto md:max-w-none md:overflow-y-auto md:h-screen print:max-w-none print:p-0 print:w-full print:overflow-visible">
          {/* Mobile Navigation Tabs */}
          <div className="md:hidden flex bg-white p-1.5 rounded-[1.8rem] shadow-sm border border-slate-100 overflow-hidden print:hidden mb-6">
            {["stats", "report", "check", "menu", "roster", "settings"].map(
              (t) => (
                <button
                  key={t}
                  onClick={() => setView(`coach-${t}`)}
                  className={`flex-1 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${view === `coach-${t}` ? "bg-slate-950 text-white shadow-lg" : "text-slate-400"}`}
                >
                  {t.slice(0, 3)}
                </button>
              ),
            )}
          </div>

          {/* ... Period Selector ... */}
          <div className="mb-6 flex justify-end items-center gap-3 no-print">
            <span className="text-xs font-bold text-slate-400">Target:</span>
            {availablePeriods.length > 0 && selectedPeriod && (
              <select
                className="bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl px-4 py-2 outline-none shadow-sm focus:border-blue-500 cursor-pointer"
                value={selectedPeriod.id}
                onChange={(e) => {
                  const period = availablePeriods.find(
                    (p) => p.id === e.target.value,
                  );
                  if (period) setSelectedPeriod(period);
                }}
              >
                <optgroup
                  label="🚩 指定期間"
                  className="text-slate-900 font-bold bg-slate-100"
                >
                  {availablePeriods
                    .filter((p) => p.type === "global" || p.type === "custom")
                    .map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        className="text-slate-900 bg-white"
                      >
                        {/* ▼▼▼ 修正: 「月/日」の表示 ▼▼▼ */}
                        {p.name} ({p.start.slice(5).replace("-", "/")}~
                        {p.end.slice(5).replace("-", "/")})
                      </option>
                    ))}
                </optgroup>

                <optgroup label="📂 年度アーカイブ">
                  {availablePeriods
                    .filter((p) => p.type === "year")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>

                <optgroup label="📅 月次レポート">
                  {availablePeriods
                    .filter((p) => p.type === "month")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              </select>
            )}
          </div>

          {/* ... (Existing views: stats, report, check, menu, roster, settings) ... */}
          {(view === "coach-stats" || !view.startsWith("coach-")) && (
            <div className="space-y-6 animate-in fade-in">
              {/* ... stats content ... */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* ... existing summary cards ... */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border-l-8 border-slate-500">
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total Members
                  </p>
                  <p className="text-3xl md:text-4xl font-black text-slate-800">
                    {activeRunners.length}
                    <span className="text-xs ml-1">名</span>
                  </p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border-l-8 border-blue-500">
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    Today's Report
                  </p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl md:text-4xl font-black text-blue-600">
                      {coachStats.reportRate}
                    </p>
                    <span className="text-sm font-black text-slate-400">%</span>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border-l-8 border-emerald-500">
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    Total Distance
                  </p>
                  <p className="text-2xl md:text-3xl font-black text-emerald-600">
                    {(reportMatrix &&
                      reportMatrix.totals &&
                      reportMatrix.totals.grandTotal) ||
                      0}
                    <span className="text-xs ml-1 text-slate-400">km</span>
                  </p>
                </div>
                <div
                  // ★onClickを追加
                  onClick={() => {
                    if (coachStats.painAlertCount > 0) {
                      setIsPainAlertModalOpen(true);
                    }
                  }}
                  // ★カーソル(cursor-pointer)とホバー効果(active:scale-95)を追加
                  className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-8 transition-transform ${
                    coachStats.painAlertCount > 0
                      ? "border-rose-500 bg-rose-50 cursor-pointer active:scale-95 hover:shadow-md"
                      : "border-emerald-500"
                  }`}
                >
                  {/* タイトルに「一覧」というヒントを追加 */}
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">
                      Pain Alert
                    </p>
                    {coachStats.painAlertCount > 0 && (
                      <ChevronRight size={14} className="text-rose-400" />
                    )}
                  </div>
                  <p
                    className={`text-3xl md:text-4xl font-black ${coachStats.painAlertCount > 0 ? "text-rose-600" : "text-emerald-600"}`}
                  >
                    {coachStats.painAlertCount}
                    <span className="text-xs ml-1 text-slate-400">名</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm h-[28rem] flex flex-col">
                  {/* ... ranking chart ... */}
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                      <Trophy size={18} className="text-orange-500" /> Team
                      Ranking
                    </h3>
                    <button
                      onClick={exportCSV}
                      className="text-blue-600 p-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                  <div className="flex-1 w-full min-h-0 overflow-y-auto pr-2">
                    <div
                      style={{ height: Math.max(300, rankingData.length * 50) }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={rankingData}
                          layout="vertical"
                          margin={{ left: -10, right: 60 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                            stroke="#f1f5f9"
                          />
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="name"
                            type="category"
                            width={110}
                            tick={{
                              fontSize: 12,
                              fontWeight: "bold",
                              fill: "#1e293b",
                              interval: 0,
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            cursor={{ fill: "#f8fafc" }}
                            contentStyle={{
                              borderRadius: "12px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                              fontWeight: "bold",
                            }}
                          />
                          <Bar
                            dataKey="total"
                            radius={[0, 10, 10, 0]}
                            barSize={24}
                          >
                            {rankingData.map((_, i) => (
                              <Cell
                                key={i}
                                fill={
                                  i === 0
                                    ? "#0f172a"
                                    : i < 3
                                      ? "#3b82f6"
                                      : "#cbd5e1"
                                }
                              />
                            ))}
                            <LabelList
                              dataKey="total"
                              position="right"
                              formatter={(v) => `${v}km`}
                              style={{
                                fontSize: "11px",
                                fontWeight: "black",
                                fill: "#475569",
                              }}
                              offset={10}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100 h-[28rem] flex flex-col">
                  <div className="p-6 bg-slate-50 border-b flex items-center gap-2">
                    <Activity size={16} className="text-slate-400" />
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                      Recent Activity
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {allLogs
                      .filter((l) =>
                        activeRunners.some((r) => r.id === l.runnerId),
                      )
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 50)
                      .map((l) => (
                        <div
                          key={l.id}
                          className="p-4 mb-2 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors relative group"
                        >
                          <div className="absolute right-4 top-4 hidden group-hover:block">
                            <button
                              onClick={() => openCoachEditModal(l)}
                              className="bg-white border border-slate-200 p-2 rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-colors"
                              title="監督修正"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                          <div className="flex justify-between items-start mb-1 pr-10">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-2 h-2 rounded-full ${l.pain > 3 ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`}
                              ></div>
                              <span className="font-bold text-slate-700 text-sm">
                                {l.runnerName}
                              </span>
                            </div>
                            <span className="font-black text-blue-600">
                              {l.distance}km
                            </span>
                          </div>
                          {/* ★修正：日付・カテゴリの行 */}
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-5 mb-2">
                            {l.date.slice(5).replace("-", "/")} · {l.category}
                          </div>

                          {/* ★追加：コンディション（RPE・Pain）をバッジで目立たせる行 */}
                          <div className="flex gap-2 ml-5 mb-1">
                            {/* RPEバッジ */}
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-black ${
                                l.rpe >= 8
                                  ? "bg-rose-100 text-rose-600 border border-rose-200" // 高強度：赤
                                  : l.rpe >= 5
                                    ? "bg-orange-100 text-orange-600 border border-orange-200" // 中強度：オレンジ
                                    : "bg-blue-50 text-blue-600 border border-blue-100" // 低強度：青
                              }`}
                            >
                              RPE {l.rpe}
                            </span>

                            {/* Painバッジ（痛みがある場合のみ表示） */}
                            {l.pain > 1 && (
                              <span
                                className={`px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 ${
                                  l.pain >= 4
                                    ? "bg-purple-100 text-purple-600 border border-purple-200 animate-pulse" // 激痛：紫（点滅）
                                    : l.pain === 3
                                      ? "bg-rose-100 text-rose-600 border border-rose-200" // 痛みあり：赤
                                      : "bg-yellow-100 text-yellow-700 border border-yellow-200" // 違和感：黄色
                                }`}
                              >
                                <HeartPulse size={12} /> Pain {l.pain}
                              </span>
                            )}
                          </div>
                          {l.menuDetail && (
                            <p className="mt-2 ml-5 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                              "{l.menuDetail}"
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "coach-report" && (
            <>
              {/* ▼▼▼ 修正: 操作ボタンをレポートの外（上部）にまとめて配置 ▼▼▼ */}
              <div className="flex flex-wrap justify-end items-center mb-6 gap-3 px-2 no-print">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportMatrixCSV}
                    className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2 font-bold text-xs"
                  >
                    <FileSpreadsheet size={16} /> CSV出力
                  </button>
                  <button
                    onClick={handlePrint}
                    className="bg-slate-900 text-white px-4 py-2.5 rounded-xl hover:bg-slate-700 transition-colors shadow-md flex items-center gap-2 font-bold text-xs"
                  >
                    <Printer size={16} /> 印刷 / PDF
                  </button>
                </div>
                <div className="w-px h-8 bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setIsPrintPreview(!isPrintPreview)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
                    isPrintPreview
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {isPrintPreview ? <X size={16} /> : <Eye size={16} />}
                  {isPrintPreview ? "プレビューを閉じる" : "印刷レイアウト確認"}
                </button>
              </div>
              {/* ▲▲▲ 修正ここまで ▲▲▲ */}

              <div className={isPrintPreview ? "preview-mode-wrapper" : ""}>
                {isPrintPreview && (
                  <div className="flex justify-end mb-4 max-w-5xl mx-auto no-print">
                    <button
                      onClick={() => setIsPrintPreview(false)}
                      className="bg-white text-slate-800 px-6 py-3 rounded-full font-bold shadow-xl hover:bg-slate-100 transition-colors"
                    >
                      閉じる
                    </button>
                  </div>
                )}
                <style>{printStyles}</style>

                {/* ▼▼▼ レポート本編 ▼▼▼ */}
                <div
                  id="printable-report"
                  className={`${
                    isPrintPreview
                      ? "max-w-5xl mx-auto scale-100 origin-top"
                      : ""
                  }`}
                >
                  {/* 1. 学年ごとのテーブルエリア */}
                  {(() => {
                    const entranceYears = [
                      ...new Set(
                        activeRunners.map((r) =>
                          (r.memberCode || r.id).substring(0, 2),
                        ),
                      ),
                    ].sort();

                    return entranceYears.map((year, index) => {
                      const groupRunners = activeRunners
                        .filter((r) => (r.memberCode || r.id).startsWith(year))
                        .sort((a, b) =>
                          (a.memberCode || a.id).localeCompare(
                            b.memberCode || b.id,
                          ),
                        );

                      if (groupRunners.length === 0) return null;

                      // 最初の要素は改ページしない、それ以降は改ページ
                      const wrapperClass =
                        index === 0 ? "mb-8" : "page-break mb-8";

                      return (
                        <div key={year} className={wrapperClass}>
                          <div className="report-card-base">
                            <div className="pb-4 mb-4 border-b-2 border-slate-100 print:border-slate-800">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h2 className="font-black text-xl text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                                    <FileText
                                      className="text-blue-600 print:text-black"
                                      size={20}
                                    />
                                    KSWC EKIDEN REPORT
                                  </h2>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-slate-600 mt-1">
                                    Target Period: {targetPeriod.name} (
                                    {targetPeriod.start} - {targetPeriod.end})
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-black border border-slate-200 print:border-slate-400 print:bg-white print:text-black">
                                    <Users
                                      className="inline mr-1 -mt-0.5"
                                      size={12}
                                    />
                                    {year}年度生 (Grade {year})
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              style={{ overflow: "visible" }}
                              className={`pb-4 print:overflow-visible ${isPrintPreview ? "" : "overflow-x-auto"}`}
                            >
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr>
                                    <th className="p-3 border-b-2 border-slate-100 font-black text-left text-slate-400 min-w-[100px] sticky left-0 bg-white">
                                      DATE
                                    </th>
                                    {groupRunners.map((r) => (
                                      <th
                                        key={r.id}
                                        className="p-3 border-b-2 border-slate-100 font-bold text-slate-800 min-w-[80px] whitespace-nowrap text-center bg-slate-50/50"
                                      >
                                        {r.lastName} {r.firstName.charAt(0)}.
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {reportMatrix.matrix.map((row) => (
                                    <tr
                                      key={row.date}
                                      className="hover:bg-slate-50 transition-colors"
                                    >
                                      <td className="p-3 border-b border-slate-100 font-bold text-slate-500 whitespace-nowrap sticky left-0 bg-white">
                                        {row.date.slice(5).replace("-", "/")}
                                      </td>
                                      {groupRunners.map((r) => {
                                        const val = row[r.id];
                                        let cellClass =
                                          "p-2 border-b border-slate-100 text-center font-bold text-sm ";
                                        if (val === "未")
                                          cellClass +=
                                            "text-rose-400 bg-rose-50/30";
                                        else if (val === "休")
                                          cellClass +=
                                            "text-emerald-500 bg-emerald-50/30";
                                        else if (val === "0")
                                          cellClass += "text-slate-300";
                                        else cellClass += "text-blue-600";
                                        return (
                                          <td key={r.id} className={cellClass}>
                                            {val}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}

                                  {/* Q1-Q4 Total */}
                                  {targetPeriod.type === "custom" &&
                                    reportMatrix.qTotals.map((row, i) => (
                                      <tr
                                        key={`qtotal-${i}`}
                                        className="bg-slate-50 font-bold text-slate-600"
                                      >
                                        <td
                                          className="p-3 border-b border-slate-200 sticky left-0 bg-slate-50 whitespace-nowrap"
                                          style={{ minWidth: "80px" }}
                                        >
                                          Q{i + 1} Total
                                        </td>
                                        {groupRunners.map((r) => {
                                          const goalKey = `goalQ${i + 1}`;
                                          const goal = getGoalValue(
                                            r,
                                            targetPeriod.id,
                                            targetPeriod.type,
                                            goalKey,
                                          );
                                          return (
                                            <td
                                              key={r.id}
                                              className="p-3 text-center border-b border-slate-200"
                                            >
                                              <span style={{ fontSize: "1em" }}>
                                                {row[r.id] || 0}
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: "0.7em",
                                                  color: "#94a3b8",
                                                }}
                                              >
                                                {" "}
                                                / {goal}
                                              </span>
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    ))}

                                  {/* Total Row */}
                                  <tr className="bg-slate-100 font-black text-slate-800">
                                    <td className="p-3 sticky left-0 bg-slate-100 border-t-2 border-slate-300">
                                      TOTAL
                                    </td>
                                    {groupRunners.map((r) => (
                                      <td
                                        key={r.id}
                                        className="p-3 text-center text-blue-700 border-t-2 border-slate-300"
                                      >
                                        <span style={{ fontSize: "1.1em" }}>
                                          {reportMatrix.totals[r.id] || 0}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: "0.8em",
                                            color: "#64748b",
                                          }}
                                        >
                                          {" "}
                                          /{" "}
                                          {getGoalValue(
                                            r,
                                            targetPeriod.id,
                                            targetPeriod.type,
                                            "goalPeriod",
                                          )}
                                        </span>
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* 2. グラフエリア (改ページして全員分表示) */}
                  <div className="page-break">
                    <div className="report-card-base">
                      <div className="pb-4 mb-4 border-b border-slate-100 print:border-slate-800">
                        <h2 className="font-black text-xl text-slate-800 flex items-center gap-2 uppercase tracking-tighter">
                          <BarChart2
                            className="text-blue-600 print:text-black"
                            size={20}
                          />
                          TEAM ANALYTICS (ALL MEMBERS)
                        </h2>
                      </div>

                      {/* ① 折れ線グラフ */}
                      <div className="mt-4">
                        <h3 className="font-black text-sm uppercase tracking-widest mb-6 text-center text-slate-700">
                          Cumulative Distance Trends
                        </h3>
                        <div style={{ width: "100%", height: "300px" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={cumulativeData}
                              margin={{
                                top: 10,
                                right: 50,
                                left: 0,
                                bottom: 0,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#f1f5f9"
                              />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} width={30} />
                              <Tooltip />
                              <Legend />
                              {[...activeRunners]
                                .sort((a, b) =>
                                  (a.memberCode || a.id).localeCompare(
                                    b.memberCode || b.id,
                                  ),
                                )
                                .map((r, i) => (
                                  <Line
                                    key={r.id}
                                    type="monotone"
                                    dataKey={r.id}
                                    name={`${r.lastName} ${r.firstName}`}
                                    stroke={COLORS[i % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 6 }}
                                  />
                                ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* ② 棒グラフ (Total) */}
                    <div className="report-card-base">
                      <h3 className="font-black text-sm uppercase tracking-widest mb-6 text-center text-slate-700">
                        Total Distance Ranking
                      </h3>
                      <div style={{ width: "100%", height: "400px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={reportChartData}
                            layout="horizontal"
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 60,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#e2e8f0"
                            />
                            <XAxis
                              dataKey="name"
                              tick={{
                                fontSize: 10,
                                fill: "#64748b",
                                fontWeight: "bold",
                              }}
                              angle={-45}
                              textAnchor="end"
                              interval={0}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#64748b" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: "#f1f5f9" }}
                              contentStyle={{
                                borderRadius: "12px",
                                border: "none",
                                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                              }}
                            />
                            <Bar
                              dataKey="total"
                              name="Total"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                              barSize={activeRunners.length > 15 ? 15 : 30}
                            >
                              <LabelList
                                dataKey="total"
                                position="top"
                                formatter={(val) => (val > 0 ? val : "")}
                                style={{
                                  fontSize: "10px",
                                  fill: "#64748b",
                                  fontWeight: "bold",
                                }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {view === "coach-check" && (
            // ... (Check view remains same) ...
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
              {/* ... (existing content) ... */}
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Status Check
              </h3>
              {/* ... (content) ... */}
              <div className="flex flex-col md:flex-row items-center justify-center mb-6 gap-6">
                <input
                  type="date"
                  className="p-3 bg-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <div className="bg-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center px-8">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      提出率
                    </span>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-blue-600">
                        {checkListData.length > 0
                          ? Math.round(
                              (checkListData.filter(
                                (r) => r.status !== "unsubmitted",
                              ).length /
                                checkListData.length) *
                                100,
                            )
                          : 0}
                      </span>
                      <span className="text-xs font-bold text-slate-400 mb-1">
                        %
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center px-8">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      提出済
                    </span>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-black text-emerald-600">
                        {
                          checkListData.filter(
                            (r) => r.status !== "unsubmitted",
                          ).length
                        }
                      </span>
                      <span className="text-xs font-bold text-slate-400 mb-1">
                        / {checkListData.length}名
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-slate-100 grid md:grid-cols-2 gap-x-12 gap-y-2">
                {checkListData.map((r) => (
                  <div
                    key={r.id}
                    className="py-4 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${r.status === "active" ? "bg-blue-500" : r.status === "rest" ? "bg-emerald-400" : "bg-rose-400"}`}
                      >
                        {r.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          {r.lastName} {r.firstName}
                        </p>
                      </div>
                    </div>
                    <div>
                      {r.status === "active" && (
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                          <Check size={12} /> {r.detail}
                        </span>
                      )}
                      {r.status === "rest" && (
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                          {r.detail}
                        </span>
                      )}
                      {r.status === "unsubmitted" && (
                        <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                          <AlertTriangle size={12} /> 未提出
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === "coach-menu" && (
            // ... (Menu view remains same) ...
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400">
                Board Update
              </h3>
              <div className="space-y-4 max-w-2xl mx-auto">
                <input
                  type="date"
                  className="w-full p-5 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-blue-500 font-black text-sm"
                  value={menuInput.date}
                  onChange={(e) =>
                    setMenuInput({ ...menuInput, date: e.target.value })
                  }
                />
                <textarea
                  placeholder="指示を入力..."
                  className="w-full p-6 bg-slate-50 rounded-[2.5rem] h-64 outline-none font-bold text-slate-700 border-2 border-transparent focus:border-blue-500 text-lg leading-relaxed shadow-inner resize-none"
                  value={menuInput.text}
                  onChange={(e) =>
                    setMenuInput({ ...menuInput, text: e.target.value })
                  }
                />
                <button
                  onClick={async () => {
                    await setDoc(
                      doc(
                        db,
                        "artifacts",
                        appId,
                        "public",
                        "data",
                        "menus",
                        menuInput.date,
                      ),
                      menuInput,
                    );
                    setSuccessMsg("掲示しました");
                    setTimeout(() => setSuccessMsg(""), 2000);
                  }}
                  className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black shadow-xl active:scale-95 transition-all"
                >
                  掲示板を更新
                </button>
              </div>
            </div>
          )}

          {view === "coach-roster" && (
            // ... (Roster view remains same) ...
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in fade-in">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Team Roster
              </h3>
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                  <UserCheck size={16} /> Active Members ({activeRunners.length}
                  )
                </h4>
                <div className="divide-y divide-slate-100 grid md:grid-cols-2 gap-x-12 gap-y-0">
                  {activeRunners.map((r) => (
                    <div
                      key={r.id}
                      className="py-4 flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-colors rounded-xl px-2"
                      onClick={() => handleCoachEditRunner(r)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center font-black text-blue-600">
                          {r.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {r.lastName} {r.firstName}
                          </p>
                          {/* ▼ 追加: IDとPINを並べて表示 */}
                          <div className="flex items-center gap-2 mt-0.5 mb-0.5">
                            <span className="text-[10px] font-mono font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              ID: {r.memberCode || "-"}
                            </span>
                            <span className="text-[10px] text-slate-300 font-mono">
                              PIN: {r.pin || "----"}
                            </span>
                          </div>
                          {/* ▲ ここまで */}
                          <p className="text-[10px] text-slate-400 font-bold">
                            Goal: {r.goalMonthly}km/mo
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartPreview(r);
                          }}
                          className="text-slate-400 hover:text-blue-600 p-2 rounded-lg bg-slate-50 transition-colors"
                          title="本人視点でプレビュー"
                        >
                          <Eye size={18} />
                        </button>
                        <ChevronRight className="text-slate-300" size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4 pt-8 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                  <Archive size={16} /> Retired / Inactive
                </h4>
                <div className="divide-y divide-slate-100 opacity-60 hover:opacity-100 transition-opacity grid md:grid-cols-2 gap-x-12 gap-y-0">
                  {allRunners
                    .filter((r) => r.status === "retired")
                    .map((r) => (
                      <div
                        key={r.id}
                        className="py-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 grayscale">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                            {r.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-600">
                              {r.lastName} {r.firstName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              Retired
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                message: `${r.lastName}選手を現役復帰させますか？`,
                                onConfirm: async () => {
                                  await updateDoc(
                                    doc(
                                      db,
                                      "artifacts",
                                      appId,
                                      "public",
                                      "data",
                                      "runners",
                                      r.id,
                                    ),
                                    { status: "active" },
                                  );
                                  setConfirmDialog({
                                    isOpen: false,
                                    message: "",
                                    onConfirm: null,
                                  });
                                },
                              })
                            }
                            className="bg-emerald-50 text-emerald-600 p-2 rounded-xl hover:bg-emerald-100 transition-colors"
                            title="現役復帰"
                          >
                            <UserCheck size={18} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmDialog({
                                isOpen: true,
                                message: `警告: ${r.lastName}選手のデータを完全に削除します。元に戻せません。よろしいですか？`,
                                onConfirm: async () => {
                                  await deleteDoc(
                                    doc(
                                      db,
                                      "artifacts",
                                      appId,
                                      "public",
                                      "data",
                                      "runners",
                                      r.id,
                                    ),
                                  );
                                  setConfirmDialog({
                                    isOpen: false,
                                    message: "",
                                    onConfirm: null,
                                  });
                                },
                              })
                            }
                            className="bg-rose-50 text-rose-600 p-2 rounded-xl hover:bg-rose-100 transition-colors"
                            title="完全削除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  {allRunners.filter((r) => r.status === "retired").length ===
                    0 && (
                    <p className="text-center text-xs text-slate-300 py-2">
                      引退した選手はいません
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Coach Runner Detail View (With Goal Editing) */}
          {view === "coach-runner-detail" && selectedRunner && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in slide-in-from-right-10 max-w-2xl mx-auto">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Athlete Detail
              </h3>

              {/* Profile Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">
                      Last Name
                    </label>
                    <input
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none"
                      value={coachEditFormData.lastName}
                      onChange={(e) =>
                        setCoachEditFormData({
                          ...coachEditFormData,
                          lastName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">
                      First Name
                    </label>
                    <input
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none"
                      value={coachEditFormData.firstName}
                      onChange={(e) =>
                        setCoachEditFormData({
                          ...coachEditFormData,
                          firstName: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">
                    Login PIN
                  </label>
                  <input
                    type="tel"
                    maxLength={4}
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none"
                    value={coachEditFormData.pin}
                    onChange={(e) =>
                      setCoachEditFormData({
                        ...coachEditFormData,
                        pin: e.target.value,
                      })
                    }
                  />
                </div>
                <button
                  onClick={handleCoachSaveProfile}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all"
                >
                  プロフィール更新
                </button>
              </div>

              {/* Goal Management Section (NEW) */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                    <Target size={16} /> Goal Management
                  </h4>
                  {/* FIX: 詳細画面で期間を切り替えられるように変更 */}
                  <select
                    className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg px-2 py-1 outline-none focus:border-blue-500"
                    value={selectedPeriod?.id || ""}
                    onChange={(e) => {
                      const period = availablePeriods.find(
                        (p) => p.id === e.target.value,
                      );
                      if (period) setSelectedPeriod(period);
                    }}
                  >
                    {availablePeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  {/* Monthly Goal (Always visible) */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Monthly Goal (Global)
                    </label>
                    <input
                      type="number"
                      placeholder="例: 200"
                      className="w-full p-3 bg-white rounded-xl font-black text-blue-600 outline-none border border-slate-200 focus:border-blue-400"
                      value={coachGoalInput.monthly || ""}
                      onChange={(e) =>
                        setCoachGoalInput({
                          ...coachGoalInput,
                          monthly: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Period Total (If not Month type) */}
                  {targetPeriod.type !== "month" && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Total Goal ({targetPeriod.name})
                      </label>
                      <input
                        type="number"
                        placeholder="例: 1000"
                        className="w-full p-3 bg-white rounded-xl font-black text-emerald-600 outline-none border border-slate-200 focus:border-emerald-400"
                        value={coachGoalInput.period || ""}
                        onChange={(e) =>
                          setCoachGoalInput({
                            ...coachGoalInput,
                            period: e.target.value,
                          })
                        }
                      />
                    </div>
                  )}

                  {/* Quarters (If Custom or Global) */}
                  {(targetPeriod.type === "custom" ||
                    targetPeriod.type === "global") &&
                    activeQuarters.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        {activeQuarters.map((q, idx) => (
                          <div key={idx} className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                              Q{idx + 1} Goal
                            </label>
                            <input
                              type="number"
                              className="w-full p-2 bg-white rounded-lg font-bold text-slate-700 outline-none border border-slate-200 focus:border-emerald-400 text-sm"
                              value={coachGoalInput[`q${idx + 1}`] || ""}
                              onChange={(e) =>
                                setCoachGoalInput({
                                  ...coachGoalInput,
                                  [`q${idx + 1}`]: e.target.value,
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}

                  <button
                    onClick={handleCoachSaveGoals}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all mt-2"
                  >
                    目標値を保存
                  </button>
                </div>
              </div>

              {/* Recent Logs Section */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                  <FileText size={16} /> Recent Logs
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {allLogs
                    .filter((l) => l.runnerId === selectedRunner.id)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 30)
                    .map((l) => (
                      <div
                        key={l.id}
                        className="bg-slate-50 p-3 rounded-xl flex justify-between items-start group relative hover:border hover:border-blue-200 border border-transparent transition-all"
                      >
                        <div className="w-full">
                          {/* 1行目: 日付とカテゴリ */}
                          <div className="flex justify-between items-center pr-2">
                            <p className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                              {l.date.slice(5).replace("-", "/")}{" "}
                              <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-600 text-[9px]">
                                {l.category}
                              </span>
                            </p>
                            {/* 距離を右側に配置 */}
                            <p className="text-sm font-black text-blue-600">
                              {l.distance}km
                            </p>
                          </div>

                          {/* 2行目: RPEとPainのバッジ（ここを追加） */}
                          <div className="flex gap-2 mt-2 mb-2">
                            {/* RPEバッジ */}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${
                                l.rpe >= 8
                                  ? "bg-rose-100 text-rose-600 border-rose-200"
                                  : l.rpe >= 5
                                    ? "bg-orange-100 text-orange-600 border-orange-200"
                                    : "bg-blue-50 text-blue-600 border-blue-100"
                              }`}
                            >
                              RPE {l.rpe}
                            </span>

                            {/* Painバッジ（痛みがある時のみ） */}
                            {l.pain > 1 && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black border flex items-center gap-1 ${
                                  l.pain >= 4
                                    ? "bg-purple-100 text-purple-600 border-purple-200 animate-pulse"
                                    : l.pain === 3
                                      ? "bg-rose-100 text-rose-600 border-rose-200"
                                      : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                }`}
                              >
                                <HeartPulse size={10} /> Pain {l.pain}
                              </span>
                            )}
                          </div>

                          {/* 3行目: コメント */}
                          {l.menuDetail && (
                            <p className="text-[10px] text-slate-500 bg-white/60 p-1.5 rounded-lg leading-relaxed">
                              {l.menuDetail}
                            </p>
                          )}
                        </div>

                        {/* 修正ボタン（絶対配置に変更して右上に固定） */}
                        <button
                          onClick={() => openCoachEditModal(l)}
                          className="absolute right-2 top-2 bg-white p-1.5 rounded-lg text-slate-300 hover:text-blue-600 shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="修正する"
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    ))}
                  {allLogs.filter((l) => l.runnerId === selectedRunner.id)
                    .length === 0 && (
                    <p className="text-center text-xs text-slate-300">
                      記録がありません
                    </p>
                  )}
                </div>
              </div>

              {/* Feedback Section */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                  <MessageSquare size={16} /> Feedback for {targetPeriod.name}
                </h4>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-2 flex items-center gap-1">
                    <User size={10} /> Runner's Comment
                  </p>
                  <p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">
                    {getRunnerFeedback(selectedRunner.id)?.runnerComment ||
                      "（未入力）"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[9px] text-slate-400 font-bold uppercase ml-2 flex items-center gap-1">
                    <Edit size={10} /> Coach Comment
                  </p>
                  <textarea
                    className="w-full p-4 bg-blue-50 rounded-2xl text-sm font-bold text-slate-700 min-h-[100px] outline-none focus:ring-2 ring-blue-200 border border-blue-100"
                    placeholder="フィードバックを入力..."
                    defaultValue={
                      getRunnerFeedback(selectedRunner.id)?.coachComment || ""
                    }
                    onChange={(e) => setCoachFeedbackComment(e.target.value)}
                  />
                  <button
                    onClick={() => handleSaveCoachFeedback(selectedRunner.id)}
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md active:scale-95"
                  >
                    フィードバック送信
                  </button>
                </div>
              </div>

              {/* Status Management */}
              <div className="border-t border-slate-100 pt-8 mt-4 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                  <Settings size={16} /> Status Management
                </h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-500 font-bold">
                    この選手が部を離れる場合、または引退する場合はこちらからステータスを変更してください。データは保持されます。
                  </p>
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        message: `${selectedRunner.lastName}選手を引退(アーカイブ)扱いにしますか？\n(現役リストから外れ、引退リストに移動します)`,
                        onConfirm: async () => {
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
                              status: "retired",
                            },
                          );
                          setConfirmDialog({
                            isOpen: false,
                            message: "",
                            onConfirm: null,
                          });
                          setView("coach-roster");
                        },
                      });
                    }}
                    className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <UserMinus size={16} /> 引退・登録解除 (アーカイブ)
                  </button>
                </div>
              </div>

              <button
                onClick={() => setView("coach-roster")}
                className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest"
              >
                一覧に戻る
              </button>
            </div>
          )}

          {/* ... Coach Settings ... */}
          {view === "coach-settings" && (
            // ... (Settings view remains same) ...
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in slide-in-from-right-5 max-w-2xl mx-auto">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Settings
              </h3>
              {/* ... (Settings content) ... */}
              <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                  <RotateCcw size={16} /> Default Display Period
                </h4>
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold">
                    ログイン後に最初に表示される期間を選択してください。
                  </p>
                  <select
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold bg-white"
                    value={appSettings.defaultPeriodId || "dynamic_current"}
                    onChange={handleSaveDefaultPeriod}
                  >
                    <option value="dynamic_current">
                      常に「今月」を表示 (Auto Current Month)
                    </option>
                    {availablePeriods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.start && p.end
                          ? ` (${p.start.slice(5).replace("-", "/")}～${p.end.slice(5).replace("-", "/")})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* カスタム期間の追加・削除UI */}
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                  <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                    <Calendar size={16} />{" "}
                    {editingPeriodId ? "Edit Period" : "Add Custom Period"}
                  </h4>
                  {/* ... Period inputs ... */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="期間名 (例: 夏合宿)"
                        className="p-3 rounded-xl border border-slate-200 text-sm font-bold w-full"
                        value={newPeriodInput.name}
                        onChange={(e) =>
                          updateNewPeriodInputWithAutoQuarters(
                            "name",
                            e.target.value,
                          )
                        }
                      />
                      <input
                        type="date"
                        className="p-3 rounded-xl border border-slate-200 text-sm font-bold w-full"
                        value={newPeriodInput.start}
                        onChange={(e) =>
                          updateNewPeriodInputWithAutoQuarters(
                            "start",
                            e.target.value,
                          )
                        }
                      />
                      <input
                        type="date"
                        className="p-3 rounded-xl border border-slate-200 text-sm font-bold w-full"
                        value={newPeriodInput.end}
                        onChange={(e) =>
                          updateNewPeriodInputWithAutoQuarters(
                            "end",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    {/* Q1-Q4 詳細設定 */}
                    {newPeriodInput.start && newPeriodInput.end && (
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 mt-2 animate-in fade-in">
                        <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                          Quarter Details (Auto-calculated, Edit if needed)
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {newPeriodInput.quarters.map((q, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-black w-8 text-slate-500">
                                Q{idx + 1}
                              </span>
                              <input
                                type="date"
                                className="p-2 rounded-lg border border-slate-100 text-xs font-bold w-full"
                                value={q.start}
                                onChange={(e) =>
                                  handleNewPeriodQuarterChange(
                                    idx,
                                    "start",
                                    e.target.value,
                                  )
                                }
                              />
                              <span className="text-slate-300">-</span>
                              <input
                                type="date"
                                className="p-2 rounded-lg border border-slate-100 text-xs font-bold w-full"
                                value={q.end}
                                onChange={(e) =>
                                  handleNewPeriodQuarterChange(
                                    idx,
                                    "end",
                                    e.target.value,
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {editingPeriodId && (
                        <button
                          onClick={handleCancelEdit}
                          className="w-1/3 py-3 bg-slate-200 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-300 transition-colors"
                        >
                          キャンセル
                        </button>
                      )}
                      <button
                        onClick={handleSaveCustomPeriod}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-blue-700 transition-colors"
                      >
                        {editingPeriodId ? "更新する" : "追加する"}
                      </button>
                    </div>
                  </div>

                  {/* 登録済みリスト */}
                  <div className="space-y-2 mt-6 pt-4 border-t border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Existing Periods
                    </p>
                    {appSettings.customPeriods &&
                      appSettings.customPeriods.map((p) => (
                        <div
                          key={p.id}
                          className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-slate-100"
                        >
                          <div>
                            <p className="font-bold text-sm text-slate-700">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {p.start} ~ {p.end}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCustomPeriod(p)}
                              className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCustomPeriod(p.id)}
                              className="p-2 bg-rose-50 rounded-lg text-rose-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    {(!appSettings.customPeriods ||
                      appSettings.customPeriods.length === 0) && (
                      <p className="text-center text-xs text-slate-300 py-2">
                        期間はまだありません
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                    Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    className="w-full p-5 bg-slate-50 rounded-2xl font-black text-4xl text-center outline-none border-2 border-transparent focus:border-blue-500 font-mono tracking-[0.5em]"
                    value={appSettings.coachPass}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        coachPass: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-emerald-500 uppercase ml-3 tracking-widest">
                    Team Join Passcode
                  </label>
                  <input
                    type="text"
                    className="w-full p-5 bg-slate-50 rounded-2xl font-black text-2xl text-center outline-none border-2 border-transparent focus:border-emerald-500 tracking-widest text-emerald-600"
                    value={appSettings.teamPass}
                    onChange={(e) =>
                      setAppSettings({
                        ...appSettings,
                        teamPass: e.target.value,
                      })
                    }
                  />
                </div>
                {/* ... Default period setting ... */}
                <div className="space-y-2 opacity-50 hover:opacity-100 transition-opacity">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-widest">
                    Global Default Period (Legacy)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black"
                      value={appSettings.startDate}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          startDate: e.target.value,
                        })
                      }
                    />
                    <input
                      type="date"
                      className="w-full p-4 bg-slate-50 rounded-2xl text-[10px] font-black"
                      value={appSettings.endDate}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDoc(
                      doc(
                        db,
                        "artifacts",
                        appId,
                        "public",
                        "data",
                        "settings",
                        "global",
                      ),
                      appSettings,
                    );
                    setSuccessMsg("保存しました");
                    setTimeout(() => setSuccessMsg(""), 2000);
                  }}
                  className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black shadow-xl active:scale-95"
                >
                  設定保存
                </button>
              </div>
            </div>
          )}

          {/* Coach Edit Log Modal (Already implemented) */}
          {isCoachEditModalOpen && (
            // ... (Modal code remains same) ...
            <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
                <h3 className="font-black text-lg text-slate-700 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Edit className="text-blue-600" size={20} /> 記録の修正 (監督)
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">
                        日付
                      </label>
                      <input
                        type="date"
                        className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm"
                        value={formData.date}
                        onChange={(e) =>
                          setFormData({ ...formData, date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">
                        距離(km)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm"
                        value={formData.distance}
                        onChange={(e) =>
                          setFormData({ ...formData, distance: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400">
                      メニュー
                    </label>
                    <textarea
                      className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm h-16 resize-none"
                      value={formData.menuDetail}
                      onChange={(e) =>
                        setFormData({ ...formData, menuDetail: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">
                        RPE
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm"
                        value={formData.rpe}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            // 空文字の時はそのまま、それ以外は数値化
                            rpe:
                              e.target.value === ""
                                ? ""
                                : parseInt(e.target.value, 10),
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400">
                        Pain
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        className="w-full p-2 bg-slate-50 rounded-lg font-bold text-sm"
                        value={formData.pain}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            // 空文字の時はそのまま、それ以外は数値化
                            rpe:
                              e.target.value === ""
                                ? ""
                                : parseInt(e.target.value, 10),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                {/* ▼▼▼ 修正: ボタンエリアに削除ボタンを追加 ▼▼▼ */}
                <div className="flex gap-2 pt-4 border-t border-slate-100 mt-2">
                  {/* 1. 削除ボタン (赤) */}
                  <button
                    onClick={handleCoachDeleteLog}
                    className="p-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors"
                    title="この記録を削除"
                  >
                    <Trash2 size={18} />
                  </button>

                  {/* 2. キャンセルボタン */}
                  <button
                    onClick={() => {
                      setIsCoachEditModalOpen(false);
                      setEditingLogId(null);
                      resetForm();
                    }}
                    className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
                  >
                    キャンセル
                  </button>

                  {/* 3. 更新ボタン (青) */}
                  <button
                    onClick={handleCoachUpdateLog}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-blue-700 transition-colors"
                  >
                    更新して保存
                  </button>
                </div>
                {/* ▲▲▲ 修正ここまで ▲▲▲ */}
              </div>
            </div>
          )}

          {/* ▼▼▼ 追加: Pain Alert List Modal ▼▼▼ */}
          {isPainAlertModalOpen && (
            <div
              className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
              onClick={() => setIsPainAlertModalOpen(false)}
            >
              <div
                className="bg-white w-full max-w-md rounded-[2.5rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-black text-lg text-rose-600 flex items-center gap-2">
                    <AlertTriangle size={20} /> Pain Alert List
                  </h3>
                  <button
                    onClick={() => setIsPainAlertModalOpen(false)}
                    className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                  {activeRunners
                    .map((runner) => {
                      // 各選手の最新ログを取得して判定
                      const runnerLogs = allLogs
                        .filter((l) => l.runnerId === runner.id)
                        .sort((a, b) => new Date(b.date) - new Date(a.date));

                      if (runnerLogs.length === 0) return null;
                      const latestLog = runnerLogs[0];

                      // 痛みが3以上の場合のみ表示対象とする
                      if (latestLog.pain < 3) return null;

                      return { runner, log: latestLog };
                    })
                    .filter(Boolean) // nullを除去
                    // 痛みが強い順に並べ替え
                    .sort((a, b) => b.log.pain - a.log.pain)
                    .map(({ runner, log }) => (
                      <div
                        key={runner.id}
                        className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-rose-500 shadow-sm text-sm">
                              {runner.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-sm">
                                {runner.lastName} {runner.firstName}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400">
                                {log.date.slice(5).replace("-", "/")}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${
                              log.pain >= 4
                                ? "bg-rose-600 text-white animate-pulse"
                                : "bg-white text-rose-500 border border-rose-200"
                            }`}
                          >
                            <HeartPulse size={14} /> Pain {log.pain}
                          </span>
                        </div>

                        {/* メニュー詳細（痛みの原因や状況）を表示 */}
                        <div className="bg-white/60 p-2 rounded-xl mt-1">
                          <p className="text-xs text-slate-600 font-bold">
                            {log.category}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {log.menuDetail || "（コメントなし）"}
                          </p>
                        </div>

                        {/* 監督用の「詳細へ」ボタン */}
                        <button
                          onClick={() => {
                            setIsPainAlertModalOpen(false);
                            handleCoachEditRunner(runner); // その選手の詳細画面へ移動
                          }}
                          className="text-[10px] font-bold text-rose-400 text-right hover:text-rose-600 flex items-center justify-end gap-1 mt-1"
                        >
                          詳細・連絡する <ChevronRight size={12} />
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ... (Confirm dialog remains same) ... */}
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs w-full animate-in zoom-in-95">
              <p className="font-bold text-slate-800 mb-6 text-center leading-relaxed text-sm">
                {confirmDialog.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setConfirmDialog({ ...confirmDialog, isOpen: false })
                  }
                  className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 text-sm"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default App;
