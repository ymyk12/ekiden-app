/*
 * ManagerDashboard — マネージャーダッシュボード
 *
 * マネージャーが使う画面。チームの練習日誌・スケジュール・
 * 大会情報の閲覧・入力を担当する。
 * デモモード時は isDemoMode フラグで保存処理を抑制する。
 */
import React, { useState, useEffect } from "react";
import { updateDoc } from "firebase/firestore";
import { docRef } from "../utils/firestore";
import {
  LogOut,
  BookOpen,
  ClipboardList,
  BarChart2,
  X,
  Flag,
  CalendarDays,
  FileText,
} from "lucide-react";

// Utilsから読み込む
import { ROLES } from "../utils/constants";
import { getTodayStr, getMonthRange, countMissingDays } from "../utils/dateUtils";
import { buildSubmissionRow } from "../utils/submission";

// 大会LAPタイム入力
import LapTimeModal from "./LapTimeModal";
// 大会チームレポート
import TeamRaceReport from "./TeamRaceReport";
// カレンダービュー
import CalendarView from "./CalendarView";
// チーム共有資料（しおり等）
import DocumentsModal from "./DocumentsModal";
import ManagerCheckView from "./manager/ManagerCheckView";
import ManagerStatusView from "./manager/ManagerStatusView";
import ManagerRaceView from "./manager/ManagerRaceView";
import TeamDiaryView from "./shared/TeamDiaryView";
import { useTeamDiary } from "../hooks/useTeamDiary";
import { useLogRange } from "../hooks/useLogRange";

import { toast } from "react-hot-toast";

