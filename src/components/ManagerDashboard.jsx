/*
 * ManagerDashboard — マネージャーダッシュボード
 *
 * マネージャーが使う画面。チームの練習日誌・スケジュール・
 * 大会情報の閲覧・入力を担当する。
 * デモモード時は isDemoMode フラグで保存処理を抑制する。
 */
import React, { useState, useEffect } from "react";
import { setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { docRef } from "../utils/firestore";
import {
  LogOut,
  BookOpen,
  ClipboardList,
  BarChart2,
  X,
  Sparkles,
  Loader2,
  Flag,
  CalendarDays,
  FileText,
} from "lucide-react";

// Utilsから読み込む
import { ROLES } from "../utils/constants";
import { getTodayStr } from "../utils/dateUtils";

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
import ManagerDiaryView from "./manager/ManagerDiaryView";
import ManagerRaceView from "./manager/ManagerRaceView";

import { getFunctions, httpsCallable } from "firebase/functions";
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

  // 日誌関連のステート
  const [diaryMode, setDiaryMode] = useState("list");
  const [listMonth, setListMonth] = useState(new Date());
  const [diaryInput, setDiaryInput] = useState({
    isRestDay: false,
    weather: "",
    temp: "",
    wind: 1,
    humidity: "",
    startTime: "15:50",
    endTime: "18:30",
    location: "",
    locationDetail: "",
    reinforcements: [],
    reinforcementDetail: "",
    menu: "",
    result: "",
  });

  // AIアシスタント関連のステート
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiImage, setAiImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const reinforcementOptions = [
    "コア",
    "腹筋",
    "脚部",
    "フォーム",
    "ウェイト",
    "DM腹背",
    "DM投げ",
    "スタビライゼーション",
    "その他",
  ];

  // 曜日・季節からデフォルト練習時間を自動判定する
  const getDefaultTimes = (dateString) => {
    const d = new Date(dateString);
    const day = d.getDay(); // 0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土
    const month = d.getMonth() + 1; // 1〜12月

    // パターン1：土日
    if (day === 0 || day === 6) {
      return { startTime: "09:00", endTime: "12:00" };
    }

    // パターン2：夏
    if (month === 7 || month === 8 || month === 9) {
      return { startTime: "07:00", endTime: "10:00" };
    }

    // パターン3：学期末、冬・春休み
    if (month === 12 || month === 3) {
      return { startTime: "09:00", endTime: "10:00" };
    }

    // パターン4：基本の平日
    return { startTime: "15:50", endTime: "18:30" };
  };
  //

  const existingLog = React.useMemo(() => {
    return teamLogs.find((l) => l.date === checkDate);
  }, [teamLogs, checkDate]);

  React.useEffect(() => {
    const defaultTimes = getDefaultTimes(checkDate);

    if (existingLog) {
      setDiaryInput({
        isRestDay: existingLog.isRestDay || false,
        weather: existingLog.weather || "晴れ",
        temp: existingLog.temp || "",
        wind: existingLog.wind || 1,
        humidity: existingLog.humidity || "",
        startTime: existingLog.startTime || defaultTimes.startTime,
        endTime: existingLog.endTime || defaultTimes.endTime,
        location: existingLog.location || "1.53kmコース",
        locationDetail: existingLog.locationDetail || "",
        reinforcements: existingLog.reinforcements || [],
        reinforcementDetail: existingLog.reinforcementDetail || "",
        menu: existingLog.menu || "",
        result: existingLog.result || "",
      });
    } else {
      setDiaryInput({
        isRestDay: false,
        weather: "晴れ",
        temp: "",
        wind: 1,
        humidity: "",
        startTime: defaultTimes.startTime,
        endTime: defaultTimes.endTime,
        location: "1.53kmコース",
        locationDetail: "",
        reinforcements: [],
        reinforcementDetail: "",
        menu: "",
        result: "",
      });
    }
  }, [checkDate, existingLog]);

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

  const shiftMonth = (months) => {
    const d = new Date(listMonth);
    d.setMonth(d.getMonth() + months);
    setListMonth(d);
  };

  const monthlyLogs = React.useMemo(() => {
    const year = listMonth.getFullYear();
    const month = listMonth.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, "0")}`;

    return teamLogs
      .filter((l) => l.date.startsWith(prefix))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [teamLogs, listMonth]);

  const toggleReinforcement = (item) => {
    setDiaryInput((prev) => {
      const current = prev.reinforcements;
      if (current.includes(item)) {
        return { ...prev, reinforcements: current.filter((i) => i !== item) };
      } else {
        return { ...prev, reinforcements: [...current, item] };
      }
    });
  };

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

  const submissionStatusList = React.useMemo(() => {
    const targetDateStr = checkDate;
    return allRunners
      .filter((runner) => runner.role !== ROLES.MANAGER)
      .map((runner) => {
        const targetLog = allLogs.find(
          (log) => log.runnerId === runner.id && log.date === targetDateStr,
        );
        const monthTotal = monthlyTotals[runner.id] || 0;

        let status = "unsubmitted";
        let label = "未";
        if (targetLog) {
          const isRest = targetLog.category === "完全休養";
          if (targetLog.distance > 0) {
            status = "submitted";
            label = `${targetLog.distance}km`;
          } else if (isRest) {
            status = "rest";
            label = "休養";
          } else {
            status = "rest";
            label = "0km";
          }
        }
        return {
          ...runner,
          status,
          label,
          monthTotal: Math.round(monthTotal * 10) / 10,
        };
      });
  }, [allRunners, allLogs, checkDate, monthlyTotals]);

  const rankingData = React.useMemo(() => {
    return allRunners
      .filter((runner) => runner.role !== ROLES.MANAGER)
      .map((r) => ({
        name: `${r.lastName} ${r.firstName}`,
        id: r.id,
        total: Math.round((monthlyTotals[r.id] || 0) * 10) / 10,
      }))
      .sort((a, b) => b.total - a.total);
  }, [allRunners, monthlyTotals]);

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
  const saveDiary = async () => {
    if (!diaryInput.menu) return toast.error("メニュー内容は必須です");
    if (isDemoMode) {
      toast.success(
        existingLog
          ? "【デモ】日誌を更新しました"
          : "【デモ】日誌を保存しました",
      );
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(docRef("team_logs", checkDate), {
        ...diaryInput,
        date: checkDate,
        updatedBy: `${profile.lastName} (MG)`,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef("menus", checkDate), {
        date: checkDate,
        text: diaryInput.menu,
      });
      toast.success(
        existingLog ? "日誌を更新しました！" : "日誌を保存しました！",
      );
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ワンタップで休養日を保存する
  const handleRestRegister = async () => {
    // 既存の入力状態（天気など）を引き継ぎつつ、休養日データを作る
    const restData = {
      ...diaryInput,
      isRestDay: true,
      menu: "休養日",
      startTime: "",
      endTime: "",
      location: "なし",
      result: "",
    };

    if (isDemoMode) {
      toast.success("【デモ】休養日を記録しました");
      setDiaryMode("list");
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(docRef("team_logs", checkDate), {
        ...restData,
        date: checkDate,
        updatedBy: `${profile.lastName} (MG)`,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef("menus", checkDate), {
        date: checkDate,
        text: restData.menu,
      });
      toast.success(`${checkDate} を休養日として保存しました！☕`);
      setDiaryMode("list"); // 保存したらすぐに一覧画面に戻る！
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDiary = () => {
    setConfirmDialog({
      isOpen: true,
      message: `${checkDate} の日誌を削除しますか？`,
      onConfirm: () => {
        setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        executeDeleteDiary();
      },
    });
  };

  const executeDeleteDiary = async () => {
    if (isDemoMode) {
      toast.success("【デモ】日誌を削除しました");
      setDiaryMode("list");
      return;
    }
    try {
      await deleteDoc(docRef("team_logs", checkDate));
      await deleteDoc(docRef("menus", checkDate));
      toast.success("日誌を削除しました🗑️");
      setDiaryInput({
        weather: "晴れ",
        temp: "",
        wind: 1,
        startTime: "15:50",
        endTime: "18:30",
        location: "1.53kmコース",
        locationDetail: "",
        reinforcements: [],
        reinforcementDetail: "",
        menu: "",
        result: "",
      });
      setDiaryMode("list");
    } catch (e) {
      toast.error("削除エラー: " + e.message);
    }
  };

  const generateDiaryWithAI = async () => {
    if (!aiImage) return toast.error("練習記録表の画像を選択してください");

    setIsGenerating(true);
    try {
      const prompt = `添付された画像（陸上競技の練習記録表）から情報を読み取り、以下の【ルール】と【出力フォーマット】に厳密に従ってテキストデータとして出力してください。

【読み取りのルール】
1. **練習メニューの展開**:
- 画像中段の「チーム」と「練習メニュー」の対応を読み取ってください。
- 「〃」などの省略記号は、直上または該当する内容を補完し、完全な文字列として出力してください。

2. **メンバーの抽出と振り分け（重要）**:
- 画像右側の「メンバー」欄からメンバーの名前を抽出しますが、以下の例外ルールを必ず適用してください。
- **グループ変更**: 名前の付近（上など）に左記とは違うグループ名が示唆されている場合は、推察されるグループのメンバーとして含めてください。
- **別メニュー組**: 名前に「（ ）」がついている者は「別メニュー組」としてまとめてください。
- **欠席者**: 名前の付近に「欠」とある者は「欠席者」としてまとめてください。

3. **記録データの抽出**:
- 画像下段の「記録」セクションから、各グループの「LAP」、「PACE」（または「LAP(1000)」）、および「TOTAL」の数値を抽出してください。
- 「TOTAL」の列に記載がある場合は抽出し、記録の末尾に単純な丸括弧書きで \`(XX'XX"XX)\` のように追記してください（Totalという文字は不要）。
- 「LAP(1000)」や「PACE」の列に記載がある場合は、角括弧書きで \`[1km: XX'XX"XX]\` や \`[pace: XX'XX"XX]\` のように明記して追記してください。
- 記録表内にリカバリータイムがある場合は抽出し、記録の末尾に \`(r: XX"XX)\` のように追記してください。
- 各メンバー名の下にある丸印や矢印などは出力から除外してください。

【出力フォーマット】
「練習メニュー」と「練習記録」をそれぞれワンクリックでコピーできるように、別々のテキストコードブロック（\`\`\`text と \`\`\` で囲む形式）に分けて出力してください。

### 練習メニュー
\`\`\`text
快調走（またはその日のメインメニュー名）
■男子A・B ([メンバー名]・[メンバー名]...)
[距離] [メニュー名] ([設定ペース])...
■別メニュー組：[メンバー名]・[メンバー名]...
■欠席者：[メンバー名]・[メンバー名]...
\`\`\`

### 練習記録
\`\`\`text
■[記録のグループ名]
• [周回数または距離]：[LAPタイム] ([TOTALタイム]) [1km:[タイム] または pace:[タイム]]
\`\`\``;

      const base64EncodedDataPromise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(aiImage);
      });
      const base64Data = await base64EncodedDataPromise;

      const functions = getFunctions();
      const analyzeDiaryImage = httpsCallable(functions, "analyzeDiaryImage");

      const result = await analyzeDiaryImage({
        prompt: prompt,
        base64Image: base64Data,
        mimeType: aiImage.type,
      });

      const generatedText = result.data.text;

      let extractedMenu = "";
      let extractedResult = "";

      try {
        const parts = generatedText.split("### 練習記録");
        if (parts.length === 2) {
          extractedMenu = parts[0]
            .replace(/### 練習メニュー/g, "")
            .replace(/```text/g, "")
            .replace(/```/g, "")
            .trim();
          extractedResult = parts[1]
            .replace(/```text/g, "")
            .replace(/```/g, "")
            .trim();
        } else {
          extractedResult = generatedText
            .replace(/```text/g, "")
            .replace(/```/g, "")
            .trim();
        }
      } catch (e) {
        extractedResult = generatedText;
      }

      setDiaryInput({
        ...diaryInput,
        menu: extractedMenu || diaryInput.menu,
        result: extractedResult,
      });

      toast.success("✨ メニューと記録の自動振り分けが完了しました！");
      setShowAIModal(false);
      setAiImage(null);
    } catch (error) {
      toast.error("生成に失敗しました: " + error.message);
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

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
          <ManagerDiaryView
            diaryMode={diaryMode}
            setDiaryMode={setDiaryMode}
            listMonth={listMonth}
            shiftMonth={shiftMonth}
            checkDate={checkDate}
            setCheckDate={setCheckDate}
            monthlyLogs={monthlyLogs}
            existingLog={existingLog}
            deleteDiary={deleteDiary}
            handleRestRegister={handleRestRegister}
            isSaving={isSaving}
            diaryInput={diaryInput}
            setDiaryInput={setDiaryInput}
            reinforcementOptions={reinforcementOptions}
            toggleReinforcement={toggleReinforcement}
            saveDiary={saveDiary}
            setShowAIModal={setShowAIModal}
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

      {/* AI作成ポップアップ */}
      {showAIModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-black flex items-center gap-2">
                <Sparkles size={18} /> AI 記録表読み取り
              </h3>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setAiImage(null);
                }}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-bold text-slate-500">
                練習記録表（ホワイトボードやノート）の写真をアップロードしてください。AIが画像からメニュー、メンバー、タイムを自動で読み取りテキスト化します。
              </p>

              <div className="border-2 border-dashed border-indigo-200 rounded-xl p-6 text-center bg-slate-50 hover:bg-indigo-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAiImage(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAIModal(false);
                    setAiImage(null);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={generateDiaryWithAI}
                  disabled={isGenerating || !aiImage}
                  className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />{" "}
                      読み取り中...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> 文字起こしを実行
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
