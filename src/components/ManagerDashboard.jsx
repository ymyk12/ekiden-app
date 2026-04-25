import React, { useState } from "react";
import { doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import {
  LogOut,
  ChevronRight,
  Activity,
  Trophy,
  BookOpen,
  MapPin,
  Dumbbell,
  ClipboardList,
  BarChart2,
  ArrowLeft,
  HeartPulse,
  Check,
  X,
  Save,
  Plus,
  Trash2,
  Wind,
  Sparkles,
  Loader2,
  Flag,
  Timer,
  Home,
  Users,
} from "lucide-react";

// Utilsから読み込む
import { ROLES } from "../utils/constants";
import { getTodayStr } from "../utils/dateUtils";

// 練習日誌
import DiaryListItem from "./DiaryListItem";
// 大会LAPタイム入力
import LapTimeModal from "./LapTimeModal";
// 大会チームレポート
import TeamRaceReport from "./TeamRaceReport";

import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "react-hot-toast";

// --- Manager Dashboard Component ---
const ManagerDashboard = ({
  profile,
  allRunners,
  allLogs,
  teamLogs,
  tournaments = [], // 🌟 大会データ
  raceCards = [], // 🌟 種目データ
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

  // 詳細モーダル関連のステート
  const [selectedLog, setSelectedLog] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 🌟 大会・LAP入力関連のステート
  const [selectedTourId, setSelectedTourId] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [lapInput, setLapInput] = useState("");
  const [showTeamReportId, setShowTeamReportId] = useState(null);

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

  // 曜日や季節から「時間」の初期設定を自動判定する関数 🌟🌟
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
    // 🌟 今選んでいる日付から、その日のデフォルトの時間を取得！
    const defaultTimes = getDefaultTimes(checkDate);

    if (existingLog) {
      setDiaryInput({
        isRestDay: existingLog.isRestDay || false,
        weather: existingLog.weather || "晴れ",
        temp: existingLog.temp || "",
        wind: existingLog.wind || 1,
        humidity: existingLog.humidity || "",
        // 🌟 既存データに時間がない場合はデフォルトをセット
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
        // 🌟 新規作成時は、判定したデフォルトの時間をセット！
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
    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "team_logs", checkDate),
        {
          ...diaryInput,
          date: checkDate,
          updatedBy: `${profile.lastName} (MG)`,
          updatedAt: new Date().toISOString(),
        },
      );
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "menus", checkDate),
        { date: checkDate, text: diaryInput.menu },
      );
      toast.success(
        existingLog ? "日誌を更新しました！" : "日誌を保存しました！",
      );
    } catch (e) {
      toast.error("エラー: " + e.message);
    }
  };

  // ワンタップで休養日を保存する
  const handleRestRegister = async () => {
    // 既存の入力状態（天気など）を引き継ぎつつ、休養日データを作る
    const restData = {
      ...diaryInput,
      isRestDay: true,
      menu: "【完全休養】本日はオフです。",
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

    try {
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "team_logs", checkDate),
        {
          ...restData,
          date: checkDate,
          updatedBy: `${profile.lastName} (MG)`,
          updatedAt: new Date().toISOString(),
        },
      );
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "menus", checkDate),
        { date: checkDate, text: restData.menu },
      );
      toast.success(`${checkDate} を休養日として保存しました！☕`);
      setDiaryMode("list"); // 保存したらすぐに一覧画面に戻る！
    } catch (e) {
      toast.error("エラー: " + e.message);
    }
  };

  const deleteDiary = async () => {
    if (!window.confirm(`${checkDate} の日誌を削除しますか？`)) return;
    if (isDemoMode) {
      toast.success("【デモ】日誌を削除しました");
      setDiaryMode("list");
      return;
    }
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "team_logs", checkDate),
      );
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "menus", checkDate),
      );
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

      const data = result.data;
      const generatedText = data.candidates[0].content.parts[0].text;

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

  // 🌟 LAPタイムの保存機能 (マネージャーが選手のノートを更新する)
  const saveLapTime = async () => {
    if (!editingCard) return;
    try {
      if (!isDemoMode) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "raceCards",
            editingCard.id,
          ),
          {
            lapTimes: lapInput,
            updatedAt: new Date().toISOString(),
            updatedBy: `${profile.lastName} (MG)`,
          },
        );
      }
      toast.success(`${editingCard.runnerName}選手のLAPを更新しました！`);
      setEditingCard(null);
    } catch (e) {
      toast.error("保存失敗: " + e.message);
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-indigo-600 text-white pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-lg mb-6 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">
              Manager Dashboard
            </p>
            <h1 className="text-2xl font-black tracking-tighter">
              {profile.lastName} {profile.firstName}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-indigo-800/50 hover:bg-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors"
          >
            <LogOut size={14} className="inline mr-1" /> ログアウト
          </button>
        </div>
      </header>

      <main className="px-5 max-w-md mx-auto space-y-6">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex overflow-x-auto no-scrollbar">
          {["check", "status", "diary", "race"].map((view) => (
            <button
              key={view}
              onClick={() => {
                setCurrentView(view);
                if (view === "diary") setDiaryMode("list");
              }}
              className={`flex-1 min-w-[70px] py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                currentView === view
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              {view === "check" && <ClipboardList size={14} />}
              {view === "status" && <BarChart2 size={14} />}
              {view === "diary" && <BookOpen size={14} />}
              {view === "race" && <Flag size={14} />}
              {view === "check"
                ? "提出"
                : view === "status"
                  ? "状況"
                  : view === "diary"
                    ? "日誌"
                    : "大会"}
            </button>
          ))}
        </div>

        {/* --- 1. 提出チェック --- */}
        {currentView === "check" && (
          <div className="bg-white p-5 rounded-[2rem] shadow-sm animate-in fade-in">
            <div className="mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Select Date
                </span>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                  {checkDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:bg-indigo-50"
                >
                  <ArrowLeft size={18} />
                </button>
                <input
                  type="date"
                  className="flex-1 p-3 bg-white rounded-xl font-bold text-slate-700 text-center outline-none border border-slate-200"
                  value={checkDate}
                  onChange={(e) => setCheckDate(e.target.value)}
                />
                <button
                  onClick={() => shiftDate(1)}
                  className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500 hover:bg-indigo-50"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {submissionStatusList.map((r) => {
                const targetLog = allLogs.find(
                  (l) => l.runnerId === r.id && l.date === checkDate,
                );
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      if (targetLog) {
                        setSelectedLog(targetLog);
                        setIsDetailOpen(true);
                      }
                    }}
                    className={`py-3 flex items-center justify-between px-2 rounded-xl transition-all ${targetLog ? "cursor-pointer hover:bg-indigo-50" : "opacity-70"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white ${r.status === "unsubmitted" ? "bg-slate-200" : "bg-indigo-500"}`}
                      >
                        {r.lastName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-700 block">
                          {r.lastName} {r.firstName}
                        </span>
                        <div className="flex gap-2 items-center">
                          <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 rounded">
                            月間: {r.monthTotal}km
                          </span>
                          {targetLog && targetLog.pain >= 3 && (
                            <span className="text-[9px] text-rose-500 font-bold flex items-center gap-0.5 animate-pulse">
                              <HeartPulse size={9} /> Pain
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {r.status === "unsubmitted" ? (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
                          未提出
                        </span>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black border flex items-center gap-1 ${r.status === "rest" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}
                        >
                          <Check size={10} /> {r.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- 2. チーム状況 --- */}
        {currentView === "status" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-sm text-slate-700 flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" /> 月間ランキング
                </h3>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">
                  {new Date(checkDate).getMonth() + 1}月度
                </span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {rankingData.map((runner, idx) => (
                  <div
                    key={runner.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl relative overflow-hidden"
                  >
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1 ${idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-slate-300" : idx === 2 ? "bg-orange-300" : "bg-transparent"}`}
                    ></div>
                    <div className="flex items-center gap-3 pl-2">
                      <span className="text-xs font-black text-slate-400 w-4">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {runner.name}
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-700">
                      {runner.total}
                      <span className="text-[10px] text-slate-400 ml-0.5">
                        km
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] shadow-sm">
              <h3 className="font-black text-sm text-slate-700 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" /> Team Activity
              </h3>
              <div className="space-y-4 pl-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {teamActivityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 relative"
                    onClick={() => {
                      setSelectedLog(log);
                      setIsDetailOpen(true);
                    }}
                  >
                    <div className="absolute left-[19px] top-8 bottom-[-16px] w-0.5 bg-slate-100 last:hidden"></div>
                    <div
                      className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm z-10 ${log.category === "完全休養" ? "bg-emerald-400" : "bg-indigo-500"}`}
                    >
                      {log.runnerName ? log.runnerName.charAt(0) : "?"}
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl w-full border border-slate-100 cursor-pointer hover:border-indigo-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400">
                            {log.date.slice(5).replace("-", "/")}{" "}
                            <span className="text-slate-300">·</span>{" "}
                            {log.runnerName}
                          </p>
                          <p className="text-sm font-black mt-0.5 text-slate-700">
                            {log.category === "完全休養"
                              ? "完全休養"
                              : `${log.distance}km`}
                          </p>
                        </div>
                      </div>
                      {log.menuDetail && (
                        <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-2">
                          {log.menuDetail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- 3. 練習日誌 (AIアシスタント機能入り) --- */}
        {currentView === "diary" && (
          <div className="space-y-6">
            {diaryMode === "list" && (
              <div className="animate-in fade-in space-y-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm">
                  <button
                    onClick={() => shiftMonth(-1)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-indigo-50 text-slate-500"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Target Month
                    </p>
                    <h2 className="text-lg font-black text-slate-800">
                      {listMonth.getFullYear()}年 {listMonth.getMonth() + 1}月
                    </h2>
                  </div>
                  <button
                    onClick={() => shiftMonth(1)}
                    className="p-2 bg-slate-100 rounded-full hover:bg-indigo-50 text-slate-500"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setCheckDate(getTodayStr());
                    setDiaryMode("edit");
                  }}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={20} /> 本日の練習を記録する
                </button>

                <div className="space-y-3">
                  {monthlyLogs.length > 0 ? (
                    monthlyLogs.map((log) => (
                      <DiaryListItem
                        key={log.date}
                        log={log}
                        isExpanded={false}
                        showChevron={true}
                        onClick={() => {
                          setCheckDate(log.date);
                          setDiaryMode("edit");
                        }}
                      />
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-300 font-bold text-sm">
                      この月の日誌はありません
                    </div>
                  )}
                </div>
              </div>
            )}

            {diaryMode === "edit" && (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-5 animate-in slide-in-from-right-10 relative">
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setDiaryMode("list")}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    <ArrowLeft size={16} /> 一覧に戻る
                  </button>
                  {existingLog && (
                    <button
                      onClick={deleteDiary}
                      className="text-rose-400 hover:text-rose-600 bg-rose-50 p-2 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <BookOpen size={18} className="text-indigo-500" />
                  <h2 className="text-sm font-black text-slate-700">
                    練習日誌の記録
                  </h2>
                </div>

                <div className="flex items-end gap-3 mb-6">
                  {/* flex-1 をつけて「余った幅は全部 日付入力 に使って！」と命令 */}
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                      Date
                    </label>
                    {/* w-100 ではなく w-full を使います。高さをボタンと合わせるため p-3 に統一。 */}
                    <input
                      type="date"
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-indigo-500"
                      value={checkDate}
                      onChange={(e) => setCheckDate(e.target.value)}
                    />
                  </div>

                  {/* ボタンの mb-6 を消し、幅をシュッとさせる（px-5） */}
                  <button
                    onClick={handleRestRegister}
                    className="py-3 px-5 bg-emerald-500 text-white rounded-xl font-black shadow-md hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Home size={16} /> 休養日
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                      Weather
                    </label>
                    <select
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500"
                      value={diaryInput.weather}
                      onChange={(e) =>
                        setDiaryInput({
                          ...diaryInput,
                          weather: e.target.value,
                        })
                      }
                    >
                      <option value="晴れ">☀ 晴</option>
                      <option value="曇り">☁ 曇</option>
                      <option value="雨">☂ 雨</option>
                      <option value="雪">⛄ 雪</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                      Temp (℃)
                    </label>
                    <input
                      type="number"
                      placeholder="25"
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500"
                      value={diaryInput.temp}
                      onChange={(e) =>
                        setDiaryInput({ ...diaryInput, temp: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                      Humid (%)
                    </label>
                    <input
                      type="number"
                      placeholder="60"
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500"
                      value={diaryInput.humidity}
                      onChange={(e) =>
                        setDiaryInput({
                          ...diaryInput,
                          humidity: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                      <Wind size={12} /> Wind Strength
                    </label>
                    <span className="text-xs font-black text-indigo-600">
                      {diaryInput.wind === 1
                        ? "1 (無風)"
                        : diaryInput.wind === 5
                          ? "5 (強風)"
                          : diaryInput.wind}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    value={diaryInput.wind}
                    onChange={(e) =>
                      setDiaryInput({
                        ...diaryInput,
                        wind: parseInt(e.target.value),
                      })
                    }
                  />
                  <div className="flex justify-between px-1">
                    <span className="text-[8px] text-slate-400">弱</span>
                    <span className="text-[8px] text-slate-400">強</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                      Start
                    </label>
                    <input
                      type="time"
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500"
                      value={diaryInput.startTime}
                      onChange={(e) =>
                        setDiaryInput({
                          ...diaryInput,
                          startTime: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                      End
                    </label>
                    <input
                      type="time"
                      className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500"
                      value={diaryInput.endTime}
                      onChange={(e) =>
                        setDiaryInput({
                          ...diaryInput,
                          endTime: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={12} /> Location
                  </label>
                  <select
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-500"
                    value={diaryInput.location}
                    onChange={(e) =>
                      setDiaryInput({ ...diaryInput, location: e.target.value })
                    }
                  >
                    <option value="1.53kmコース">1.53kmコース</option>
                    <option value="1.1kmコース">1.1kmコース</option>
                    <option value="河川敷">河川敷</option>
                    <option value="クロカン・芝">クロカン・芝</option>
                    <option value="防災公園">防災公園</option>
                    <option value="競技場">競技場 (詳細記入)</option>
                    <option value="その他">その他 (詳細記入)</option>
                  </select>
                  {(diaryInput.location === "競技場" ||
                    diaryInput.location === "その他") && (
                    <input
                      type="text"
                      placeholder="詳細を入力 (例: 市営競技場)"
                      className="w-full p-3 bg-white border-2 border-indigo-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:border-indigo-500 mt-2 animate-in fade-in"
                      value={diaryInput.locationDetail}
                      onChange={(e) =>
                        setDiaryInput({
                          ...diaryInput,
                          locationDetail: e.target.value,
                        })
                      }
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1">
                    <Dumbbell size={12} /> Reinforcement
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {reinforcementOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => toggleReinforcement(option)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          diaryInput.reinforcements.includes(option)
                            ? "bg-indigo-500 text-white border-indigo-500 shadow-sm"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {diaryInput.reinforcements.includes("その他") && (
                    <input
                      type="text"
                      placeholder="その他の補強内容..."
                      className="w-full p-3 bg-white border-2 border-indigo-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:border-indigo-500 mt-2 animate-in fade-in"
                      value={diaryInput.reinforcementDetail}
                      onChange={(e) =>
                        setDiaryInput({
                          ...diaryInput,
                          reinforcementDetail: e.target.value,
                        })
                      }
                    />
                  )}
                </div>

                {/* AIアシスタントボタン (ここから既存コード) */}
                <div className="flex justify-end pt-2 pb-1">
                  <button
                    onClick={() => setShowAIModal(true)}
                    className="text-xs bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-black flex items-center gap-1.5 active:scale-95 transition-all hover:bg-indigo-200 shadow-sm"
                  >
                    <Sparkles size={16} /> AIアシスタントで文章を自動作成
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                    Menu Plan
                  </label>
                  <textarea
                    className="w-full p-4 bg-slate-50 rounded-xl h-32 font-bold text-slate-600 outline-none focus:ring-2 ring-indigo-500 text-sm resize-none"
                    placeholder="本日の練習メニューを入力..."
                    value={diaryInput.menu}
                    onChange={(e) =>
                      setDiaryInput({ ...diaryInput, menu: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                    Results / Notes
                  </label>
                  <textarea
                    className="w-full p-4 bg-indigo-50 rounded-xl h-32 font-bold text-indigo-900 outline-none focus:ring-2 ring-indigo-500 text-sm resize-none"
                    placeholder="練習の結果、雰囲気、ポイント練習のタイム設定など..."
                    value={diaryInput.result}
                    onChange={(e) =>
                      setDiaryInput({ ...diaryInput, result: e.target.value })
                    }
                  />
                </div>

                <button
                  onClick={saveDiary}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />{" "}
                  {existingLog ? "日誌を更新" : "日誌を保存・公開"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- 4. 大会記録管理 --- */}
        {currentView === "race" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm">
              <h3 className="font-black text-sm text-slate-700 mb-4 flex items-center gap-2">
                <Flag size={18} className="text-indigo-500" /> Race Management
              </h3>

              {!selectedTourId ? (
                <div className="space-y-3">
                  {tournaments.length === 0 ? (
                    <p className="text-center text-xs text-slate-300 py-10">
                      大会が登録されていません
                    </p>
                  ) : (
                    tournaments.map((tour) => (
                      // 🌟 修正ポイント1: 全体を <div> で囲みます（keyもここに移動）
                      <div key={tour.id} className="flex flex-col gap-2 mb-3">
                        {/* 👇 これが元々あった「選手のエントリー一覧を見る」ボタンです */}
                        <button
                          onClick={() => setSelectedTourId(tour.id)}
                          className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-indigo-300 transition-all text-left shadow-sm"
                        >
                          <div>
                            <p className="font-black text-slate-700">
                              {tour.name}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {tour.startDate} 〜{tour.endDate || ""}
                            </p>
                          </div>
                          <ChevronRight size={18} className="text-slate-300" />
                        </button>

                        {/* 👇 🌟 修正ポイント2: ここに「チームレポートを見る」ボタンを追加します！ */}
                        <button
                          onClick={() => setShowTeamReportId(tour.id)}
                          className="w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-black text-sm hover:bg-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Users size={18} /> チームレポートを見る
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedTourId(null)}
                    className="text-xs font-bold text-indigo-600 flex items-center gap-1 mb-2"
                  >
                    <ArrowLeft size={14} /> 大会一覧に戻る
                  </button>

                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    エントリー選手一覧
                  </h4>
                  <div className="space-y-2">
                    {raceCards.filter((c) => c.tournamentId === selectedTourId)
                      .length === 0 ? (
                      <p className="text-center text-xs text-slate-300 py-6">
                        エントリー選手はいません
                      </p>
                    ) : (
                      raceCards
                        .filter((c) => c.tournamentId === selectedTourId)
                        .map((card) => (
                          <div
                            key={card.id}
                            className="bg-slate-50 p-3 rounded-xl flex justify-between items-center border border-slate-100"
                          >
                            <div>
                              <p className="font-bold text-sm text-slate-700">
                                {card.runnerName}
                              </p>
                              <p className="text-[10px] font-bold text-indigo-500">
                                {card.raceType} / {card.distance}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingCard(card);
                                setLapInput(card.lapTimes || "");
                              }}
                              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black shadow-sm active:scale-95 transition-all flex items-center gap-1"
                            >
                              <Timer size={12} /> LAP入力
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ▼▼▼ AI作成ポップアップ（モーダル） ▼▼▼ */}
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
      {/* ========================================== */}
    </div>
  );
};

export default ManagerDashboard;
