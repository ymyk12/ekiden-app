// CoachViewはPC画面を前提とし、スマホ画面をサブ的な画面として整える

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  LayoutDashboard,
  FileText,
  ClipboardList,
  Calendar,
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
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { ROLES } from "../utils/constants";
import { getTodayStr } from "../utils/dateUtils";

// 練習日誌
import DiaryListItem from "./DiaryListItem";
// グラフ設定
import CoachReportView from "./CoachReportView";
// 走行距離印刷設定
import { usePrint } from "../hooks/usePrint";
// 大会LAPタイム入力
import LapTimeModal from "./LapTimeModal";
// 大会ノート印刷設定
import TeamRaceReport from "./TeamRaceReport";

const CoachView = (props) => {
  // App.js から渡されたデータを展開
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

  // フックから直接 handlePrint を取り出す！
  const { handlePrint } = usePrint();

  // 🌟🌟▼▼ 監督用の通知管理システム ▼▼🌟🌟
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(() => {
    return (
      localStorage.getItem(`notif_read_coach_${appId}`) ||
      "2000-01-01T00:00:00.000Z"
    );
  });

  const notifications = useMemo(() => {
    const list = [];
    // 1. 大会ノートの提出・更新
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

    // 2. 振り返りの提出・更新
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
              if (runner) handleCoachEditRunner(runner); // 該当選手の詳細画面へジャンプ
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

  // 🌟🌟▼▼ 監督用のLAPタイム入力システム ▼▼🌟🌟
  const [editingLapCard, setEditingLapCard] = useState(null);
  const [lapInput, setLapInput] = useState("");
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
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "raceCards",
          editingLapCard.id,
        ),
        {
          lapTimes: lapInput,
          updatedAt: new Date().toISOString(),
          updatedBy: "監督",
        },
      );
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
  // 🌟🌟▲▲ LAP入力システムここまで ▲▲🌟🌟

  const handleOpenNotif = () => {
    setIsNotifOpen(true);
    const nowStr = new Date().toISOString();
    setLastReadTime(nowStr);
    localStorage.setItem(`notif_read_coach_${appId}`, nowStr);
  };

  const [selectedTourId, setSelectedTourId] = useState(null); // 開いている大会一覧
  const [readingCard, setReadingCard] = useState(null); // 読んでいるノート詳細
  const [coachFeedbackInput, setCoachFeedbackInput] = useState(""); //監督からのフィードバック
  const [showTeamReportId, setShowTeamReportId] = useState(null); // 大会チームレポート用

  // ▼▼▼ チーム日誌のリスト表示用 ▼▼▼
  const [diaryMode, setDiaryMode] = useState("list"); // "list" か "edit"
  const [listMonth, setListMonth] = useState(new Date());

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
            {[
              "stats",
              "report",
              "check",
              "menu",
              "race",
              "roster",
              "settings",
              "admin",
            ].map((t) => (
              <button
                key={t}
                onClick={() => setView(`coach-${t}`)}
                className={`flex items-center gap-3 py-3 px-4 rounded-xl font-bold uppercase tracking-widest transition-all ${view === `coach-${t}` ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-800"}`}
              >
                {t === "stats" && <LayoutDashboard size={18} />}
                {t === "report" && <FileText size={18} />}
                {t === "check" && <ClipboardList size={18} />}
                {t === "menu" && <Calendar size={18} />}
                {t === "race" && <Flag size={18} />}
                {t === "roster" && <Users size={18} />}
                {t === "settings" && <Settings size={18} />}
                {t === "admin" && <Eye size={18} />}
                {t}
              </button>
            ))}
          </nav>
        </div>
        <div className="space-y-4 mt-8 md:mt-auto">
          {/* 🌟 ベルマーク */}
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

      {/* Main Content Area */}
      <main className="flex-1 p-5 md:p-8 w-full max-w-md mx-auto md:max-w-none md:overflow-y-auto md:h-screen print:max-w-none print:p-0 print:w-full print:overflow-visible">
        {/* Mobile Navigation Tabs (アイコン化) */}
        <div className="md:hidden flex bg-white p-1.5 rounded-[1.8rem] shadow-sm border border-slate-100 overflow-x-auto no-scrollbar print:hidden mb-6 gap-2">
          {[
            { id: "stats", icon: LayoutDashboard },
            { id: "report", icon: FileText },
            { id: "check", icon: ClipboardList },
            { id: "menu", icon: Calendar },
            { id: "race", icon: Flag },
            { id: "roster", icon: Users },
            { id: "settings", icon: Settings },
            { id: "admin", icon: Eye },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = view === `coach-${item.id}`;
            return (
              <button
                key={item.id}
                onClick={() => setView(`coach-${item.id}`)}
                className={`flex-none w-12 h-12 flex items-center justify-center rounded-2xl transition-all active:scale-95 ${
                  isActive
                    ? "bg-slate-950 text-white shadow-lg scale-105"
                    : "text-slate-400 hover:bg-slate-50"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </button>
            );
          })}
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
              {/* 🌟 チーム平均疲労度 (Avg RPE) のカード */}
              <div
                className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-8 ${
                  coachStats.avgRpe >= 8
                    ? "border-rose-500"
                    : coachStats.avgRpe >= 6
                      ? "border-orange-500"
                      : "border-emerald-500"
                }`}
              >
                <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                  Today's Avg RPE
                </p>
                <div className="flex items-baseline gap-1">
                  <p
                    className={`text-3xl md:text-4xl font-black ${
                      coachStats.avgRpe >= 8
                        ? "text-rose-600"
                        : coachStats.avgRpe >= 6
                          ? "text-orange-600"
                          : "text-emerald-600"
                    }`}
                  >
                    {coachStats.avgRpe > 0 ? coachStats.avgRpe.toFixed(1) : "-"}
                  </p>
                  <span className="text-xs font-black text-slate-400">
                    / 10
                  </span>
                </div>
              </div>
              <div
                onClick={() => {
                  if (coachStats.alertList?.length > 0) {
                    setIsPainAlertModalOpen(true);
                  }
                }}
                className={`bg-white p-6 rounded-[2rem] shadow-sm border-l-8 transition-transform ${
                  coachStats.alertList?.length > 0
                    ? "border-rose-500 bg-rose-50 cursor-pointer active:scale-95 hover:shadow-md"
                    : "border-emerald-500"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] md:text-xs font-black text-rose-500 uppercase tracking-widest">
                    Condition Alert
                  </p>
                  {coachStats.alertList?.length > 0 && (
                    <ChevronRight size={14} className="text-rose-400" />
                  )}
                </div>
                <p
                  className={`text-3xl md:text-4xl font-black ${coachStats.alertList?.length > 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {coachStats.alertList?.length || 0}
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
          <CoachReportView
            handleExportMatrixCSV={handleExportMatrixCSV}
            handlePrint={handlePrint}
            printStyles={printStyles}
            activeRunners={activeRunners}
            targetPeriod={targetPeriod}
            reportMatrix={reportMatrix}
            monthlyTrendData={monthlyTrendData}
            cumulativeData={cumulativeData}
            reportChartData={reportChartData}
          />
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
                        checkListData.filter((r) => r.status !== "unsubmitted")
                          .length
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

        {view === "coach-menu" &&
          (() => {
            // 月間データの絞り込み
            const year = listMonth.getFullYear();
            const month = listMonth.getMonth() + 1;
            const prefix = `${year}-${String(month).padStart(2, "0")}`;
            const monthlyLogs = (teamLogs || [])
              .filter((l) => l.date.startsWith(prefix))
              .sort((a, b) => (a.date < b.date ? 1 : -1));

            return (
              <div className="space-y-6 animate-in fade-in">
                {diaryMode === "list" ? (
                  /* ==========================================
                   1. 月間リスト表示モード
                ========================================== */
                  <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 flex items-center gap-2">
                        <BookOpen size={14} /> Team Diary Check & Edit
                      </h3>
                    </div>

                    {/* 月めくりカレンダー */}
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

                    {/* 新規作成・今日のチェックボタン */}
                    <button
                      onClick={() => {
                        setMenuInput({ ...menuInput, date: getTodayStr() });
                        setDiaryMode("edit");
                      }}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> 今日の日誌をチェック・作成する
                    </button>

                    {/* 日誌リスト */}
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
                  /* ==========================================
                   2. 編集・確認モード (Edit Mode)
                ========================================== */
                  <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 max-w-2xl mx-auto relative">
                    <div className="flex justify-between items-center mb-2">
                      <button
                        onClick={() => setDiaryMode("list")}
                        className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <ArrowLeft size={16} /> 一覧に戻る
                      </button>
                      <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 flex items-center gap-2">
                        <BookOpen size={14} /> Team Diary Check & Edit
                      </h3>
                    </div>

                    {/* 日付選択 */}
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Date
                      </span>
                      <input
                        type="date"
                        className="flex-1 bg-transparent font-black text-slate-700 outline-none"
                        value={menuInput.date}
                        onChange={(e) =>
                          setMenuInput({ ...menuInput, date: e.target.value })
                        }
                      />
                    </div>

                    {(() => {
                      const diary = teamLogs?.find(
                        (l) => l.date === menuInput.date,
                      );

                      if (!diary) {
                        return (
                          <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed mt-4">
                            <BookOpen
                              size={32}
                              className="mx-auto text-slate-300 mb-2"
                            />
                            <p className="text-xs font-bold text-slate-400">
                              この日の日誌はまだ提出されていません
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-5 mt-2">
                          {/* マネージャー入力のメタ情報 */}
                          <div className="flex flex-wrap gap-2">
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">
                              {diary.weather}{" "}
                              {diary.temp ? `${diary.temp}℃` : ""}
                            </span>
                            {diary.startTime && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200">
                                {diary.startTime} - {diary.endTime}
                              </span>
                            )}
                            {diary.location && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                                <MapPin size={10} />
                                {diary.location === "その他" &&
                                diary.locationDetail
                                  ? diary.locationDetail
                                  : diary.location === "競技場" &&
                                      diary.locationDetail
                                    ? `${diary.location} (${diary.locationDetail})`
                                    : diary.location}
                              </span>
                            )}
                          </div>

                          {/* メニュー内容 (監督が直接編集可能) */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                              <Edit size={12} /> Menu (メニュー)
                            </p>
                            <textarea
                              id="edit-diary-menu"
                              defaultValue={diary.menu || ""}
                              className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 min-h-[120px] text-sm resize-none shadow-sm"
                            />
                          </div>

                          {/* 補強 */}
                          {diary.reinforcements &&
                            diary.reinforcements.length > 0 && (
                              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <p className="text-[10px] font-black text-blue-400 mb-2 flex items-center gap-1 uppercase tracking-widest">
                                  <Dumbbell size={10} /> Reinforcement
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {diary.reinforcements.map((item, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] font-bold bg-white text-slate-600 px-2 py-1 rounded shadow-sm border border-slate-100"
                                    >
                                      {item}
                                    </span>
                                  ))}
                                  {diary.reinforcements.includes("その他") &&
                                    diary.reinforcementDetail && (
                                      <span className="text-[10px] font-bold text-slate-400 self-center">
                                        : {diary.reinforcementDetail}
                                      </span>
                                    )}
                                </div>
                              </div>
                            )}

                          {/* 結果・ノート (監督が直接編集可能) */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 ml-1">
                              <Edit size={12} /> Results / Notes (報告・所感)
                            </p>
                            <textarea
                              id="edit-diary-result"
                              defaultValue={diary.result || ""}
                              className="w-full p-4 bg-white rounded-2xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 min-h-[100px] text-sm resize-none shadow-sm"
                            />
                          </div>

                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold px-1">
                            <span>
                              ※書き換えて保存すると選手画面に反映されます
                            </span>
                            <span>Written by {diary.updatedBy}</span>
                          </div>

                          <button
                            onClick={async () => {
                              const newMenu =
                                document.getElementById(
                                  "edit-diary-menu",
                                ).value;
                              const newResult =
                                document.getElementById(
                                  "edit-diary-result",
                                ).value;

                              await updateDoc(
                                doc(
                                  db,
                                  "artifacts",
                                  appId,
                                  "public",
                                  "data",
                                  "team_logs",
                                  menuInput.date,
                                ),
                                {
                                  menu: newMenu,
                                  result: newResult,
                                  updatedAt: new Date().toISOString(),
                                },
                              );

                              import("react-hot-toast").then((module) => {
                                module.toast.success("日誌を更新しました！");
                              });
                            }}
                            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            <Save size={16} /> 内容を上書き保存する
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })()}

        {/* ▼▼▼ 大会管理画面 (Race Management) 完成版 ▼▼▼ */}
        {view === "coach-race" && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 tracking-[0.3em]">
                Race & Tournament
              </h3>
            </div>

            <div className="bg-blue-50 p-6 rounded-3xl space-y-4 border border-blue-100">
              <h4 className="font-black text-blue-600 text-sm flex items-center gap-2">
                <Flag size={18} /> 新しい大会を登録する
              </h4>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                ここで大会を登録すると、選手たちの画面に「振り返りシート（Race
                Card）」の入力ボタンが表示されるようになります。
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="大会名 (例: 秋季県大会)"
                  className="w-full p-4 bg-white rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-sm shadow-sm"
                  value={newTournamentInput.name} // ✨ 入力データを繋ぐ！
                  onChange={(e) =>
                    setNewTournamentInput({
                      ...newTournamentInput,
                      name: e.target.value,
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 ml-1">
                      開始日
                    </label>
                    <input
                      type="date"
                      className="w-full p-4 bg-white rounded-xl font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400 text-xs shadow-sm"
                      value={newTournamentInput.startDate} // ✨ 入力データを繋ぐ！
                      onChange={(e) =>
                        setNewTournamentInput({
                          ...newTournamentInput,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 ml-1">
                      終了日
                    </label>
                    <input
                      type="date"
                      className="w-full p-4 bg-white rounded-xl font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400 text-xs shadow-sm"
                      value={newTournamentInput.endDate} // ✨ 入力データを繋ぐ！
                      onChange={(e) =>
                        setNewTournamentInput({
                          ...newTournamentInput,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveTournament} // ✨ 保存関数を繋ぐ！
                  disabled={isSubmitting}
                  className={`w-full py-4 rounded-xl font-black text-sm shadow-md transition-all mt-2 ${isSubmitting ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"}`}
                >
                  {isSubmitting ? "登録中..." : "大会を登録して選手に通知する"}
                </button>
              </div>
            </div>

            {/* 登録済みの大会リスト */}
            <div className="space-y-3 pt-6 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Registered Races
              </h4>

              {tournaments.length === 0 ? (
                <p className="text-center text-xs text-slate-400 font-bold py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                  大会はまだ登録されていません
                </p>
              ) : (
                <div className="space-y-3">
                  {tournaments.map((tour) => (
                    <div
                      key={tour.id}
                      className="bg-white border border-slate-200 p-4 rounded-2xl flex justify-between items-center shadow-sm"
                    >
                      {/* 🌟 大会名をボタン化 */}
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
                        {/* 選手たちが提出したシートの枚数（タップして一覧を開くボタンに変更） */}
                        <button
                          onClick={() => setSelectedTourId(tour.id)}
                          className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1 active:scale-95 transition-all hover:bg-indigo-100 cursor-pointer shadow-sm"
                        >
                          <ClipboardCheck size={12} />
                          {
                            raceCards.filter(
                              (card) => card.tournamentId === tour.id,
                            ).length
                          }{" "}
                          枚提出
                        </button>
                        <button
                          onClick={() => handleDeleteTournament(tour.id)} // ✨ 削除関数を繋ぐ！
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
        )}

        {/* 管理者ツール画面 (Admin Tools)  */}
        {view === "coach-admin" && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in slide-in-from-right-5 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 tracking-[0.3em]">
                Admin Tools
              </h3>
            </div>

            <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100 space-y-4">
              <h4 className="font-black text-sm text-purple-700 flex items-center gap-2 mb-2">
                <Eye size={18} /> システム管理者機能
              </h4>
              <p className="text-[10px] text-slate-600 font-bold leading-relaxed mb-6">
                この機能はシステム管理者用です。他のユーザー権限での動作確認や、設定のテストを行うことができます。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                KSWC System Control
              </p>
            </div>
          </div>
        )}

        {view === "coach-roster" && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in fade-in">
            <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
              Team Roster
            </h3>

            {/* ▼▼▼ データを選手とマネージャーに分離 ▼▼▼ */}
            {(() => {
              const athletes = activeRunners.filter(
                (r) => r.role !== ROLES.MANAGER,
              );
              const managers = activeRunners.filter(
                (r) => r.role === ROLES.MANAGER,
              );

              return (
                <>
                  {/* --- 1. 選手リスト --- */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                      <UserCheck size={16} /> Athletes ({athletes.length})
                    </h4>
                    <div className="divide-y divide-slate-100 grid md:grid-cols-2 gap-x-12 gap-y-0">
                      {athletes.map((r) => (
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
                            <ChevronRight
                              className="text-slate-300"
                              size={20}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* --- 2. マネージャーリスト (存在する場合のみ表示) --- */}
                  {managers.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-black uppercase text-indigo-600 flex items-center gap-2">
                        <ClipboardList size={16} /> Managers ({managers.length})
                      </h4>
                      <div className="divide-y divide-slate-100 grid md:grid-cols-2 gap-x-12 gap-y-0">
                        {managers.map((r) => (
                          <div
                            key={r.id}
                            className="py-4 flex items-center justify-between group cursor-pointer hover:bg-indigo-50/50 transition-colors rounded-xl px-2"
                            onClick={() => handleCoachEditRunner(r)}
                          >
                            <div className="flex items-center gap-3">
                              {/* マネージャーはインディゴ色 */}
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

            {/* --- 3. 引退/アーカイブ (既存のまま) --- */}
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

            <button
              onClick={() => setView("coach-stats")}
              className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest"
            >
              ホームに戻る
            </button>
          </div>
        )}

        {/* Coach Runner Detail View (With Goal Editing) */}
        {view === "coach-runner-detail" && selectedRunner && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in slide-in-from-right-10 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Athlete Detail
              </h3>
              <div className="w-9" />{" "}
              {/* レイアウト調整用の透明な箱（タイトルを真ん中に保つため） */}
            </div>

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
            {/* 戻るボタンとタイトルを並べる */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em] m-0">
                Settings
              </h3>
              <div className="w-9" />{" "}
              {/* レイアウト調整用の透明な箱（タイトルを真ん中に保つため） */}
            </div>

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

              {/* 選手データの統合 (Merge)  */}
              <div className="bg-rose-50 p-6 rounded-3xl space-y-4 border border-rose-100 mt-8">
                <h4 className="text-xs font-black uppercase text-rose-600 flex items-center gap-2">
                  <AlertTriangle size={16} /> Data Merge (選手データの統合)
                </h4>
                <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                  重複して登録された選手データを1つにまとめます。統合元の練習記録はすべて統合先に移動し、統合元のプロフィールは削除されます。
                </p>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-rose-500 uppercase">
                      1. 残す選手 (統合先: データを受け取る側)
                    </label>
                    <select
                      className="w-full p-3 rounded-xl border border-rose-200 text-sm font-bold bg-white outline-none focus:border-rose-500"
                      value={mergeTargetId}
                      onChange={(e) => setMergeTargetId(e.target.value)}
                    >
                      <option value="">選択してください...</option>
                      {allRunners.map((r) => (
                        <option key={`target-${r.id}`} value={r.id}>
                          {r.lastName} {r.firstName} (ID: {r.memberCode || r.id}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-rose-500 uppercase">
                      2. 消す選手 (統合元: データ移動後に削除される側)
                    </label>
                    <select
                      className="w-full p-3 rounded-xl border border-rose-200 text-sm font-bold bg-white outline-none focus:border-rose-500"
                      value={mergeSourceId}
                      onChange={(e) => setMergeSourceId(e.target.value)}
                    >
                      <option value="">選択してください...</option>
                      {allRunners.map((r) => (
                        <option key={`source-${r.id}`} value={r.id}>
                          {r.lastName} {r.firstName} (ID: {r.memberCode || r.id}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                  {errorMsg && view === "coach-settings" && (
                    <p className="text-xs text-rose-500 font-bold">
                      {errorMsg}
                    </p>
                  )}
                  <button
                    onClick={handleMergeRunners}
                    disabled={!mergeTargetId || !mergeSourceId || isSubmitting}
                    className={`w-full py-3 rounded-xl font-bold text-xs shadow-md transition-all ${
                      !mergeTargetId || !mergeSourceId || isSubmitting
                        ? "bg-rose-200 text-white cursor-not-allowed"
                        : "bg-rose-600 text-white hover:bg-rose-700 active:scale-95"
                    }`}
                  >
                    {isSubmitting ? "統合処理中..." : "データを統合する"}
                  </button>
                </div>
              </div>

              {/* 設定保存 */}
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
        {/* ▼▼▼ Condition Alert List Modal ▼▼▼ */}
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
                {coachStats.alertList?.map(({ runner, latestLog, alerts }) => (
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

                      {/* アラートバッジを縦に並べて表示 */}
                      <div className="flex flex-col gap-1 items-end">
                        {alerts.map((a, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-sm ${a.color}`}
                          >
                            {a.type === "pain" && <HeartPulse size={12} />}
                            {a.type === "fatigue" && <Activity size={12} />}
                            {a.type === "missing" && (
                              <AlertTriangle size={12} />
                            )}
                            {a.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* メニュー詳細（痛みの原因や状況）を表示 */}
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
        {/* ▼▼▼ 通知センター (Notification Modal) ▼▼▼ */}
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
          </div>
        )}
        {/* ▲▲▲ 通知センター ここまで ▲▲▲ */}
      </main>

      {/* 🌟 チームレポート（全画面・印刷用） */}
      {showTeamReportId && (
        <TeamRaceReport
          reportTour={tournaments.find((t) => t.id === showTeamReportId)}
          reportCards={raceCards.filter(
            (c) => c.tournamentId === showTeamReportId,
          )}
          onClose={() => setShowTeamReportId(null)}
        />
      )}

      {/* 提出されたRace Cardの閲覧画面  */}
      {selectedTourId &&
        (() => {
          // 選択された大会と、その大会に提出されたカードを抽出
          const currentTour = tournaments.find((t) => t.id === selectedTourId);
          const submittedCards = raceCards.filter(
            (c) => c.tournamentId === selectedTourId,
          );

          return (
            <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in slide-in-from-bottom-4">
              {/* ヘッダー */}
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md pt-12 pb-6">
                <button
                  onClick={() => {
                    setSelectedTourId(null);
                    setReadingCard(null); // 閉じるときは詳細もリセット
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

              {/* ノート詳細を読んでいる場合 */}
              {readingCard ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24 relative">
                  <button
                    onClick={() => setReadingCard(null)}
                    className="text-[10px] font-black text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm flex items-center gap-1 border border-slate-200 active:scale-95 transition-all"
                  >
                    <ArrowLeft size={14} /> 提出一覧に戻る
                  </button>

                  {/* ノートの中身（フル項目表示デザイン） */}
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
                          {readingCard.raceType === "駅伝"
                            ? `${readingCard.distance} (${readingCard.ekidenDistance}km)`
                            : readingCard.distance}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-5">
                      {/* 🎯 レース前 (PRE-RACE) */}
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

                      {/* 🌤️ 気象条件 (CONDITION) */}
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

                      {/* 🏁 レース後 (POST-RACE) */}
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
                        {readingCard.lapTimes && (
                          <div>
                            <p className="text-[10px] font-black text-indigo-600">
                              ラップタイム
                            </p>
                            <p className="font-mono text-xs text-slate-700 whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100/50">
                              {readingCard.lapTimes}
                            </p>
                          </div>
                        )}
                        {/* 🌟 監督用のLAPタイム入力ボタン */}
                        <button
                          onClick={() => {
                            setEditingLapCard(readingCard); // cardはmap等で回しているRaceCardデータ
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

                      {/* 🤝 仲間と次への目標 */}
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
                      {/* ▼▼▼ 新規追加: 監督からのフィードバック入力欄 ▼▼▼ */}
                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-200 space-y-3 mt-4">
                        <h4 className="font-black text-sm text-indigo-700 flex items-center gap-2 border-b border-indigo-200/50 pb-2">
                          <MessageSquare size={16} /> Coach Feedback
                          (フィードバック)
                        </h4>
                        <textarea
                          value={coachFeedbackInput}
                          onChange={(e) =>
                            setCoachFeedbackInput(e.target.value)
                          }
                          placeholder="選手へのアドバイスや労いの言葉を入力..."
                          className="w-full p-4 bg-white rounded-xl font-bold text-sm outline-none border border-indigo-200 focus:border-indigo-400 h-24 resize-none"
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
                          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                        >
                          <Save size={16} /> フィードバックを送信
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 提出者一覧画面 */
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
                        <div className="text-right flex items-center">
                          {card.resultTime ? (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                              Resultあり
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                              レース前
                            </span>
                          )}
                          <ChevronRight
                            size={16}
                            className="text-slate-300 ml-2 group-hover:text-indigo-500 transition-colors"
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

      {/* 大会LAPタイム入力：監督画面用 */}
      <LapTimeModal
        key={editingLapCard?.id || "empty"}
        editingLapCard={editingLapCard}
        onClose={() => setEditingLapCard(null)}
        lapInput={lapInput}
        setLapInput={setLapInput}
        onSave={handleSaveLapTime}
      />

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
};

export default CoachView;