// --- Manager Dashboard Component ---
const ManagerDashboard = ({
  profile,
  allRunners,
  allLogs,
  teamLogs,
  tournaments = [],
  raceCards = [],
  db,
  appId,
  setSuccessMsg,
  handleLogout,
  isDemoMode,
}) => {
  const [currentView, setCurrentView] = useState("check");
  const [checkDate, setCheckDate] = useState(getTodayStr());

  // 確認日が直近3か月より前なら、その月のチームのログを読み込む
  const { ensureLogsMonth } = useLogRange();
  useEffect(() => {
    ensureLogsMonth((checkDate || "").slice(0, 7));
  }, [checkDate, ensureLogsMonth]);

  // 詳細モーダル関連のステート
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 削除確認ダイアログ（AthleteView / CoachView と同じ見た目に統一）
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  });

  const [editingCard, setEditingCard] = useState(null);
  const [lapInput, setLapInput] = useState("");
  const [showTeamReportId, setShowTeamReportId] = useState(null);
  const [showDocs, setShowDocs] = useState(false);

  // チーム練習日誌（監督・マネージャー共通フック）。対象日は checkDate を使う。
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
    role: ROLES.MANAGER,
    profile,
    diaryDate: checkDate,
    setDiaryDate: setCheckDate,
    teamLogs,
    isDemoMode,
    setConfirmDialog,
  });

  const shiftDate = (days) => {
    const d = new Date(checkDate);
    d.setDate(d.getDate() + days);
    setCheckDate(d.toLocaleDateString("sv-SE"));
  };

  // Esc でモーダルを閉じる／提出チェック画面では ←→ で日付送り（PC操作向け）
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (showAIModal) return setShowAIModal(false);
        if (showTeamReportId) return setShowTeamReportId(null);
        if (isDetailOpen) return setIsDetailOpen(false);
        if (confirmDialog?.isOpen)
          return setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        return;
      }
      // 入力欄にフォーカス中は矢印キーを横取りしない
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const anyModalOpen =
        showAIModal || showTeamReportId || isDetailOpen || confirmDialog?.isOpen;
      if (currentView === "check" && diaryMode === "list" && !anyModalOpen) {
        if (e.key === "ArrowLeft") shiftDate(-1);
        if (e.key === "ArrowRight") shiftDate(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showAIModal,
    showTeamReportId,
    isDetailOpen,
    confirmDialog,
    currentView,
    diaryMode,
    checkDate,
  ]);

  const monthlyTotals = React.useMemo(() => {
    const targetMonthPrefix = checkDate.slice(0, 7);
    const totals = {};
    allLogs.forEach((l) => {
      if (l.date.startsWith(targetMonthPrefix)) {
        totals[l.runnerId] =
          (totals[l.runnerId] || 0) + (Number(l.distance) || 0);
      }
    });
    return totals;
  }, [allLogs, checkDate]);

  // 提出状況は監督基準に統一（共通ロジック）。付加情報（月間km等）はマネージャーでは表示しない。
  const submissionStatusList = React.useMemo(() => {
    return allRunners
      .filter((runner) => runner.role !== ROLES.MANAGER)
      .map((runner) => ({
        ...runner,
        ...buildSubmissionRow(runner, allLogs, checkDate),
      }));
  }, [allRunners, allLogs, checkDate]);

  const rankingData = React.useMemo(() => {
    // 未入力日数は当月（checkDate の月）の月初〜前日まで
    const { start: monthStart, end: monthEnd } = getMonthRange(checkDate);
    return allRunners
      .filter((runner) => runner.role !== ROLES.MANAGER)
      .map((r) => {
        const logDateSet = new Set(
          allLogs.filter((l) => l.runnerId === r.id).map((l) => l.date),
        );
        return {
          name: `${r.lastName} ${r.firstName}`,
          id: r.id,
          total: Math.round((monthlyTotals[r.id] || 0) * 10) / 10,
          missingCount: countMissingDays(logDateSet, monthStart, monthEnd),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [allRunners, allLogs, monthlyTotals, checkDate]);

  const teamActivityLogs = React.useMemo(() => {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 6);
    const minDateStr = pastDate.toLocaleDateString("sv-SE");
    return allLogs
      .filter(
        (l) =>
          l.date >= minDateStr &&
          allRunners.some(
            (r) => r.id === l.runnerId && r.role !== ROLES.MANAGER,
          ),
      )
      .sort((a, b) =>
        a.date !== b.date
          ? a.date < b.date
            ? 1
            : -1
          : (b.createdAt || "").localeCompare(a.createdAt || ""),
      )
      .slice(0, 100);
  }, [allLogs, allRunners]);

  // --- Functions ---
  const saveLapTime = async () => {
    if (!editingCard) return;
    try {
      if (!isDemoMode) {
        await updateDoc(docRef("raceCards", editingCard.id), {
          lapTimes: lapInput,
          resultTime: editingCard.resultTime || "",
          updatedAt: new Date().toISOString(),
          updatedBy: `${profile.lastName} (MG)`,
        });
      }
      toast.success(`${editingCard.runnerName}選手のLAPを更新しました！`);
      setEditingCard(null);
    } catch (e) {
      toast.error("保存失敗: " + e.message);
    }
  };

  // --- Render ---
  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 overflow-hidden">
      <header className="sticky top-0 z-50 bg-indigo-600 text-white pt-12 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-end pb-4">
          <div>
            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">
              Manager Dashboard
            </p>
            <h1 className="text-2xl font-black tracking-tighter">
              {profile.lastName} {profile.firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDocs(true)}
              className="bg-indigo-800/50 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
            >
              <FileText size={14} className="inline mr-1" /> 資料
            </button>
            <button
              onClick={handleLogout}
              className="bg-indigo-800/50 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
            >
              <LogOut size={14} className="inline mr-1" /> ログアウト
            </button>
          </div>
        </div>
        {/* タブバーをヘッダー内に統合して一緒にstickyにする */}
        <div className="relative z-10 flex gap-1 pb-3">
          {["check", "status", "diary", "race", "calendar"].map((view) => (
            <button
              key={view}
              onClick={() => {
                setCurrentView(view);
                if (view === "diary") setDiaryMode("list");
              }}
              className={`flex-1 min-w-[48px] py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                currentView === view
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-indigo-200 hover:text-white hover:bg-white/10"
              }`}
            >
              {view === "check" && <ClipboardList size={13} />}
              {view === "status" && <BarChart2 size={13} />}
              {view === "diary" && <BookOpen size={13} />}
              {view === "race" && <Flag size={13} />}
              {view === "calendar" && <CalendarDays size={13} />}
              {view === "check"
                ? "提出"
                : view === "status"
                  ? "状況"
                  : view === "diary"
                    ? "日誌"
                    : view === "race"
                      ? "大会"
                      : "Cal"}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-5 w-full max-w-md mx-auto mt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col">
        {/* --- 1. 提出チェック --- */}
        {currentView === "check" && (
          <ManagerCheckView
            shiftDate={shiftDate}
            checkDate={checkDate}
            setCheckDate={setCheckDate}
            submissionStatusList={submissionStatusList}
            allLogs={allLogs}
            setSelectedLog={setSelectedLog}
            setIsDetailOpen={setIsDetailOpen}
          />
        )}

        {/* --- 2. チーム状況 --- */}
        {currentView === "status" && (
          <ManagerStatusView
            checkDate={checkDate}
            rankingData={rankingData}
            teamActivityLogs={teamActivityLogs}
            setSelectedLog={setSelectedLog}
            setIsDetailOpen={setIsDetailOpen}
          />
        )}
        {currentView === "diary" && (
          <TeamDiaryView
            accent="indigo"
            diaryDate={checkDate}
            setDiaryDate={setCheckDate}
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

        {/* --- 4. 大会記録管理 --- */}
        {currentView === "race" && (
          <ManagerRaceView
            tournaments={tournaments}
            raceCards={raceCards}
            setShowTeamReportId={setShowTeamReportId}
            setEditingCard={setEditingCard}
            setLapInput={setLapInput}
          />
        )}

        {/* --- 5. カレンダー --- */}
        {currentView === "calendar" && (
          <div className="h-full animate-in fade-in">
            <CalendarView
              allLogs={allLogs}
              teamLogs={teamLogs}
              tournaments={tournaments}
              role="manager"
              currentUserId={null}
              responsive={false}
            />
          </div>
        )}
      </main>


      {/* // 大会LAPタイム入力 */}
      <LapTimeModal
        key={editingCard?.id || "empty"}
        editingCard={editingCard}
        onClose={() => setEditingCard(null)}
        lapInput={lapInput}
        setLapInput={setLapInput}
        onSave={saveLapTime}
        onResultChange={(newResult) =>
          setEditingCard({ ...editingCard, resultTime: newResult })
        }
      />

      {/* 詳細モーダル */}
      {isDetailOpen && selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsDetailOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Daily Report ({selectedLog.date})
                </p>
                <h3 className="text-xl font-black text-slate-800">
                  {selectedLog.runnerName}
                </h3>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="bg-slate-100 p-2 rounded-full text-slate-400 hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-indigo-50 p-3 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-indigo-400 uppercase">
                  Distance
                </p>
                <p className="text-2xl font-black text-indigo-600">
                  {selectedLog.distance}
                  <span className="text-sm ml-1">km</span>
                </p>
              </div>
              <div className="flex-1 bg-slate-50 p-3 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Type
                </p>
                <p className="text-lg font-black text-slate-600">
                  {selectedLog.category}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-3 rounded-2xl border flex flex-col items-center ${selectedLog.pain >= 3 ? "bg-rose-50 border-rose-200" : "bg-white border-slate-100"}`}
              >
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Pain
                </span>
                <span
                  className={`text-xl font-black ${selectedLog.pain >= 3 ? "text-rose-500" : "text-slate-700"}`}
                >
                  {selectedLog.pain}{" "}
                  <span className="text-xs text-slate-400">/5</span>
                </span>
              </div>
              <div className="p-3 rounded-2xl border border-slate-100 bg-white flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  RPE
                </span>
                <span className="text-xl font-black text-slate-700">
                  {selectedLog.rpe}{" "}
                  <span className="text-xs text-slate-400">/10</span>
                </span>
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Comment / Menu
              </p>
              <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedLog.menuDetail || "（コメントなし）"}
              </p>
            </div>
            <button
              onClick={() => setIsDetailOpen(false)}
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-xs shadow-lg"
            >
              閉じる
            </button>
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
      {/* ========================================== */}

      <DocumentsModal open={showDocs} onClose={() => setShowDocs(false)} />
    </div>
  );
};

export default ManagerDashboard;
