// ==========================================
//   import
// ==========================================
import { useState, useMemo, useEffect } from "react";

import {
  Eye,
  Menu,
  Target,
  LogOut,
  Filter,
  Activity,
  AlertTriangle,
  BookOpen,
  MapPin,
  Dumbbell,
  ArrowLeft,
  Check,
  Save,
  Users,
  MessageSquare,
  HeartPulse,
  Trash2,
  ChevronRight,
  Home,
  Plus,
  Edit,
  AlertCircle,
  Loader2,
  Flag,
  Calendar,
  Bell,
} from "lucide-react";

import { ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

import { ROLES, CATEGORY } from "../utils/constants";

import { getGoalValue, getTodayStr, getDatesInRange } from "../utils/dateUtils";

// 練習日誌
import DiaryListItem from "./DiaryListItem";

// 大会ノート
import RaceCardEntry from "./RaceCardEntry";
// 大会レポート（チーム）
import TeamRaceReport from "./TeamRaceReport";

const AthleteView = (props) => {
  // App.js から渡されたデータ（Props）をすべて展開します
  const {
    role,
    previewRunner,
    setPreviewRunner,
    currentUserId,
    currentProfile,
    view,
    setView,
    isMenuOpen,
    setIsMenuOpen,
    successMsg,
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
    teamLogs,
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
  } = props;

  // 画面（view）が切り替わるたびに、スクロールを一番上（0, 0）に戻す
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const isPreview = role === ROLES.COACH && previewRunner;

  // 通知管理システム
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(() => {
    return (
      localStorage.getItem(`notif_read_${currentUserId}`) ||
      "2000-01-01T00:00:00.000Z"
    );
  });

  // AthleteView.jsx の通知読み込み部分
  const [notifiedIds, setNotifiedIds] = useState(() => {
    try {
      const item = localStorage.getItem(`notified_ids_${currentUserId}`);
      return item && item !== "undefined" ? JSON.parse(item) : [];
    } catch (e) {
      return []; // 記憶が壊れていたら無視して空っぽにする！
    }
  });

  // アプリ内のデータから「お知らせ」を自動でリストアップ
  const notifications = useMemo(() => {
    const list = [];

    // 1. 大会ノートへのフィードバック
    const myCards = raceCards.filter(
      (c) => c.runnerId === currentUserId && c.coachFeedback,
    );
    myCards.forEach((c) => {
      const tour = tournaments.find((t) => t.id === c.tournamentId);
      list.push({
        id: `fb_race_${c.id}_${c.updatedAt || ""}`,
        type: "Feedback",
        title: "大会ノートにコメントが届きました",
        message: `「${tour?.name || "大会"}」のシートに監督からフィードバックがあります！`,
        time: c.updatedAt || "2024-01-01T00:00:00.000Z",
        onClick: () => {
          setIsNotifOpen(false);
          setRaceCardInput(c);
          setEditingRaceCardId(c.id);
          setView("race-entry");
        },
      });
    });

    // 2. 振り返りへのフィードバック
    if (currentFeedback && currentFeedback.coachComment) {
      list.push({
        id: `fb_period_${targetPeriod.id}`,
        type: "Feedback",
        title: "振り返りにコメントが届きました",
        message: `「${targetPeriod.name}」の目標・振り返りに監督からフィードバックがあります！`,
        time: currentFeedback.updatedAt || "2024-01-01T00:00:00.000Z",
        onClick: () => {
          setIsNotifOpen(false);
          setView("review");
        },
      });
    }

    // 3. 新しい大会が追加された（便宜上、トーナメント一覧の最後を最新とみなす）
    // 🌟 修正：全ての大会を通知リストに追加（未読判定は後続のロジックで行われます）
    if (tournaments && tournaments.length > 0) {
      tournaments.forEach((tour) => {
        list.push({
          id: `tour_${tour.id}`,
          type: "New Event",
          title: "新しい大会が設定されました",
          message: `「${tour.name}」が予定に追加されました。出場種目を登録しましょう！`,
          time: tour.createdAt || new Date(tour.startDate).toISOString(),
          onClick: () => {
            setIsNotifOpen(false);
            setView("race");
          },
        });
      });
    }

    // 🌟 チーム日誌のブロックは削除しました！

    // 新しい順に並び替え
    return list.sort((a, b) => (a.time < b.time ? 1 : -1));
  }, [
    raceCards,
    currentFeedback,
    tournaments,
    targetPeriod,
    currentUserId,
    setEditingRaceCardId,
    setRaceCardInput,
    setView,
  ]);

  // 未読件数の計算
  const unreadCount = notifications.filter((n) => n.time > lastReadTime).length;

  // 🌟 追加：カテゴリごとの未読判定（バッジ表示用）
  const unreadNotifs = notifications.filter((n) => n.time > lastReadTime);
  // 大会・レース関連
  const hasUnreadRace = unreadNotifs.some(
    (n) => n.id.startsWith("fb_race_") || n.id.startsWith("tour_"),
  );
  // 大会振り返り関連
  const hasUnreadReview = unreadNotifs.some((n) =>
    n.id.startsWith("fb_period_"),
  );
  // 大会レポート（チーム）の閲覧
  const [showTeamReportId, setShowTeamReportId] = useState(null);

  // 🌟 修正：日誌の赤バッジ判定を独立させる（一覧やプッシュ通知には出さないため）
  const latestDiaryTime =
    teamLogs && teamLogs.length > 0
      ? Math.max(
          ...teamLogs.map((l) =>
            new Date(l.updatedAt || l.createdAt || "2000-01-01").getTime(),
          ),
        )
      : 0;
  const hasUnreadDiary = latestDiaryTime > new Date(lastReadTime).getTime();

  // ベルを開いた時の処理（既読にする）
  const handleOpenNotif = () => {
    setIsNotifOpen(true);
    const nowStr = new Date().toISOString();
    setLastReadTime(nowStr);
    localStorage.setItem(`notif_read_${currentUserId}`, nowStr);
  };

  // 【スマホへのプッシュ通知機能】（初回許可取り）
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 【スマホへのプッシュ通知機能】（未読があれば鳴らす）
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      const newNotifs = notifications.filter(
        (n) => !notifiedIds.includes(n.id) && n.time > lastReadTime,
      );
      if (newNotifs.length > 0) {
        newNotifs.forEach((n) => {
          new Notification("駅伝・陸上アプリ", {
            body: n.title,
            icon: "/favicon.ico",
          });
        });
        const updatedIds = [...notifiedIds, ...newNotifs.map((n) => n.id)];
        setNotifiedIds(updatedIds);
        localStorage.setItem(
          `notified_ids_${currentUserId}`,
          JSON.stringify(updatedIds),
        );
      }
    }
  }, [notifications, notifiedIds, currentUserId, lastReadTime]);

  const safeChangeView = (targetView) => {
    if (
      view === "entry" &&
      targetView !== "entry" &&
      (formData.distance !== "" || formData.menuDetail !== "")
    ) {
      setConfirmDialog({
        isOpen: true,
        message: "入力中の内容が消えてしまいますが、移動しますか？",
        onConfirm: () => {
          resetForm();
          setView(targetView);
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        },
      });
    } else {
      if (view === "entry" && targetView !== "entry") resetForm();
      setView(targetView);
    }
  };

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
            onClick={() => {
              setPreviewRunner(null);
              setView("coach-roster");
            }}
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
            {/* 大会ノート*/}
            <button
              onClick={() => {
                safeChangeView("race");
                setIsMenuOpen(false);
              }}
              className="w-full py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <Flag size={20} /> 大会ノート (Race Card)
              {/* 🌟 大会関連の未読があれば赤丸を表示 */}
              {hasUnreadRace && (
                <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              )}
            </button>
            {/* 目標設定 */}
            <button
              onClick={() => {
                safeChangeView("goal");
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
              <LogOut size={20} /> {isPreview ? "プレビュー終了" : "ログアウト"}
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
            {/* 🌟 大会関連の未読があれば赤丸を表示 */}
            {hasUnreadRace && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-blue-600"></span>
              </span>
            )}
          </button>
          <div className="text-center">
            <p className="text-blue-100 text-[10px] font-black tracking-widest uppercase mb-1">
              Athlete Dashboard
            </p>
            <h1 className="text-2xl font-black tracking-tighter">
              {currentProfile.lastName} {currentProfile.firstName}
            </h1>
          </div>
          {/* 通知ベルアイコン  */}
          <div className="relative">
            <button
              onClick={handleOpenNotif}
              className="bg-white/20 p-2.5 rounded-2xl active:scale-90 transition-all text-white relative shadow-sm hover:bg-white/30"
            >
              <Bell size={20} />
              {/* 未読がある場合、ピカピカ光る赤丸バッジを表示！ */}
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-500 border-2 border-blue-600 text-[9px] font-black text-white items-center justify-center shadow-md">
                    {unreadCount}
                  </span>
                </span>
              )}
            </button>
          </div>
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
            {(() => {
              const currentGoal = getGoalValue(
                currentProfile,
                targetPeriod.id,
                targetPeriod.type,
                "goalPeriod",
              );
              if (!currentGoal || currentGoal === 0) {
                return (
                  <div
                    onClick={() => setView("goal")}
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

            {missingDates.length > 0 && (
              <div className="mb-6 animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-2 px-2">
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle size={14} /> Missing Reports (
                    {missingDates.length})
                  </p>
                </div>
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
                        className="bg-amber-400 text-slate-900 py-2 px-4 rounded-xl shadow-sm flex items-center justify-between cursor-pointer active:scale-95 transition-transform border border-slate-900/10"
                      >
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={16} className="text-slate-800" />
                          <div className="flex items-baseline gap-2">
                            <span className="font-black text-sm">
                              {d.getMonth() + 1}/{d.getDate()}
                            </span>
                            <span className="text-[10px] font-bold opacity-70">
                              未入力
                            </span>
                          </div>
                        </div>
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
                {missingDates.length >= 2 && (
                  <p className="text-center text-[10px] text-slate-400 font-bold">
                    休みだった場合も「完全休養」として記録しましょう！
                  </p>
                )}
              </div>
            )}

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
                        width: `${Math.min(100, ((targetPeriod.type === "month" ? personalStats.monthly : personalStats.period) / getGoalValue(currentProfile, targetPeriod.id, targetPeriod.type, "goalPeriod")) * 100)}%`,
                      }}
                    ></div>
                  </div>
                )}
                <p className="text-[9px] text-right text-slate-400 font-bold mt-1">
                  {targetPeriod.name}
                </p>
              </div>

              {activeQuarters &&
                activeQuarters.length > 0 &&
                targetPeriod.type !== "month" && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Target size={12} /> Quarterly Progress
                    </h4>
                    <div className="space-y-2">
                      {activeQuarters.map((q, idx) => {
                        const qKey = `q${idx + 1}`;
                        const qGoal =
                          getGoalValue(
                            currentProfile,
                            targetPeriod.id,
                            targetPeriod.type,
                            qKey,
                          ) || 0;
                        let currentQVal = 0;
                        let isActive = false;
                        if (q.start && q.end) {
                          const qStart = new Date(q.start);
                          const qEnd = new Date(q.end);
                          qEnd.setHours(23, 59, 59, 999);
                          const qTotal = allLogs
                            .filter((l) => l.runnerId === currentUserId)
                            .filter((l) => {
                              const d = new Date(l.date);
                              return !isNaN(d) && d >= qStart && d <= qEnd;
                            })
                            .reduce(
                              (sum, l) => sum + (Number(l.distance) || 0),
                              0,
                            );
                          currentQVal = Math.round(qTotal * 10) / 10;
                          const now = new Date();
                          isActive = now >= qStart && now <= qEnd;
                        }
                        const progressRate =
                          qGoal > 0
                            ? Math.min(100, (currentQVal / qGoal) * 100)
                            : 0;
                        return (
                          <div
                            key={qKey}
                            className={`p-3 rounded-2xl border transition-all ${isActive ? "bg-blue-50/50 border-blue-200 shadow-sm" : "bg-slate-50 border-slate-100 opacity-90"}`}
                          >
                            <div className="flex justify-between items-end mb-1.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs font-black ${isActive ? "text-blue-600" : "text-slate-500"}`}
                                >
                                  Q{idx + 1}
                                </span>
                                {q.start && q.end && (
                                  <span className="text-[9px] font-bold text-slate-400">
                                    {q.start.slice(5).replace("-", "/")} -{" "}
                                    {q.end.slice(5).replace("-", "/")}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-sm font-black ${isActive ? "text-blue-600" : "text-slate-700"}`}
                                >
                                  {currentQVal}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 mx-0.5">
                                  /
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {qGoal} km
                                </span>
                              </div>
                            </div>
                            {qGoal > 0 ? (
                              <div className="w-full bg-slate-200/50 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ${isActive ? "bg-gradient-to-r from-blue-400 to-blue-600" : "bg-slate-300"}`}
                                  style={{ width: `${progressRate}%` }}
                                ></div>
                              </div>
                            ) : (
                              <div className="w-full bg-slate-100 h-1.5 rounded-full flex items-center justify-center">
                                <span className="text-[8px] text-slate-300 font-bold uppercase tracking-widest scale-75">
                                  No Goal
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            <div className="bg-slate-900 p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden mb-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
              {(() => {
                const todayStr = getTodayStr();
                const diary = teamLogs.find((l) => l.date === todayStr);
                if (diary) {
                  return (
                    <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-start">
                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                          <BookOpen size={12} /> Team Practice Diary
                        </p>
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                            {diary.weather} {diary.temp ? `${diary.temp}℃` : ""}
                          </span>
                          {diary.startTime && (
                            <span className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                              {diary.startTime} - {diary.endTime}
                            </span>
                          )}
                        </div>
                      </div>
                      {diary.location && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                          <MapPin size={14} className="text-blue-400" />
                          {diary.location === "その他" && diary.locationDetail
                            ? diary.locationDetail
                            : diary.location === "競技場" &&
                                diary.locationDetail
                              ? `${diary.location} (${diary.locationDetail})`
                              : diary.location}
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 mb-1">
                          MENU
                        </p>
                        <p className="font-bold text-lg leading-snug whitespace-pre-wrap">
                          {diary.menu}
                        </p>
                      </div>
                      {diary.reinforcements &&
                        diary.reinforcements.length > 0 && (
                          <div className="bg-blue-900/30 p-3 rounded-xl border border-blue-500/20">
                            <p className="text-[10px] font-bold text-blue-300 mb-2 flex items-center gap-1">
                              <Dumbbell size={10} /> REINFORCEMENT
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {diary.reinforcements.map((item, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-bold bg-blue-500/20 text-blue-100 px-2 py-1 rounded"
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
                      {diary.result && (
                        <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                          <p className="text-[10px] font-bold text-blue-300 mb-1 flex items-center gap-1">
                            <Activity size={10} /> RESULT / NOTES
                          </p>
                          <p className="text-xs font-bold leading-relaxed text-slate-200 whitespace-pre-wrap">
                            {diary.result}
                          </p>
                        </div>
                      )}
                      {/* ▼▼▼ 監督からの追記 (ホーム画面用デザイン) ▼▼▼ */}
                      {diary.coachNote && (
                        <div className="bg-amber-400/10 p-3 rounded-xl border border-amber-400/20 mt-3">
                          <p className="text-[10px] font-black text-amber-300 mb-1 flex items-center gap-1 uppercase tracking-widest">
                            <MessageSquare size={10} /> Coach's Note
                          </p>
                          <p className="text-xs font-bold leading-relaxed text-amber-50 whitespace-pre-wrap">
                            {diary.coachNote}
                          </p>
                        </div>
                      )}
                      <p className="text-[9px] text-slate-500 text-right">
                        Updated by: {diary.updatedBy}
                      </p>
                    </div>
                  );
                }
              })()}
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} /> Team Activity (Last 7 Days)
                </h3>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-1">
                {(() => {
                  const today = new Date();
                  const pastDate = new Date();
                  pastDate.setDate(today.getDate() - 6);
                  const minDateStr = pastDate.toLocaleDateString("sv-SE");

                  const teamLogsList = allLogs
                    .filter((l) => l.date >= minDateStr)
                    .filter((l) =>
                      activeRunners.some((r) => r.id === l.runnerId),
                    )
                    .sort((a, b) => {
                      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
                      return (b.createdAt || "").localeCompare(
                        a.createdAt || "",
                      );
                    })
                    .slice(0, 10);

                  if (teamLogsList.length === 0) {
                    return (
                      <p className="text-center text-xs text-slate-300 py-4 font-bold">
                        直近の活動記録はありません
                      </p>
                    );
                  }

                  return teamLogsList.map((log) => {
                    const isRest = log.category === "完全休養";
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 relative pl-2"
                      >
                        <div className="absolute left-[19px] top-8 bottom-[-16px] w-0.5 bg-slate-100 last:hidden"></div>
                        <div
                          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm z-10 ${isRest ? "bg-emerald-400" : "bg-blue-500"}`}
                        >
                          {log.runnerName ? log.runnerName.charAt(0) : "?"}
                        </div>
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
                          </div>
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

        {/* Entry View */}
        {view === "entry" && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => safeChangeView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Daily Entry
              </h3>
            </div>
            <div className="space-y-4">
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
                    {Object.values(CATEGORY).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Menu Detail
                </label>
                <textarea
                  placeholder="メニューの内容、タイムなど"
                  className="w-full p-4 bg-slate-50 rounded-3xl font-bold text-slate-600 outline-none focus:ring-2 ring-blue-500 min-h-[100px] text-sm resize-none"
                  value={formData.menuDetail}
                  onChange={(e) =>
                    setFormData({ ...formData, menuDetail: e.target.value })
                  }
                />
              </div>
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
                          rpe:
                            e.target.value === ""
                              ? ""
                              : parseInt(e.target.value, 10),
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
              <div className="pt-4 space-y-3">
                <button
                  onClick={handleSaveLog}
                  disabled={isSubmitting || !formData.distance}
                  className={`w-full py-5 rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all ${isSubmitting || !formData.distance ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white active:scale-95"}`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />{" "}
                      {editingLogId ? "更新中..." : "保存中..."}
                    </>
                  ) : (
                    <>
                      <Save size={20} />{" "}
                      {editingLogId ? "更新する" : "保存する"}
                    </>
                  )}
                </button>
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
              <div className="pt-8 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} /> My Activity
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    {targetPeriod.name}
                  </span>
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {(() => {
                    const start = new Date(targetPeriod.start);
                    const end = new Date(targetPeriod.end);
                    end.setHours(23, 59, 59, 999);
                    const myPeriodLogs = allLogs
                      .filter((l) => l.runnerId === currentUserId)
                      .filter((l) => {
                        const d = new Date(l.date);
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
                          onClick={() => handleEditLog(log)}
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
                              className={`text-lg font-black ${isRest ? "text-emerald-500" : "text-blue-600"}`}
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
                            <div className="flex gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${log.rpe >= 8 ? "bg-rose-100 text-rose-600 border-rose-200" : log.rpe >= 5 ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-blue-50 text-blue-600 border-blue-100"}`}
                              >
                                RPE {log.rpe}
                              </span>
                              {log.pain > 1 && (
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[9px] font-black border flex items-center gap-1 ${log.pain >= 4 ? "bg-purple-100 text-purple-600 border-purple-200 animate-pulse" : log.pain === 3 ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}
                                >
                                  <HeartPulse size={10} /> Pain {log.pain}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLog(log.id);
                                }}
                                className="text-slate-300 hover:text-rose-500 transition-colors p-2 -mr-2"
                                title="削除する"
                              >
                                <Trash2 size={18} />
                              </button>
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
            </div>
          </div>
        )}

        {/* TEAM DIARY */}
        {view === "diary" && (
          <div className="bg-white p-6 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in pb-24">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => safeChangeView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                TEAM DIARY
              </h3>
              <div className="w-9" />
            </div>
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Target: {targetPeriod.name}
              </span>
            </div>
            <div className="space-y-4">
              {(() => {
                const start = new Date(targetPeriod.start);
                const end = new Date(targetPeriod.end);
                end.setHours(23, 59, 59, 999);
                const filteredLogs = teamLogs
                  .filter((l) => {
                    const d = new Date(l.date);
                    return d >= start && d <= end;
                  })
                  .sort((a, b) => (a.date < b.date ? 1 : -1));

                if (filteredLogs.length === 0) {
                  return (
                    <div className="text-center py-10">
                      <p className="text-xs font-bold text-slate-300">
                        この期間の日誌はありません
                      </p>
                    </div>
                  );
                }

                return filteredLogs.map((log) => {
                  const isExpanded = expandedDiaryId === log.date;
                  return (
                    <DiaryListItem
                      key={log.date}
                      log={log}
                      isExpanded={isExpanded}
                      onClick={() =>
                        setExpandedDiaryId(isExpanded ? null : log.date)
                      }
                    >
                      {/* ▼▼ ここから下は isExpanded の中身として渡されます ▼▼ */}
                      <div className="px-4 pb-4 space-y-4 border-t border-slate-200/50 pt-4 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500">
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-indigo-400 block text-[9px] uppercase">
                              Time
                            </span>
                            {log.startTime
                              ? `${log.startTime} - ${log.endTime}`
                              : "-"}
                          </div>
                          <div className="bg-white p-2 rounded-lg border border-slate-100">
                            <span className="text-indigo-400 block text-[9px] uppercase">
                              Cond
                            </span>
                            {log.temp ? `${log.temp}℃` : "-"} / Wind:{" "}
                            {log.wind || "-"}
                          </div>
                        </div>
                        {log.reinforcements &&
                          log.reinforcements.length > 0 && (
                            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                              <p className="text-[9px] font-black text-blue-400 uppercase mb-2 flex items-center gap-1">
                                <Dumbbell size={10} /> Reinforcement
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {log.reinforcements.map((item, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-bold bg-white text-slate-600 px-2 py-1 rounded border border-blue-100"
                                  >
                                    {item}
                                  </span>
                                ))}
                                {log.reinforcementDetail && (
                                  <span className="text-[10px] font-bold text-slate-400 self-center">
                                    ({log.reinforcementDetail})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        {log.result && (
                          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                            <p className="text-[9px] font-black text-indigo-400 uppercase mb-1 flex items-center gap-1">
                              <Activity size={10} /> Result / Notes
                            </p>
                            <p className="text-xs font-bold leading-relaxed text-slate-700 whitespace-pre-wrap">
                              {log.result}
                            </p>
                          </div>
                        )}
                        {/* ▼▼▼ 監督からの追記 (一覧画面用デザイン) ▼▼▼ */}
                        {log.coachNote && (
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mt-3">
                            <p className="text-[9px] font-black text-amber-600 uppercase mb-1 flex items-center gap-1 tracking-widest">
                              <MessageSquare size={10} /> Coach's Note
                            </p>
                            <p className="text-xs font-bold leading-relaxed text-slate-800 whitespace-pre-wrap">
                              {log.coachNote}
                            </p>
                          </div>
                        )}
                        <p className="text-[9px] text-right text-slate-300">
                          Updated by: {log.updatedBy}
                        </p>
                      </div>
                    </DiaryListItem>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Review View */}
        {view === "review" && (
          <div className="bg-white p-6 rounded-[3rem] shadow-sm space-y-8 animate-in fade-in">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => safeChangeView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Period Review
              </h3>
            </div>

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
                            <Cell fill="#3b82f6" />
                            <Cell fill="#e2e8f0" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
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

            <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} /> Training Intensity
              </h4>
              {(() => {
                const counts = { low: 0, mid: 0, high: 0 };
                periodLogs.forEach((l) => {
                  if (l.rpe >= 8) counts.high++;
                  else if (l.rpe >= 5) counts.mid++;
                  else counts.low++;
                });
                const total = periodLogs.length || 1;
                return (
                  <div className="space-y-3">
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

            <div className="bg-white border border-slate-100 p-6 rounded-3xl space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <HeartPulse size={16} /> Physical Condition Map
              </h4>
              {(() => {
                const dates = getDatesInRange(
                  targetPeriod.start,
                  targetPeriod.end,
                );
                const painMap = {};
                periodLogs.forEach((l) => {
                  if (!painMap[l.date] || painMap[l.date] < l.pain)
                    painMap[l.date] = l.pain;
                });
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {dates.map((date) => {
                        const pain = painMap[date];
                        const day = parseInt(date.split("-")[2], 10);
                        let bgClass = "bg-slate-100 text-slate-300";
                        if (pain === 1)
                          bgClass = "bg-emerald-300 text-emerald-800";
                        if (pain === 2)
                          bgClass = "bg-yellow-300 text-yellow-800";
                        if (pain === 3) bgClass = "bg-orange-400 text-white";
                        if (pain === 4) bgClass = "bg-rose-500 text-white";
                        if (pain === 5) bgClass = "bg-purple-600 text-white";
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
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400">
                            <span>RPE (強度)</span>
                            <span>{log.rpe}/10</span>
                          </div>
                          <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${log.rpe >= 8 ? "bg-rose-500" : log.rpe >= 5 ? "bg-orange-400" : "bg-blue-400"}`}
                              style={{ width: `${log.rpe * 10}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-bold text-slate-400">
                            <span>Pain (痛み)</span>
                            <span>{log.pain}/5</span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((lvl) => (
                              <div
                                key={lvl}
                                className={`h-2 flex-1 rounded-full ${lvl <= log.pain ? (log.pain >= 3 ? "bg-rose-500" : "bg-emerald-400") : "bg-white"}`}
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

        {/* Goal View */}
        {view === "goal" && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => safeChangeView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 tracking-[0.3em]">
                Target Setting
              </h3>
              <div className="w-9" />
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-100">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <Target size={18} className="text-blue-500" />{" "}
                  {targetPeriod.name} の目標
                </h4>
                {targetPeriod.type === "month" && (
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
                )}
                {targetPeriod.type !== "month" && (
                  <div className="space-y-2">
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
            </div>
          </div>
        )}

        {/* Team Status View */}
        {view === "team_status" && (
          <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => safeChangeView("menu")}
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
              <div className="space-y-3">
                {rankingData.map((runner, index) => {
                  const todayLog = allLogs.find(
                    (l) => l.runnerId === runner.id && l.date === getTodayStr(),
                  );
                  return (
                    <div
                      key={runner.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden"
                    >
                      <div
                        className={`absolute top-0 left-0 px-3 py-1 rounded-br-xl text-[10px] font-black ${index === 0 ? "bg-yellow-400 text-yellow-900" : index === 1 ? "bg-slate-300 text-slate-700" : index === 2 ? "bg-orange-300 text-orange-800" : "bg-slate-200 text-slate-500"}`}
                      >
                        #{index + 1}
                      </div>
                      <div className="flex items-center gap-3 pl-8">
                        <div>
                          <p className="font-bold text-slate-700 text-sm">
                            {runner.name}
                          </p>
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

        {/* RACE HUB */}
        {view === "race" && (
          <div className="bg-white p-6 rounded-[3rem] shadow-sm space-y-6 animate-in fade-in pb-24">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => safeChangeView("menu")}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
              >
                <ArrowLeft size={20} />
              </button>
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
                Race Cards
              </h3>
              <div className="w-9" />
            </div>

            <div className="space-y-6">
              {tournaments.length === 0 ? (
                <div className="text-center py-10">
                  <Flag size={40} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-xs font-bold text-slate-400">
                    予定されている大会はありません
                  </p>
                </div>
              ) : (
                tournaments.map((tour) => {
                  const myCards = raceCards.filter(
                    (c) =>
                      c.tournamentId === tour.id &&
                      c.runnerId === currentUserId,
                  );
                  const now = new Date().toISOString().slice(0, 10);
                  const isOngoing =
                    now >= tour.startDate && now <= tour.endDate;
                  return (
                    <div
                      key={tour.id}
                      className={`p-5 rounded-3xl border transition-all ${isOngoing ? "bg-blue-50/30 border-blue-200 shadow-md" : "bg-slate-50 border-slate-100"}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-black text-slate-800">
                            {tour.name}
                          </h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                            <Calendar size={12} />{" "}
                            {tour.startDate.replace(/-/g, "/")} 〜{" "}
                            {tour.endDate.replace(/-/g, "/")}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {myCards.map((card) => (
                          <div
                            key={card.id}
                            onClick={() => {
                              setRaceCardInput(card);
                              setEditingRaceCardId(card.id);
                              setView("race-entry");
                            }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer active:scale-95 transition-all group"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                                  {card.raceType}
                                </span>
                                {/* 🌟 達成バッジを表示 */}
                                {(card.badges || []).map((badge) => (
                                  <span
                                    key={badge}
                                    className={`text-[9px] font-black px-2 py-1 rounded-lg text-white ${
                                      badge === "自己ベスト"
                                        ? "bg-orange-500"
                                        : badge === "組1位"
                                          ? "bg-blue-500"
                                          : "bg-emerald-500"
                                    }`}
                                  >
                                    {badge}
                                  </span>
                                ))}
                                {/* ✨ フィードバックがあれば通知バッジを表示 ✨ */}
                                {card.coachFeedback && (
                                  <span className="bg-indigo-500 text-white text-[9px] font-black px-2 py-1 rounded-full animate-pulse flex items-center gap-1 shadow-sm">
                                    <MessageSquare size={10} /> コメントあり
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-black text-slate-400 group-hover:text-blue-500 flex items-center gap-1">
                                編集 <ChevronRight size={14} />
                              </span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <p className="font-black text-lg text-slate-700">
                                  {card.raceType === "駅伝"
                                    ? `${card.distance} (${card.ekidenDistance}km)`
                                    : card.distance}
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1">
                                  目標: {card.targetTime || "未設定"}
                                </p>
                              </div>
                              <div className="text-right">
                                {card.resultTime ? (
                                  <>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                      Result
                                    </p>
                                    <p className="font-black text-emerald-600">
                                      {card.resultTime}
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded">
                                    レース前
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setEditingRaceCardId(null);
                            setRaceCardInput({
                              tournamentId: tour.id,
                              raceType: "トラック",
                              distance: "1500m",
                              ekidenDistance: "",
                              targetTime: "",
                              wupPlan: "",
                              racePlan: "",
                              condition: 3,
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
                            setView("race-entry");
                          }}
                          className="w-full py-3 border-2 border-dashed border-blue-200 text-blue-500 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                        >
                          <Plus size={16} /> 出場種目を追加
                        </button>
                        {/* チームレポートを開くボタン */}
                        <button
                          onClick={() => setShowTeamReportId(tour.id)}
                          className="w-full py-3 mt-4 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-black text-sm hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Users size={18} /> 今大会のチームレポートを見る
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* RACE ENTRY  */}
        {view === "race-entry" && (
          <RaceCardEntry
            setView={setView}
            tournaments={tournaments}
            raceCardInput={raceCardInput}
            setRaceCardInput={setRaceCardInput}
            editingRaceCardId={editingRaceCardId}
            isSubmitting={isSubmitting}
            handleSaveRaceCard={handleSaveRaceCard}
            handleDeleteRaceCard={handleDeleteRaceCard}
          />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-8 pt-2 px-4 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-between items-end h-24 pointer-events-auto">
          <button
            onClick={() => safeChangeView("menu")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 ${view === "menu" ? "text-blue-600 -translate-y-1" : "text-slate-300 hover:text-slate-400"}`}
          >
            <Home size={22} strokeWidth={view === "menu" ? 3 : 2} />
            <span className="text-[8px] font-black uppercase tracking-widest">
              Home
            </span>
          </button>
          <button
            onClick={() => safeChangeView("team_status")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 ${view === "team_status" ? "text-indigo-500 -translate-y-1" : "text-slate-300 hover:text-slate-400"}`}
          >
            <Users size={22} strokeWidth={view === "team_status" ? 3 : 2} />
            <span className="text-[8px] font-black uppercase tracking-widest">
              Team
            </span>
          </button>
          <div className="relative mx-1">
            <button
              onClick={() => {
                resetForm();
                setView("entry");
              }}
              className="bg-blue-600 text-white p-3.5 rounded-full shadow-xl shadow-blue-200 active:scale-95 transition-all -mb-8 border-[6px] border-slate-50 group hover:bg-blue-700"
            >
              <Plus
                size={28}
                strokeWidth={3}
                className="group-hover:rotate-90 transition-transform duration-300"
              />
            </button>
          </div>
          <button
            onClick={() => safeChangeView("diary")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 ${view === "diary" ? "text-orange-500 -translate-y-1" : "text-slate-300 hover:text-slate-400"}`}
          >
            <div className="relative">
              <BookOpen size={22} strokeWidth={view === "diary" ? 3 : 2} />
              {/* 🌟 日誌の未読があれば赤丸を表示 */}
              {hasUnreadDiary && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white"></span>
                </span>
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">
              Diary
            </span>
          </button>

          <button
            onClick={() => safeChangeView("review")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 ${view === "review" ? "text-emerald-500 -translate-y-1" : "text-slate-300 hover:text-slate-400"}`}
          >
            <div className="relative">
              <MessageSquare
                size={22}
                strokeWidth={view === "review" ? 3 : 2}
              />
              {/* 🌟 振り返りの未読があれば赤丸を表示 */}
              {hasUnreadReview && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white"></span>
                </span>
              )}
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest">
              Review
            </span>
          </button>
        </div>
      </nav>

      {/* 削除確認ダイアログ */}
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
      {/* 通知センター (Notification Modal) */}
      {isNotifOpen && (
        <div
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsNotifOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md max-h-[80vh] rounded-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
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

            {/* リスト部分 */}
            <div className="overflow-y-auto p-4 space-y-3 pb-8">
              {notifications.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <Bell size={40} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-500">
                    新しいお知らせはありません
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={notif.onClick}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition-all cursor-pointer hover:border-blue-200 shadow-sm relative overflow-hidden group"
                  >
                    {/* 未読インジケーター (青い線) */}
                    {notif.time > lastReadTime && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    )}

                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[9px] font-black text-white px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm ${
                          notif.type === "Feedback"
                            ? "bg-indigo-500" // Feedbackの通知
                            : notif.type === "Diary"
                              ? "bg-orange-500" // NewIventの通知
                              : "bg-emerald-500" // Diaryの通知
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
                        確認する <ChevronRight size={10} />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* 🌟 画面の最後にこれを追加！ (既存の</div>の内側の一番下) */}
      {showTeamReportId && (
        <TeamRaceReport
          reportTour={tournaments.find((t) => t.id === showTeamReportId)}
          reportCards={raceCards.filter(
            (c) => c.tournamentId === showTeamReportId,
          )}
          onClose={() => setShowTeamReportId(null)}
        />
      )}
    </div> //  AthleteViewの最後の閉じタグ
  );
};

export default AthleteView;
