/*
 * useTeamData — チーム全体のデータをリアルタイムで取得するカスタムフック
 *
 * Firestore の複数コレクション（選手・練習記録・大会・フィードバックなど）を
 * onSnapshot で購読し、常に最新状態を返す。
 * logs は全員「fetchCutoff 以降（既定は直近3ヶ月）」を基本購読し、それより前の過去ログは
 * 必要なぶんだけ追加購読して allLogs に合成する:
 *   - 自分の全期間   : 自動（ensureRunnerLogs）
 *   - 選手1人の全期間: 監督が選手を開いたとき等（ensureRunnerLogs）
 *   - チームの1か月  : 画面がその月を表示したとき（ensureLogsMonth）
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  onSnapshot,
  getDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { colRef, settingsDocRef } from "../utils/firestore";

// fullLogs: true のとき fetchCutoff を無視して logs を全期間取得する（監督の任意切替用）
export const useTeamData = (user, role, fetchCutoff, fullLogs = false) => {
  const [allRunners, setAllRunners] = useState([]);
  // 基本の購読分（fetchCutoff 以降）。それ以前の過去ログは extraLogs に足す（下記）
  const [baseLogs, setBaseLogs] = useState([]);
  // 過去ログの追加購読。キーは "r:<runnerId>"（選手1人の全期間）か "m:YYYY-MM"（チームの1か月）
  const [extraLogs, setExtraLogs] = useState({});
  const extraUnsubs = useRef({});
  // 追加購読の関数を安定させるため、最新の cutoff・全期間フラグは ref 経由で参照する
  const cutoffRef = useRef(fetchCutoff);
  const fullLogsRef = useRef(fullLogs);
  cutoffRef.current = fetchCutoff;
  fullLogsRef.current = fullLogs;
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
    defaultPeriodId: "dynamic_current",
    loaded: false,
  });

  const [dataLoading, setDataLoading] = useState(true);

  // 過去ログの追加購読を1件開始する（同じキーは二重に購読しない）。
  // onSnapshot なので、過去ログを編集・削除したときも画面に反映される。
  const subscribeExtra = useCallback((key, q) => {
    if (extraUnsubs.current[key]) return;
    extraUnsubs.current[key] = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExtraLogs((prev) => ({ ...prev, [key]: docs }));
    });
  }, []);

  // 選手1人の全期間のログを読み込む（自分の全期間は自動、監督は選んだ選手ぶん）。
  const ensureRunnerLogs = useCallback(
    (runnerId) => {
      if (!runnerId || fullLogsRef.current) return;
      subscribeExtra(
        `r:${runnerId}`,
        query(colRef("logs"), where("runnerId", "==", runnerId)),
      );
    },
    [subscribeExtra],
  );

  // チーム全体の指定した1か月（"YYYY-MM"）のログを読み込む。
  // 基本の購読範囲（fetchCutoff 以降）に収まる月は何もしない。
  const ensureLogsMonth = useCallback(
    (ym) => {
      if (!/^\d{4}-\d{2}$/.test(ym || "") || fullLogsRef.current) return;
      const cutoff = cutoffRef.current;
      if (!cutoff || `${ym}-01` >= cutoff) return;
      subscribeExtra(
        `m:${ym}`,
        query(
          colRef("logs"),
          where("date", ">=", `${ym}-01`),
          where("date", "<=", `${ym}-31`),
        ),
      );
    },
    [subscribeExtra],
  );

  // ユーザーが変わった／画面を閉じたときに追加購読を解除する
  useEffect(() => {
    const unsubs = extraUnsubs.current;
    return () => {
      Object.values(unsubs).forEach((u) => u());
      extraUnsubs.current = {};
      setExtraLogs({});
    };
  }, [user]);

  // 基本の購読分と追加購読分を id で重複排除して合成する（基本の購読を優先）
  const allLogs = useMemo(() => {
    const m = new Map();
    Object.values(extraLogs).forEach((docs) =>
      docs.forEach((l) => m.set(l.id, l)),
    );
    baseLogs.forEach((l) => m.set(l.id, l));
    return Array.from(m.values());
  }, [baseLogs, extraLogs]);

  useEffect(() => {
    if (!user) return; // ユーザーがいない時は何もしない
    const timeout = setTimeout(() => setDataLoading(false), 3000);

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
            defaultPeriodId: "dynamic_current",
          });
        }
      })
      .catch((e) => console.log("Settings init error", e));

    // 大量の logs 購読は初期描画・ローディング解除を遅らせるため、
    // runners 取得後（＝画面表示が確定した後）に開始する。来ない場合は保険のタイマーで開始。
    let unsubLogs = () => {};
    let logsAttached = false;
    const attachLogs = () => {
      if (logsAttached) return;
      logsAttached = true;
      // 全員 fetchCutoff（既定は直近3ヶ月）で制限する。
      // 監督が設定で「全期間」に切り替えた場合（fullLogs）のみ無制限。
      // それ以前の過去ログは ensureRunnerLogs / ensureLogsMonth で必要なぶんだけ追加購読する。
      let logsQuery = colRef("logs");
      if (!fullLogs && fetchCutoff) {
        logsQuery = query(logsQuery, where("date", ">=", fetchCutoff));
      }
      unsubLogs = onSnapshot(logsQuery, (snap) => {
        setBaseLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    };

    // 各コレクションの監視（リアルタイムリスナー）
    const unsubRunners = onSnapshot(colRef("runners"), (snap) => {
      setAllRunners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
      clearTimeout(timeout);
      attachLogs();
      // 自分（選手・マネージャー・引退者）の全期間のログは自動で読み込む
      const me = snap.docs.find((d) => d.data().lastLoginUid === user.uid);
      if (me) ensureRunnerLogs(me.id);
    });
    const logsTimer = setTimeout(attachLogs, 800);

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
          defaultPeriodId: data.defaultPeriodId || "dynamic_current",
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
      clearTimeout(logsTimer);
    };
  }, [user, role, fetchCutoff, fullLogs, ensureRunnerLogs]);

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
    ensureRunnerLogs,
    ensureLogsMonth,
  };
};
