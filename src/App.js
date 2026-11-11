import { useState, useEffect, lazy, Suspense } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { setDoc, updateDoc, getDocs, deleteDoc } from "firebase/firestore";
import { docRef, colRef } from "./utils/firestore";

import { Toaster, toast } from "react-hot-toast";

import { ROLES } from "./utils/constants";
import { getTodayStr } from "./utils/dateUtils";

import { auth, db, appId } from "./firebaseConfig";
// appId は子コンポーネントへの props 渡しで使用
import { useTeamData } from "./hooks/useTeamData";
import { usePeriod } from "./hooks/usePeriod";
import { useStats } from "./hooks/useStats";
import { useAuthHandlers } from "./hooks/useAuthHandlers";
import { useLogHandlers } from "./hooks/useLogHandlers";
import { useRaceHandlers } from "./hooks/useRaceHandlers";
import { useGoalReview } from "./hooks/useGoalReview";
import { useRunnerManagement } from "./hooks/useRunnerManagement";
import { LogRangeContext } from "./hooks/useLogRange";

import { getToken } from "firebase/messaging";
import { messaging } from "./firebaseConfig";

import "./print.css";

// ログイン前に表示する画面（遅延なし）
import ErrorBoundary from "./components/ErrorBoundary";
import WelcomeScreen from "./components/WelcomeScreen";
import LoginScreen from "./components/LoginScreen";
import RegisterScreen from "./components/RegisterScreen";

// ログイン後の重い画面（遅延読み込み）
const CoachAuthScreen = lazy(() => import("./components/CoachAuthScreen"));
const CoachView = lazy(() => import("./components/CoachView"));
const AthleteView = lazy(() => import("./components/AthleteView"));
const ManagerDashboard = lazy(() => import("./components/ManagerDashboard"));
const OBView = lazy(() => import("./components/OBView"));

// --- App Version ---
const APP_LAST_UPDATED = "6.7.54";

// FCM Web Push 用の公開鍵（Firebaseコンソール > Cloud Messaging > ウェブ構成）
const FCM_VAPID_KEY =
  "BKhAK3cczxwz1pSnOOQjaiIRfRwywvhohAcoqosBZyLLzZecKMk3ZOuFuMnKyoKp01J6A4-0UzkaeCaNrfpeQkY";

