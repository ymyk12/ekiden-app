/*
 * AthleteView — 選手ダッシュボード（メイン画面）
 *
 * 選手がログイン後に使うすべての機能を含む大型コンポーネント。
 * 練習記録の入力・閲覧、走行距離グラフ、目標設定、
 * 大会振り返りノート、監督フィードバックの確認などを担当する。
 * 監督が特定選手のデータをプレビューする際にも使用される。
 */
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";

import {
  Eye,
  Menu,
  Target,
  LogOut,
  Filter,
  BookOpen,
  Users,
  Trash2,
  ChevronRight,
  Home,
  Plus,
  Edit,
  Loader2,
  Flag,
  Calendar,
  Bell,
  X,
} from "lucide-react";

import { ROLES, CATEGORY } from "../utils/constants";

import RaceCardEntry from "./RaceCardEntry";
import TeamRaceReport from "./TeamRaceReport";
import CalendarView from "./CalendarView";
import DocumentsModal from "./DocumentsModal";
import AnnouncementCenter from "./shared/AnnouncementCenter";
import { useAnnouncements } from "../hooks/useAnnouncements";
import AthleteTeamStatusView from "./athlete/AthleteTeamStatusView";
import AthleteMenuView from "./athlete/AthleteMenuView";
import AthleteEntryView from "./athlete/AthleteEntryView";
import AthleteMyLogView from "./athlete/AthleteMyLogView";
import AthleteGoalView from "./athlete/AthleteGoalView";
import AthleteRaceView from "./athlete/AthleteRaceView";

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
    periodLogs,
    rankingData,
    teamLogs,
    allLogs,
    activeRunners,
    teamRunners,
    logInput,
    setLogInput,
    isSubmitting,
    editingLogId,
    setEditingLogId,
    expandedDiaryId,
    setExpandedDiaryId,
    goalInput,
    setGoalInput,
    handleLogout,
    handleSaveLog,
    handleDeleteLog,
    handleRestRegister,
    handleEditLog,
    resetForm,
    updateGoals,
    tournaments,
    raceCards,
    editingRaceCardId,
    setEditingRaceCardId,
    raceCardInput,
    setRaceCardInput,
    handleSaveRaceCard,
    handleDeleteRaceCard,
    isAthleteEditModalOpen,
    setIsAthleteEditModalOpen,
    handleAthleteUpdateLog,
  } = props;

  // 画面（view）が切り替わるたびに、スクロールを一番上（0, 0）に戻す
  useEffect(() => {
    window.scrollTo(0, 0);
    // menu の四半期開閉トグルは AthleteMenuView が自前で保持し、
    // menu へ戻るたびに再マウントされて自然に閉じた状態に戻る。
  }, [view]);

  const isPreview = role === ROLES.COACH && previewRunner;

  // 新機能のお知らせ（プレビュー中の監督には出さない＝本人ログイン時のみ）
  // 確認用: プレビュー中でも、URL に ?announce=1 を付ければお知らせを表示できる
  const announcementRole =
    !isPreview || new URLSearchParams(window.location.search).has("announce")
      ? "athlete"
      : "";
  const {
    forRole: roleAnnouncements,
    pendingModal: pendingAnnouncements,
    markShown: markAnnouncementShown,
    markUsed: markAnnouncementUsed,
    hasUnused: hasUnusedAnnouncement,
  } = useAnnouncements({ role: announcementRole, userId: currentUserId });

  // 新機能の画面を開いたら、その機能を「使用済み」にして NEW バッジを消す
  useEffect(() => {
    roleAnnouncements.forEach((a) => {
      if (a.cta?.view === view) markAnnouncementUsed(a.id);
    });
  }, [view, roleAnnouncements, markAnnouncementUsed]);

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [lastReadTime, setLastReadTime] = useState(() => {
    return (
      localStorage.getItem(`notif_read_${currentUserId}`) ||
      "2000-01-01T00:00:00.000Z"
    );
  });

  // アプリ内のデータから「お知らせ」を自動でリストアップ
  const notifications = useMemo(() => {
    const list = [];

    const myCards = raceCards.filter(
      (c) => c.runnerId === currentUserId && c.coachFeedback,
    );
    myCards.forEach((c) => {
      const tour = tournaments.find((t) => t.id === c.tournamentId);
      const feedbackTime = c.coachFeedbackAt || c.updatedAt || "2024-01-01T00:00:00.000Z";
      list.push({
        id: `fb_race_${c.id}_${feedbackTime}`,
        type: "Feedback",
        title: "大会ノートにコメントが届きました",
        message: `「${tour?.name || "大会"}」のシートに監督からフィードバックがあります！`,
        time: feedbackTime,
        onClick: () => {
          setIsNotifOpen(false);
          setRaceCardInput(c);
          setEditingRaceCardId(c.id);
          setView("race-entry");
        },
      });
    });

    // 3. 新しい大会が追加された（便宜上、トーナメント一覧の最後を最新とみなす）
    // 全ての大会を通知リストに追加（未読判定は後続のロジックで行う）
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

    return list.sort((a, b) => (a.time < b.time ? 1 : -1));
  }, [
    raceCards,
    tournaments,
    currentUserId,
    setEditingRaceCardId,
    setRaceCardInput,
    setView,
  ]);

  const unreadCount = notifications.filter((n) => n.time > lastReadTime).length;

  // カテゴリごとの未読判定（バッジ表示用）
  const unreadNotifs = notifications.filter((n) => n.time > lastReadTime);
  const hasUnreadRace = unreadNotifs.some(
    (n) => n.id.startsWith("fb_race_") || n.id.startsWith("tour_"),
  );
  const [showTeamReportId, setShowTeamReportId] = useState(null);
  const [diaryDetailLog, setDiaryDetailLog] = useState(null);
  const [showDocs, setShowDocs] = useState(false);

  // Esc キーで開いている最前面のモーダルを閉じる（PC操作向け）
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (isNotifOpen) return setIsNotifOpen(false);
      if (confirmDialog?.isOpen)
        return setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
      if (diaryDetailLog) return setDiaryDetailLog(null);
      if (isAthleteEditModalOpen) return setIsAthleteEditModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    isNotifOpen,
    confirmDialog,
    diaryDetailLog,
    isAthleteEditModalOpen,
    setConfirmDialog,
    setIsAthleteEditModalOpen,
  ]);

  // 日誌の赤バッジ判定を独立させる（一覧やプッシュ通知には出ない）
  const latestDiaryTime =
    teamLogs && teamLogs.length > 0
      ? Math.max(
          ...teamLogs.map((l) =>
            new Date(l.updatedAt || l.createdAt || "2000-01-01").getTime(),
          ),
        )
      : 0;
  const hasUnreadDiary = latestDiaryTime > new Date(lastReadTime).getTime();

  const handleOpenNotif = () => {
    setIsNotifOpen(true);
    const nowStr = new Date().toISOString();
    setLastReadTime(nowStr);
    localStorage.setItem(`notif_read_${currentUserId}`, nowStr);
  };

  const safeChangeView = (targetView) => {
    if (
      view === "entry" &&
      targetView !== "entry" &&
      (logInput.distance !== "" || logInput.menuDetail !== "")
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
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm p-6 rounded-[2.5rem] space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-black text-center text-slate-400 uppercase tracking-widest text-xs">
              Menu
            </h3>
            <button
              onClick={() => {
                safeChangeView("race");
                setIsMenuOpen(false);
              }}
              className="w-full py-4 bg-indigo-50 text-indigo-700 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              <Flag size={20} /> 大会ノート (Race Card)
              {/* 大会関連の未読があれば赤丸を表示 */}
              {hasUnreadRace && (
                <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
              )}
            </button>
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
        className={`sticky top-0 z-50 bg-blue-600 text-white pt-12 pb-4 px-6 rounded-b-[2.5rem] relative overflow-hidden shadow-lg shadow-blue-900/20 ${isPreview ? "mt-8" : ""}`}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
        <div className="flex justify-between items-center relative z-10 max-w-md mx-auto">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="bg-white/20 p-2.5 rounded-2xl active:scale-90 transition-all text-white"
          >
            <Menu size={20} />
            {(hasUnreadRace || hasUnusedAnnouncement("menu")) && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-blue-600"></span>
              </span>
            )}
          </button>
          <div className="text-center">
            <p className="text-blue-100 text-[10px] font-black tracking-widest uppercase mb-0.5">
              Athlete Dashboard
            </p>
            <h1 className="text-xl font-black tracking-tighter">
              {currentProfile.lastName} {currentProfile.firstName}
            </h1>
          </div>
          <div className="relative">
            <button
              onClick={handleOpenNotif}
              className="bg-white/20 p-2.5 rounded-2xl active:scale-90 transition-all text-white relative shadow-sm hover:bg-white/30"
            >
              <Bell size={20} />
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

        {availablePeriods.length > 0 && selectedPeriod && (
          <div className="mt-3 max-w-md mx-auto relative z-10">
            <div className="bg-white/20 backdrop-blur-md p-2 rounded-2xl flex items-center gap-2 border border-white/30">
              <Filter size={14} className="text-white ml-2 opacity-80 flex-shrink-0" />
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
      </header>

      <main className="px-5 space-y-6 relative z-20 max-w-md mx-auto print:max-w-none print:w-full print:px-0 print:mx-0 print:space-y-0 print:overflow-visible">
        {view === "menu" && (
          <AthleteMenuView
            currentProfile={currentProfile}
            targetPeriod={targetPeriod}
            setView={setView}
            safeChangeView={safeChangeView}
            missingDates={missingDates}
            logInput={logInput}
            setLogInput={setLogInput}
            setShowDocs={setShowDocs}
            personalStats={personalStats}
            activeQuarters={activeQuarters}
            allLogs={allLogs}
            currentUserId={currentUserId}
            teamLogs={teamLogs}
          />
        )}

        {/* Entry View */}
        {view === "entry" && (
          <AthleteEntryView
            safeChangeView={safeChangeView}
            logInput={logInput}
            setLogInput={setLogInput}
            handleSaveLog={handleSaveLog}
            isSubmitting={isSubmitting}
            editingLogId={editingLogId}
            setEditingLogId={setEditingLogId}
            resetForm={resetForm}
            handleRestRegister={handleRestRegister}
          />
        )}

        {/* MY LOG */}
        {(view === "diary" || view === "my-report") && (
          <AthleteMyLogView
            initialSubView={view === "my-report" ? "report" : "log"}
            teamRunners={teamRunners}
            safeChangeView={safeChangeView}
            periodLogs={periodLogs}
            setDiaryDetailLog={setDiaryDetailLog}
            targetPeriod={targetPeriod}
            allLogs={allLogs}
            raceCards={raceCards}
            tournaments={tournaments}
            currentUserId={currentUserId}
          />
        )}

        {/* Goal View */}
        {view === "goal" && (
          <AthleteGoalView
            safeChangeView={safeChangeView}
            targetPeriod={targetPeriod}
            goalInput={goalInput}
            setGoalInput={setGoalInput}
            activeQuarters={activeQuarters}
            updateGoals={updateGoals}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Team Status View */}
        {view === "team_status" && (
          <AthleteTeamStatusView
            safeChangeView={safeChangeView}
            targetPeriod={targetPeriod}
            rankingData={rankingData}
            allLogs={allLogs}
            teamLogs={teamLogs}
            activeRunners={activeRunners}
            teamRunners={teamRunners}
            expandedDiaryId={expandedDiaryId}
            setExpandedDiaryId={setExpandedDiaryId}
          />
        )}

        {/* RACE HUB */}
        {view === "race" && (
          <AthleteRaceView
            safeChangeView={safeChangeView}
            tournaments={tournaments}
            raceCards={raceCards}
            currentUserId={currentUserId}
            gender={currentProfile.gender}
            setRaceCardInput={setRaceCardInput}
            setEditingRaceCardId={setEditingRaceCardId}
            setView={setView}
            setShowTeamReportId={setShowTeamReportId}
          />
        )}

        {/* RACE ENTRY  */}
        {view === "race-entry" && (
          <RaceCardEntry
            setView={setView}
            setConfirmDialog={setConfirmDialog}
            tournaments={tournaments}
            raceCardInput={raceCardInput}
            setRaceCardInput={setRaceCardInput}
            editingRaceCardId={editingRaceCardId}
            isSubmitting={isSubmitting}
            handleSaveRaceCard={handleSaveRaceCard}
            handleDeleteRaceCard={handleDeleteRaceCard}
            raceCards={raceCards}
            currentUserId={currentUserId}
            gender={currentProfile.gender}
          />
        )}

        {/* CALENDAR */}
        {view === "calendar" && (
          <CalendarView
            allLogs={allLogs}
            teamLogs={teamLogs}
            tournaments={tournaments}
            role={role}
            currentUserId={currentUserId}
            responsive={false}
            onEntryRequest={(dateStr) => {
              setLogInput({ ...logInput, date: dateStr });
              setView("entry");
            }}
            onEditRequest={(log) => handleEditLog(log)}
          />
        )}

      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 px-3 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-between items-end min-h-24 pointer-events-auto">
          <button
            onClick={() => safeChangeView("menu")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 rounded-xl py-1 ${view === "menu" ? "text-blue-600 -translate-y-1 bg-blue-50" : "text-slate-400 hover:text-slate-500"}`}
          >
            <Home size={20} strokeWidth={view === "menu" ? 3 : 2} />
            <span className="text-[11px] font-black uppercase tracking-widest">Home</span>
          </button>
          <button
            onClick={() => safeChangeView("diary")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 rounded-xl py-1 ${view === "diary" || view === "my-report" ? "text-blue-600 -translate-y-1 bg-blue-50" : "text-slate-400 hover:text-slate-500"}`}
          >
            <div className="relative">
              <BookOpen size={20} strokeWidth={view === "diary" || view === "my-report" ? 3 : 2} />
              {hasUnusedAnnouncement("mylog") && (
                <span className="absolute -top-1.5 -right-3 text-[8px] font-black text-white bg-rose-500 px-1 py-px rounded-full animate-pulse">
                  NEW
                </span>
              )}
            </div>
            <span className="text-[11px] font-black uppercase tracking-tight whitespace-nowrap">My Log</span>
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
            onClick={() => safeChangeView("team_status")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 rounded-xl py-1 ${view === "team_status" ? "text-blue-600 -translate-y-1 bg-blue-50" : "text-slate-400 hover:text-slate-500"}`}
          >
            <div className="relative">
              <Users size={20} strokeWidth={view === "team_status" ? 3 : 2} />
              {hasUnreadDiary && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white"></span>
                </span>
              )}
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest">Team</span>
          </button>
          <button
            onClick={() => safeChangeView("calendar")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 rounded-xl py-1 ${view === "calendar" ? "text-blue-600 -translate-y-1 bg-blue-50" : "text-slate-400 hover:text-slate-500"}`}
          >
            <Calendar size={20} strokeWidth={view === "calendar" ? 3 : 2} />
            <span className="text-[11px] font-black uppercase tracking-widest">Cal</span>
          </button>
        </div>
      </nav>

      {/* 削除確認ダイアログ */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs w-full animate-in zoom-in-95">
            <p className="font-bold text-slate-800 mb-6 text-center leading-relaxed text-sm whitespace-pre-wrap">
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
          className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsNotifOpen(false)}
        >
          <div
            className="bg-white w-full max-w-md max-h-[80vh] rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 relative z-10">
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
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3 pb-8">
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
      {showTeamReportId && (
        <TeamRaceReport
          reportTour={tournaments.find((t) => t.id === showTeamReportId)}
          reportCards={raceCards.filter(
            (c) => c.tournamentId === showTeamReportId,
          )}
          onClose={() => setShowTeamReportId(null)}
        />
      )}

      {/* My Log 詳細ボトムシート（閲覧用 → 編集はここから）
          createPortal で body 直下に出し position:fixed の封じ込めを回避 */}
      {diaryDetailLog && (() => {
        const log = diaryDetailLog;
        const isRest = log.category === "完全休養";
        return createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
              onClick={() => setDiaryDetailLog(null)}
            />
            <div
              className="relative w-full max-w-md mx-auto max-h-[85dvh] flex flex-col bg-white rounded-t-[2rem] shadow-2xl animate-in slide-in-from-bottom duration-300"
              style={{ maxHeight: "85dvh" }}
            >
              {/* グラブハンドル＋ヘッダー（固定） */}
              <div className="flex-shrink-0 px-5 pt-3">
                <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mb-2" />
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-800">
                    {log.date.replace(/-/g, "/")}
                  </h3>
                  <button
                    onClick={() => setDiaryDetailLog(null)}
                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 本文（ここだけスクロール） */}
              <div
                className="overflow-y-auto overscroll-contain min-h-0 px-5 pt-3 space-y-4"
                style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
              >
              <div
                className={`rounded-2xl px-4 py-3 space-y-2 ${isRest ? "bg-emerald-50 border border-emerald-100" : "bg-blue-50 border border-blue-100"}`}
              >
                {isRest ? (
                  <p className="text-sm font-bold text-emerald-700">💤 完全休養</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-blue-700">{log.distance}</span>
                      <span className="text-xs font-bold text-blue-500">km</span>
                      <span className="ml-auto text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                        {log.category}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {log.rpe > 0 && (
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${log.rpe >= 8 ? "bg-rose-100 text-rose-600 border-rose-200" : log.rpe >= 5 ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          RPE {log.rpe}
                        </span>
                      )}
                      {log.pain > 1 && (
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${log.pain >= 4 ? "bg-purple-100 text-purple-600 border-purple-200" : log.pain >= 3 ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
                          Pain {log.pain}
                        </span>
                      )}
                    </div>
                    {log.menuDetail && (
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap pt-1">
                        {log.menuDetail}
                      </p>
                    )}
                  </>
                )}
              </div>

              </div>{/* /本文スクロール */}

              {/* アクション（下部固定） */}
              <div className="flex-shrink-0 flex gap-2 px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-slate-100">
                <button
                  onClick={() => {
                    setDiaryDetailLog(null);
                    handleDeleteLog(log.id);
                  }}
                  className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 active:scale-95 transition-all flex-shrink-0"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => {
                    setDiaryDetailLog(null);
                    handleEditLog(log);
                  }}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
                >
                  <Edit size={16} strokeWidth={2.5} />
                  この記録を編集
                </button>
              </div>
            </div>
          </div>,
          document.body,
        );
      })()}

      {/* 選手自身の練習記録編集モーダル */}
      {isAthleteEditModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-black text-sm text-slate-800">
              記録を修正する
            </h3>

            {/* 日付・区分 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">
                  日付
                </label>
                <input
                  type="date"
                  value={logInput.date}
                  onChange={(e) =>
                    setLogInput({ ...logInput, date: e.target.value })
                  }
                  className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">
                  区分
                </label>
                <select
                  value={logInput.category}
                  onChange={(e) =>
                    setLogInput({ ...logInput, category: e.target.value })
                  }
                  className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled>
                    区分を選択
                  </option>
                  {Object.values(CATEGORY).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 距離 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">
                距離 (km)
              </label>
              <input
                type="number"
                step="0.01"
                value={logInput.distance}
                onChange={(e) =>
                  setLogInput({ ...logInput, distance: e.target.value })
                }
                className="w-full mt-1 p-3 bg-blue-50/30 border border-blue-100 rounded-xl font-black text-2xl text-center outline-none focus:ring-2 ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* メニュー詳細 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase">
                メニュー詳細
              </label>
              <textarea
                value={logInput.menuDetail}
                onChange={(e) =>
                  setLogInput({ ...logInput, menuDetail: e.target.value })
                }
                className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 focus:border-transparent min-h-[80px] resize-none"
              />
            </div>

            {/* RPE・痛み */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">
                  RPE (1-10)
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={logInput.rpe}
                  onChange={(e) =>
                    setLogInput({ ...logInput, rpe: e.target.value })
                  }
                  className="w-full mt-2 accent-blue-600"
                />
                <p className="text-center font-black text-lg text-blue-600">
                  {logInput.rpe}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase">
                  痛み (1-5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={logInput.pain}
                  onChange={(e) =>
                    setLogInput({ ...logInput, pain: e.target.value })
                  }
                  className="w-full mt-2 accent-rose-500"
                />
                <p
                  className={`text-center font-black text-lg ${logInput.pain >= 3 ? "text-rose-500" : "text-slate-500"}`}
                >
                  {logInput.pain}
                </p>
              </div>
            </div>

            {/* ボタン */}
            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsAthleteEditModalOpen(false);
                  handleDeleteLog(editingLogId);
                }}
                className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 active:scale-95 transition-all"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() => {
                  setIsAthleteEditModalOpen(false);
                  resetForm();
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm active:scale-95 transition-all"
              >
                キャンセル
              </button>
              <button
                onClick={handleAthleteUpdateLog}
                disabled={isSubmitting}
                className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-1.5 ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md shadow-blue-500/25 active:scale-95"}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> 更新中...
                  </>
                ) : (
                  "更新する"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <DocumentsModal open={showDocs} onClose={() => setShowDocs(false)} />

      {/* 新機能のお知らせ（初回ログイン時） */}
      <AnnouncementCenter
        pendingModal={pendingAnnouncements}
        markShown={markAnnouncementShown}
        onNavigate={(v) => safeChangeView(v)}
      />
    </div> //  AthleteViewの最後の閉じタグ
  );
};

export default AthleteView;
