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
  CalendarDays,
  Settings,
  LogOut,
  BarChart2,
  Flag,
  BookOpen,
  Bell,
  BellRing,
  Home,
} from "lucide-react";

import { setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { docRef } from "../utils/firestore";
import { ROLES } from "../utils/constants";
import { getTodayStr, getDatesInRange } from "../utils/dateUtils";

import DocumentsModal from "./DocumentsModal";
import { usePrint } from "../hooks/usePrint";
import LapTimeModal from "./LapTimeModal";
import TeamRaceReport from "./TeamRaceReport";
import TeamDiaryView from "./shared/TeamDiaryView";
import { useTeamDiary } from "../hooks/useTeamDiary";
import CoachSettingsView from "./coach/CoachSettingsView";
import CoachRunnerDetailView from "./coach/CoachRunnerDetailView";
import CoachRaceView from "./coach/CoachRaceView";
import CoachRosterView from "./coach/CoachRosterView";
import CoachHomeView from "./coach/CoachHomeView";
import CoachStatsView from "./coach/CoachStatsView";
import CoachCalendarView from "./coach/CoachCalendarView";
import CoachLogEditModal from "./coach/CoachLogEditModal";
import CoachPainAlertModal from "./coach/CoachPainAlertModal";
import CoachNotificationsModal from "./coach/CoachNotificationsModal";
import CoachReadingCardModal from "./coach/CoachReadingCardModal";

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
    setDemoMode,
    tournaments,
    raceCards,
    newTournamentInput,
    setNewTournamentInput,
    handleSaveTournament,
    handleDeleteTournament,
    handleSaveRaceCardFeedback,
    handleSaveEkidenPresets,
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
        if (c.updatedBy === "coach" || c.createdBy === "coach") return;
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
  const [onlyPendingFeedback, setOnlyPendingFeedback] = useState(false);
  // カードを開いた時点の送り順を固定する（FB送信でフィルタから外れても 0/N に戻らないように）
  const [readingNavIds, setReadingNavIds] = useState(null);
  const [showDocs, setShowDocs] = useState(false);
  const [readingCard, setReadingCard] = useState(null);
  const [coachFeedbackInput, setCoachFeedbackInput] = useState("");
  const [showTeamReportId, setShowTeamReportId] = useState(null);

  const [isSubmitListOpen, setIsSubmitListOpen] = useState(false);
  const [isMissingListOpen, setIsMissingListOpen] = useState(false);
  const [missingStart, setMissingStart] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString("sv-SE");
  });
  const [missingEnd, setMissingEnd] = useState(getTodayStr);
  const [missingCopied, setMissingCopied] = useState(false);
  const [isReassigningCard, setIsReassigningCard] = useState(false);
  const [reassignTourId, setReassignTourId] = useState("");
  const [isEditingReadingCard, setIsEditingReadingCard] = useState(false);
  const [readingCardEditInput, setReadingCardEditInput] = useState({});
  // チーム練習日誌（監督・マネージャー共通フック）。対象日は menuInput.date を使う。
  const {
    diaryMode,
    setDiaryMode,
    listMonth,
    shiftMonth,
    isSaving,
    diaryInput,
    setDiaryInput,
    showAIModal,
    setShowAIModal,
    aiImage,
    setAiImage,
    isGenerating,
    reinforcementOptions,
    existingLog,
    monthlyLogs,
    openDiary,
    toggleReinforcement,
    saveDiary,
    handleRestRegister,
    deleteDiary,
    generateDiaryWithAI,
  } = useTeamDiary({
    role: ROLES.COACH,
    profile: null,
    diaryDate: menuInput.date,
    setDiaryDate: (d) => setMenuInput({ ...menuInput, date: d }),
    teamLogs,
    setConfirmDialog,
  });

  const missingListText = useMemo(() => {
    const dates = getDatesInRange(missingStart, missingEnd);
    if (dates.length === 0) return "";
    const logSet = new Set(allLogs.map((l) => `${l.runnerId}_${l.date}`));
    const lines = activeRunners
      .filter((r) => r.role !== ROLES.MANAGER)
      .map((r) => {
        const missing = dates.filter((d) => !logSet.has(`${r.id}_${d}`));
        if (missing.length === 0) return null;
        const datesStr = missing
          .map((d) => d.slice(5).replace("-", "/"))
          .join("、");
        return `${r.lastName}${r.firstName}：${datesStr}`;
      })
      .filter(Boolean);
    if (lines.length === 0) return "全員提出済みです";
    const startLabel = missingStart.slice(5).replace("-", "/");
    const endLabel = missingEnd.slice(5).replace("-", "/");
    return `【${startLabel}〜${endLabel} 未入力選手リスト】\n${lines.join("\n")}`;
  }, [missingStart, missingEnd, allLogs, activeRunners]);

  // Esc キーで開いている最前面のモーダルを閉じる（PC操作向け）
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (showAIModal) return setShowAIModal(false);
      if (showTeamReportId) return setShowTeamReportId(null);
      if (isNotifOpen) return setIsNotifOpen(false);
      if (confirmDialog?.isOpen)
        return setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
      if (isCoachEditModalOpen) return setIsCoachEditModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    showAIModal,
    setShowAIModal,
    showTeamReportId,
    isNotifOpen,
    confirmDialog,
    isCoachEditModalOpen,
    setConfirmDialog,
    setIsCoachEditModalOpen,
  ]);


  return (
    <div className="h-[100dvh] bg-slate-50 overflow-hidden print:bg-white print:h-auto flex flex-col md:flex-row">
      <header className="bg-slate-950 text-white px-4 py-2.5 sticky top-0 z-50 md:p-5 md:h-screen md:w-64 lg:w-72 md:flex md:flex-col md:justify-between shadow-xl print:hidden">
        <div className="flex items-center justify-between md:block">
          <h1 className="font-black italic text-lg flex items-center gap-2 tracking-tighter md:text-xl md:mb-7">
            <Users size={18} className="text-blue-400 md:w-5 md:h-5" /> COACH
            TERMINAL
          </h1>

          {/* モバイル用アイコン（右端） */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setShowDocs(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all"
              aria-label="資料"
            >
              <FileText size={19} />
            </button>
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
            onClick={() => setShowDocs(true)}
            className="flex items-center gap-2 font-bold text-sm text-slate-400 hover:text-white transition-all"
          >
            <FileText size={18} /> 資料
          </button>
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
        <div className="md:hidden relative flex-shrink-0 print:hidden">
          <div className="flex bg-slate-950 px-3 py-2 overflow-x-auto no-scrollbar gap-1">
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
                  <span className="text-[10px] font-black uppercase tracking-wide">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
          {/* 右端フェード: 横スクロールで続きのタブがあることを示す */}
          <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-slate-950 to-transparent" />
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
        <main className="flex-1 overflow-y-auto p-5 md:p-8 w-full max-w-md mx-auto md:max-w-3xl lg:max-w-5xl xl:max-w-6xl print:max-w-none print:p-0 print:w-full print:overflow-visible">
          {view === "coach-home" && (
            <CoachHomeView
              checkDate={checkDate}
              setCheckDate={setCheckDate}
              coachStats={coachStats}
              setIsPainAlertModalOpen={setIsPainAlertModalOpen}
              isSubmitListOpen={isSubmitListOpen}
              setIsSubmitListOpen={setIsSubmitListOpen}
              checkListData={checkListData}
              allLogs={allLogs}
              activeRunners={activeRunners}
              openCoachEditModal={openCoachEditModal}
              isMissingListOpen={isMissingListOpen}
              setIsMissingListOpen={setIsMissingListOpen}
              missingStart={missingStart}
              setMissingStart={setMissingStart}
              missingEnd={missingEnd}
              setMissingEnd={setMissingEnd}
              missingListText={missingListText}
              missingCopied={missingCopied}
              setMissingCopied={setMissingCopied}
            />
          )}

          {view === "coach-stats" && (
            <CoachStatsView
              exportCSV={exportCSV}
              rankingData={rankingData}
              handlePrint={handlePrint}
              activeRunners={activeRunners}
              targetPeriod={targetPeriod}
              reportMatrix={reportMatrix}
              monthlyTrendData={monthlyTrendData}
              cumulativeData={cumulativeData}
              reportChartData={reportChartData}
              allLogs={allLogs}
              raceCards={raceCards}
              tournaments={tournaments}
            />
          )}

          {view === "coach-diary" && (
            <TeamDiaryView
              accent="blue"
              diaryDate={menuInput.date}
              setDiaryDate={(d) => setMenuInput({ ...menuInput, date: d })}
              diaryMode={diaryMode}
              setDiaryMode={setDiaryMode}
              listMonth={listMonth}
              shiftMonth={shiftMonth}
              monthlyLogs={monthlyLogs}
              existingLog={existingLog}
              diaryInput={diaryInput}
              setDiaryInput={setDiaryInput}
              isSaving={isSaving}
              reinforcementOptions={reinforcementOptions}
              showAIModal={showAIModal}
              setShowAIModal={setShowAIModal}
              aiImage={aiImage}
              setAiImage={setAiImage}
              isGenerating={isGenerating}
              openDiary={openDiary}
              toggleReinforcement={toggleReinforcement}
              saveDiary={saveDiary}
              handleRestRegister={handleRestRegister}
              deleteDiary={deleteDiary}
              generateDiaryWithAI={generateDiaryWithAI}
            />
          )}

          {view === "coach-race" && (
            <CoachRaceView
              tournaments={tournaments}
              raceCards={raceCards}
              newTournamentInput={newTournamentInput}
              setNewTournamentInput={setNewTournamentInput}
              handleSaveTournament={handleSaveTournament}
              handleDeleteTournament={handleDeleteTournament}
              isSubmitting={isSubmitting}
              setShowTeamReportId={setShowTeamReportId}
              setSelectedTourId={setSelectedTourId}
              setOnlyPendingFeedback={setOnlyPendingFeedback}
              ekidenPresets={appSettings?.ekidenPresets || []}
              handleSaveEkidenPresets={handleSaveEkidenPresets}
            />
          )}

          {view === "coach-roster" && (
            <CoachRosterView
              activeRunners={activeRunners}
              allRunners={allRunners}
              handleCoachEditRunner={handleCoachEditRunner}
              handleStartPreview={handleStartPreview}
              setConfirmDialog={setConfirmDialog}
              setView={setView}
            />
          )}

          {view === "coach-runner-detail" && selectedRunner && (
            <CoachRunnerDetailView
              selectedRunner={selectedRunner}
              setView={setView}
              coachEditFormData={coachEditFormData}
              setCoachEditFormData={setCoachEditFormData}
              handleCoachSaveProfile={handleCoachSaveProfile}
              isSubmitting={isSubmitting}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              availablePeriods={availablePeriods}
              targetPeriod={targetPeriod}
              coachGoalInput={coachGoalInput}
              setCoachGoalInput={setCoachGoalInput}
              activeQuarters={activeQuarters}
              handleCoachSaveGoals={handleCoachSaveGoals}
              allLogs={allLogs}
              openCoachEditModal={openCoachEditModal}
              getRunnerFeedback={getRunnerFeedback}
              setCoachFeedbackComment={setCoachFeedbackComment}
              handleSaveCoachFeedback={handleSaveCoachFeedback}
              setConfirmDialog={setConfirmDialog}
              handleCoachChangeRole={handleCoachChangeRole}
            />
          )}

          {view === "coach-settings" && (
            <CoachSettingsView
              appSettings={appSettings}
              setAppSettings={setAppSettings}
              handleSaveDefaultPeriod={handleSaveDefaultPeriod}
              availablePeriods={availablePeriods}
              editingPeriodId={editingPeriodId}
              newPeriodInput={newPeriodInput}
              updateNewPeriodInputWithAutoQuarters={updateNewPeriodInputWithAutoQuarters}
              handleNewPeriodQuarterChange={handleNewPeriodQuarterChange}
              handleCancelEdit={handleCancelEdit}
              handleSaveCustomPeriod={handleSaveCustomPeriod}
              isPeriodSaving={isPeriodSaving}
              handleEditCustomPeriod={handleEditCustomPeriod}
              handleDeleteCustomPeriod={handleDeleteCustomPeriod}
              setDemoMode={setDemoMode}
              setView={setView}
            />
          )}

          {isCoachEditModalOpen && (
            <CoachLogEditModal
              logInput={logInput}
              setLogInput={setLogInput}
              handleCoachDeleteLog={handleCoachDeleteLog}
              handleCoachUpdateLog={handleCoachUpdateLog}
              setIsCoachEditModalOpen={setIsCoachEditModalOpen}
              setEditingLogId={setEditingLogId}
              resetForm={resetForm}
              isSubmitting={isSubmitting}
            />
          )}

          {isPainAlertModalOpen && (
            <CoachPainAlertModal
              coachStats={coachStats}
              setIsPainAlertModalOpen={setIsPainAlertModalOpen}
              handleCoachEditRunner={handleCoachEditRunner}
            />
          )}

          {isNotifOpen && (
            <CoachNotificationsModal
              notifications={notifications}
              lastReadTime={lastReadTime}
              setIsNotifOpen={setIsNotifOpen}
            />
          )}

          {view === "coach-calendar" && (
            <CoachCalendarView
              selectedRunner={selectedRunner}
              allLogs={allLogs}
              teamLogs={teamLogs}
              tournaments={tournaments}
              setShowTeamReportId={setShowTeamReportId}
            />
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
          handlePrint={handlePrint}
          canEdit
          onSaveCard={async (cardId, { resultTime, lapTimes }) => {
            await updateDoc(docRef("raceCards", cardId), {
              resultTime,
              lapTimes,
              updatedAt: new Date().toISOString(),
              updatedBy: "coach",
            });
          }}
          onEditCard={async (cardId, fields) => {
            await updateDoc(docRef("raceCards", cardId), {
              ...fields,
              updatedAt: new Date().toISOString(),
              updatedBy: "coach",
            });
          }}
          onSaveConditions={async (dateKey, data) => {
            await updateDoc(docRef("tournaments", showTeamReportId), {
              [`conditions.${dateKey}`]: data,
            });
          }}
          onSaveTeamResult={async (key, data) => {
            await updateDoc(docRef("tournaments", showTeamReportId), {
              [`teamResults.${key}`]: data,
            });
          }}
          onDeleteCard={async (cardId) => {
            await deleteDoc(docRef("raceCards", cardId));
          }}
          onOpenCard={(card) => {
            setShowTeamReportId(null);
            setSelectedTourId(card.tournamentId);
            setOnlyPendingFeedback(false);
            setReadingNavIds(null);
            setReadingCard(card);
            setCoachFeedbackInput(card.coachFeedback || "");
          }}
          allRunners={activeRunners.filter((r) => r.role !== "manager")}
          onAddCard={async (cardData) => {
            const cardId = `rc_coach_${Date.now()}`;
            await setDoc(docRef("raceCards", cardId), {
              ...cardData,
              id: cardId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: "coach",
            });
          }}
        />
      )}

      {selectedTourId && (
        <CoachReadingCardModal
          selectedTourId={selectedTourId}
          setSelectedTourId={setSelectedTourId}
          tournaments={tournaments}
          raceCards={raceCards}
          onlyPendingFeedback={onlyPendingFeedback}
          setOnlyPendingFeedback={setOnlyPendingFeedback}
          readingCard={readingCard}
          setReadingCard={setReadingCard}
          readingNavIds={readingNavIds}
          setReadingNavIds={setReadingNavIds}
          isReassigningCard={isReassigningCard}
          setIsReassigningCard={setIsReassigningCard}
          reassignTourId={reassignTourId}
          setReassignTourId={setReassignTourId}
          isEditingReadingCard={isEditingReadingCard}
          setIsEditingReadingCard={setIsEditingReadingCard}
          readingCardEditInput={readingCardEditInput}
          setReadingCardEditInput={setReadingCardEditInput}
          coachFeedbackInput={coachFeedbackInput}
          setCoachFeedbackInput={setCoachFeedbackInput}
          isSubmitting={isSubmitting}
          handleSaveRaceCardFeedback={handleSaveRaceCardFeedback}
          setEditingLapCard={setEditingLapCard}
          setLapInput={setLapInput}
        />
      )}

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

      <DocumentsModal open={showDocs} onClose={() => setShowDocs(false)} />
    </div>
  );
};

export default CoachView;
