/*
 * CoachView — 監督ダッシュボード（メイン画面）
 *
 * 監督がログイン後に使うすべての機能を含む大型コンポーネント。
 * チーム全体の練習状況確認、選手個別管理、大会・振り返り管理、
 * レポート表示、期間設定、データエクスポートなどを担当する。
 */
import { useState, useMemo, useEffect } from "react";
import {
  Users,
  FileText,
  ClipboardList,
  Calendar,
  CalendarDays,
  Settings,
  LogOut,
  ChevronRight,
  Trophy,
  Download,
  X,
  Eye,
  Check,
  AlertTriangle,
  Edit,
  HeartPulse,
  User,
  MessageSquare,
  UserMinus,
  Archive,
  RotateCcw,
  Trash2,
  Activity,
  BarChart2,
  UserCheck,
  Target,
  ClipboardCheck,
  Timer,
  ArrowLeft,
  Flag,
  Cloud,
  Thermometer,
  Droplets,
  Save,
  BookOpen,
  Dumbbell,
  MapPin,
  Plus,
  Bell,
  BellRing,
  Loader2,
  Sparkles,
  Home,
  ChevronDown,
} from "lucide-react";

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
} from "recharts";
import { setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { docRef, settingsDocRef } from "../utils/firestore";
import { ROLES } from "../utils/constants";
import { getTodayStr } from "../utils/dateUtils";

import DiaryListItem from "./DiaryListItem";
import CoachReportView from "./CoachReportView";
import CalendarView from "./CalendarView";
import { usePrint } from "../hooks/usePrint";
import LapTimeModal from "./LapTimeModal";
import TeamRaceReport from "./TeamRaceReport";

// LAP解析ヘルパー関数
const timeToSeconds = (str) => {
  if (!str) return 0;
  const cleanStr = str.replace(/[()（）]/g, "");
  const match = cleanStr.match(/(?:(\d+)')?(?:(\d+)")?(\d+)?/);
  if (!match) return 0;
  const m = parseFloat(match[1] || 0);
  const s = parseFloat(match[2] || 0);
  const c = parseFloat(match[3] || 0) / 100;
  return m * 60 + s + c;
};

const secondsToTime = (totalSeconds) => {
  if (totalSeconds <= 0) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const c = Math.round((totalSeconds % 1) * 100);
  const ss = String(s).padStart(2, "0");
  const cc = String(c).padStart(2, "0");
  return m > 0 ? `${m}'${ss}"${cc}` : `${s}"${cc}`;
};

const analyzeLaps = (lapStr, raceType, distanceStr, ekidenDist) => {
  if (!lapStr) return null;
  let targetDistStr = ekidenDist ? String(ekidenDist) + "km" : distanceStr;
  let totalDist = parseInt((targetDistStr || "").replace(/[^0-9]/g, ""));
  if ((targetDistStr || "").toLowerCase().includes("km")) totalDist *= 1000;

  const lines = lapStr.replace(/\s+(?=\d+(?:km|m):)/g, "\n").split("\n");
  let currentKilo = 1000;
  let current400 = 400;
  let lastKiloCumul = 0;
  let last400Cumul = 0;

  let totalSec = 0;
  let totalEnteredDist = 0;

  const formattedLines = [];

  const isLongDistance =
    totalDist >= 1500 ||
    (raceType && (raceType.includes("駅伝") || raceType.includes("ロード")));

  lines.forEach((line) => {
    const cleanLine = line.trim().replace(/\s/g, "").replace(/km:/g, "000m:");
    const match = cleanLine.match(/(\d+)m:(.*?)(?:\((.*?)\))?$/);
    if (!match) {
      if (line.trim()) formattedLines.push(line.trim());
      return;
    }

    const dist = parseInt(match[1]);
    const segTime = match[2];
    const cumulTimeStr = match[3] || match[2];

    const cumulSec = timeToSeconds(cumulTimeStr);
    if (cumulSec <= 0) {
      formattedLines.push(`${dist}m: ${segTime}`);
      return;
    }

    totalSec = cumulSec;
    totalEnteredDist = dist;

    let displayLine = `${dist}m: ${segTime}`;

    if (cumulTimeStr !== segTime) {
      displayLine += ` ${cumulTimeStr}`;
    }

    if (dist === currentKilo) {
      const splitSec = cumulSec - lastKiloCumul;
      if (isLongDistance) {
        displayLine += `(${secondsToTime(splitSec)})`;
      }
      lastKiloCumul = cumulSec;
      currentKilo += 1000;
    }

    if (dist === current400) {
      const splitSec = cumulSec - last400Cumul;
      if (!isLongDistance) {
        displayLine += `(${secondsToTime(splitSec)})`;
      }
      last400Cumul = cumulSec;
      current400 += 400;
    }

    formattedLines.push(displayLine);
  });

  if (totalEnteredDist === 0) return null;

  const avgPace = isLongDistance
    ? totalSec / (totalEnteredDist / 1000)
    : totalSec / (totalEnteredDist / 400);

  formattedLines.push(`AVG ${secondsToTime(avgPace)}`);

  return { formattedLines };
};

const CoachView = (props) => {
  const {
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
    monthlyTrendData,
    isPainAlertModalOpen,
    setIsPainAlertModalOpen,
    rankingData,
    exportCSV,
    reportChartData,
    activeQuarters,
    cumulativeData,
    checkDate,
    setCheckDate,
    checkListData,
    allLogs,
    menuInput,
    setMenuInput,
    teamLogs,
    appId,
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
    isPeriodSaving,
    isSubmitting,
    isCoachEditModalOpen,
    setIsCoachEditModalOpen,
    logInput,
    setLogInput,
    handleCoachDeleteLog,
    setEditingLogId,
    resetForm,
    handleCoachUpdateLog,
    coachEditFormData,
    setCoachEditFormData,
    handleCoachSaveProfile,
    handleCoachChangeRole,
    coachGoalInput,
    setCoachGoalInput,
    handleCoachSaveGoals,
    selectedRunner,
    getRunnerFeedback,
    setCoachFeedbackComment,
    handleSaveCoachFeedback,
    openCoachEditModal,
    confirmDialog,
    handleExportMatrixCSV,
    setDemoMode,
    tournaments,
    raceCards,
    newTournamentInput,
    setNewTournamentInput,
    handleSaveTournament,
    handleDeleteTournament,
    handleSaveRaceCardFeedback,
    allFeedbacks,
  } = props;

  const { handlePrint } = usePrint();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(() => {
    return (
      localStorage.getItem(`notif_read_coach_${appId}`) ||
      "2000-01-01T00:00:00.000Z"
    );
  });

  const notifications = useMemo(() => {
    const list = [];
    if (raceCards && raceCards.length > 0) {
      raceCards.forEach((c) => {
        const timeStr = c.updatedAt || c.createdAt;
        if (timeStr) {
          const tour = tournaments.find((t) => t.id === c.tournamentId);
          list.push({
            id: `racecard_${c.id}_${timeStr}`,
            type: "Race Card",
            title: "大会ノートが提出/更新されました",
            message: `${c.runnerName}選手が「${tour?.name || "大会"}」のノートを提出/更新しました。`,
            time: timeStr,
            onClick: () => {
              setIsNotifOpen(false);
              setSelectedTourId(c.tournamentId);
              setView("coach-race");
            },
          });
        }
      });
    }

    if (allFeedbacks && allFeedbacks.length > 0) {
      allFeedbacks.forEach((f) => {
        if (f.runnerComment && f.updatedAt) {
          list.push({
            id: `review_${f.id}_${f.updatedAt}`,
            type: "Review",
            title: "振り返りが提出/更新されました",
            message: `${f.runnerName}選手が「${f.periodName || "指定期間"}」の振り返りを提出/更新しました。`,
            time: f.updatedAt,
            onClick: () => {
              setIsNotifOpen(false);
              const runner = activeRunners.find((r) => r.id === f.runnerId);
              if (runner) handleCoachEditRunner(runner);
            },
          });
        }
      });
    }
    return list.sort((a, b) => (a.time < b.time ? 1 : -1));
  }, [
    raceCards,
    allFeedbacks,
    tournaments,
    activeRunners,
    setView,
    handleCoachEditRunner,
  ]);

  const unreadCount = notifications.filter((n) => n.time > lastReadTime).length;

  const [editingLapCard, setEditingLapCard] = useState(null);
  const [lapInput, setLapInput] = useState("");
  const [lapResultInput, setLapResultInput] = useState("");
  const handleSaveLapTime = async () => {
    if (!editingLapCard) return;
    try {
      if (props.isDemoMode) {
        import("react-hot-toast").then((m) =>
          m.toast.success("【デモ】LAPを更新しました"),
        );
        setEditingLapCard(null);
        return;
      }
      await updateDoc(docRef("raceCards", editingLapCard.id), {
        lapTimes: lapInput,
        resultTime: lapResultInput,
        updatedAt: new Date().toISOString(),
        updatedBy: "監督",
      });
      import("react-hot-toast").then((m) =>
        m.toast.success(
          `${editingLapCard.runnerName}選手のLAPを更新しました！`,
        ),
      );
      setEditingLapCard(null);
    } catch (e) {
      import("react-hot-toast").then((m) =>
        m.toast.error("保存失敗: " + e.message),
      );
    }
  };

  const handleOpenNotif = () => {
    setIsNotifOpen(true);
    const nowStr = new Date().toISOString();
    setLastReadTime(nowStr);
    localStorage.setItem(`notif_read_coach_${appId}`, nowStr);
  };

  const [selectedTourId, setSelectedTourId] = useState(null);
  const [readingCard, setReadingCard] = useState(null);
  const [coachFeedbackInput, setCoachFeedbackInput] = useState("");
  const [showTeamReportId, setShowTeamReportId] = useState(null);

  const [statsSubTab, setStatsSubTab] = useState("ranking");
  const [isSubmitListOpen, setIsSubmitListOpen] = useState(false);
  const [isExistingPeriodsOpen, setIsExistingPeriodsOpen] = useState(false);
  const [isNewTournamentModalOpen, setIsNewTournamentModalOpen] =
    useState(false);
  const [raceMonthFilter, setRaceMonthFilter] = useState("all");
  const [diaryMode, setDiaryMode] = useState("list");
  const [listMonth, setListMonth] = useState(new Date());
  const [isDiarySaving, setIsDiarySaving] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  // 日誌フルフォーム用 state
  const [diaryInput, setDiaryInput] = useState({
    isRestDay: false,
    weather: "晴れ",
    temp: "",
    wind: 1,
    humidity: "",
    startTime: "15:50",
    endTime: "18:30",
    location: "1.53kmコース",
    locationDetail: "",
    reinforcements: [],
    reinforcementDetail: "",
    menu: "",
    result: "",
  });

  const reinforcementOptions = [
    "コア",
    "腹筋",
    "脚部",
    "フォーム",
    "ウェイト",
    "DM腹背",
    "DM投げ",
    "スタビライゼーション",
    "その他",
  ];

  const getDefaultTimes = (dateString) => {
    const d = new Date(dateString);
    const day = d.getDay();
    const month = d.getMonth() + 1;
    if (day === 0 || day === 6) return { startTime: "09:00", endTime: "12:00" };
    if (month === 7 || month === 8 || month === 9)
      return { startTime: "07:00", endTime: "10:00" };
    if (month === 12 || month === 3)
      return { startTime: "09:00", endTime: "10:00" };
    return { startTime: "15:50", endTime: "18:30" };
  };

  const coachExistingLog = useMemo(
    () => teamLogs?.find((l) => l.date === menuInput.date),
    [teamLogs, menuInput.date],
  );

  useEffect(() => {
    const defaultTimes = getDefaultTimes(menuInput.date);
    if (coachExistingLog) {
      setDiaryInput({
        isRestDay: coachExistingLog.isRestDay || false,
        weather: coachExistingLog.weather || "晴れ",
        temp: coachExistingLog.temp || "",
        wind: coachExistingLog.wind || 1,
        humidity: coachExistingLog.humidity || "",
        startTime: coachExistingLog.startTime || defaultTimes.startTime,
        endTime: coachExistingLog.endTime || defaultTimes.endTime,
        location: coachExistingLog.location || "1.53kmコース",
        locationDetail: coachExistingLog.locationDetail || "",
        reinforcements: coachExistingLog.reinforcements || [],
        reinforcementDetail: coachExistingLog.reinforcementDetail || "",
        menu: coachExistingLog.menu || "",
        result: coachExistingLog.result || "",
      });
    } else {
      setDiaryInput({
        isRestDay: false,
        weather: "晴れ",
        temp: "",
        wind: 1,
        humidity: "",
        startTime: defaultTimes.startTime,
        endTime: defaultTimes.endTime,
        location: "1.53kmコース",
        locationDetail: "",
        reinforcements: [],
        reinforcementDetail: "",
        menu: "",
        result: "",
      });
    }
  }, [menuInput.date, coachExistingLog]);

  const toggleCoachReinforcement = (item) => {
    setDiaryInput((prev) => {
      const current = prev.reinforcements;
      return current.includes(item)
        ? { ...prev, reinforcements: current.filter((i) => i !== item) }
        : { ...prev, reinforcements: [...current, item] };
    });
  };

  const saveCoachDiary = async () => {
    if (!diaryInput.menu) {
      const { toast } = await import("react-hot-toast");
      return toast.error("メニュー内容は必須です");
    }
    setIsDiarySaving(true);
    try {
      await setDoc(docRef("team_logs", menuInput.date), {
        ...diaryInput,
        date: menuInput.date,
        updatedBy: "監督",
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef("menus", menuInput.date), {
        date: menuInput.date,
        text: diaryInput.menu,
      });
      const { toast } = await import("react-hot-toast");
      toast.success(
        coachExistingLog ? "日誌を更新しました！" : "日誌を保存しました！",
      );
    } catch (e) {
      const { toast } = await import("react-hot-toast");
      toast.error("エラー: " + e.message);
    } finally {
      setIsDiarySaving(false);
    }
  };

  const handleCoachRestRegister = async () => {
    const restData = {
      ...diaryInput,
      isRestDay: true,
      menu: "【完全休養】本日はオフです。",
      startTime: "",
      endTime: "",
      location: "なし",
      result: "",
    };
    setIsDiarySaving(true);
    try {
      await setDoc(docRef("team_logs", menuInput.date), {
        ...restData,
        date: menuInput.date,
        updatedBy: "監督",
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef("menus", menuInput.date), {
        date: menuInput.date,
        text: restData.menu,
      });
      const { toast } = await import("react-hot-toast");
      toast.success(`${menuInput.date} を休養日として保存しました！`);
      setDiaryMode("list");
    } catch (e) {
      const { toast } = await import("react-hot-toast");
      toast.error("エラー: " + e.message);
    } finally {
      setIsDiarySaving(false);
    }
  };

  const deleteCoachDiary = async () => {
    if (!window.confirm(`${menuInput.date} の日誌を削除しますか？`)) return;
    try {
      await deleteDoc(docRef("team_logs", menuInput.date));
      await deleteDoc(docRef("menus", menuInput.date));
      const { toast } = await import("react-hot-toast");
      toast.success("日誌を削除しました");
      setDiaryMode("list");
    } catch (e) {
      const { toast } = await import("react-hot-toast");
      toast.error("削除エラー: " + e.message);
    }
  };

  // AI アシスタント
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiImage, setAiImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCoachDiaryWithAI = async () => {
    if (!aiImage) {
      const { toast } = await import("react-hot-toast");
      return toast.error("練習記録表の画像を選択してください");
    }
    setIsGenerating(true);
    try {
      const prompt = `添付された画像（陸上競技の練習記録表）から情報を読み取り、以下の【ルール】と【出力フォーマット】に厳密に従ってテキストデータとして出力してください。

【読み取りのルール】
1. **練習メニューの展開**:
- 画像中段の「チーム」と「練習メニュー」の対応を読み取ってください。
- 「〃」などの省略記号は、直上または該当する内容を補完し、完全な文字列として出力してください。

2. **メンバーの抽出と振り分け（重要）**:
- 画像右側の「メンバー」欄からメンバーの名前を抽出しますが、以下の例外ルールを必ず適用してください。
- **グループ変更**: 名前の付近（上など）に左記とは違うグループ名が示唆されている場合は、推察されるグループのメンバーとして含めてください。
- **別メニュー組**: 名前に「（ ）」がついている者は「別メニュー組」としてまとめてください。
- **欠席者**: 名前の付近に「欠」とある者は「欠席者」としてまとめてください。

3. **記録データの抽出**:
- 画像下段の「記録」セクションから、各グループの「LAP」、「PACE」（または「LAP(1000)」）、および「TOTAL」の数値を抽出してください。
- 「TOTAL」の列に記載がある場合は抽出し、記録の末尾に単純な丸括弧書きで \`(XX'XX"XX)\` のように追記してください（Totalという文字は不要）。
- 「LAP(1000)」や「PACE」の列に記載がある場合は、角括弧書きで \`[1km: XX'XX"XX]\` や \`[pace: XX'XX"XX]\` のように明記して追記してください。
- 記録表内にリカバリータイムがある場合は抽出し、記録の末尾に \`(r: XX"XX)\` のように追記してください。
- 各メンバー名の下にある丸印や矢印などは出力から除外してください。

【出力フォーマット】
「練習メニュー」と「練習記録」をそれぞれワンクリックでコピーできるように、別々のテキストコードブロック（\`\`\`text と \`\`\` で囲む形式）に分けて出力してください。

### 練習メニュー
\`\`\`text
快調走（またはその日のメインメニュー名）
■男子A・B ([メンバー名]・[メンバー名]...)
[距離] [メニュー名] ([設定ペース])...
■別メニュー組：[メンバー名]・[メンバー名]...
■欠席者：[メンバー名]・[メンバー名]...
\`\`\`

### 練習記録
\`\`\`text
■[記録のグループ名]
• [周回数または距離]：[LAPタイム] ([TOTALタイム]) [1km:[タイム] または pace:[タイム]]
\`\`\``;

      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(aiImage);
      });

      const functions = getFunctions();
      const analyzeDiaryImage = httpsCallable(functions, "analyzeDiaryImage");
      const result = await analyzeDiaryImage({
        prompt,
        base64Image: base64Data,
        mimeType: aiImage.type,
      });

      const generatedText = result.data.text;
      let extractedMenu = "";
      let extractedResult = "";

      try {
        const parts = generatedText.split("### 練習記録");
        if (parts.length === 2) {
          extractedMenu = parts[0]
            .replace(/### 練習メニュー/g, "")
            .replace(/```text/g, "")
            .replace(/```/g, "")
            .trim();
          extractedResult = parts[1]
            .replace(/```text/g, "")
            .replace(/```/g, "")
            .trim();
        } else {
          extractedResult = generatedText
            .replace(/```text/g, "")
            .replace(/```/g, "")
            .trim();
        }
      } catch {
        extractedResult = generatedText;
      }

      setDiaryInput((prev) => ({
        ...prev,
        menu: extractedMenu || prev.menu,
        result: extractedResult,
      }));

      const { toast } = await import("react-hot-toast");
      toast.success("✨ メニューと記録の自動振り分けが完了しました！");
      setShowAIModal(false);
      setAiImage(null);
    } catch (error) {
      const { toast } = await import("react-hot-toast");
      toast.error("生成に失敗しました: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-slate-50 overflow-hidden print:bg-white print:h-auto flex flex-col md:flex-row">
      <header className="bg-slate-950 text-white px-4 py-2.5 sticky top-0 z-50 md:p-5 md:h-screen md:w-64 md:flex md:flex-col md:justify-between shadow-xl print:hidden">
        <div className="flex items-center justify-between md:block">
          <h1 className="font-black italic text-lg flex items-center gap-2 tracking-tighter md:text-xl md:mb-7">
            <Users size={18} className="text-blue-400 md:w-5 md:h-5" /> COACH
            TERMINAL
          </h1>

          {/* モバイル用アイコン（右端） */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={handleOpenNotif}
              className={`relative p-1.5 rounded-lg transition-all ${unreadCount > 0 ? "text-rose-400" : "text-slate-400"}`}
            >
              {unreadCount > 0 ? (
                <>
                  <BellRing size={20} className="animate-pulse" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                </>
              ) : (
                <Bell size={20} />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>

          <nav className="hidden md:flex flex-col gap-1">
            {[
              { id: "home", icon: Home, label: "Home" },
              { id: "diary", icon: BookOpen, label: "Diary" },
              { id: "stats", icon: BarChart2, label: "Stats" },
              { id: "race", icon: Flag, label: "Race" },
              { id: "calendar", icon: CalendarDays, label: "Calendar" },
              { id: "roster", icon: Users, label: "Roster" },
              { id: "settings", icon: Settings, label: "Settings" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(`coach-${id}`)}
                className={`flex items-center gap-3 py-2 px-4 rounded-xl font-bold uppercase tracking-widest transition-all text-[11px] ${view === `coach-${id}` ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800"}`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="hidden md:block space-y-4 mt-auto">
          <button
            onClick={handleOpenNotif}
            className={`flex items-center gap-2 font-bold text-sm transition-all relative ${
              unreadCount > 0
                ? "text-rose-400 hover:text-rose-300"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {unreadCount > 0 ? (
              <>
                <div className="relative">
                  <BellRing size={18} className="animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                </div>
                Notifications ({unreadCount})
              </>
            ) : (
              <>
                <Bell size={18} /> Notifications
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="opacity-60 hover:opacity-100 flex items-center gap-2 font-bold text-sm text-slate-400"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="md:hidden flex-shrink-0 flex bg-slate-950 px-3 py-2 overflow-x-auto no-scrollbar print:hidden gap-1">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "diary", icon: BookOpen, label: "Diary" },
            { id: "stats", icon: BarChart2, label: "Stats" },
            { id: "race", icon: Flag, label: "Race" },
            { id: "calendar", icon: CalendarDays, label: "Cal" },
            { id: "roster", icon: Users, label: "Roster" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = view === `coach-${item.id}`;
            return (
              <button
                key={item.id}
                onClick={() => setView(`coach-${item.id}`)}
                className={`flex-none flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all active:scale-95 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-black uppercase tracking-wide">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex-shrink-0 flex justify-end items-center gap-3 px-5 py-2 bg-slate-50 border-b border-slate-100 no-print print:hidden">
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
        <main className="flex-1 overflow-y-auto p-5 md:p-8 w-full max-w-md mx-auto md:max-w-none print:max-w-none print:p-0 print:w-full print:overflow-visible">
          {view === "coach-home" && (
            <div className="space-y-6 animate-in fade-in">
              {/* 提出状況 */}
              <div className="bg-white p-4 rounded-[2rem] shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 p-2.5 bg-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:ring-2 ring-blue-500"
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                  />
                  <div
                    onClick={() => {
                      if (coachStats.alertList?.length > 0)
                        setIsPainAlertModalOpen(true);
                    }}
                    className={`px-5 py-2.5 rounded-2xl flex flex-col items-center transition-all ${coachStats.alertList?.length > 0 ? "bg-rose-50 cursor-pointer active:scale-95" : "bg-slate-100"}`}
                  >
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-0.5 ${coachStats.alertList?.length > 0 ? "text-rose-500" : "text-slate-400"}`}
                    >
                      <AlertTriangle size={9} /> Alert
                    </span>
                    <div className="flex items-end gap-0.5">
                      <span
                        className={`text-2xl font-black leading-tight ${coachStats.alertList?.length > 0 ? "text-rose-600" : "text-emerald-600"}`}
                      >
                        {coachStats.alertList?.length || 0}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                        名
                      </span>
                    </div>
                  </div>
                  <div
                    onClick={() => setIsSubmitListOpen((v) => !v)}
                    className="px-5 py-2.5 rounded-2xl flex flex-col items-center bg-slate-100 cursor-pointer active:scale-95 transition-all hover:bg-slate-200"
                  >
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      提出済
                    </span>
                    <div className="flex items-end gap-0.5">
                      <span className="text-2xl font-black text-emerald-600 leading-tight">
                        {
                          checkListData.filter(
                            (r) => r.status !== "unsubmitted",
                          ).length
                        }
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                        / {checkListData.length}名
                      </span>
                    </div>
                  </div>
                </div>
                {isSubmitListOpen && (
                  <div className="divide-y divide-slate-100 grid md:grid-cols-2 gap-x-12 gap-y-2 animate-in fade-in slide-in-from-top-2">
                    {checkListData.map((r) => (
                      <div
                        key={r.id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm ${r.status === "active" ? "bg-blue-500" : r.status === "rest" ? "bg-emerald-400" : "bg-rose-400"}`}
                          >
                            {r.lastName.charAt(0)}
                          </div>
                          <p className="font-bold text-slate-800 text-sm">
                            {r.lastName} {r.firstName}
                          </p>
                        </div>
                        <div>
                          {r.status === "active" && (
                            <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                              <Check size={12} /> {r.detail}
                            </span>
                          )}
                          {r.status === "rest" && (
                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black">
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
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 h-[28rem] flex flex-col">
                <div className="p-5 bg-slate-50 border-b flex items-center gap-2">
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
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-5 mb-2">
                          {l.date.slice(5).replace("-", "/")} · {l.category}
                        </div>
                        <div className="flex gap-2 ml-5 mb-1">
                          <span
                            className={`px-2 py-1 rounded-md text-[10px] font-black ${l.rpe >= 8 ? "bg-rose-100 text-rose-600 border border-rose-200" : l.rpe >= 5 ? "bg-orange-100 text-orange-600 border border-orange-200" : "bg-blue-50 text-blue-600 border border-blue-100"}`}
                          >
                            RPE {l.rpe}
                          </span>
                          {l.pain > 1 && (
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 ${l.pain >= 4 ? "bg-purple-100 text-purple-600 border border-purple-200 animate-pulse" : l.pain === 3 ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-yellow-100 text-yellow-700 border border-yellow-200"}`}
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
          )}

          {view === "coach-stats" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                {["ranking", "report"].map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setStatsSubTab(sub)}
                    className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${statsSubTab === sub ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                  >
                    {sub === "ranking" ? "ランキング" : "レポート"}
                  </button>
                ))}
              </div>
              {statsSubTab === "ranking" && (
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
              )}
              {statsSubTab === "report" && (
                <CoachReportView
                  handleExportMatrixCSV={handleExportMatrixCSV}
                  handlePrint={handlePrint}
                  activeRunners={activeRunners}
                  targetPeriod={targetPeriod}
                  reportMatrix={reportMatrix}
                  monthlyTrendData={monthlyTrendData}
                  cumulativeData={cumulativeData}
                  reportChartData={reportChartData}
                />
              )}
            </div>
          )}

          {view === "coach-diary" &&
            (() => {
              const year = listMonth.getFullYear();
              const month = listMonth.getMonth() + 1;
              const prefix = `${year}-${String(month).padStart(2, "0")}`;
              const monthlyLogs = (teamLogs || [])
                .filter((l) => l.date.startsWith(prefix))
                .sort((a, b) => (a.date < b.date ? 1 : -1));

              return (
                <div className="space-y-6 animate-in fade-in">
                  {diaryMode === "list" ? (
                    <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 max-w-2xl mx-auto">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 flex items-center gap-2">
                          <BookOpen size={14} /> Team Diary Check & Edit
                        </h3>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
                        <button
                          onClick={() => {
                            const d = new Date(listMonth);
                            d.setMonth(d.getMonth() - 1);
                            setListMonth(d);
                          }}
                          className="p-2 bg-white rounded-full shadow-sm hover:bg-blue-50 text-slate-500 transition-colors"
                        >
                          <ArrowLeft size={20} />
                        </button>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Target Month
                          </p>
                          <h2 className="text-lg font-black text-slate-800">
                            {year}年 {month}月
                          </h2>
                        </div>
                        <button
                          onClick={() => {
                            const d = new Date(listMonth);
                            d.setMonth(d.getMonth() + 1);
                            setListMonth(d);
                          }}
                          className="p-2 bg-white rounded-full shadow-sm hover:bg-blue-50 text-slate-500 transition-colors"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setMenuInput({ ...menuInput, date: getTodayStr() });
                          setDiaryMode("edit");
                        }}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={20} /> 今日の日誌をチェック・作成する
                      </button>
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        {monthlyLogs.length > 0 ? (
                          monthlyLogs.map((log) => (
                            <DiaryListItem
                              key={log.date}
                              log={log}
                              isExpanded={false}
                              showChevron={true}
                              onClick={() => {
                                setMenuInput({ ...menuInput, date: log.date });
                                setDiaryMode("edit");
                              }}
                            />
                          ))
                        ) : (
                          <div className="text-center py-10 text-slate-300 font-bold text-sm">
                            この月の日誌はありません
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-5 max-w-2xl mx-auto animate-in slide-in-from-right-10 relative">
                      <div className="flex justify-between items-center mb-2">
                        <button
                          onClick={() => setDiaryMode("list")}
                          className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <ArrowLeft size={16} /> 一覧に戻る
                        </button>
                        {coachExistingLog && (
                          <button
                            onClick={deleteCoachDiary}
                            className="text-rose-400 hover:text-rose-600 bg-rose-50 p-2 rounded-xl transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <BookOpen size={18} className="text-blue-500" />
                        <h2 className="text-sm font-black text-slate-700">
                          練習日誌の記録
                        </h2>
                      </div>

                      {/* Date + 休養日ボタン */}
                      <div className="flex items-end gap-3 mb-6">
                        <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                            Date
                          </label>
                          <input
                            type="date"
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-blue-500"
                            value={menuInput.date}
                            onChange={(e) =>
                              setMenuInput({
                                ...menuInput,
                                date: e.target.value,
                              })
                            }
                          />
                        </div>
                        <button
                          onClick={handleCoachRestRegister}
                          disabled={isDiarySaving}
                          className={`py-3 px-5 rounded-xl font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 ${isDiarySaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
                        >
                          {isDiarySaving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <BookOpen size={16} />
                          )}
                          休養日
                        </button>
                      </div>

                      {/* 天気・気温・湿度 */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                            Weather
                          </label>
                          <select
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500"
                            value={diaryInput.weather}
                            onChange={(e) =>
                              setDiaryInput({
                                ...diaryInput,
                                weather: e.target.value,
                              })
                            }
                          >
                            <option value="晴れ">☀ 晴</option>
                            <option value="曇り">☁ 曇</option>
                            <option value="雨">☂ 雨</option>
                            <option value="雪">⛄ 雪</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                            Temp (℃)
                          </label>
                          <input
                            type="number"
                            placeholder="25"
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500"
                            value={diaryInput.temp}
                            onChange={(e) =>
                              setDiaryInput({
                                ...diaryInput,
                                temp: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                            Humid (%)
                          </label>
                          <input
                            type="number"
                            placeholder="60"
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500"
                            value={diaryInput.humidity}
                            onChange={(e) =>
                              setDiaryInput({
                                ...diaryInput,
                                humidity: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* 風速 */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                            Wind Strength
                          </label>
                          <span className="text-xs font-black text-blue-600">
                            {diaryInput.wind === 1
                              ? "1 (無風)"
                              : diaryInput.wind === 5
                                ? "5 (強風)"
                                : diaryInput.wind}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          step="1"
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                          value={diaryInput.wind}
                          onChange={(e) =>
                            setDiaryInput({
                              ...diaryInput,
                              wind: parseInt(e.target.value),
                            })
                          }
                        />
                        <div className="flex justify-between px-1">
                          <span className="text-[8px] text-slate-400">弱</span>
                          <span className="text-[8px] text-slate-400">強</span>
                        </div>
                      </div>

                      {/* 開始・終了時刻 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                            Start
                          </label>
                          <input
                            type="time"
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500"
                            value={diaryInput.startTime}
                            onChange={(e) =>
                              setDiaryInput({
                                ...diaryInput,
                                startTime: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                            End
                          </label>
                          <input
                            type="time"
                            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500"
                            value={diaryInput.endTime}
                            onChange={(e) =>
                              setDiaryInput({
                                ...diaryInput,
                                endTime: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* 場所 */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1">
                          <MapPin size={12} /> Location
                        </label>
                        <select
                          className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-blue-500"
                          value={diaryInput.location}
                          onChange={(e) =>
                            setDiaryInput({
                              ...diaryInput,
                              location: e.target.value,
                            })
                          }
                        >
                          <option value="1.53kmコース">1.53kmコース</option>
                          <option value="1.1kmコース">1.1kmコース</option>
                          <option value="河川敷">河川敷</option>
                          <option value="クロカン・芝">クロカン・芝</option>
                          <option value="防災公園">防災公園</option>
                          <option value="競技場">競技場 (詳細記入)</option>
                          <option value="その他">その他 (詳細記入)</option>
                        </select>
                        {(diaryInput.location === "競技場" ||
                          diaryInput.location === "その他") && (
                          <input
                            type="text"
                            placeholder="詳細を入力 (例: 市営競技場)"
                            className="w-full p-3 bg-white border-2 border-blue-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:border-blue-500 mt-2 animate-in fade-in"
                            value={diaryInput.locationDetail}
                            onChange={(e) =>
                              setDiaryInput({
                                ...diaryInput,
                                locationDetail: e.target.value,
                              })
                            }
                          />
                        )}
                      </div>

                      {/* 補強 */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1">
                          <Dumbbell size={12} /> Reinforcement
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {reinforcementOptions.map((option) => (
                            <button
                              key={option}
                              onClick={() => toggleCoachReinforcement(option)}
                              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${diaryInput.reinforcements.includes(option) ? "bg-blue-500 text-white border-blue-500 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        {diaryInput.reinforcements.includes("その他") && (
                          <input
                            type="text"
                            placeholder="その他の補強内容..."
                            className="w-full p-3 bg-white border-2 border-blue-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:border-blue-500 mt-2 animate-in fade-in"
                            value={diaryInput.reinforcementDetail}
                            onChange={(e) =>
                              setDiaryInput({
                                ...diaryInput,
                                reinforcementDetail: e.target.value,
                              })
                            }
                          />
                        )}
                      </div>

                      {/* AI アシスタント */}
                      <div className="flex justify-end pt-2 pb-1">
                        <button
                          onClick={() => setShowAIModal(true)}
                          className="text-xs bg-blue-100 text-blue-700 px-4 py-2.5 rounded-xl font-black flex items-center gap-1.5 active:scale-95 transition-all hover:bg-blue-200 shadow-sm"
                        >
                          <Sparkles size={16} /> AIアシスタントで文章を自動作成
                        </button>
                      </div>

                      {/* メニュー */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                          Menu Plan
                        </label>
                        <textarea
                          className="w-full p-4 bg-slate-50 rounded-xl h-32 font-bold text-slate-600 outline-none focus:ring-2 ring-blue-500 text-sm resize-none"
                          placeholder="本日の練習メニューを入力..."
                          value={diaryInput.menu}
                          onChange={(e) =>
                            setDiaryInput({
                              ...diaryInput,
                              menu: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* 結果・所感 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                          Results / Notes
                        </label>
                        <textarea
                          className="w-full p-4 bg-blue-50 rounded-xl h-32 font-bold text-blue-900 outline-none focus:ring-2 ring-blue-500 text-sm resize-none"
                          placeholder="練習の結果、雰囲気、ポイント練習のタイム設定など..."
                          value={diaryInput.result}
                          onChange={(e) =>
                            setDiaryInput({
                              ...diaryInput,
                              result: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* 保存ボタン */}
                      <button
                        onClick={saveCoachDiary}
                        disabled={isDiarySaving}
                        className={`w-full py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isDiarySaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white shadow-blue-200"}`}
                      >
                        {isDiarySaving ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />{" "}
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save size={18} />{" "}
                            {coachExistingLog
                              ? "日誌を更新"
                              : "日誌を保存・公開"}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* AI アシスタント モーダル */}
          {showAIModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                  <h3 className="font-black flex items-center gap-2">
                    <Sparkles size={18} /> AI 記録表読み取り
                  </h3>
                  <button
                    onClick={() => {
                      setShowAIModal(false);
                      setAiImage(null);
                    }}
                    className="hover:bg-white/20 p-1 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-xs font-bold text-slate-500">
                    練習記録表（ホワイトボードやノート）の写真をアップロードしてください。AIが画像からメニュー、メンバー、タイムを自動で読み取りテキスト化します。
                  </p>
                  <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 text-center bg-slate-50 hover:bg-blue-50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAiImage(e.target.files[0])}
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        setShowAIModal(false);
                        setAiImage(null);
                      }}
                      className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={generateCoachDiaryWithAI}
                      disabled={isGenerating || !aiImage}
                      className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-black shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />{" "}
                          読み取り中...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} /> 文字起こしを実行
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === "coach-race" && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-[0.3em]">
                  Race & Tournament
                </h3>
              </div>
              <button
                onClick={() => setIsNewTournamentModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
              >
                <Plus size={15} strokeWidth={3} /> 新しい大会を登録する
              </button>

              {/* 大会登録モーダル */}
              {isNewTournamentModalOpen && (
                <div
                  className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
                  onClick={() => setIsNewTournamentModalOpen(false)}
                >
                  <div
                    className="bg-white w-full max-w-sm rounded-[2rem] p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
                        <Flag size={14} /> 新しい大会を登録する
                      </h4>
                      <button
                        onClick={() => setIsNewTournamentModalOpen(false)}
                        className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="大会名 (例: 秋季県大会)"
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                      value={newTournamentInput.name}
                      onChange={(e) =>
                        setNewTournamentInput({
                          ...newTournamentInput,
                          name: e.target.value,
                        })
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                        value={newTournamentInput.startDate}
                        onChange={(e) =>
                          setNewTournamentInput({
                            ...newTournamentInput,
                            startDate: e.target.value,
                          })
                        }
                      />
                      <input
                        type="date"
                        className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                        value={newTournamentInput.endDate}
                        onChange={(e) =>
                          setNewTournamentInput({
                            ...newTournamentInput,
                            endDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      onClick={async () => {
                        await handleSaveTournament();
                        setIsNewTournamentModalOpen(false);
                      }}
                      disabled={isSubmitting}
                      className={`w-full py-3 rounded-xl font-black text-sm transition-all ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"}`}
                    >
                      {isSubmitting ? "登録中..." : "登録・通知"}
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-3 pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Registered Races
                </h4>
                {tournaments.length > 0 &&
                  (() => {
                    const months = [
                      ...new Set(
                        tournaments
                          .map((t) => t.startDate?.slice(0, 7))
                          .filter(Boolean),
                      ),
                    ]
                      .sort()
                      .reverse();
                    return (
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {["all", ...months].map((m) => (
                          <button
                            key={m}
                            onClick={() => setRaceMonthFilter(m)}
                            className={`flex-none px-3 py-1 rounded-full text-[10px] font-black transition-all ${raceMonthFilter === m ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                          >
                            {m === "all" ? "すべて" : m.replace("-", "/")}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                <div className="overflow-y-auto max-h-[calc(100dvh-380px)] space-y-3 pr-1">
                  {tournaments.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 font-bold py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                      大会はまだ登録されていません
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {tournaments
                        .filter(
                          (t) =>
                            raceMonthFilter === "all" ||
                            t.startDate?.slice(0, 7) === raceMonthFilter,
                        )
                        .map((tour) => (
                          <div
                            key={tour.id}
                            className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-sm"
                          >
                            <div
                              className="flex-1 cursor-pointer group pr-4"
                              onClick={() => setShowTeamReportId(tour.id)}
                            >
                              <h5 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                                {tour.name}{" "}
                                <BarChart2
                                  size={16}
                                  className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                />
                              </h5>
                              <p className="text-[10px] font-bold text-slate-400 mt-1">
                                {tour.startDate.replace(/-/g, "/")} 〜{" "}
                                {tour.endDate?.replace(/-/g, "/") || ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => setSelectedTourId(tour.id)}
                                className="flex flex-col items-center gap-1 active:scale-95 transition-all cursor-pointer"
                              >
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1 hover:bg-indigo-100 shadow-sm">
                                  <ClipboardCheck size={12} />
                                  {
                                    raceCards.filter(
                                      (card) => card.tournamentId === tour.id,
                                    ).length
                                  }{" "}
                                  枚提出
                                </span>
                                {(() => {
                                  const pending = raceCards.filter(
                                    (card) =>
                                      card.tournamentId === tour.id &&
                                      !card.coachFeedback,
                                  ).length;
                                  return pending > 0 ? (
                                    <span className="text-[10px] font-black bg-amber-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                      <MessageSquare size={10} /> FB未 {pending}
                                      件
                                    </span>
                                  ) : raceCards.filter(
                                      (card) => card.tournamentId === tour.id,
                                    ).length > 0 ? (
                                    <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                                      <Check size={10} /> FB完了
                                    </span>
                                  ) : null;
                                })()}
                              </button>
                              <button
                                onClick={() => handleDeleteTournament(tour.id)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                title="大会を削除する"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === "coach-roster" && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in fade-in">
              <h3 className="font-black uppercase text-[10px] text-slate-400 text-center tracking-[0.3em]">
                Team Roster
              </h3>
              {(() => {
                const athletes = activeRunners.filter(
                  (r) => r.role !== ROLES.MANAGER,
                );
                const managers = activeRunners.filter(
                  (r) => r.role === ROLES.MANAGER,
                );
                const entranceYears = [
                  ...new Set(
                    athletes.map((r) => (r.memberCode || r.id).substring(0, 2)),
                  ),
                ].sort();
                const athleteCard = (r) => (
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
                        <div className="flex items-center gap-2 mt-0.5 mb-0.5">
                          <span className="text-[10px] font-mono font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            ID: {r.memberCode || "-"}
                          </span>
                          {r.gender && (
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${r.gender === "男" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"}`}
                            >
                              {r.gender}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-300 font-mono">
                            PIN: {r.pin || "----"}
                          </span>
                        </div>
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
                );
                return (
                  <>
                    {entranceYears.map((year, idx) => {
                      const gOrd = { 男: 0, 女: 1 };
                      const group = athletes
                        .filter((r) => (r.memberCode || r.id).startsWith(year))
                        .sort((a, b) => {
                          const ga = gOrd[a.gender] ?? 2;
                          const gb = gOrd[b.gender] ?? 2;
                          if (ga !== gb) return ga - gb;
                          return (a.memberCode || a.id).localeCompare(
                            b.memberCode || b.id,
                          );
                        });
                      if (group.length === 0) return null;
                      return (
                        <div
                          key={year}
                          className={`space-y-2 ${idx > 0 ? "pt-6 border-t border-slate-100" : ""}`}
                        >
                          <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                            <UserCheck size={16} /> 20{year}年度入学
                            <span className="text-slate-400 font-bold normal-case">
                              ({group.length}名)
                            </span>
                          </h4>
                          <div className="divide-y divide-slate-100">
                            {group.map(athleteCard)}
                          </div>
                        </div>
                      );
                    })}
                    {managers.length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-slate-100">
                        <h4 className="text-xs font-black uppercase text-indigo-600 flex items-center gap-2">
                          <ClipboardList size={16} /> Managers (
                          {managers.length})
                        </h4>
                        <div className="divide-y divide-slate-100 grid md:grid-cols-2 gap-x-12 gap-y-0">
                          {managers.map((r) => (
                            <div
                              key={r.id}
                              className="py-4 flex items-center justify-between group cursor-pointer hover:bg-indigo-50/50 transition-colors rounded-xl px-2"
                              onClick={() => handleCoachEditRunner(r)}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-black text-indigo-600">
                                  {r.lastName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">
                                    {r.lastName} {r.firstName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 mb-0.5">
                                    <span className="text-[10px] font-mono font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                      ID: {r.memberCode || "-"}
                                    </span>
                                    <span className="text-[10px] text-slate-300 font-mono">
                                      PIN: {r.pin || "----"}
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-black text-white bg-indigo-400 px-2 py-0.5 rounded-full">
                                    MANAGER
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartPreview(r);
                                  }}
                                  className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg bg-slate-50 transition-colors"
                                  title="ダッシュボードをプレビュー"
                                >
                                  <Eye size={18} />
                                </button>
                                <ChevronRight
                                  className="text-slate-300"
                                  size={20}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
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
                                  await updateDoc(docRef("runners", r.id), {
                                    status: "active",
                                  });
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
                                  await deleteDoc(docRef("runners", r.id));
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
              <button
                onClick={() => setView("coach-home")}
                className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest"
              >
                ホームに戻る
              </button>
            </div>
          )}

          {view === "coach-runner-detail" && selectedRunner && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in slide-in-from-right-10 max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setView("menu")}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <h3 className="font-black uppercase text-[10px] text-slate-400 text-center tracking-[0.3em]">
                  Athlete Detail
                </h3>
                <div className="w-9" />
              </div>
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
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">
                    Gender
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {["男", "女"].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() =>
                          setCoachEditFormData({
                            ...coachEditFormData,
                            gender: g,
                          })
                        }
                        className={`py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 ${
                          coachEditFormData.gender === g
                            ? g === "男"
                              ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                              : "bg-pink-500 text-white shadow-md shadow-pink-200"
                            : "bg-slate-50 text-slate-400 border border-slate-200"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCoachSaveProfile}
                  disabled={isSubmitting}
                  className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white active:scale-95"}`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> 更新中...
                    </>
                  ) : (
                    "プロフィール更新"
                  )}
                </button>
              </div>
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
                    <Target size={16} /> Goal Management
                  </h4>
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
                    disabled={isSubmitting}
                    className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all mt-2 flex items-center justify-center gap-1.5 ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-emerald-600 text-white active:scale-95"}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> 保存中...
                      </>
                    ) : (
                      "目標値を保存"
                    )}
                  </button>
                </div>
              </div>
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
                          <div className="flex justify-between items-center pr-2">
                            <p className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                              {l.date.slice(5).replace("-", "/")}{" "}
                              <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-600 text-[9px]">
                                {l.category}
                              </span>
                            </p>
                            <p className="text-sm font-black text-blue-600">
                              {l.distance}km
                            </p>
                          </div>
                          <div className="flex gap-2 mt-2 mb-2">
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
                          {l.menuDetail && (
                            <p className="text-[10px] text-slate-500 bg-white/60 p-1.5 rounded-lg leading-relaxed">
                              {l.menuDetail}
                            </p>
                          )}
                        </div>
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
                    disabled={isSubmitting}
                    className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-slate-800 text-white active:scale-95"}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> 送信中...
                      </>
                    ) : (
                      "フィードバック送信"
                    )}
                  </button>
                </div>
              </div>
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
                            docRef("runners", selectedRunner.id),
                            {
                              status: "retired",
                            },
                          );
                          setConfirmDialog({
                            isOpen: false,
                            message: "",
                            onConfirm: null,
                          });
                          import("react-hot-toast").then((module) => {
                            module.toast.success(
                              `${selectedRunner.lastName}選手をアーカイブしました`,
                            );
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
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                  <Users size={16} /> Role
                </h4>
                <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">
                      {selectedRunner.role === ROLES.MANAGER
                        ? "マネージャー"
                        : "選手"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                      次回ログイン時に反映されます
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      handleCoachChangeRole(
                        selectedRunner,
                        selectedRunner.role === ROLES.MANAGER
                          ? "athlete"
                          : ROLES.MANAGER,
                      )
                    }
                    className={`px-4 py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
                      selectedRunner.role === ROLES.MANAGER
                        ? "bg-blue-500 text-white"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {selectedRunner.role === ROLES.MANAGER
                      ? "選手に転向"
                      : "マネージャーに転向"}
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
            <div className="bg-white p-5 rounded-[2rem] shadow-sm space-y-4 animate-in slide-in-from-right-5 max-w-2xl mx-auto">
              <h3 className="font-black uppercase text-[10px] text-slate-400 text-center tracking-[0.3em]">
                Settings
              </h3>

              <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                  <RotateCcw size={14} /> Default Display Period
                </h4>
                <select
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white"
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

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                  <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                    <Calendar size={14} />{" "}
                    {editingPeriodId ? "Edit Period" : "Add Custom Period"}
                  </h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="期間名 (例: 夏合宿)"
                      className="p-2.5 rounded-xl border border-slate-200 text-sm font-bold w-full"
                      value={newPeriodInput.name}
                      onChange={(e) =>
                        updateNewPeriodInputWithAutoQuarters(
                          "name",
                          e.target.value,
                        )
                      }
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="date"
                        className="p-2.5 rounded-xl border border-slate-200 text-sm font-bold w-full"
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
                        className="p-2.5 rounded-xl border border-slate-200 text-sm font-bold w-full"
                        value={newPeriodInput.end}
                        onChange={(e) =>
                          updateNewPeriodInputWithAutoQuarters(
                            "end",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    {newPeriodInput.start && newPeriodInput.end && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 animate-in fade-in">
                        <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                          Quarter Details (Auto-calculated, Edit if needed)
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {newPeriodInput.quarters.map((q, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs font-black w-8 text-slate-500">
                                Q{idx + 1}
                              </span>
                              <input
                                type="date"
                                className="p-1.5 rounded-lg border border-slate-100 text-xs font-bold w-full"
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
                                className="p-1.5 rounded-lg border border-slate-100 text-xs font-bold w-full"
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
                          className="w-1/3 py-2.5 bg-slate-200 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-300 transition-colors"
                        >
                          キャンセル
                        </button>
                      )}
                      <button
                        onClick={handleSaveCustomPeriod}
                        disabled={isPeriodSaving}
                        className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 ${isPeriodSaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                      >
                        {isPeriodSaving ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />{" "}
                            保存中...
                          </>
                        ) : editingPeriodId ? (
                          "更新する"
                        ) : (
                          "追加する"
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <button
                      onClick={() => setIsExistingPeriodsOpen((v) => !v)}
                      className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                      <span>
                        Existing Periods{" "}
                        {appSettings.customPeriods?.length > 0
                          ? `(${appSettings.customPeriods.length})`
                          : ""}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`transition-transform ${isExistingPeriodsOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isExistingPeriodsOpen && (
                      <div className="space-y-1.5 mt-2">
                        {appSettings.customPeriods &&
                          appSettings.customPeriods.map((p) => (
                            <div
                              key={p.id}
                              className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-slate-100"
                            >
                              <div>
                                <p className="font-bold text-sm text-slate-700">
                                  {p.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  {p.start} ~ {p.end}
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleEditCustomPeriod(p)}
                                  className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomPeriod(p.id)}
                                  className="p-1.5 bg-rose-50 rounded-lg text-rose-400 hover:text-rose-600 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        {(!appSettings.customPeriods ||
                          appSettings.customPeriods.length === 0) && (
                          <p className="text-center text-xs text-slate-300 py-1">
                            期間はまだありません
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">
                      Passcode
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      className="w-full p-3 bg-slate-50 rounded-2xl font-black text-2xl text-center outline-none border-2 border-transparent focus:border-blue-500 font-mono tracking-[0.4em]"
                      value={appSettings.coachPass}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          coachPass: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-500 uppercase ml-2 tracking-widest">
                      Team Join
                    </label>
                    <input
                      type="text"
                      className="w-full p-3 bg-slate-50 rounded-2xl font-black text-2xl text-center outline-none border-2 border-transparent focus:border-emerald-500 tracking-[0.4em] text-emerald-600"
                      value={appSettings.teamPass}
                      onChange={(e) =>
                        setAppSettings({
                          ...appSettings,
                          teamPass: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setIsSettingsSaving(true);
                    try {
                      await setDoc(settingsDocRef(), appSettings);
                      import("react-hot-toast").then((m) =>
                        m.toast.success("設定を保存しました"),
                      );
                    } catch (e) {
                      import("react-hot-toast").then((m) =>
                        m.toast.error("エラー: " + e.message),
                      );
                    } finally {
                      setIsSettingsSaving(false);
                    }
                  }}
                  disabled={isSettingsSaving}
                  className={`w-full py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 ${isSettingsSaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-slate-900 text-white active:scale-95"}`}
                >
                  {isSettingsSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> 保存中...
                    </>
                  ) : (
                    "設定保存"
                  )}
                </button>
              </div>
            </div>
          )}

          {isCoachEditModalOpen && (
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
                        value={logInput.date}
                        onChange={(e) =>
                          setLogInput({ ...logInput, date: e.target.value })
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
                        value={logInput.distance}
                        onChange={(e) =>
                          setLogInput({ ...logInput, distance: e.target.value })
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
                      value={logInput.menuDetail}
                      onChange={(e) =>
                        setLogInput({ ...logInput, menuDetail: e.target.value })
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
                        value={logInput.rpe}
                        onChange={(e) =>
                          setLogInput({
                            ...logInput,
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
                        value={logInput.pain}
                        onChange={(e) =>
                          setLogInput({
                            ...logInput,
                            pain:
                              e.target.value === ""
                                ? ""
                                : parseInt(e.target.value, 10),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-4 border-t border-slate-100 mt-2">
                  <button
                    onClick={handleCoachDeleteLog}
                    className="p-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors"
                    title="この記録を削除"
                  >
                    <Trash2 size={18} />
                  </button>
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
                  <button
                    onClick={handleCoachUpdateLog}
                    disabled={isSubmitting}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700"}`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> 更新中...
                      </>
                    ) : (
                      "更新して保存"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                    <AlertTriangle size={20} /> Condition Alert List
                  </h3>
                  <button
                    onClick={() => setIsPainAlertModalOpen(false)}
                    className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                  {coachStats.alertList?.map(
                    ({ runner, latestLog, alerts }) => (
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
                                {latestLog
                                  ? latestLog.date.slice(5).replace("-", "/")
                                  : "記録なし"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {alerts.map((a, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-sm ${a.color}`}
                              >
                                {a.type === "pain" && <HeartPulse size={12} />}
                                {a.type === "fatigue" && <Activity size={12} />}
                                {a.label}
                              </span>
                            ))}
                          </div>
                        </div>
                        {latestLog && (
                          <div className="bg-white/60 p-2 rounded-xl mt-1">
                            <p className="text-[11px] text-slate-600 font-bold">
                              {latestLog.category}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                              {latestLog.menuDetail || "（コメントなし）"}
                            </p>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setIsPainAlertModalOpen(false);
                            handleCoachEditRunner(runner);
                          }}
                          className="text-[10px] font-bold text-rose-400 text-right hover:text-rose-600 flex items-center justify-end gap-1 mt-1"
                        >
                          詳細・連絡する <ChevronRight size={12} />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {isNotifOpen && (
            <div
              className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in"
              onClick={() => setIsNotifOpen(false)}
            >
              <div
                className="bg-white w-full max-w-md max-h-[80vh] rounded-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-[2.5rem] sticky top-0 z-10">
                  <h3 className="font-black text-lg flex items-center gap-2 text-slate-800">
                    <Bell className="text-rose-500" /> Notifications
                  </h3>
                  <button
                    onClick={() => setIsNotifOpen(false)}
                    className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full active:scale-95"
                  >
                    閉じる
                  </button>
                </div>
                <div className="overflow-y-auto p-4 space-y-3 pb-8">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                      <Bell size={40} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-xs font-bold text-slate-500">
                        新しい提出・お知らせはありません
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={notif.onClick}
                        className="p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition-all cursor-pointer hover:border-blue-200 shadow-sm relative overflow-hidden group"
                      >
                        {notif.time > lastReadTime && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`text-[9px] font-black text-white px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm ${
                              notif.type === "Race Card"
                                ? "bg-indigo-500"
                                : "bg-emerald-500"
                            }`}
                          >
                            {notif.type}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {new Date(notif.time).toLocaleDateString("ja-JP")}
                          </span>
                        </div>
                        <p className="font-black text-slate-800 text-sm mb-1">
                          {notif.title}
                        </p>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed">
                          {notif.message}
                        </p>
                        <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-bold text-blue-500 flex items-center gap-1">
                            確認・コメントする <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100 space-y-4">
                <h4 className="font-black text-sm text-purple-700 flex items-center gap-2">
                  <Eye size={18} /> Admin Tools
                </h4>
                <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                  この機能はシステム管理者用です。他のユーザー権限での動作確認や、設定のテストを行うことができます。
                </p>
                <div
                  id="demo-buttons-section"
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <button
                    onClick={() => setDemoMode("manager")}
                    className="p-5 bg-amber-50 text-amber-700 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-2 hover:bg-amber-100 border border-amber-200 shadow-sm active:scale-95 transition-all"
                  >
                    <Users size={24} />
                    マネージャープレビュー
                  </button>
                  <button
                    onClick={() => {
                      setDemoMode("admin");
                      setView("menu");
                      window.scrollTo(0, 0);
                    }}
                    className="p-5 bg-purple-100 text-purple-800 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-2 hover:bg-purple-200 border border-purple-300 shadow-sm active:scale-95 transition-all"
                  >
                    <Eye size={24} />
                    選手プレビュー
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === "coach-calendar" && (
            <div className="animate-in fade-in max-w-md mx-auto">
              {selectedRunner && (
                <p className="text-xs font-bold text-slate-400 mb-3 px-1">
                  {selectedRunner.lastName} {selectedRunner.firstName}{" "}
                  の記録を表示中
                </p>
              )}
              <CalendarView
                allLogs={allLogs}
                teamLogs={teamLogs}
                tournaments={tournaments}
                role="coach"
                currentUserId={selectedRunner?.id || null}
              />
            </div>
          )}
        </main>
      </div>

      {showTeamReportId && (
        <TeamRaceReport
          reportTour={tournaments.find((t) => t.id === showTeamReportId)}
          reportCards={raceCards.filter(
            (c) => c.tournamentId === showTeamReportId,
          )}
          onClose={() => setShowTeamReportId(null)}
          canEdit
          onSaveCard={async (cardId, { resultTime, lapTimes }) => {
            await updateDoc(docRef("raceCards", cardId), {
              resultTime,
              lapTimes,
              updatedAt: new Date().toISOString(),
              updatedBy: "coach",
            });
          }}
        />
      )}

      {selectedTourId &&
        (() => {
          const currentTour = tournaments.find((t) => t.id === selectedTourId);
          const submittedCards = raceCards.filter(
            (c) => c.tournamentId === selectedTourId,
          );

          return (
            <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in slide-in-from-bottom-4">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md pt-12 pb-6">
                <button
                  onClick={() => {
                    setSelectedTourId(null);
                    setReadingCard(null);
                  }}
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    Submitted Cards
                  </p>
                  <h2 className="font-bold text-sm">{currentTour?.name}</h2>
                </div>
                <div className="w-10" />
              </div>

              {readingCard ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24 relative">
                  <button
                    onClick={() => setReadingCard(null)}
                    className="text-[10px] font-black text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm flex items-center gap-1 border border-slate-200 active:scale-95 transition-all"
                  >
                    <ArrowLeft size={14} /> 提出一覧に戻る
                  </button>

                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Runner
                      </p>
                      <h3 className="text-2xl font-black text-slate-800">
                        {readingCard.runnerName}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-white bg-slate-800 px-2 py-1 rounded-lg">
                          {readingCard.raceType}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {readingCard.distance === "その他"
                            ? readingCard.ekidenDistance
                            : readingCard.raceType === "駅伝"
                              ? `${readingCard.distance} (${readingCard.ekidenDistance}km)`
                              : readingCard.distance}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 space-y-4">
                        <h4 className="font-black text-sm text-amber-600 flex items-center gap-2 border-b border-amber-200/50 pb-2">
                          <Target size={16} /> PRE-RACE (レース前)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-amber-600">
                              目標タイム
                            </p>
                            <p className="font-black text-lg text-slate-700 mt-1">
                              {readingCard.targetTime || "未設定"}
                            </p>
                          </div>
                          {readingCard.startTime && (
                            <div>
                              <p className="text-[10px] font-black text-amber-600">
                                スタート予定
                              </p>
                              <p className="font-bold text-slate-700 mt-1 flex items-center gap-1">
                                <Timer size={14} /> {readingCard.startTime}
                              </p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <p className="text-[10px] font-black text-amber-600">
                              コンディション (調子)
                            </p>
                            <p className="font-bold text-slate-700 mt-1">
                              {readingCard.condition === 1
                                ? "BAD (不調)"
                                : readingCard.condition === 2
                                  ? "POOR (いまいち)"
                                  : readingCard.condition === 3
                                    ? "FAIR (普通)"
                                    : readingCard.condition === 4
                                      ? "GOOD (好調)"
                                      : readingCard.condition === 5
                                        ? "PEAK (絶好調)"
                                        : "未選択"}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-600">
                            W-UP計画
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-amber-100/50">
                            {readingCard.wupPlan || "未記入"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-600">
                            レースプラン
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-amber-100/50">
                            {readingCard.racePlan || "未記入"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="font-black text-sm text-slate-500 flex items-center gap-2 border-b border-slate-200 pb-2">
                          <Cloud size={16} /> CONDITION (気象条件)
                        </h4>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 mb-1">
                              天気
                            </p>
                            <p className="font-bold text-sm text-slate-700">
                              {readingCard.weather || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 mb-1">
                              風
                            </p>
                            <p className="font-bold text-sm text-slate-700">
                              {readingCard.wind || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 flex justify-center items-center gap-0.5 mb-1">
                              <Thermometer
                                size={10}
                                className="text-rose-400"
                              />
                              気温
                            </p>
                            <p className="font-bold text-sm text-slate-700">
                              {readingCard.temp ? `${readingCard.temp}℃` : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 flex justify-center items-center gap-0.5 mb-1">
                              <Droplets size={10} className="text-blue-400" />
                              湿度
                            </p>
                            <p className="font-bold text-sm text-slate-700">
                              {readingCard.humidity
                                ? `${readingCard.humidity}%`
                                : "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-4">
                        <h4 className="font-black text-sm text-indigo-600 flex items-center gap-2 border-b border-indigo-200/50 pb-2">
                          <Flag size={16} /> POST-RACE (レース後)
                        </h4>
                        <div>
                          <p className="text-[10px] font-black text-indigo-600">
                            実際のタイム (Result)
                          </p>
                          <p className="font-black text-2xl text-indigo-600 mt-1">
                            {readingCard.resultTime || "未入力"}
                          </p>
                        </div>

                        {readingCard.lapTimes &&
                          (() => {
                            const analysis = analyzeLaps(
                              readingCard.lapTimes,
                              readingCard.raceType,
                              readingCard.distance,
                              readingCard.ekidenDistance,
                            );
                            return (
                              <div>
                                <p className="text-[10px] font-black text-indigo-600 mb-1">
                                  ラップタイム
                                </p>
                                <div className="bg-white p-3 rounded-xl border border-indigo-100/50 flex flex-col gap-0.5">
                                  {analysis && analysis.formattedLines
                                    ? analysis.formattedLines.map(
                                        (lap, idx) => (
                                          <span
                                            key={idx}
                                            className={`text-xs font-mono font-bold block tracking-tight ${
                                              lap.startsWith("AVG")
                                                ? "text-indigo-500 mt-1"
                                                : "text-slate-700"
                                            }`}
                                          >
                                            {lap}
                                          </span>
                                        ),
                                      )
                                    : readingCard.lapTimes
                                        .split(/\n/)
                                        .map((lap, idx) => (
                                          <span
                                            key={idx}
                                            className="text-xs font-mono text-slate-700 font-bold block tracking-tight"
                                          >
                                            {lap}
                                          </span>
                                        ))}
                                </div>
                              </div>
                            );
                          })()}

                        <button
                          onClick={() => {
                            setEditingLapCard(readingCard);
                            setLapInput(readingCard.lapTimes || "");
                          }}
                          className="mt-3 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1 w-full hover:bg-indigo-200"
                        >
                          <Timer size={14} /> LAPタイムを入力・編集する
                        </button>
                        <div>
                          <p className="text-[10px] font-black text-indigo-600">
                            良かった点・収穫
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100/50">
                            {readingCard.goodPoints || "未入力"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-600">
                            課題・反省点
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100/50">
                            {readingCard.issues || "未入力"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                            <Users size={12} /> 仲間の良かった点・学んだこと
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-emerald-100/50">
                            {readingCard.teammateGoodPoints || "未入力"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                            <Target size={12} /> 次に向けての目標
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-emerald-100/50">
                            {readingCard.nextGoal || "未入力"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`p-5 rounded-2xl border space-y-3 mt-4 ${readingCard.coachFeedback ? "bg-indigo-600 border-indigo-700" : "bg-indigo-50 border-indigo-200"}`}
                      >
                        <h4
                          className={`font-black text-sm flex items-center justify-between border-b pb-2 ${readingCard.coachFeedback ? "text-white border-indigo-500" : "text-indigo-700 border-indigo-200/50"}`}
                        >
                          <span className="flex items-center gap-2">
                            <MessageSquare size={16} /> Coach Feedback
                          </span>
                          {readingCard.coachFeedback && (
                            <span className="text-[9px] font-black bg-white/20 text-white px-2 py-1 rounded-lg">
                              送信済み
                            </span>
                          )}
                        </h4>
                        <textarea
                          value={coachFeedbackInput}
                          onChange={(e) =>
                            setCoachFeedbackInput(e.target.value)
                          }
                          placeholder="選手へのアドバイスや労いの言葉を入力..."
                          className={`w-full p-4 rounded-xl font-bold text-sm outline-none border h-24 resize-none ${readingCard.coachFeedback ? "bg-white/10 border-indigo-400 text-white placeholder:text-indigo-300 focus:border-white" : "bg-white border-indigo-200 focus:border-indigo-400"}`}
                        />
                        <button
                          onClick={() => {
                            handleSaveRaceCardFeedback(
                              readingCard.id,
                              coachFeedbackInput,
                            );
                            setReadingCard({
                              ...readingCard,
                              coachFeedback: coachFeedbackInput,
                            });
                          }}
                          disabled={isSubmitting}
                          className={`w-full py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 ${readingCard.coachFeedback ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white"}`}
                        >
                          <Save size={16} />{" "}
                          {readingCard.coachFeedback
                            ? "フィードバックを更新"
                            : "フィードバックを送信"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-24 bg-slate-50">
                  {submittedCards.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                      <ClipboardCheck
                        size={40}
                        className="mx-auto mb-2 text-slate-400"
                      />
                      <p className="text-xs font-bold text-slate-500">
                        まだ提出されていません
                      </p>
                    </div>
                  ) : (
                    submittedCards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => {
                          setReadingCard(card);
                          setCoachFeedbackInput(card.coachFeedback || "");
                        }}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-95 transition-all cursor-pointer group hover:border-indigo-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                            {card.runnerName.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-black text-slate-800">
                              {card.runnerName}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {card.raceType} /{" "}
                              {card.raceType === "駅伝"
                                ? `${card.distance}(${card.ekidenDistance}km)`
                                : card.distance}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col items-end gap-1">
                            {/* Result バッジ */}
                            {card.resultTime || card.status === "finish" ? (
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                Resultあり
                              </span>
                            ) : card.status === "dns" ? (
                              <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                                DNS
                              </span>
                            ) : card.status === "dnf" ? (
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                DNF
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                レース前
                              </span>
                            )}
                            {/* フィードバック有無バッジ */}
                            {card.coachFeedback ? (
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 flex items-center gap-1">
                                <MessageSquare size={9} /> FB済
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                                <MessageSquare size={9} /> FB未
                              </span>
                            )}
                          </div>
                          <ChevronRight
                            size={16}
                            className="text-slate-300 group-hover:text-indigo-500 transition-colors"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })()}

      <LapTimeModal
        key={editingLapCard?.id || "empty"}
        editingCard={editingLapCard}
        onClose={() => setEditingLapCard(null)}
        lapInput={lapInput}
        setLapInput={setLapInput}
        onSave={handleSaveLapTime}
        // lapResultInput に同期させる
        onResultChange={(newResult) => {
          setLapResultInput(newResult);
          // 画面(詳細ビュー)を開いている場合は即座に見た目も反映する
          if (readingCard && readingCard.id === editingLapCard?.id) {
            setReadingCard((prev) => ({ ...prev, resultTime: newResult }));
          }
        }}
      />

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
};

export default CoachView;
