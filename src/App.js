import { useState, useEffect, lazy, Suspense } from "react";
import { signInAnonymously, onAuthStateChanged, signOut } from "firebase/auth";
import {
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { colRef, docRef } from "./utils/firestore";

import { Toaster, toast } from "react-hot-toast";

import { ROLES } from "./utils/constants";
import { getTodayStr, extractGoalInputs } from "./utils/dateUtils";

import { auth, db, appId } from "./firebaseConfig";
// appId は子コンポーネントへの props 渡しで使用
import { useTeamData } from "./hooks/useTeamData";
import { usePeriod } from "./hooks/usePeriod";
import { useStats } from "./hooks/useStats";

import { getToken } from "firebase/messaging";
import { messaging } from "./firebaseConfig";

import "./print.css";

// ログイン前に表示する画面（遅延なし）
import WelcomeScreen from "./components/WelcomeScreen";
import LoginScreen from "./components/LoginScreen";
import RegisterScreen from "./components/RegisterScreen";

// ログイン後の重い画面（遅延読み込み）
const CoachAuthScreen = lazy(() => import("./components/CoachAuthScreen"));
const CoachView = lazy(() => import("./components/CoachView"));
const AthleteView = lazy(() => import("./components/AthleteView"));
const ManagerDashboard = lazy(() => import("./components/ManagerDashboard"));

// --- App Version ---
const APP_LAST_UPDATED = "6.3.0";

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
  const [editingLogId, setEditingLogId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedDiaryId, setExpandedDiaryId] = useState(null);

  // ─── 監督専用の操作状態 ───
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [coachEditFormData, setCoachEditFormData] = useState({});
  const [previewRunner, setPreviewRunner] = useState(null);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [checkDate, setCheckDate] = useState(getTodayStr());
  const [isCoachEditModalOpen, setIsCoachEditModalOpen] = useState(false);
  const [isAthleteEditModalOpen, setIsAthleteEditModalOpen] = useState(false);
  const [isPainAlertModalOpen, setIsPainAlertModalOpen] = useState(false);
  const [coachGoalInput, setCoachGoalInput] = useState({
    monthly: "",
    period: "",
    q1: "",
    q2: "",
    q3: "",
    q4: "",
  });

  const [demoMode, setDemoMode] = useState(null); // "manager" か "admin" か null
  const handleExitDemo = () => {
    setDemoMode(null);
    setView("coach-admin");
    // 画面切り替え後のレンダリングを待ってからスクロール
    setTimeout(() => {
      const target = document.getElementById("demo-buttons-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  };

  // ─── 入力フォームのデータ ───
  const [reviewComment, setReviewComment] = useState("");
  const [coachFeedbackComment, setCoachFeedbackComment] = useState("");

  const [logInput, setLogInput] = useState({
    date: getTodayStr(),
    distance: "",
    category: "",
    menuDetail: "",
    rpe: 1,
    pain: 1,
    achieved: true,
  });

  const [authInput, setAuthInput] = useState({
    lastName: "",
    firstName: "",
    memberCode: "",
    teamPass: "",
    personalPin: "",
    isManager: false,
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

  const [mergeInput, setMergeInput] = useState({ sourceId: "", targetId: "" });

  const [newTournamentInput, setNewTournamentInput] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  // fetchCutoff: データ取得の下限日（初期値3ヶ月前）。usePeriod が選択期間に合わせて延長する
  const [fetchCutoff, setFetchCutoff] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toLocaleDateString("sv-SE");
  });

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
  } = useTeamData(user, role, fetchCutoff);

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

  // プッシュ通知の許可と FCM トークン保存
  useEffect(() => {
    const requestPushPermission = async () => {
      if (!currentProfile?.id) return;

      try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          const currentToken = await getToken(messaging, {
            vapidKey:
              "BKhAK3cczxwz1pSnOOQjaiIRfRwywvhohAcoqosBZyLLzZecKMk3ZOuFuMnKyoKp01J6A4-0UzkaeCaNrfpeQkY",
          });

          if (currentToken) {
            await updateDoc(docRef("runners", currentProfile.id), {
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
  }, [currentProfile?.id]);

  useEffect(() => {
    if (role === ROLES.COACH && selectedRunner && targetPeriod) {
      const inputs = extractGoalInputs(
        selectedRunner,
        targetPeriod.id,
        targetPeriod.type,
      );
      setCoachGoalInput({
        ...inputs,
        // custom期間でHelperが0を返す場合のフォールバック
        monthly: inputs.monthly || selectedRunner.goalMonthly || "",
      });
    }
  }, [role, selectedRunner, targetPeriod]);

  // 目標設定画面を開いたとき、現在の目標値をフォームに反映する
  useEffect(() => {
    if (view === "goal" && currentProfile && targetPeriod) {
      setGoalInput(
        extractGoalInputs(currentProfile, targetPeriod.id, targetPeriod.type),
      );
    }
  }, [view, currentProfile, targetPeriod]);

  // ─── 認証 ───
  // 新規ユーザーを登録し、Firestore に選手情報を保存する
  const handleRegister = async () => {
    setErrorMsg("");
    if (
      !authInput.lastName.trim() ||
      !authInput.firstName.trim() ||
      authInput.memberCode.length !== 5
    ) {
      setErrorMsg("名前と5桁の選手番号を入力してください。");
      return;
    }

    if (authInput.teamPass !== appSettings.teamPass) {
      setErrorMsg("チームパスコードが間違っています。");
      return;
    }
    if (!authInput.personalPin || !/^\d{4}$/.test(authInput.personalPin)) {
      setErrorMsg("個人パスコードは4桁の数字で設定してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = authInput.memberCode.trim();
      const runnersRef = colRef("runners");

      const runnerDoc = docRef("runners", targetId);
      const docSnap = await getDoc(runnerDoc);

      if (docSnap.exists()) {
        setErrorMsg(
          `選手番号 ${targetId} は既に登録されています。「ログイン」してください。`,
        );
        setIsSubmitting(false);
        return;
      }

      const q = query(runnersRef, where("memberCode", "==", targetId));
      const qSnap = await getDocs(q);

      if (!qSnap.empty) {
        setErrorMsg(
          `選手番号 ${targetId} は既に使用されています（旧データ等）。管理者に連絡してください。`,
        );
        setIsSubmitting(false);
        return;
      }

      const newProfile = {
        id: targetId,
        memberCode: targetId,
        lastName: authInput.lastName.trim(),
        firstName: authInput.firstName.trim(),
        role: authInput.isManager ? ROLES.MANAGER : "athlete",
        goalMonthly: 0,
        goalPeriod: 0,
        status: "active",
        pin: authInput.personalPin,
        registeredAt: new Date().toISOString(),
        lastLoginUid: user.uid,
      };

      await setDoc(runnerDoc, newProfile);

      setProfile(newProfile);
      setRole(ROLES.RUNNER);
      setView("menu");
      toast.success("登録が完了しました！");
    } catch (e) {
      console.error(e);
      setErrorMsg("登録エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 選手番号でログインし、ロールを確定する
  const handleLogin = async () => {
    setErrorMsg("");
    if (authInput.memberCode.length !== 5) {
      setErrorMsg("5桁の選手番号を入力してください。");
      return;
    }
    if (!authInput.personalPin) {
      setErrorMsg("パスコードを入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = authInput.memberCode.trim();
      const runnersRef = colRef("runners");
      const runnerDoc = docRef("runners", targetId);
      const docSnap = await getDoc(runnerDoc);

      if (!docSnap.exists()) {
        const q = query(runnersRef, where("memberCode", "==", targetId));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const oldDoc = qSnap.docs[0];
          const oldData = oldDoc.data();

          if (oldData.pin !== authInput.personalPin) {
            setErrorMsg("パスコードが違います。");
            setIsSubmitting(false);
            return;
          }

          await setDoc(runnerDoc, {
            ...oldData,
            id: targetId,
            lastLoginUid: user.uid,
            migratedAt: new Date().toISOString(),
          });

          const logsRef = colRef("logs");
          const logsQ = query(logsRef, where("runnerId", "==", oldDoc.id));
          const logsSnap = await getDocs(logsQ);
          const batch = writeBatch(db);

          logsSnap.forEach((l) => {
            batch.update(docRef("logs", l.id), { runnerId: targetId });
          });

          const fbsRef = colRef("feedbacks");
          const fbsQ = query(fbsRef, where("runnerId", "==", oldDoc.id));
          const fbsSnap = await getDocs(fbsQ);

          fbsSnap.forEach((f) => {
            const oldFbId = f.id;
            const newFbId = oldFbId.replace(oldDoc.id, targetId);
            if (oldFbId !== newFbId) {
              batch.set(docRef("feedbacks", newFbId), {
                ...f.data(),
                runnerId: targetId,
              });
              batch.delete(docRef("feedbacks", oldFbId));
            }
          });

          batch.delete(docRef("runners", oldDoc.id));
          await batch.commit();

          setProfile({ ...oldData, id: targetId, lastLoginUid: user.uid });
          setRole(ROLES.RUNNER);
          setView("menu");
          toast.success("システム更新: データを移行しました");
          return;
        }

        setErrorMsg("データが見つかりません。");
        setIsSubmitting(false);
        return;
      }

      const profileData = docSnap.data();
      if (profileData.pin !== authInput.personalPin) {
        setErrorMsg("パスコードが違います。");
        setIsSubmitting(false);
        return;
      }

      await updateDoc(runnerDoc, {
        lastLoginUid: user.uid,
      });

      setProfile(profileData);
      setRole(ROLES.RUNNER);
      setView("menu");
      toast.success(`ログインしました！`);
    } catch (e) {
      console.error(e);
      setErrorMsg("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 練習記録 ───
  const resetForm = () => {
    setLogInput({
      date: getTodayStr(),
      distance: "",
      category: "",
      menuDetail: "",
      rpe: 1,
      pain: 1,
      achieved: true,
    });
    setEditingLogId(null);
  };

  const handleEditLog = (log) => {
    setLogInput({
      date: log.date,
      distance: log.distance,
      category: log.category,
      menuDetail: log.menuDetail || "",
      rpe: log.rpe,
      pain: log.pain,
      achieved: log.achieved,
    });
    setEditingLogId(log.id);
    setIsAthleteEditModalOpen(true);
  };

  // 選手が自分の練習記録を修正・保存する
  const handleAthleteUpdateLog = async () => {
    if (!editingLogId) return;
    setIsSubmitting(true);
    try {
      await updateDoc(docRef("logs", editingLogId), {
        date: logInput.date,
        distance: parseFloat(logInput.distance),
        category: logInput.category,
        menuDetail: logInput.menuDetail,
        rpe: parseInt(logInput.rpe, 10),
        pain: parseInt(logInput.pain, 10),
        achieved: logInput.achieved,
        updatedAt: new Date().toISOString(),
      });
      toast.success("記録を更新しました");
      setIsAthleteEditModalOpen(false);
      setEditingLogId(null);
      resetForm();
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 監督による記録修正 ───
  const openCoachEditModal = (log) => {
    setLogInput({
      date: log.date,
      distance: log.distance,
      category: log.category,
      menuDetail: log.menuDetail || "",
      rpe: log.rpe,
      pain: log.pain,
      achieved: log.achieved,
    });
    setEditingLogId(log.id);
    setIsCoachEditModalOpen(true);
  };

  // 監督が選手の練習記録を修正・上書きする
  const handleCoachUpdateLog = async () => {
    if (!editingLogId) return;
    setIsSubmitting(true);
    try {
      await updateDoc(docRef("logs", editingLogId), {
        date: logInput.date,
        distance: parseFloat(logInput.distance),
        category: logInput.category,
        menuDetail: logInput.menuDetail,
        rpe: parseInt(logInput.rpe, 10),
        pain: parseInt(logInput.pain, 10),
        updatedBy: ROLES.COACH,
      });
      toast.success("記録を修正しました");
      setIsCoachEditModalOpen(false);
      setEditingLogId(null);
      resetForm();
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCoachDeleteLog = () => {
    if (!editingLogId) return;

    setConfirmDialog({
      isOpen: true,
      message: "この記録を完全に削除しますか？（元に戻せません）",
      onConfirm: async () => {
        try {
          await deleteDoc(docRef("logs", editingLogId));
          toast.success("記録を削除しました");
          setIsCoachEditModalOpen(false);
          setEditingLogId(null);
          resetForm();
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        } catch (e) {
          toast.error("エラー: " + e.message);
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

  // ─── プロフィール・目標値 ───
  // 選手のプロフィール（名前・暗証番号）を更新する
  const handleCoachSaveProfile = async () => {
    if (!selectedRunner) return;
    setIsSubmitting(true);
    try {
      await updateDoc(docRef("runners", selectedRunner.id), {
        lastName: coachEditFormData.lastName,
        firstName: coachEditFormData.firstName,
        pin: coachEditFormData.pin,
      });
      toast.success("プロフィールを更新しました");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 監督が選手の目標距離・目標タイムを設定する
  const handleCoachSaveGoals = async () => {
    if (!selectedRunner) return;
    setIsSubmitting(true);
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
      if (coachGoalInput.monthly !== "")
        updates.goalMonthly = parseFloat(coachGoalInput.monthly);
    }

    try {
      await updateDoc(docRef("runners", selectedRunner.id), updates);
      toast.success("目標値を保存しました");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 練習記録を Firestore に保存する（新規・上書き両対応）
  const handleSaveLog = async () => {
    if (!logInput.distance) return;
    setIsSubmitting(true);
    try {
      const dataToSave = {
        date: logInput.date,
        distance: parseFloat(logInput.distance),
        category: logInput.category,
        menuDetail: logInput.menuDetail,
        rpe: parseInt(logInput.rpe, 10),
        pain: parseInt(logInput.pain, 10),
        achieved: logInput.achieved,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
      };
      if (editingLogId) {
        await updateDoc(docRef("logs", editingLogId), {
          ...dataToSave,
          updatedAt: new Date().toISOString(),
        });
        toast.success("記録を更新しました！");
      } else {
        await addDoc(colRef("logs"), {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
        toast.success("記録を保存しました！");
      }
      resetForm();
      setView("menu");
    } catch (e) {
      console.error(e);
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 大会・振り返りノート ───
  // 大会情報を新規作成または更新する
  const handleSaveTournament = async () => {
    if (
      !newTournamentInput.name ||
      !newTournamentInput.startDate ||
      !newTournamentInput.endDate
    ) {
      toast.error("大会名と期間（開始・終了）をすべて入力してください");
      return;
    }
    if (newTournamentInput.startDate > newTournamentInput.endDate) {
      toast.error("終了日は開始日以降の日付を指定してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const tournamentId = `tour_${Date.now()}`;
      const newTournament = {
        id: tournamentId,
        name: newTournamentInput.name,
        startDate: newTournamentInput.startDate,
        endDate: newTournamentInput.endDate,
        createdAt: new Date().toISOString(),
      };

      await setDoc(docRef("tournaments", tournamentId), newTournament);

      setNewTournamentInput({ name: "", startDate: "", endDate: "" });
      toast.success("新しい大会を登録しました！");
    } catch (error) {
      console.error("Error saving tournament:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 大会情報を削除する
  const handleDeleteTournament = async (tournamentId) => {
    if (
      !window.confirm(
        "この大会を削除しますか？\n※選手の振り返りシートも影響を受けます",
      )
    )
      return;

    setIsSubmitting(true);
    try {
      await deleteDoc(docRef("tournaments", tournamentId));
      toast.success("大会を削除しました");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      toast.error("削除に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [editingRaceCardId, setEditingRaceCardId] = useState(null);
  const [raceCardInput, setRaceCardInput] = useState({
    tournamentId: "",
    raceType: "",
    distance: "",
    startTime: "",
    ekidenDistance: "",
    targetTime: "",
    wupPlan: "",
    racePlan: "",
    condition: "",
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

  // 大会振り返りノートを保存する
  const handleSaveRaceCard = async () => {
    if (!raceCardInput.tournamentId) {
      toast.error("エラー：大会が選択されていません");
      return;
    }
    setIsSubmitting(true);
    try {
      const dataToSave = {
        ...raceCardInput,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
        updatedAt: new Date().toISOString(),
      };

      if (editingRaceCardId) {
        await updateDoc(docRef("raceCards", editingRaceCardId), dataToSave);
        toast.success("大会ノートを更新しました！");
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(colRef("raceCards"), dataToSave);
        toast.success("新しい種目シートを作成しました！");
      }
      setEditingRaceCardId(null);
      setView("race");
    } catch (e) {
      console.error(e);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRaceCard = async (cardId) => {
    if (!window.confirm("このシートを削除しますか？")) return;
    try {
      await deleteDoc(docRef("raceCards", cardId));
      toast.success("シートを削除しました");
    } catch (e) {
      console.error(e);
      toast.error("削除に失敗しました");
    }
  };

  const handleSaveRaceCardFeedback = async (cardId, feedbackText) => {
    setIsSubmitting(true);
    try {
      await updateDoc(docRef("raceCards", cardId), {
        coachFeedback: feedbackText,
        updatedAt: new Date().toISOString(),
      });
      toast.success("フィードバックを送信しました！");
    } catch (e) {
      console.error(e);
      toast.error("送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 練習記録を削除する
  const handleDeleteLog = (targetId = null) => {
    const idToDelete = targetId || editingLogId;
    if (!idToDelete) return;

    setConfirmDialog({
      isOpen: true,
      message: "この記録を削除しますか？",
      onConfirm: async () => {
        try {
          await deleteDoc(docRef("logs", idToDelete));
          toast.success("記録を削除しました");
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });

          if (idToDelete === editingLogId) {
            setEditingLogId(null);
            resetForm();
          }
        } catch (e) {
          console.error(e);
          toast.error("エラー: " + e.message);
        }
      },
    });
  };

  const handleRestRegister = async () => {
    setIsSubmitting(true);
    try {
      const dataToSave = {
        date: logInput.date,
        distance: 0,
        category: "完全休養",
        menuDetail: "オフ",
        rpe: 1,
        pain: 1,
        achieved: true,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
      };
      await addDoc(colRef("logs"), {
        ...dataToSave,
        createdAt: new Date().toISOString(),
      });
      toast.success("休養を記録しました");
      resetForm();
      setView("menu");
    } catch (e) {
      console.error(e);
      toast.error("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPreview = (runner) => {
    setPreviewRunner(runner);
    setView("menu");
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
    toast.success("ログアウトしました");
  };

  // ─── データ出力・選手統合 ───
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
    toast.success("CSVをダウンロードしました");
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
    toast.success("マトリックスCSVをダウンロードしました");
  };

  // ─── 目標・振り返り・フィードバック ───
  // 選手の目標距離・目標タイムを保存する
  const updateGoals = async () => {
    setIsSubmitting(true);
    try {
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
      await updateDoc(docRef("runners", currentUserId), updates);
      toast.success("目標を保存しました！");
      setView("menu");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 選手が自分の振り返りコメントを保存する
  const handleSaveReview = async () => {
    if (!reviewComment.trim()) return;
    setIsSubmitting(true);
    try {
      const feedbackId = `${targetPeriod.id}_${currentUserId}`;
      await setDoc(
        docRef("feedbacks", feedbackId),
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
      toast.success("振り返りを保存しました！📝");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 監督のフィードバックコメントを保存する
  const handleSaveCoachFeedback = async (runnerId) => {
    if (!coachFeedbackComment.trim()) return;
    setIsSubmitting(true);
    try {
      const feedbackId = `${targetPeriod.id}_${runnerId}`;
      await setDoc(
        docRef("feedbacks", feedbackId),
        {
          coachComment: coachFeedbackComment,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      toast.success("フィードバックを送りました！");
      setCoachFeedbackComment("");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRunnerFeedback = (rId) => {
    if (!rId || !targetPeriod) return null;
    const feedbackId = `${targetPeriod.id}_${rId}`;
    return allFeedbacks.find((f) => f.id === feedbackId);
  };

  // 重複した選手データを 1 件に統合する
  const handleMergeRunners = async () => {
    const { sourceId, targetId } = mergeInput;
    if (!targetId || !sourceId) {
      toast.error("両方の選手を選択してください。");
      return;
    }
    if (targetId === sourceId) {
      toast.error("同じ選手は選択できません。");
      return;
    }

    const targetRunner = allRunners.find((r) => r.id === targetId);
    const sourceRunner = allRunners.find((r) => r.id === sourceId);

    if (!targetRunner || !sourceRunner) return;

    setConfirmDialog({
      isOpen: true,
      message: `【重要警告】\n「${sourceRunner.lastName} ${sourceRunner.firstName}」の記録をすべて\n「${targetRunner.lastName} ${targetRunner.firstName}」に移動し、元のデータを削除します。\nこの操作は元に戻せません。実行しますか？`,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const batch = writeBatch(db);

          const logsQ = query(
            colRef("logs"),
            where("runnerId", "==", sourceId),
          );
          const logsSnap = await getDocs(logsQ);
          logsSnap.forEach((l) => {
            batch.update(docRef("logs", l.id), {
              runnerId: targetId,
              runnerName: `${targetRunner.lastName} ${targetRunner.firstName}`,
            });
          });

          const fbsQ = query(
            colRef("feedbacks"),
            where("runnerId", "==", sourceId),
          );
          const fbsSnap = await getDocs(fbsQ);
          fbsSnap.forEach((f) => {
            const data = f.data();
            const newFbId = f.id.replace(sourceId, targetId);
            if (f.id !== newFbId) {
              batch.set(docRef("feedbacks", newFbId), {
                ...data,
                runnerId: targetId,
                runnerName: `${targetRunner.lastName} ${targetRunner.firstName}`,
              });
              batch.delete(docRef("feedbacks", f.id));
            }
          });

          batch.delete(docRef("runners", sourceId));
          await batch.commit();

          toast.success("選手の統合が完了しました");
          setMergeInput({ sourceId: "", targetId: "" });
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        } catch (e) {
          console.error(e);
          toast.error("統合エラー: " + e.message);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
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
    handleExportMatrixCSV,
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
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      }
    >
      <Toaster position="top-center" reverseOrder={false} />
      {renderContent()}
    </Suspense>
  );
};

export default App;
