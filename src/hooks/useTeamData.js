/*
 * useTeamData — チーム全体のデータをリアルタイムで取得するカスタムフック
 *
 * Firestore の複数コレクション（選手・練習記録・大会・フィードバックなど）を
 * onSnapshot で購読し、常に最新状態を返す。
 * ロール（coach / runner / manager）に応じて取得範囲を切り替える。
 */
import { useState, useEffect } from "react";
import {
  onSnapshot,
  getDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { ROLES } from "../utils/constants";
import { colRef, settingsDocRef } from "../utils/firestore";

export const useTeamData = (user, role, fetchCutoff) => {
  const [allRunners, setAllRunners] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [raceCards, setRaceCards] = useState([]);
  const [practiceMenus, setPracticeMenus] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [teamLogs, setTeamLogs] = useState([]);
  const [appSettings, setAppSettings] = useState({
    coachPass: "1234",
    teamPass: "2025",
    startDate: "",
    endDate: "",
    quarters: [],
    customPeriods: [],
    defaultPeriodId: "global_period",
    loaded: false,
  });

  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return; // ユーザーがいない時は何もしない
    const timeout = setTimeout(() => setDataLoading(false), 5000);

    const settingsDoc = settingsDocRef();

    // 設定ファイルの初期化チェック
    getDoc(settingsDoc)
      .then((snap) => {
        if (!snap.exists()) {
          const todayDate = new Date();
          const currentMonth = todayDate.getMonth() + 1;
          let fiscalYear = todayDate.getFullYear();
          if (currentMonth <= 3) fiscalYear -= 1;

          const startStr = `${fiscalYear}-04-01`;
          const endStr = `${fiscalYear + 1}-03-31`;

          setDoc(settingsDoc, {
            coachPass: "1234",
            teamPass: "2025",
            startDate: startStr,
            endDate: endStr,
            quarters: [],
            customPeriods: [],
            defaultPeriodId: "global_period",
          });
        }
      })
      .catch((e) => console.log("Settings init error", e));

    // 各コレクションの監視（リアルタイムリスナー）
    const unsubRunners = onSnapshot(colRef("runners"), (snap) => {
      setAllRunners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
      clearTimeout(timeout);
    });

    // 監督・管理者以外は fetchCutoff で取得範囲を制限する
    let logsQuery = colRef("logs");
    if (role !== ROLES.COACH && role !== ROLES.ADMIN && fetchCutoff) {
      logsQuery = query(logsQuery, where("date", ">=", fetchCutoff));
    }

    const unsubLogs = onSnapshot(logsQuery, (snap) => {
      setAllLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTournaments = onSnapshot(colRef("tournaments"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
      setTournaments(data);
    });

    const unsubRaceCards = onSnapshot(colRef("raceCards"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRaceCards(data);
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

    const unsubMenus = onSnapshot(colRef("menus"), (snap) => {
      setPracticeMenus(snap.docs.map((d) => d.data()));
    });

    const unsubFeedbacks = onSnapshot(colRef("feedbacks"), (snap) => {
      setAllFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTeamLogs = onSnapshot(colRef("team_logs"), (snap) => {
      setTeamLogs(snap.docs.map((d) => ({ date: d.id, ...d.data() })));
    });

    // クリーンアップ関数（コンポーネントが消えたり、roleが変わったりした時に古い監視を解除する）
    return () => {
      unsubRunners();
      unsubLogs();
      unsubSettings();
      unsubMenus();
      unsubFeedbacks();
      unsubTeamLogs();
      unsubTournaments();
      unsubRaceCards();
      clearTimeout(timeout);
    };
  }, [user, role, fetchCutoff]);

  // 取ってきたデータをApp.jsに渡す
  return {
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
  };
};