const App = () => {
  // ─── 認証・ユーザー情報 ───
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── 画面・UI の状態 ───
  const [view, setView] = useState("menu");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);

  // ─── 監督専用の操作状態 ───
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [previewRunner, setPreviewRunner] = useState(null);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [checkDate, setCheckDate] = useState(getTodayStr());
  const [isPainAlertModalOpen, setIsPainAlertModalOpen] = useState(false);

  const [demoMode, setDemoMode] = useState(null); // "manager" か "admin" か null
  const handleExitDemo = () => {
    setDemoMode(null);
    setView("coach-settings");
    // 画面切り替え後のレンダリングを待ってからスクロール
    setTimeout(() => {
      const target = document.getElementById("demo-buttons-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  };

  // ─── 入力フォームのデータ ───
  const [menuInput, setMenuInput] = useState({ date: getTodayStr(), text: "" });

  // fetchCutoff: データ取得の下限日（初期値3ヶ月前）。usePeriod が選択期間に合わせて延長する
  const [fetchCutoff, setFetchCutoff] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toLocaleDateString("sv-SE");
  });

  // 監督の「ログを全期間取得」切替（この端末のみ・既定は OFF＝選手と同じ直近3ヶ月）。
  // 不便なときに設定画面から全期間へ戻せる。
  const [coachFullLogs, setCoachFullLogsState] = useState(() => {
    try {
      return localStorage.getItem("coachFullLogs") === "1";
    } catch (e) {
      return false;
    }
  });
  // 監督の「この端末で通知を受け取る」切替（この端末のみ・既定は ON）
  const [coachPush, setCoachPushState] = useState(() => {
    try {
      return localStorage.getItem("coachPush") !== "0";
    } catch (e) {
      return true;
    }
  });
  const setCoachPush = (v) => {
    setCoachPushState(v);
    try {
      localStorage.setItem("coachPush", v ? "1" : "0");
    } catch (e) {
      // 保存できなくても切替自体は有効
    }
  };
  const setCoachFullLogs = (v) => {
    setCoachFullLogsState(v);
    try {
      localStorage.setItem("coachFullLogs", v ? "1" : "0");
    } catch (e) {
      // localStorage が使えなくても切替自体は有効（保存されないだけ）
    }
  };

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
    ensureRunnerLogs,
    ensureLogsMonth,
  } = useTeamData(
    user,
    role,
    fetchCutoff,
    (role === ROLES.COACH || role === ROLES.ADMIN) && coachFullLogs,
  );

  // appSettings が揃ってから初期化するため useTeamData の後に呼ぶ
  const {
    availablePeriods,
    selectedPeriod,
    setSelectedPeriod,
    targetPeriod,
    activeQuarters,
    newPeriodInput,
    editingPeriodId,
    isPeriodSaving,
    updateNewPeriodInputWithAutoQuarters,
    handleNewPeriodQuarterChange,
    handleSaveCustomPeriod,
    handleDeleteCustomPeriod,
    handleEditCustomPeriod,
    handleCancelEdit,
    handleSaveDefaultPeriod,
  } = usePeriod({ appSettings, setFetchCutoff, setConfirmDialog });

  // 過去ログの追加読み込み。
  //  - 監督が選手をプレビューするときは、その選手の全期間を読み込む
  //  - 監督／マネージャーの「確認日」が直近3か月より前なら、その月のチームのログを読み込む
  useEffect(() => {
    if (previewRunner?.id) ensureRunnerLogs(previewRunner.id);
  }, [previewRunner?.id, ensureRunnerLogs]);
  useEffect(() => {
    ensureLogsMonth((checkDate || "").slice(0, 7));
  }, [checkDate, ensureLogsMonth]);

  // 監督モードで選択中の選手情報をリアルタイムに同期する
  useEffect(() => {
    if (role === ROLES.COACH && selectedRunner && allRunners.length > 0) {
      const updated = allRunners.find((r) => r.id === selectedRunner.id);
      // 差分がある場合のみ更新（JSON.stringify で比較して不要な再レンダーを防ぐ）
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
      setLoading(false);

      if (!u) {
        signInAnonymously(auth).catch((e) => console.error(e));
      }
    });
    return () => unsub();
  }, []);

  // データ更新時に自分のプロフィールと役割を同期する
  useEffect(() => {
    if (!user || allRunners.length === 0) return;

    // profile.id ではなく lastLoginUid で自分を特定する（uid との不一致を回避）
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

  // logs の runnerId は選手番号なので、lastLoginUid ではなく profile.id を使う
  const currentUserId = previewRunner ? previewRunner.id : profile?.id;
  const currentProfile = previewRunner || profile;

  const {
    activeRunners,
    teamRunners,
    periodRunners,
    personalStats,
    missingDates,
    currentFeedback,
    periodLogs,
    rankingData,
    reportChartData,
    reportMatrix,
    cumulativeData,
    monthlyTrendData,
    checkListData,
    coachStats,
  } = useStats({
    allLogs,
    allRunners,
    allFeedbacks,
    currentUserId,
    targetPeriod,
    activeQuarters,
    checkDate,
  });

  // ─── ハンドラ群（ドメイン別カスタムフック）───
  const {
    authInput,
    setAuthInput,
    handleRegister,
    handleLogin,
    handleStartPreview,
    handleLogout,
  } = useAuthHandlers({
    user,
    appSettings,
    previewRunner,
    setPreviewRunner,
    setProfile,
    setRole,
    setView,
    setErrorMsg,
    setIsSubmitting,
    setIsMenuOpen,
  });

  const {
    logInput,
    setLogInput,
    editingLogId,
    setEditingLogId,
    isCoachEditModalOpen,
    setIsCoachEditModalOpen,
    isAthleteEditModalOpen,
    setIsAthleteEditModalOpen,
    resetForm,
    handleEditLog,
    handleAthleteUpdateLog,
    openCoachEditModal,
    handleCoachUpdateLog,
    handleCoachDeleteLog,
    handleSaveLog,
    handleDeleteLog,
    handleRestRegister,
  } = useLogHandlers({
    currentUserId,
    currentProfile,
    setView,
    setIsSubmitting,
    setConfirmDialog,
  });

  const {
    newTournamentInput,
    setNewTournamentInput,
    editingRaceCardId,
    setEditingRaceCardId,
    raceCardInput,
    setRaceCardInput,
    handleSaveTournament,
    handleDeleteTournament,
    handleSaveRaceCard,
    handleDeleteRaceCard,
    handleSaveRaceCardFeedback,
    handleSaveEkidenPresets,
  } = useRaceHandlers({
    currentUserId,
    currentProfile,
    tournaments,
    appSettings,
    setView,
    setIsSubmitting,
    setConfirmDialog,
  });

  const {
    goalInput,
    setGoalInput,
    reviewComment,
    setReviewComment,
    coachFeedbackComment,
    setCoachFeedbackComment,
    updateGoals,
    handleSaveReview,
    handleSaveCoachFeedback,
    getRunnerFeedback,
  } = useGoalReview({
    currentUserId,
    currentProfile,
    targetPeriod,
    allFeedbacks,
    view,
    setView,
    setIsSubmitting,
  });

  const {
    coachEditFormData,
    setCoachEditFormData,
    coachGoalInput,
    setCoachGoalInput,
    mergeInput,
    setMergeInput,
    handleCoachEditRunner,
    handleCoachSaveProfile,
    handleCoachChangeRole,
    handleCoachSaveGoals,
    handleMergeRunners,
  } = useRunnerManagement({
    role,
    selectedRunner,
    setSelectedRunner,
    targetPeriod,
    allRunners,
    setView,
    setIsSubmitting,
    setConfirmDialog,
    setCoachFeedbackComment,
  });

  // プッシュ通知の許可と FCM トークン保存
  // 必ずログイン本人（profile）のドキュメントにのみ保存する。
  // プレビュー中は currentProfile が選手側に変わるため、それを使うと
  // 監督端末のトークンで選手のトークンを上書きしてしまう（誤配送の原因）。
  useEffect(() => {
    if (previewRunner) return; // 監督プレビュー中は実行しない
    const requestPushPermission = async () => {
      if (!profile?.id) return;

      try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          const currentToken = await getToken(messaging, {
            vapidKey: FCM_VAPID_KEY,
          });

          if (currentToken) {
            await updateDoc(docRef("runners", profile.id), {
              fcmToken: currentToken,
            });
            console.log("プッシュ通知の準備完了！トークンを保存しました。");
          }
        }
      } catch (error) {
        console.error("プッシュ通知の設定に失敗しました:", error);
      }
    };

    requestPushPermission();
  }, [profile?.id, previewRunner]);

  // 監督端末の通知登録。監督は runners にプロフィールを持たないため、
  // coach_devices コレクションへトークンを保存し、Cloud Functions が
  // 大会ノート提出時にこの宛先へ直接プッシュ通知を送る。
  // 端末ごとのオン/オフ（coachPush）: OFF の端末は登録を外し、通知を受け取らない。
  useEffect(() => {
    if (role !== ROLES.COACH) return;
    const registerCoachDevice = async () => {
      try {
        if (!coachPush) {
          // OFF: 許可済みなら、この端末のトークンの登録を削除する
          if (Notification.permission === "granted") {
            const token = await getToken(messaging, {
              vapidKey: FCM_VAPID_KEY,
            });
            if (token) await deleteDoc(docRef("coach_devices", token));
          }
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const token = await getToken(messaging, { vapidKey: FCM_VAPID_KEY });
        if (token) {
          await setDoc(docRef("coach_devices", token), {
            token,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("監督向け通知の登録に失敗しました:", e);
      }
    };
    registerCoachDevice();
  }, [role, coachPush]);

  // ─── データ出力 ───
  // CSV は「全期間の全ログ」を出力する。画面には直近3ヶ月＋開いた分しか読み込んでいないため、
  // 出力の瞬間だけ logs を全件取得する（操作は手動・低頻度なので読み取りは許容）。
  const exportCSV = async () => {
    const loadingId = toast.loading("全期間のログを取得しています…");
    let exportLogs;
    try {
      const snap = await getDocs(colRef("logs"));
      exportLogs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    } catch (e) {
      console.error("CSV用ログの取得に失敗しました:", e);
      toast.error("ログの取得に失敗しました。CSVは出力されていません", {
        id: loadingId,
      });
      return;
    }
    toast.dismiss(loadingId);
    const headers = [
      "日付",
      "名前",
      "区分",
      "メニュー",
      "距離(km)",
      "練習強度(RPE)",
      "痛み",
    ];
    const rows = exportLogs.map((l) => [
      l.date,
      l.runnerName,
      l.category,
      l.menuDetail || "",
      l.distance,
      l.rpe,
      l.pain,
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob(["﻿" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ekiden_team_data.csv`;
    link.click();
    toast.success("CSVをダウンロードしました");
  };

  // 各ビューに渡す props
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
    isAthleteEditModalOpen,
    setIsAthleteEditModalOpen,
    handleAthleteUpdateLog,
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
    view,
    setView,
    handleLogout,
    availablePeriods,
    selectedPeriod,
    setSelectedPeriod,
    targetPeriod,
    activeRunners,
    teamRunners,
    periodRunners,
    coachStats,
    reportMatrix,
    monthlyTrendData,
    isPainAlertModalOpen,
    setIsPainAlertModalOpen,
    rankingData,
    exportCSV,
    isPrintPreview,
    setIsPrintPreview,
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
    coachFullLogs,
    setCoachFullLogs,
    coachPush,
    setCoachPush,
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
    mergeInput,
    setMergeInput,
    errorMsg,
    isSubmitting,
    handleMergeRunners,
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
    handleSaveEkidenPresets,
  };

  // ─── 画面切り替えロジック ───
  // role の値に応じて表示する画面を返す
  const renderContent = () => {
    // データ読み込み中はスピナーを表示
    if (loading || (user && dataLoading)) {
      return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      );
    }

    // デモモード中は専用画面を返す
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
          <ManagerDashboard
            profile={{
              lastName: "デモ",
              firstName: "マネージャー",
              role: ROLES.MANAGER,
            }}
            allRunners={activeRunners}
            allLogs={allLogs}
            teamLogs={teamLogs}
            tournaments={tournaments}
            raceCards={raceCards}
            practiceMenus={practiceMenus}
            handleLogout={handleExitDemo} // デモ終了をログアウト代わりに使用
            appId={appId}
            db={db}
            setSuccessMsg={(msg) => toast.success("【デモ】" + msg)}
            menuInput={menuInput}
            setMenuInput={setMenuInput}
            isDemoMode={true} // マネージャー画面側で保存を抑制するフラグ
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

    // 未ログイン状態 → ウェルカム画面
    if (!role) {
      return <WelcomeScreen setRole={setRole} appVersion={APP_LAST_UPDATED} />;
    }

    // 監督パスワード入力画面
    if (role === ROLES.COACH_AUTH) {
      return (
        <CoachAuthScreen
          appSettings={appSettings}
          setRole={setRole}
          setView={setView}
        />
      );
    }

    // 選手登録フロー
    if (role === ROLES.REGISTERING) {
      return (
        <RegisterScreen
          authInput={authInput}
          setAuthInput={setAuthInput}
          handleRegister={handleRegister}
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
          setRole={setRole}
        />
      );
    }

    // ログインフロー
    if (role === ROLES.LOGIN) {
      return (
        <LoginScreen
          authInput={authInput}
          setAuthInput={setAuthInput}
          handleLogin={handleLogin}
          errorMsg={errorMsg}
          isSubmitting={isSubmitting}
          setRole={setRole}
        />
      );
    }

    // マネージャー画面
    if (role === ROLES.RUNNER && profile && profile.role === ROLES.MANAGER) {
      return (
        <ManagerDashboard
          profile={profile}
          allRunners={activeRunners}
          allLogs={allLogs}
          teamLogs={teamLogs}
          tournaments={tournaments}
          raceCards={raceCards}
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

    // 引退した選手 → OB/OG 閲覧専用画面（引退処理 ＝ OBView への移行）
    // 監督が名簿の引退者をプレビューする場合も同じ画面（バナー付き）を表示する
    const isRetiredPreview =
      role === ROLES.COACH && previewRunner?.status === "retired";
    if (
      isRetiredPreview ||
      (role === ROLES.RUNNER && profile && profile.status === "retired")
    ) {
      return (
        <OBView
          profile={isRetiredPreview ? previewRunner : profile}
          teamRunners={teamRunners}
          allLogs={allLogs}
          raceCards={raceCards}
          tournaments={tournaments}
          handleLogout={handleLogout}
          isPreview={isRetiredPreview}
          onExitPreview={() => {
            setPreviewRunner(null);
            setView("coach-roster");
          }}
        />
      );
    }

    // 選手ダッシュボード（監督プレビュー中も含む）
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

    // 監督ダッシュボード
    if (role === ROLES.COACH) {
      return <CoachView {...coachProps} />;
    }

    return null;
  };

  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        }
      >
        <Toaster position="top-center" reverseOrder={false} />
        <LogRangeContext.Provider value={{ ensureRunnerLogs, ensureLogsMonth }}>
          {renderContent()}
        </LogRangeContext.Provider>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;
