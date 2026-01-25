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
} from "lucide-react";

// --- App Version ---
const APP_LAST_UPDATED = "2026.01.24 12:55 (Fix handleStartPreview)";

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
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];

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
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    name: `${year}年`,
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

// --- Print Styles ---
const printStyles = `
  .report-card-base { background: white; padding: 20px; border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 20px; width: 100%; }
  .report-chart-container { height: 400px; width: 100%; overflow-x: auto; display: block; }
  .preview-mode-wrapper { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: #525659; z-index: 9999; overflow-y: auto; padding: 20px; display: block; }
  .preview-mode-wrapper .report-card-base { width: 297mm; height: 210mm; padding: 10mm; margin: 0 auto 30px auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border-radius: 0; box-sizing: border-box; position: relative; overflow: hidden; page-break-after: always; display: flex; flex-direction: column; }
  .preview-mode-wrapper .report-chart-container { overflow: hidden !important; flex: 1; width: 100% !important; display: flex; align-items: center; }
  .preview-mode-wrapper table { width: 100% !important; table-layout: fixed !important; font-size: 8px !important; }
  .preview-mode-wrapper th, .preview-mode-wrapper td { padding: 2px !important; word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; border: 1px solid #ccc !important; }
  .preview-mode-wrapper th:first-child, .preview-mode-wrapper td:first-child { width: 80px !important; white-space: nowrap !important; }
  @media print {
    @page { size: A4 landscape; margin: 0; }
    body { background-color: white !important; -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
    .no-print, header, nav, .fixed-ui, .coach-menu-bar { display: none !important; }
    .preview-mode-wrapper { position: static; background: white; padding: 0; overflow: visible; z-index: auto; display: block !important; }
    .report-card-base { width: 100% !important; height: 100vh !important; min-height: 0 !important; box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; padding: 10mm !important; page-break-after: always; page-break-inside: avoid; box-sizing: border-box; display: flex; flex-direction: column; }
    .report-card-base:last-child { page-break-after: auto; }
    .report-chart-container { overflow: visible !important; width: 100% !important; flex: 1; min-height: 150mm !important; display: block !important; }
    .chart-inner-wrapper { width: 100% !important; height: 100% !important; }
    .recharts-responsive-container { width: 100% !important; height: 100% !important; }
    table { width: 100% !important; font-size: 8px !important; table-layout: fixed !important; }
    th, td { padding: 2px !important; border: 1px solid #94a3b8 !important; white-space: normal !important; word-wrap: break-word !important; overflow: hidden; }
    th:first-child, td:first-child { width: 80px !important; white-space: nowrap !important; }
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

  const [selectedRunner, setSelectedRunner] = useState(null);
  const [coachEditFormData, setCoachEditFormData] = useState({});
  const [previewRunner, setPreviewRunner] = useState(null);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [checkDate, setCheckDate] = useState(getTodayStr());

  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [isPeriodInitialized, setIsPeriodInitialized] = useState(false);

  const [reviewComment, setReviewComment] = useState("");
  const [coachFeedbackComment, setCoachFeedbackComment] = useState("");

  const [formData, setFormData] = useState({
    date: getTodayStr(),
    distance: "",
    category: "午後練",
    menuDetail: "",
    rpe: 5,
    pain: 1,
    achieved: true,
    lastName: "",
    firstName: "",
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
          const today = getTodayStr();
          setDoc(settingsDoc, {
            coachPass: "1234",
            teamPass: "run2025",
            startDate: today,
            endDate: today,
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
      const myP = list.find((r) => r.id === user.uid);
      if (myP) {
        setProfile(myP);
        if (role !== "coach" && role !== "admin-runner") setRole("runner");
      } else {
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

  // 3. Derived Data
  const currentUserId = previewRunner ? previewRunner.id : user?.uid;
  const currentProfile = previewRunner || profile;

  const availablePeriods = useMemo(() => {
    const periods = [];
    const globalStart = appSettings.startDate || "2000-01-01";
    const globalEnd = appSettings.endDate || "2100-12-31";
    periods.push({
      id: "global_period",
      name: "全期間 (通年設定)",
      start: globalStart,
      end: globalEnd,
      quarters: appSettings.quarters || [],
      type: "global",
    });
    if (appSettings.customPeriods && appSettings.customPeriods.length > 0) {
      appSettings.customPeriods.forEach((p) => {
        periods.push({ ...p, type: "custom" });
      });
    }
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
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 3; i++) {
      const y = currentYear - i;
      const yRange = getYearRange(y);
      periods.push({
        id: `year_${y}`,
        name: yRange.name,
        start: yRange.start,
        end: yRange.end,
        type: "year",
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
      if (!target)
        target = availablePeriods.find((p) => p.id === "global_period");
      if (!target) target = availablePeriods[0];

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

  const reportDates = useMemo(() => {
    return getDatesInRange(targetPeriod.start, targetPeriod.end);
  }, [targetPeriod]);

  const reportMatrix = useMemo(() => {
    const runnerIds = activeRunners.map((r) => r.id);
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
      const log = allLogs.find(
        (l) => l.runnerId === runner.id && l.date === checkDate,
      );
      let status = "unsubmitted";
      let detail = "-";
      if (log) {
        if (log.category === "完全休養" || Number(log.distance) === 0) {
          status = "rest";
          detail = "休み";
        } else {
          status = "active";
          detail = `${log.distance}km`;
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

  // 4. Handlers (ALL DEFINED HERE AT TOP LEVEL)
  const handleRegister = async () => {
    setErrorMsg("");
    if (!formData.lastName.trim() || !formData.firstName.trim()) return;
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
      const runnersRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "runners",
      );
      const currentDocSnap = await getDoc(doc(runnersRef, user.uid));
      if (currentDocSnap.exists()) {
        const currentData = currentDocSnap.data();
        if (
          currentData.lastName !== formData.lastName.trim() ||
          currentData.firstName !== formData.firstName.trim()
        ) {
          setErrorMsg(
            "前の利用者のデータが残っています。再読み込みしてください。",
          );
          await signOut(auth);
          return;
        }
      }
      const q = query(
        runnersRef,
        where("lastName", "==", formData.lastName.trim()),
        where("firstName", "==", formData.firstName.trim()),
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setErrorMsg(
          "すでに登録があります。「2回目以降」からログインしてください。",
        );
        setIsSubmitting(false);
        return;
      }
      const isPinTaken = allRunners.some(
        (r) => r.status !== "retired" && r.pin === formData.personalPin,
      );
      if (isPinTaken) {
        setErrorMsg("そのパスコードは使用されています。");
        setIsSubmitting(false);
        return;
      }
      const newProfile = {
        lastName: formData.lastName.trim(),
        firstName: formData.firstName.trim(),
        goalMonthly: 0,
        goalPeriod: 200,
        status: "active",
        pin: formData.personalPin,
        registeredAt: new Date().toISOString(),
      };
      await setDoc(doc(runnersRef, user.uid), newProfile);
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
    if (formData.lastName.trim() === "admin") {
      setIsSubmitting(true);
      try {
        const adminProfile = {
          lastName: "admin",
          firstName: formData.firstName || "User",
          goalMonthly: 0,
          goalPeriod: 0,
          status: "active",
          pin: formData.personalPin || "0000",
          registeredAt: new Date().toISOString(),
          id: "admin_temp_id",
        };
        setProfile(adminProfile);
        setRole("admin-runner");
        setView("menu");
        setSuccessMsg("管理者モード");
        setTimeout(() => setSuccessMsg(""), 3000);
      } catch (e) {
        setErrorMsg("エラー: " + e.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    if (!formData.lastName.trim() || !formData.firstName.trim()) return;
    if (!formData.personalPin) {
      setErrorMsg("パスコードを入力してください。");
      return;
    }
    setIsSubmitting(true);
    try {
      const runnersRef = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "runners",
      );
      const q = query(
        runnersRef,
        where("lastName", "==", formData.lastName.trim()),
        where("firstName", "==", formData.firstName.trim()),
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setErrorMsg("データが見つかりません。");
        setIsSubmitting(false);
        return;
      }
      const targetDoc =
        querySnapshot.docs.find((d) => d.id === user.uid) ||
        querySnapshot.docs[0];
      const oldProfile = targetDoc.data();
      const oldId = targetDoc.id;
      if (oldProfile.pin && oldProfile.pin !== formData.personalPin) {
        setErrorMsg("パスコードが違います。");
        setIsSubmitting(false);
        return;
      }
      if (oldId !== user.uid) {
        await setDoc(doc(runnersRef, user.uid), {
          ...oldProfile,
          status: "active",
          pin: oldProfile.pin || formData.personalPin,
        });
        const batch = writeBatch(db);
        batch.delete(doc(runnersRef, oldId));
        await batch.commit();
        setProfile({ ...oldProfile, pin: formData.personalPin });
      } else {
        if (!oldProfile.pin) {
          await updateDoc(doc(runnersRef, user.uid), {
            pin: formData.personalPin,
          });
        }
        setProfile(oldProfile);
      }
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
      rpe: 5,
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
  const handleSaveLog = async () => {
    if (!formData.distance) return;
    setIsSubmitting(true);
    try {
      const dataToSave = {
        date: formData.date,
        distance: parseFloat(formData.distance),
        category: formData.category,
        menuDetail: formData.menuDetail,
        rpe: formData.rpe,
        pain: formData.pain,
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
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
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

  if (role === "coach-auth") {
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
      formData.teamPass &&
      formData.personalPin.length === 4;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl space-y-6">
          <h2 className="text-2xl font-black text-slate-900 text-center uppercase italic">
            New Member
          </h2>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="チームパスコード"
                  className={`w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ${errorMsg ? "ring-rose-500" : "ring-blue-500"}`}
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
              <div className="relative">
                <input
                  type="tel"
                  maxLength={4}
                  placeholder="個人パスコード(数字4桁)"
                  className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500"
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
              <p className="text-[10px] text-slate-400 font-bold ml-2">
                ※ログイン時に必要になります。忘れないでください。
              </p>
              {errorMsg && (
                <div className="flex items-center gap-2 text-rose-500 px-2 animate-in slide-in-from-left-2">
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
              {isSubmitting ? "登録する" : "登録"}
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
    const isReady =
      formData.lastName === "admin" ||
      (formData.lastName &&
        formData.firstName &&
        formData.personalPin.length === 4);
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl space-y-6">
          <h2 className="text-2xl font-black text-slate-900 text-center uppercase italic">
            Login
          </h2>
          <p className="text-xs text-center text-slate-400 font-bold">
            以前のデータを引き継ぎます
          </p>
          <div className="space-y-4">
            <input
              placeholder="苗字 (例: 佐藤)"
              className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-emerald-500"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
            />
            <input
              placeholder="名前 (例: 太郎)"
              className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-emerald-500"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
            />
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="tel"
                  maxLength={4}
                  placeholder="個人パスコード(数字4桁)"
                  className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-emerald-500"
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
                <div className="flex items-center gap-2 text-rose-500 px-2 animate-in slide-in-from-left-2">
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
                {availablePeriods.map((p) => (
                  <option key={p.id} value={p.id} className="text-slate-900">
                    {p.name}{" "}
                    {p.start ? `(${p.start.slice(5).replace("-", "/")})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <main className="px-5 space-y-6 relative z-20 max-w-md mx-auto">
          {view === "menu" && (
            <>
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

              {/* Review Button */}
              <button
                onClick={() => changeView("review")}
                className="w-full bg-white p-7 rounded-[2.5rem] shadow-md flex items-center justify-between group active:scale-95 transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-[1.2rem] flex items-center justify-center">
                    <MessageSquare size={30} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-xl tracking-tight">
                      振り返り (Review)
                    </p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                      Self Report & Feedback
                    </p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-slate-100" />
              </button>

              <button
                onClick={() => changeView("entry")}
                className="w-full bg-white p-7 rounded-[2.5rem] shadow-md flex items-center justify-between group active:scale-95 transition-all"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-[1.2rem] flex items-center justify-center">
                    <Plus size={30} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-xl tracking-tight">
                      練習を入力する
                    </p>
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">
                      Input Data
                    </p>
                  </div>
                </div>
                <ChevronRight size={24} className="text-slate-100" />
              </button>
            </>
          )}

          {/* Review View */}
          {view === "review" && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl space-y-8 animate-in fade-in pb-12">
              <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest flex items-center gap-2">
                <Activity size={16} /> Review: {targetPeriod.name}
              </h3>

              <div className="grid grid-cols-1 gap-6">
                <div className="bg-slate-50 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="w-40 h-40 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Done",
                              value:
                                targetPeriod.type === "month"
                                  ? personalStats.monthly
                                  : personalStats.period,
                            },
                            {
                              name: "Remaining",
                              value: Math.max(
                                0,
                                getGoalValue(
                                  currentProfile,
                                  targetPeriod.id,
                                  targetPeriod.type,
                                  "goalPeriod",
                                ) -
                                  (targetPeriod.type === "month"
                                    ? personalStats.monthly
                                    : personalStats.period),
                              ),
                            },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          startAngle={90}
                          endAngle={-270}
                          dataKey="value"
                        >
                          <Cell key="cell-0" fill="#10b981" />
                          <Cell key="cell-1" fill="#f1f5f9" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-slate-800">
                        {getGoalValue(
                          currentProfile,
                          targetPeriod.id,
                          targetPeriod.type,
                          "goalPeriod",
                        ) > 0
                          ? Math.round(
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
                            )
                          : 0}
                        %
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        Achievement
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 p-3 rounded-2xl text-center">
                    <p className="text-[9px] text-blue-400 font-black uppercase mb-1">
                      Distance
                    </p>
                    <p className="text-lg font-black text-blue-700">
                      {targetPeriod.type === "month"
                        ? personalStats.monthly
                        : personalStats.period}
                    </p>
                    <p className="text-[8px] text-blue-300 font-bold">km</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-2xl text-center">
                    <p className="text-[9px] text-orange-400 font-black uppercase mb-1">
                      Days
                    </p>
                    <p className="text-lg font-black text-orange-700">
                      {periodSummary.days}
                    </p>
                    <p className="text-[8px] text-orange-300 font-bold">days</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-2xl text-center">
                    <p className="text-[9px] text-purple-400 font-black uppercase mb-1">
                      Avg RPE
                    </p>
                    <p className="text-lg font-black text-purple-700">
                      {periodSummary.avgRpe}
                    </p>
                    <p className="text-[8px] text-purple-300 font-bold">Lv</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <HeartPulse size={12} /> Condition Trend
                </h4>
                <div className="h-32 w-full bg-slate-50 rounded-2xl p-2 border border-slate-100">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={periodSummary.painData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 8 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis hide domain={[0, 5]} />
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", fontSize: "10px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="pain"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <BookOpen size={12} /> Practice Logs
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {periodLogs.length > 0 ? (
                    periodLogs.map((l) => (
                      <div
                        key={l.id}
                        className="bg-slate-50 p-3 rounded-xl flex justify-between items-start"
                      >
                        <div>
                          <p className="text-[10px] font-black text-slate-400">
                            {l.date}{" "}
                            <span className="ml-1 px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-600">
                              {l.category}
                            </span>
                          </p>
                          <p className="text-xs font-bold text-slate-700 mt-1 line-clamp-1">
                            {l.menuDetail || "詳細なし"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-blue-600">
                            {l.distance}km
                          </p>
                          <p className="text-[9px] font-bold text-slate-400">
                            RPE:{l.rpe}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-center text-slate-300 py-4">
                      記録がありません
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-2">
                    <Edit size={14} /> Self Review
                  </label>
                  {currentFeedback && currentFeedback.updatedAt && (
                    <span className="text-[9px] text-slate-300">
                      Last:{" "}
                      {new Date(currentFeedback.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <textarea
                  className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 min-h-[120px] outline-none focus:ring-2 ring-blue-100"
                  placeholder="振り返り..."
                  defaultValue={currentFeedback?.runnerComment || ""}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
                <button
                  onClick={handleSaveReview}
                  className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-lg active:scale-95 transition-all"
                >
                  保存する
                </button>
              </div>

              {currentFeedback?.coachComment && (
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 relative mt-4">
                  <div className="absolute -top-3 left-6 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <UserCheck size={12} /> Coach Feedback
                  </div>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap">
                    {currentFeedback.coachComment}
                  </p>
                </div>
              )}

              <button
                onClick={() => setView("menu")}
                className="w-full py-4 text-slate-400 font-bold text-xs uppercase"
              >
                戻る
              </button>
            </div>
          )}

          {view === "goal" && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center space-y-8 animate-in fade-in">
              <h3 className="font-black text-slate-400 uppercase text-xs tracking-widest">
                目標設定 ({targetPeriod.name})
              </h3>
              <div className="space-y-6">
                {targetPeriod.type !== "custom" && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest mb-2 block text-left">
                      Monthly Goal (km)
                    </label>
                    <input
                      type="number"
                      className="w-full text-4xl font-black text-blue-600 bg-slate-50 rounded-2xl p-5 outline-none border-2 border-transparent focus:border-blue-100"
                      placeholder={currentProfile.goalMonthly}
                      onChange={(e) =>
                        setGoalInput({ ...goalInput, monthly: e.target.value })
                      }
                    />
                  </div>
                )}

                {(targetPeriod.type === "custom" ||
                  targetPeriod.type === "global") && (
                  <div>
                    <label className="text-[10px] font-black text-emerald-400 ml-1 uppercase tracking-widest mb-2 block text-left">
                      {targetPeriod.type === "custom"
                        ? targetPeriod.name
                        : "Yearly/Global Total"}{" "}
                      (km)
                    </label>
                    <input
                      type="number"
                      className="w-full text-4xl font-black text-emerald-600 bg-slate-50 rounded-2xl p-5 outline-none border-2 border-transparent focus:border-emerald-100"
                      placeholder={getGoalValue(
                        currentProfile,
                        targetPeriod.id,
                        targetPeriod.type,
                        "goalPeriod",
                      )}
                      onChange={(e) =>
                        setGoalInput({ ...goalInput, period: e.target.value })
                      }
                    />
                  </div>
                )}

                {activeQuarters.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-3xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-left">
                      Quarter Goals Breakdown
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {activeQuarters.map((q, idx) => (
                        <div key={idx} className="text-left">
                          <label className="text-[8px] font-bold text-slate-400 ml-1 block mb-1 truncate">
                            Q{idx + 1}{" "}
                            {q.start
                              ? `(${q.start.slice(5).replace("-", "/")}~)`
                              : ""}
                          </label>
                          <input
                            type="number"
                            className="w-full p-3 rounded-xl text-sm font-black text-slate-700 outline-none border border-slate-200 focus:border-emerald-400"
                            placeholder={
                              getGoalValue(
                                currentProfile,
                                targetPeriod.id,
                                targetPeriod.type,
                                `goalQ${idx + 1}`,
                              ) || 0
                            }
                            onChange={(e) =>
                              setGoalInput((prev) => ({
                                ...prev,
                                [`q${idx + 1}`]: e.target.value,
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => changeView("menu")}
                  className="flex-1 py-5 bg-slate-100 rounded-2xl font-black text-slate-400"
                >
                  戻る
                </button>
                <button
                  onClick={
                    isPreview
                      ? () => alert("プレビュー中は保存できません")
                      : updateGoals
                  }
                  className={`flex-1 py-5 text-white rounded-2xl font-black shadow-lg ${isPreview ? "bg-slate-400" : "bg-blue-600"}`}
                >
                  保存
                </button>
              </div>
            </div>
          )}

          {view === "team" && (
            <div className="bg-white p-7 rounded-[2.5rem] shadow-xl space-y-6 animate-in slide-in-from-right-10">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                  <Trophy size={16} className="text-orange-500" /> Team Ranking
                </h3>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {targetPeriod.name}
                </span>
              </div>
              <div
                className="w-full overflow-y-auto pr-2 hidden md:block"
                style={{ maxHeight: "60vh" }}
              >
                <div
                  style={{
                    height: "400px",
                    width: `${Math.max(100, rankingData.length * chartWidthFactor)}%`,
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={rankingData}
                      margin={{ left: 30, right: 30, bottom: 30 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        angle={-60}
                        textAnchor="end"
                        height={60}
                        tick={{
                          fontSize: 10,
                          fontWeight: "bold",
                          fill: "#1e293b",
                        }}
                      />
                      <YAxis
                        tick={{
                          fontSize: 10,
                          fontWeight: "bold",
                          fill: "#cbd5e1",
                        }}
                        width={30}
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
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
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
                          position="top"
                          formatter={(v) => `${v}`}
                          style={{
                            fontSize: "9px",
                            fontWeight: "black",
                            fill: "#475569",
                          }}
                          offset={5}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Activity size={14} /> Everyone's Activity (Latest)
                </p>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {allLogs
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 30)
                    .map((l) => (
                      <div
                        key={l.id}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl"
                      >
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs text-blue-600 shadow-sm shrink-0 border border-slate-100">
                          {l.runnerName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-0.5">
                            <span className="text-xs font-bold text-slate-700 truncate">
                              {l.runnerName}
                            </span>
                            <span className="text-[10px] font-black text-slate-400">
                              {l.date.slice(5).replace("-", "/")}
                            </span>
                          </div>
                          <div className="flex items-end gap-1 mb-1">
                            <span className="text-lg font-black text-blue-600 leading-none">
                              {l.distance}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              km
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 ml-2 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                              {l.category}
                            </span>
                          </div>
                          {l.menuDetail && (
                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed bg-white/50 p-1.5 rounded-lg border border-slate-100/50 italic">
                              {l.menuDetail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  {allLogs.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4">
                      まだ記録がありません
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === "entry" && (
            <div className="bg-white p-7 rounded-[2.5rem] shadow-xl space-y-6 animate-in slide-in-from-bottom-8 pb-10">
              <h2 className="text-xl font-black flex items-center gap-2">
                {editingLogId ? (
                  <Edit className="text-blue-600" />
                ) : (
                  <Plus className="text-blue-600" />
                )}{" "}
                {editingLogId ? "記録の編集" : "練習記録"}
              </h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      日付
                    </label>
                    <input
                      type="date"
                      className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      休憩
                    </label>
                    <button
                      onClick={() =>
                        setConfirmDialog({
                          isOpen: true,
                          message: "今日を「完全休養」として記録しますか？",
                          onConfirm: async () => {
                            setConfirmDialog({
                              isOpen: false,
                              message: "",
                              onConfirm: null,
                            });
                            await handleRestRegister();
                          },
                        })
                      }
                      disabled={isSubmitting}
                      className="w-full p-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm border border-emerald-100 active:scale-95 transition-all"
                    >
                      休養
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      距離 (km)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full p-4 bg-slate-50 rounded-2xl font-black text-2xl text-blue-600 outline-none"
                      value={formData.distance}
                      onChange={(e) =>
                        setFormData({ ...formData, distance: e.target.value })
                      }
                      placeholder="0.0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      練習区分
                    </label>
                    <div className="grid grid-rows-3 gap-1 h-full">
                      {["朝練", "午前練", "午後練"].map((cat) => (
                        <button
                          key={cat}
                          onClick={() =>
                            setFormData({ ...formData, category: cat })
                          }
                          className={`h-full rounded-lg font-bold text-[9px] uppercase transition-all ${formData.category === cat ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-1">
                    <BookOpen size={12} /> メニュー詳細
                  </label>
                  <textarea
                    className="w-full p-4 bg-slate-50 rounded-2xl h-24 outline-none font-bold text-slate-700 resize-none shadow-inner text-sm"
                    placeholder="例: 1000m × 5 (3'00), 20kmジョグ 等"
                    value={formData.menuDetail}
                    onChange={(e) =>
                      setFormData({ ...formData, menuDetail: e.target.value })
                    }
                  />
                </div>
                <div className="p-6 bg-slate-50 rounded-[2rem] space-y-5">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>練習強度 (RPE)</span>
                    <span className="text-blue-600">Lv: {formData.rpe}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    className="w-full accent-blue-600"
                    value={formData.rpe}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rpe: parseInt(e.target.value),
                      })
                    }
                  />
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                      足の痛み (1-5)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          onClick={() => setFormData({ ...formData, pain: v })}
                          className={`py-3 rounded-[1.1rem] text-sm font-black transition-all ${formData.pain === v ? "bg-rose-500 text-white shadow-md" : "bg-white text-slate-400 border border-slate-100"}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleSaveLog}
                    disabled={isSubmitting || !formData.distance}
                    className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? "保存中..."
                      : editingLogId
                        ? "更新する"
                        : "記録を保存する"}
                  </button>
                  {editingLogId && (
                    <button
                      onClick={resetForm}
                      className="w-full py-4 text-slate-400 font-bold text-sm"
                    >
                      編集をキャンセル
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === "stats" && (
            <div className="space-y-6 pb-16 animate-in slide-in-from-right-10">
              <div className="bg-white p-7 rounded-[2.5rem] shadow-lg">
                <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-8 flex items-center gap-2">
                  <BarChart2 size={16} className="text-blue-600" /> 14-Day
                  Activity
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={personalStats.daily}
                      margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{
                          fontSize: 9,
                          fontWeight: "bold",
                          fill: "#cbd5e1",
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{
                          fontSize: 9,
                          fontWeight: "bold",
                          fill: "#cbd5e1",
                        }}
                        width={30}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "#f8fafc" }}
                        contentStyle={{
                          borderRadius: "16px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="distance" radius={[5, 5, 0, 0]}>
                        {personalStats.daily.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.distance > 0 ? "#3b82f6" : "#f1f5f9"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] shadow-lg overflow-hidden border border-slate-100">
                <div className="p-6 border-b font-black text-slate-800 uppercase text-[10px] tracking-widest bg-slate-50">
                  Training History
                </div>
                <div className="divide-y divide-slate-50 max-h-[35rem] overflow-y-auto no-scrollbar">
                  {allLogs
                    .filter((l) => l.runnerId === currentUserId)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((l) => (
                      <div key={l.id} className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-3 rounded-[1.2rem] ${l.category === "朝練" ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"}`}
                            >
                              <Clock size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-300 mb-1">
                                {l.date}
                              </p>
                              <p className="text-sm font-black text-slate-800">
                                {l.category}
                              </p>
                            </div>
                          </div>
                          <span className="text-3xl font-black text-blue-600 tracking-tighter">
                            {l.distance}
                            <span className="text-[10px] ml-0.5 text-slate-400">
                              km
                            </span>
                          </span>
                        </div>
                        {l.menuDetail && (
                          <div className="bg-slate-50 p-3 rounded-2xl text-xs font-bold text-slate-600 leading-relaxed italic border-l-4 border-slate-200">
                            "{l.menuDetail}"
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 pt-1 border-t border-dashed border-slate-100 mt-1">
                          <div className="bg-slate-50 p-2.5 rounded-2xl flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase">
                              強度
                            </span>
                            <span className="text-xs font-black">
                              Lv.{l.rpe}
                            </span>
                          </div>
                          <div
                            className={`p-2.5 rounded-2xl flex items-center justify-between ${l.pain > 2 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}
                          >
                            <span className="text-[9px] font-black uppercase opacity-60">
                              痛み
                            </span>
                            <span className="text-xs font-black">
                              Lv.{l.pain}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={isPreview ? null : () => handleEditLog(l)}
                            className={`p-2 rounded-xl transition-colors ${isPreview ? "text-slate-200" : "text-slate-300 hover:text-blue-500 bg-slate-50"}`}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={
                              isPreview
                                ? null
                                : () =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      message: "この記録を削除しますか？",
                                      onConfirm: async () => {
                                        await deleteDoc(
                                          doc(
                                            db,
                                            "artifacts",
                                            appId,
                                            "public",
                                            "data",
                                            "logs",
                                            l.id,
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
                            className={`p-2 rounded-xl transition-colors ${isPreview ? "text-slate-200" : "text-slate-300 hover:text-rose-500 bg-slate-50"}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 flex justify-around items-center px-6 py-5 z-[50] rounded-t-[3.5rem] shadow-2xl max-w-md mx-auto">
          <button
            onClick={() => changeView("menu")}
            className={`flex flex-col items-center gap-1 transition-all ${view === "menu" ? "text-blue-600 scale-110" : "text-slate-300"}`}
          >
            <Home size={22} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1">
              Home
            </span>
          </button>
          <button
            onClick={() => changeView("team")}
            className={`flex flex-col items-center gap-1 transition-all ${view === "team" ? "text-blue-600 scale-110" : "text-slate-300"}`}
          >
            <Medal size={22} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1">
              Team
            </span>
          </button>
          <button
            onClick={() => changeView("entry")}
            className="flex flex-col items-center gap-1 -mt-14 transition-all"
          >
            <div
              className={`p-5 rounded-[1.8rem] shadow-xl transition-all ${view === "entry" ? "bg-blue-600 text-white scale-110" : "bg-slate-950 text-white"}`}
            >
              <Plus size={24} />
            </div>
          </button>
          <button
            onClick={() => changeView("stats")}
            className={`flex flex-col items-center gap-1 transition-all ${view === "stats" ? "text-blue-600 scale-110" : "text-slate-300"}`}
          >
            <BarChart2 size={22} />
            <span className="text-[8px] font-black uppercase tracking-widest mt-1">
              Data
            </span>
          </button>
        </nav>

        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
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

  // --- COACH VIEW ---
  if (role === "coach") {
    return (
      <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 print:bg-white print:pb-0 print:h-auto md:flex">
        {/* Header / Sidebar for PC */}
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

          {/* 期間切り替えUI (監督画面全体で使用可能に) */}
          <div className="mb-6 flex justify-end items-center gap-3 no-print">
            <span className="text-xs font-bold text-slate-400">Target:</span>
            {availablePeriods.length > 0 && selectedPeriod && (
              <select
                className="bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl px-4 py-2 outline-none shadow-sm focus:border-blue-500"
                value={selectedPeriod.id}
                onChange={(e) => {
                  const period = availablePeriods.find(
                    (p) => p.id === e.target.value,
                  );
                  if (period) setSelectedPeriod(period);
                }}
              >
                {availablePeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{" "}
                    {p.start ? `(${p.start.slice(5).replace("-", "/")})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {(view === "coach-stats" || !view.startsWith("coach-")) && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  {/* 修正: 安全なアクセス & 初期値0 */}
                  <p className="text-2xl md:text-3xl font-black text-emerald-600">
                    {(reportMatrix &&
                      reportMatrix.totals &&
                      reportMatrix.totals.grandTotal) ||
                      0}
                    <span className="text-xs ml-1 text-slate-400">km</span>
                  </p>
                </div>
                <div
                  className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-8 ${coachStats.painAlertCount > 0 ? "border-rose-500 bg-rose-50" : "border-emerald-500"}`}
                >
                  <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                    Pain Alert
                  </p>
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

                  {/* 修正箇所: グラフの高さを動的に設定 (Coach Stats) */}
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
                          className="p-4 mb-2 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
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
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-5">
                            <span>
                              {l.date} · {l.category}
                            </span>
                            <span>RPE: {l.rpe}</span>
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
              {/* 印刷プレビューモードのトグル */}
              <div className="flex justify-end mb-4 no-print">
                <button
                  onClick={() => setIsPrintPreview(!isPrintPreview)}
                  className={`px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${isPrintPreview ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                >
                  {isPrintPreview ? <X size={16} /> : <Eye size={16} />}
                  {isPrintPreview ? "プレビューを閉じる" : "印刷レイアウト確認"}
                </button>
              </div>

              {/* isPrintPreview が true の場合は画面上でプレビュー用CSSを適用するラッパーを表示 */}
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
                <div
                  id="printable-report"
                  className={`${isPrintPreview ? "max-w-5xl mx-auto shadow-2xl scale-100 origin-top" : ""}`}
                >
                  {/* 1ページ目: 表紙 & テーブル */}
                  <div className="report-card-base">
                    <div className="flex justify-between items-center pb-6 border-b border-slate-100 print:border-slate-800">
                      <div>
                        <h2 className="font-black text-2xl text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
                          <FileText className="text-blue-600 print:text-black" />{" "}
                          KSWC EKIDEN TEAM REPORT
                        </h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest print:text-slate-600 mt-1">
                          Target Period: {targetPeriod.name} (
                          {targetPeriod.start} - {targetPeriod.end})
                        </p>
                      </div>
                      <div className="flex items-center gap-2 no-print">
                        <button
                          onClick={handleExportMatrixCSV}
                          className="bg-emerald-600 text-white px-4 py-3 rounded-xl hover:bg-emerald-700 transition-colors active:scale-95 shadow-lg flex items-center gap-2 font-bold text-xs"
                        >
                          <FileSpreadsheet size={18} /> CSV出力
                        </button>
                        <button
                          onClick={handlePrint}
                          className="bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-700 transition-colors active:scale-95 shadow-lg flex items-center gap-2 font-bold text-xs"
                        >
                          <Printer size={18} /> 印刷 / PDF
                        </button>
                      </div>
                    </div>

                    <div
                      className={`pb-4 ${isPrintPreview ? "overflow-visible" : "overflow-x-auto"}`}
                    >
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="p-3 border-b-2 border-slate-100 font-black text-left text-slate-400 min-w-[100px] sticky left-0 bg-white">
                              DATE
                            </th>
                            {activeRunners.map((r) => (
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
                          {reportMatrix.matrix.map((row, i) => (
                            <tr
                              key={row.date}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="p-3 border-b border-slate-100 font-bold text-slate-500 whitespace-nowrap sticky left-0 bg-white">
                                {row.date.slice(5).replace("-", "/")}
                              </td>
                              {activeRunners.map((r) => {
                                const val = row[r.id];
                                let cellClass =
                                  "p-2 border-b border-slate-100 text-center font-bold text-sm ";
                                if (val === "未")
                                  cellClass += "text-rose-400 bg-rose-50/30";
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

                          {/* ここに追加: 区間合計 (Q1-Q4) - 修正: 項目列の幅確保 */}
                          {/* targetPeriod.type === 'custom' のときだけ表示 */}
                          {targetPeriod.type === "custom" &&
                            reportMatrix.qTotals.map((row, i) => (
                              <tr
                                key={`qtotal-${i}`}
                                className="bg-slate-50 font-bold text-slate-600"
                              >
                                {/* 修正: 幅指定を追加して折り返しを防ぐ */}
                                <td
                                  className="p-3 border-b border-slate-200 sticky left-0 bg-slate-50 whitespace-nowrap"
                                  style={{ minWidth: "80px" }}
                                >
                                  Q{i + 1} Total
                                </td>
                                {activeRunners.map((r) => {
                                  const goalKey = `goalQ${i + 1}`;
                                  const goal = getGoalValue(
                                    r,
                                    targetPeriod.id,
                                    targetPeriod.type,
                                    goalKey,
                                  ); // 修正: getGoalValueを使用
                                  return (
                                    <td
                                      key={r.id}
                                      className="p-3 text-center border-b border-slate-200"
                                    >
                                      {/* 実績 / 目標 の形で表示 */}
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

                          {/* 総合計 */}
                          <tr className="bg-slate-100 font-black text-slate-800">
                            <td className="p-3 sticky left-0 bg-slate-100 border-t-2 border-slate-300">
                              TOTAL
                            </td>
                            {activeRunners.map((r) => (
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

                  {/* 2ページ目以降: グラフ (カード形式) */}

                  {/* 1. Cumulative Distance Trends */}
                  <div className="report-card-base">
                    <h3 className="font-black text-sm uppercase tracking-widest mb-6 text-center text-slate-700">
                      Cumulative Distance Trends
                    </h3>
                    <div className="report-chart-container">
                      <div
                        className="chart-inner-wrapper"
                        style={{ width: "100%", height: "100%" }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          {/* 修正: Y軸のwidthを30に縮小 + マージン調整 */}
                          <LineChart
                            data={cumulativeData}
                            margin={{ top: 10, right: 50, left: 0, bottom: 0 }}
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
                            {activeRunners.map((r, i) => (
                              <Line
                                key={r.id}
                                type="monotone"
                                dataKey={r.id}
                                name={`${r.lastName} ${r.firstName}`}
                                stroke={COLORS[i % COLORS.length]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                                // ここで最後の点に名前を表示
                                label={({ x, y, index, stroke }) => {
                                  if (index === cumulativeData.length - 1) {
                                    return (
                                      <text
                                        x={x + 5}
                                        y={y}
                                        dy={4}
                                        fill={stroke}
                                        fontSize={10}
                                        fontWeight="bold"
                                        textAnchor="start"
                                      >
                                        {r.lastName}
                                      </text>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* 2. Total Distance */}
                  <div className="report-card-base">
                    <h3 className="font-black text-sm uppercase tracking-widest mb-6 text-center text-slate-700">
                      Total Distance
                    </h3>
                    <div className="report-chart-container">
                      {/* プレビュー時および印刷時は強制的に100%にするロジック */}
                      <div
                        className="chart-inner-wrapper"
                        style={{
                          width: isPrintPreview
                            ? "100%"
                            : `${Math.max(100, rankingData.length * chartWidthFactor)}%`,
                          height: "100%",
                          minWidth: "100%",
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          {/* 修正: Y軸のwidthを30に縮小 + マージン調整 */}
                          <BarChart
                            data={rankingData}
                            margin={{
                              top: 10,
                              right: 30,
                              left: 10,
                              bottom: 50,
                            }}
                          >
                            {" "}
                            {/* bottomを増やしてX軸ラベルの切れ防止 */}
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="name"
                              interval={0}
                              angle={-60} /* -45 -> -60 で重なり軽減 */
                              textAnchor="end"
                              height={80}
                              tick={({ x, y, payload }) => (
                                <g transform={`translate(${x},${y})`}>
                                  <text
                                    x={0}
                                    y={0}
                                    dy={16}
                                    textAnchor="end"
                                    fill="#1e293b"
                                    transform="rotate(-60)"
                                    style={{
                                      fontSize: isPrintPreview ? "9px" : "10px",
                                      fontWeight: "bold",
                                    }} /* 印刷時はフォント小さく */
                                  >
                                    {payload.value}
                                  </text>
                                </g>
                              )}
                            />
                            <YAxis tick={{ fontSize: 10 }} width={30} />
                            <Bar
                              dataKey="total"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                              // 印刷時は太さを自動(undefined)にして詰める
                              barSize={isPrintPreview ? undefined : 40}
                            >
                              <LabelList
                                dataKey="total"
                                position="top"
                                formatter={(v) => `${v}km`}
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "black",
                                  fill: "#475569",
                                }}
                                offset={5}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* 3-6. Quarter Charts */}
                  {/* targetPeriod.type === 'custom' のときだけ表示 */}
                  {targetPeriod.type === "custom" &&
                    activeQuarters.map((q, idx) => {
                      const qData = activeRunners
                        .map((r) => {
                          const total = allLogs
                            .filter(
                              (l) =>
                                l.runnerId === r.id &&
                                l.date >= q.start &&
                                l.date <= q.end,
                            )
                            .reduce((s, l) => s + (Number(l.distance) || 0), 0);
                          return {
                            name: `${r.lastName} ${r.firstName}`,
                            total: Math.round(total * 10) / 10,
                          };
                        })
                        .sort((a, b) => b.total - a.total);

                      return (
                        <div key={idx} className="report-card-base">
                          <h3 className="font-black text-sm uppercase tracking-widest mb-6 text-center text-slate-700">
                            Q{idx + 1} ({q.start.slice(5)} - {q.end.slice(5)})
                          </h3>
                          <div className="report-chart-container">
                            <div
                              className="chart-inner-wrapper"
                              style={{
                                width: isPrintPreview
                                  ? "100%"
                                  : `${Math.max(100, qData.length * chartWidthFactor)}%`,
                                height: "100%",
                                minWidth: "100%",
                              }}
                            >
                              <ResponsiveContainer width="100%" height="100%">
                                {/* 修正: Y軸のwidthを30に縮小 + マージン調整 */}
                                <BarChart
                                  data={qData}
                                  margin={{
                                    top: 10,
                                    right: 30,
                                    left: 10,
                                    bottom: 50,
                                  }}
                                >
                                  {" "}
                                  {/* bottomを増やしてX軸ラベルの切れ防止 */}
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="name"
                                    interval={0}
                                    angle={-60} /* -45 -> -60 で重なり軽減 */
                                    textAnchor="end"
                                    height={80}
                                    tick={({ x, y, payload }) => (
                                      <g transform={`translate(${x},${y})`}>
                                        <text
                                          x={0}
                                          y={0}
                                          dy={16}
                                          textAnchor="end"
                                          fill="#1e293b"
                                          transform="rotate(-60)"
                                          style={{
                                            fontSize: isPrintPreview
                                              ? "9px"
                                              : "10px",
                                            fontWeight: "bold",
                                          }} /* 印刷時はフォント小さく */
                                        >
                                          {payload.value}
                                        </text>
                                      </g>
                                    )}
                                  />
                                  <YAxis tick={{ fontSize: 10 }} width={30} />
                                  <Bar
                                    dataKey="total"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                    // 印刷時は太さを自動(undefined)にして詰める
                                    barSize={isPrintPreview ? undefined : 40}
                                  >
                                    <LabelList
                                      dataKey="total"
                                      position="top"
                                      formatter={(v) => `${v}km`}
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: "black",
                                        fill: "#475569",
                                      }}
                                      offset={5}
                                    />
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </>
          )}
          {/* ... (check/menu/roster/settings screens remain unchanged) ... */}
          {view === "coach-check" && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Status Check
              </h3>
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
                          <p className="text-[10px] text-slate-400 font-bold">
                            Goal: {r.goalMonthly}km/mo
                          </p>
                          <p className="text-[10px] text-slate-300 font-mono">
                            PIN: {r.pin || "未設定"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* プレビューボタンの追加 */}
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
          {/* 新規: Coach Runner Detail View (復元) */}
          {view === "coach-runner-detail" && selectedRunner && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in slide-in-from-right-10 max-w-2xl mx-auto">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Athlete Detail
              </h3>

              {/* 編集フォーム */}
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

              {/* フィードバックセクション (監督用) */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                  <MessageSquare size={16} /> Feedback for {targetPeriod.name}
                </h4>

                {/* 選手の振り返り表示 */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[9px] text-slate-400 font-bold uppercase mb-2 flex items-center gap-1">
                    <User size={10} /> Runner's Comment
                  </p>
                  <p className="text-sm text-slate-700 font-bold whitespace-pre-wrap">
                    {getRunnerFeedback(selectedRunner.id)?.runnerComment ||
                      "（未入力）"}
                  </p>
                </div>

                {/* 監督コメント入力 */}
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

              <button
                onClick={() => setView("coach-roster")}
                className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest"
              >
                一覧に戻る
              </button>
            </div>
          )}

          {view === "coach-settings" && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in slide-in-from-right-5 max-w-2xl mx-auto">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Settings
              </h3>
              {/* 初期表示期間の選択 */}
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
                        {p.name} {p.start ? `(${p.start.slice(5)})` : ""}
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

                {/* Default Period (Backup) は必要性が低くなったため、混乱を避けるために非表示にするか、最下部に小さく配置 */}
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
        </main>
        {confirmDialog.isOpen && (
          <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
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
