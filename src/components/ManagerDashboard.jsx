// src/components/ManagerDashboard.js
import React, { useState } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
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
} from "lucide-react";

// Utilsから読み込む（役割ROLESと練習カテゴリーの定義）
import { ROLES } from "../utils/constants";

// ▼ 新しく作った道具箱から、日付取得の関数をインポート
import { getTodayStr } from "../utils/dateUtils";

import { toast } from "react-hot-toast";

// --- Manager Dashboard Component (日誌一覧・入力切り替え機能付き) ---
const ManagerDashboard = ({
  profile,
  allRunners,
  allLogs,
  teamLogs,
  db,
  appId,
  setSuccessMsg,
  handleLogout,
  isDemoMode,
}) => {
  const [currentView, setCurrentView] = React.useState("check");
  const [checkDate, setCheckDate] = React.useState(getTodayStr());

  const [diaryMode, setDiaryMode] = React.useState("list");
  const [listMonth, setListMonth] = React.useState(new Date());

  const [diaryInput, setDiaryInput] = React.useState({
    weather: "",
    temp: "",
    wind: 1,
    startTime: "15:50",
    endTime: "18:30",
    location: "",
    locationDetail: "",
    reinforcements: [],
    reinforcementDetail: "",
    menu: "",
    result: "",
  });

  // ▼▼▼ AIアシスタント用 ▼▼▼
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiImage, setAiImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedLog, setSelectedLog] = React.useState(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  // ▼▼▼ 画像をGeminiに送れる形式（Base64）に変換する ▼▼▼
  const fileToGenerativePart = async (file) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    });
    return {
      inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
    };
  };

  const reinforcementOptions = [
    "補強A",
    "補強B",
    "補強C",
    "補強D",
    "補強E",
    "DM腹背",
    "DM投げ",
    "スタビライゼーション",
    "その他",
  ];

  const existingLog = React.useMemo(() => {
    return teamLogs.find((l) => l.date === checkDate);
  }, [teamLogs, checkDate]);

  React.useEffect(() => {
    if (existingLog) {
      setDiaryInput({
        weather: existingLog.weather || "晴れ",
        temp: existingLog.temp || "",
        wind: existingLog.wind || 3,
        startTime: existingLog.startTime || "",
        endTime: existingLog.endTime || "",
        location: existingLog.location || "1.53kmコース",
        locationDetail: existingLog.locationDetail || "",
        reinforcements: existingLog.reinforcements || [],
        reinforcementDetail: existingLog.reinforcementDetail || "",
        menu: existingLog.menu || "",
        result: existingLog.result || "",
      });
    } else {
      setDiaryInput({
        weather: "晴れ",
        temp: "",
        wind: 3,
        startTime: "16:30",
        endTime: "18:30",
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

  const submissionStatusList = React.useMemo(() => {
    const targetDateStr = checkDate;
    const targetMonthPrefix = targetDateStr.slice(0, 7);
    return allRunners
      .filter((runner) => runner.role !== ROLES.MANAGER)
      .map((runner) => {
        const targetLog = allLogs.find(
          (log) => log.runnerId === runner.id && log.date === targetDateStr,
        );
        const monthTotal = allLogs
          .filter(
            (l) =>
              l.runnerId === runner.id && l.date.startsWith(targetMonthPrefix),
          )
          .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);

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
  }, [allRunners, allLogs, checkDate]);

  const rankingData = React.useMemo(() => {
    const targetMonthPrefix = checkDate.slice(0, 7);
    return allRunners
      .filter((runner) => runner.role !== ROLES.MANAGER)
      .map((r) => {
        const total = allLogs
          .filter(
            (l) => l.runnerId === r.id && l.date.startsWith(targetMonthPrefix),
          )
          .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);
        return {
          name: `${r.lastName} ${r.firstName}`,
          id: r.id,
          total: Math.round(total * 10) / 10,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [allRunners, allLogs, checkDate]);

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

  const saveDiary = async () => {
    // 🚨 古い alert() を toast.error() に変更
    if (!diaryInput.menu) return toast.error("メニュー内容は必須です");

    if (isDemoMode) {
      // ✨ 古い setSuccessMsg を toast.success に変更
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
      // ✨ ここも toast.success に変更！
      toast.success(
        existingLog ? "日誌を更新しました！" : "日誌を保存しました！",
      );
    } catch (e) {
      // 🚨 古い alert() を toast.error() に変更
      toast.error("エラー: " + e.message);
    }
  };

  const generateDiaryWithAI = async () => {
    if (!aiImage) return toast.error("練習記録表の画像を選択してください");

    setIsGenerating(true);
    try {
      const API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

      // ✨ Googleドキュメントのプロンプトを完全再現
      const prompt = `添付された画像（陸上競技の練習記録表）から情報を読み取り、以下の【ルール】と【出力フォーマット】に厳密に従ってテキストデータとして出力してください。

【読み取りのルール】
1. **練習メニューの展開**:
- 画像中段の「チーム」と「練習メニュー」の対応を読み取ってください。
- 「〃」などの省略記号は、直上または該当する内容を補完し、完全な文字列として出力してください（例：「快調走」「(4'00"〜3'55")」「+ 400m + 200m W.S.×3」など）。

2. **メンバーの抽出と振り分け（重要）**:
- 画像右側の「メンバー」欄からメンバーの名前を抽出しますが、以下の例外ルールを必ず適用してください。
- **グループ変更**: 名前の付近（上など）に左記とは違うグループ名（例：「中A」「中B」など）が示唆されている場合は、元のグループから除外し、推察されるグループのメンバーとして含めてください。
- **別メニュー組**: 名前に「（ ）」がついている者（例：「（岡田）」など）は各チームから除外し、「別メニュー組」としてまとめてください。
- **欠席者**: 名前の付近に「欠」とある者は各チームから除外し、「欠席者」としてまとめてください。

3. **記録データの抽出**:
- 画像下段の「記録」セクションから、各グループの「LAP」、「PACE」（または「LAP(1000)」）、および「TOTAL」の数値を抽出してください。
- 「TOTAL」の列に記載がある場合は抽出し、記録の末尾に単純な丸括弧書きで \`(XX'XX"XX)\` のように追記してください（Totalという文字は不要）。
- 「LAP(1000)」や「PACE」の列に記載がある場合は、角括弧書きで \`[1km: XX'XX"XX]\` や \`[pace: XX'XX"XX]\` のように明記して追記してください。
- 記録表内にリカバリータイム（カッコ書きのタイムやジョグのタイムなど）がある場合は抽出し、記録の末尾に \`(r: XX"XX)\` のように追記してください。
- 各メンバー名の下にある丸印や矢印などは**出力から除外**してください。

【出力フォーマット】
「練習メニュー」と「練習記録」をそれぞれワンクリックでコピーできるように、別々のテキストコードブロック（\`\`\`text と \`\`\` で囲む形式）に分けて出力してください。

### 練習メニュー
\`\`\`text
快調走（またはその日のメインメニュー名）
■男子A・B ([メンバー名]・[メンバー名]...)
[距離] [メニュー名] ([設定ペース])...
■男子中A ([メンバー名]・[メンバー名]...)
[距離] [メニュー名] ([設定ペース])..
（※以下、各チーム同様に記載）
■別メニュー組：[メンバー名]・[メンバー名]...
■欠席者：[メンバー名]・[メンバー名]...
\`\`\`

### 練習記録
\`\`\`text
■[記録のグループ名（例：男子A・B / 男子中A）]
• [周回数または距離]：[LAPタイム] ([TOTALタイム]) [1km:[タイム] または pace:[タイム]]
• [周回数または距離]：[LAPタイム] ([TOTALタイム]) [1km:[タイム] または pace:[タイム]]
（※以下、各グループの周回・距離ごとに記載。PACEやTOTALがない場合は適宜省略。リカバリータイムがある場合は末尾に (r: [タイム]) と追記）
\`\`\``;

      // 画像をGemini用データに変換
      const imagePart = await fileToGenerativePart(aiImage);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, imagePart] }], // ✨ プロンプトと画像の両方を送信
          }),
        },
      );

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const generatedText = data.candidates[0].content.parts[0].text;

      // 生成された文字起こしデータを「Results / Notes」の入力欄にセット！
      setDiaryInput({ ...diaryInput, result: generatedText });
      toast.success("✨ 画像からの文字起こしが完了しました！");

      // モーダルを閉じて画像をリセット
      setShowAIModal(false);
      setAiImage(null);
    } catch (error) {
      toast.error("生成に失敗しました: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteDiary = async () => {
    if (!window.confirm(`${checkDate} の日誌を削除しますか？`)) return;

    if (isDemoMode) {
      // ✨ 古い setSuccessMsg を toast.success に変更
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
      // ✨ ここも toast.success に変更！
      toast.success("日誌を削除しました🗑️");
      setDiaryInput({
        weather: "晴れ",
        temp: "",
        wind: 3,
        startTime: "16:30",
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
      // 🚨 古い alert() を toast.error() に変更
      toast.error("削除エラー: " + e.message);
    }
  };
  // ▼▼▼ ここから下が「画面の見た目」を作る部分です ▼▼▼
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
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex">
          {["check", "status", "diary"].map((view) => (
            <button
              key={view}
              onClick={() => {
                setCurrentView(view);
                if (view === "diary") setDiaryMode("list");
              }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                currentView === view
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-400 hover:bg-slate-50"
              }`}
            >
              {view === "check" && <ClipboardList size={14} />}
              {view === "status" && <BarChart2 size={14} />}
              {view === "diary" && <BookOpen size={14} />}
              {view === "check" ? "提出" : view === "status" ? "状況" : "日誌"}
            </button>
          ))}
        </div>

        {/* 提出チェック */}
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
            </div>
          </div>
        )}

        {/* チーム状況 */}
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

        {/* 練習日誌 (一覧/入力切り替え版) */}
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
                      <div
                        key={log.date}
                        onClick={() => {
                          setCheckDate(log.date);
                          setDiaryMode("edit");
                        }}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer active:scale-95 transition-all"
                      >
                        <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
                            {log.date.slice(5).replace("-", "/")} (
                            {
                              ["日", "月", "火", "水", "木", "金", "土"][
                                new Date(log.date).getDay()
                              ]
                            }
                            )
                          </p>
                          <h3 className="font-bold text-slate-700 text-sm truncate mb-1">
                            {log.menu
                              ? log.menu.split("\n")[0]
                              : "メニューなし"}
                          </h3>
                          <div className="flex gap-2">
                            <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                              {log.weather}
                            </span>
                            {log.location && (
                              <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold flex items-center gap-0.5">
                                <MapPin size={8} />{" "}
                                {log.location === "その他" && log.locationDetail
                                  ? log.locationDetail
                                  : log.location === "競技場" &&
                                      log.locationDetail
                                    ? `${log.location} (${log.locationDetail})`
                                    : log.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-slate-300">
                          <ChevronRight size={18} />
                        </div>
                      </div>
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

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border-2 border-transparent focus:border-indigo-500"
                    value={checkDate}
                    onChange={(e) => setCheckDate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                      <option value="晴れ">☀ 晴れ</option>
                      <option value="曇り">☁ 曇り</option>
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

                {/* 1. Location */}
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

                {/* 2. Reinforcement (補強) */}
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

                {/* 3. AIアシスタントボタン  */}
                <div className="flex justify-end pt-2 pb-1">
                  <button
                    onClick={() => setShowAIModal(true)}
                    className="text-xs bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-black flex items-center gap-1.5 active:scale-95 transition-all hover:bg-indigo-200 shadow-sm"
                  >
                    <Sparkles size={16} /> AIアシスタントで文章を自動作成
                  </button>
                </div>

                {/* 4. Menu Plan */}
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

                {/* 5. Results / Notes */}
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
      </main>

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
    </div>
  );
};

export default ManagerDashboard;
