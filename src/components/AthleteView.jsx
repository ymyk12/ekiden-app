// 一番上の行付近
import React, { useState, useMemo, useEffect } from "react";
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
  Trophy,
  Users,
  MessageSquare,
  HeartPulse,
  Trash2,
  ChevronRight,
  Home,
  Plus,
  Edit,
  User,
  AlertCircle,
  Loader2,
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
  PieChart,
  Pie,
} from "recharts";
import { ROLES, CATEGORY } from "../utils/constants";
import { getGoalValue, getTodayStr, getDatesInRange } from "../utils/dateUtils";

// グラフ用のカラーパレット
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

const AthleteView = (props) => {
  // App.js から渡されたデータ（Props）をすべて展開します
  const {
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
  } = props;

  // 画面（view）が切り替わるたびに、スクロールを一番上（0, 0）に戻す魔法
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const isPreview = role === ROLES.COACH && previewRunner;

  const safeChangeView = (targetView) => {
    // 現在が「入力画面(entry)」で、かつ別の画面に行こうとしていて、かつ「距離かメニュー」に文字が入力されている場合
    if (
      view === "entry" &&
      targetView !== "entry" &&
      (formData.distance !== "" || formData.menuDetail !== "")
    ) {
      // 警告ダイアログを出す！
      setConfirmDialog({
        isOpen: true,
        message: "入力中の内容が消えてしまいますが、移動しますか？",
        onConfirm: () => {
          resetForm(); // フォームを空にする
          setView(targetView); // 画面を移動する
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null }); // ダイアログを閉じる
        },
      });
    } else {
      // それ以外（何も入力されていない、または別の画面からの移動）なら普通に移動
      if (view === "entry" && targetView !== "entry") resetForm();
      setView(targetView);
    }
  };

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
            onClick={() => {
              setPreviewRunner(null); // ① プレビューを解除する
              setView("coach-roster"); // ✨② ロースター（名簿）画面に戻る！
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
                          <AlertTriangle size={16} className="text-slate-800" />

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
              {/* ▼▼▼ ここから復活＆超進化：Q1〜Q4の分割達成状況 ▼▼▼ */}
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
                        // 各Qの目標値を取得
                        const qGoal =
                          getGoalValue(
                            currentProfile,
                            targetPeriod.id,
                            targetPeriod.type,
                            qKey,
                          ) || 0;

                        // 各Qの実績値（走行距離）をアプリ内の全データから自動計算！
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

                          // 今日の日付が、このQの期間内に入っているかを判定（ハイライト用）
                          const now = new Date();
                          isActive = now >= qStart && now <= qEnd;
                        }

                        // 進捗率の計算（最大100%）
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

                            {/* プログレスバー（メーター）の表示 */}
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

            {/* --- 練習日誌・メニュー表示カード (Runner View) --- */}
            <div className="bg-slate-900 p-7 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden mb-6">
              {/* 背景装飾 */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>

              {(() => {
                const todayStr = getTodayStr();
                // 1. 今日のチーム日誌(teamLogs)があるか探す
                const diary = teamLogs.find((l) => l.date === todayStr);
                // 2. なければ従来のメニュー(practiceMenus)を探す
                const simpleMenu = practiceMenus.find(
                  (m) => m.date === todayStr,
                );

                if (diary) {
                  return (
                    <div className="relative z-10 space-y-4">
                      {/* 1. 天気・時間 */}
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

                      {/* ★追加: 場所の表示 */}
                      {diary.location && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                          <MapPin size={14} className="text-blue-400" />
                          {diary.location}
                          {/* 詳細がある場合はカッコ書きで追加 */}
                          {(diary.location === "競技場" ||
                            diary.location === "その他") &&
                            diary.locationDetail && (
                              <span className="text-slate-400 ml-1">
                                ({diary.locationDetail})
                              </span>
                            )}
                        </div>
                      )}

                      {/* 2. メニュー */}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 mb-1">
                          MENU
                        </p>
                        <p className="font-bold text-lg leading-snug whitespace-pre-wrap">
                          {diary.menu}
                        </p>
                      </div>

                      {/* ★追加: 補強メニューの表示 */}
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
                              {/* その他詳細の表示 */}
                              {diary.reinforcements.includes("その他") &&
                                diary.reinforcementDetail && (
                                  <span className="text-[10px] font-bold text-slate-400 self-center">
                                    : {diary.reinforcementDetail}
                                  </span>
                                )}
                            </div>
                          </div>
                        )}

                      {/* 3. 結果・メモ */}
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

                      <p className="text-[9px] text-slate-500 text-right">
                        Updated by: {diary.updatedBy}
                      </p>
                    </div>
                  );
                }
              })()}
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
                    {/* CATEGORY（練習カテゴリー）から自動で <option> を作る！ */}
                    {Object.values(CATEGORY).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
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
                  placeholder="メニューの内容、タイムなど"
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
                          // 空文字ならそのまま、数値があれば整数化
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
                          // 空文字ならそのまま、数値があれば整数化
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
                {/* ▼▼▼ 変更後：保存/更新ボタン ▼▼▼ */}
                <button
                  onClick={handleSaveLog}
                  disabled={isSubmitting || !formData.distance}
                  className={`w-full py-5 rounded-3xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all ${
                    isSubmitting || !formData.distance
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 text-white active:scale-95"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {editingLogId ? "更新中..." : "保存中..."}
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      {editingLogId ? "更新する" : "保存する"}
                    </>
                  )}
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
        {/* ▼▼▼ 追加: 選手用DIARY一覧画面 ▼▼▼ */}
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
              <div className="w-9" /> {/* レイアウト調整用ダミー */}
            </div>

            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Target: {targetPeriod.name}
              </span>
            </div>

            <div className="space-y-4">
              {(() => {
                // 1. 選択期間内の日誌を抽出してソート
                const start = new Date(targetPeriod.start);
                const end = new Date(targetPeriod.end);
                // 終了日の23:59まで含める
                end.setHours(23, 59, 59, 999);

                const filteredLogs = teamLogs
                  .filter((l) => {
                    const d = new Date(l.date);
                    return d >= start && d <= end;
                  })
                  .sort((a, b) => (a.date < b.date ? 1 : -1)); // 新しい順

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
                    <div
                      key={log.date}
                      onClick={() =>
                        setExpandedDiaryId(isExpanded ? null : log.date)
                      }
                      className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                        isExpanded
                          ? "bg-slate-50 border-blue-200 shadow-md"
                          : "bg-white border-slate-100 hover:border-blue-100"
                      }`}
                    >
                      {/* カードヘッダー部分 */}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                              {log.date.slice(5).replace("-", "/")}
                              <span className="text-slate-300">
                                (
                                {
                                  ["日", "月", "火", "水", "木", "金", "土"][
                                    new Date(log.date).getDay()
                                  ]
                                }
                                )
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                              {log.weather}
                            </span>
                            {log.location && (
                              <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <MapPin size={8} /> {log.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* メニュー（未展開時は1行、展開時は全文） */}
                        <div>
                          <p
                            className={`font-bold text-slate-700 text-sm leading-relaxed ${isExpanded ? "" : "line-clamp-1"}`}
                          >
                            {log.menu}
                          </p>
                        </div>

                        {/* 展開ヒント */}
                        {!isExpanded && (
                          <div className="flex justify-center mt-2">
                            <ChevronRight
                              size={16}
                              className="text-slate-300 rotate-90"
                            />
                          </div>
                        )}
                      </div>

                      {/* 詳細部分（アコーディオン） */}
                      {isExpanded && (
                        <div className="px-4 pb-4 space-y-4 border-t border-slate-200/50 pt-4 animate-in slide-in-from-top-2">
                          {/* 詳細情報グリッド */}
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

                          {/* 補強 */}
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

                          {/* 結果・メモ */}
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

                          <p className="text-[9px] text-right text-slate-300">
                            Updated by: {log.updatedBy}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
        {/* ▲▲▲ 追加ここまで ▲▲▲ */}
        {/* ▼▼▼ 修正: 振り返り画面 (Review View) ▼▼▼ */}
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
              <div className="w-9" /> {/* レイアウト調整用ダミー */}
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl space-y-6 border border-slate-100">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <Target size={18} className="text-blue-500" />
                  {targetPeriod.name} の目標
                </h4>

                {/* 1. 月間目標（月次レポートを選んでいる時だけ表示！） */}
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

                {/* 2. 期間合計目標（月間「以外」を選んでいる時に表示！） */}
                {targetPeriod.type !== "month" && (
                  <div className="space-y-2">
                    {" "}
                    {/* ← 余分な上線を消してスッキリさせました */}
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
            </div>
          </div>
        )}

        {/* チーム状況画面 (Team Status View)  */}
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

              {/* ランキングリスト */}
              <div className="space-y-3">
                {rankingData.map((runner, index) => {
                  // 今日のログがあるか確認
                  const todayLog = allLogs.find(
                    (l) => l.runnerId === runner.id && l.date === getTodayStr(),
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
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-8 pt-2 px-4 rounded-t-[2.5rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] flex justify-between items-end h-24 pointer-events-auto">
          {/* 1. Home */}
          <button
            onClick={() => safeChangeView("menu")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 ${
              view === "menu"
                ? "text-blue-600 -translate-y-1"
                : "text-slate-300 hover:text-slate-400"
            }`}
          >
            <Home size={22} strokeWidth={view === "menu" ? 3 : 2} />
            <span className="text-[8px] font-black uppercase tracking-widest">
              Home
            </span>
          </button>

          {/* 2. Team */}
          <button
            onClick={() => safeChangeView("team_status")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 ${
              view === "team_status"
                ? "text-indigo-500 -translate-y-1"
                : "text-slate-300 hover:text-slate-400"
            }`}
          >
            <Users size={22} strokeWidth={view === "team_status" ? 3 : 2} />
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
              className="bg-blue-600 text-white p-3.5 rounded-full shadow-xl shadow-blue-200 active:scale-95 transition-all -mb-8 border-[6px] border-slate-50 group hover:bg-blue-700"
            >
              <Plus
                size={28}
                strokeWidth={3}
                className="group-hover:rotate-90 transition-transform duration-300"
              />
            </button>
          </div>

          {/* 4. Diary (New!) */}
          <button
            onClick={() => safeChangeView("diary")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 ${
              view === "diary"
                ? "text-orange-500 -translate-y-1"
                : "text-slate-300 hover:text-slate-400"
            }`}
          >
            {/* アイコンは BookOpen を使用 */}
            <BookOpen size={22} strokeWidth={view === "diary" ? 3 : 2} />
            <span className="text-[8px] font-black uppercase tracking-widest">
              Diary
            </span>
          </button>

          {/* 5. Review */}
          <button
            onClick={() => safeChangeView("review")}
            className={`flex flex-col items-center gap-1 mb-3 transition-all duration-300 w-12 ${
              view === "review"
                ? "text-emerald-500 -translate-y-1"
                : "text-slate-300 hover:text-slate-400"
            }`}
          >
            <MessageSquare size={22} strokeWidth={view === "review" ? 3 : 2} />
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
};

export default AthleteView;
