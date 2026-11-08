/*
 * useTeamDiary — チーム練習日誌の状態＋操作（監督・マネージャー共通）
 *
 * 監督(CoachView)とマネージャー(ManagerDashboard)に重複していた日誌の
 * state・初期化・5ハンドラ（保存／休養登録／削除／補強トグル／AI読み取り）を
 * 1本化したもの。差分はすべて引数で吸収する:
 *   - role / profile : updatedBy ラベル（監督="監督" / マネージャー="{姓} (MG)"）
 *   - diaryDate / setDiaryDate : 対象日（監督=menuInput.date / マネージャー=checkDate）
 *   - teamLogs : 既存日誌の取得元
 *   - isDemoMode : マネージャーのデモ時は書き込みを抑制
 *   - setConfirmDialog : 削除確認ダイアログ
 *
 * 日付そのものは各親が所有する値を使う（checkDate は提出状況等でも使うため）。
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { setDoc, deleteDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "react-hot-toast";
import { docRef } from "../utils/firestore";
import { getTodayStr } from "../utils/dateUtils";
import { ROLES } from "../utils/constants";

export const REINFORCEMENT_OPTIONS = [
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
  const day = d.getDay();
  const month = d.getMonth() + 1;
  if (day === 0 || day === 6) return { startTime: "09:00", endTime: "12:00" };
  if (month === 7 || month === 8 || month === 9)
    return { startTime: "07:00", endTime: "10:00" };
  if (month === 12 || month === 3)
    return { startTime: "09:00", endTime: "10:00" };
  return { startTime: "15:50", endTime: "18:30" };
};

const emptyDiary = (dateString) => {
  const t = getDefaultTimes(dateString);
  return {
    isRestDay: false,
    weather: "晴れ",
    temp: "",
    wind: 1,
    humidity: "",
    startTime: t.startTime,
    endTime: t.endTime,
    location: "1.53kmコース",
    locationDetail: "",
    reinforcements: [],
    reinforcementDetail: "",
    menu: "",
    result: "",
  };
};

// AI 記録表読み取り用プロンプト（監督・マネージャー共通）
const AI_PROMPT = `添付された画像（陸上競技の練習記録表）から情報を読み取り、以下の【ルール】と【出力フォーマット】に厳密に従ってテキストデータとして出力してください。

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
- 画像下段の「記録」セクションから、各グループの「LAP」「TOTAL」「PACE」（または「LAP(1000)」）の数値を抽出してください。
- 各グループの記録表に個人名の列がある場合、各行の個人ごとのマーク（○・↓・△・X）やタイムなどの注記もすべて抽出してください。
- 記録表が左右に分割されている場合（同じグループの追加周回が右側に続けて記載されている場合）は、一つの表として周回を連続させてまとめてください。
- 記録表内にリカバリータイムがある場合は抽出し、該当行の末尾に \`(r: XX"XX)\` のように追記してください。

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
手書き表の構造をパイプ（|）区切りの表形式で再現してください。各グループを以下のルールで出力してください。

- 各セルを | で区切る。1行目はヘッダー行（周回|LAP|TOTAL|PACE|個人名...）
- 各周の行: 「1周目」「2〃」「3〃」... の形式
- TOTALが記載されていない行はその欄を空欄（||）にする
- 個人列のマーク: ○（参加確認）・↓（継続）・△（部分参加）・X（欠走/失敗）を各行に記入。↓は継続する各行すべてに記入する
- 個人列に通常のマーク以外の注記（タイムや距離など）がある場合はそのまま記載する
- 最終行に400m（またはその他の距離）の計測がある場合、「400m|」行として各個人列にタイムを記入する

\`\`\`text
■[グループ名]
周回|LAP|TOTAL|PACE|[名前1]|[名前2]|[名前3]
1周目|X'XX"XX||X'XX"XX|○|○|○
2〃|X'XX"XX|XX'XX"XX|X'XX"XX|↓|↓|↓
3〃|X'XX"XX|XX'XX"XX|X'XX"XX|↓|↓|↓
400m|||XX"XX|XX"XX|XX"XX
\`\`\``;

export const useTeamDiary = ({
  role,
  profile,
  diaryDate,
  setDiaryDate,
  teamLogs,
  isDemoMode = false,
  setConfirmDialog,
}) => {
  const [diaryMode, setDiaryMode] = useState("list");
  const [listMonth, setListMonth] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [diaryInput, setDiaryInput] = useState(() => emptyDiary(getTodayStr()));
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiImage, setAiImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const updatedBy =
    role === ROLES.COACH ? "監督" : `${profile?.lastName || ""} (MG)`;

  // 対象日の既存日誌
  const existingLog = useMemo(
    () => (teamLogs || []).find((l) => l.date === diaryDate),
    [teamLogs, diaryDate],
  );

  // 対象月の日誌一覧（新しい順）
  const monthlyLogs = useMemo(() => {
    const year = listMonth.getFullYear();
    const month = listMonth.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return (teamLogs || [])
      .filter((l) => l.date.startsWith(prefix))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [teamLogs, listMonth]);

  // 対象日 or 既存日誌が変わったらフォームを初期化
  useEffect(() => {
    const defaultTimes = getDefaultTimes(diaryDate);
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
      setDiaryInput(emptyDiary(diaryDate));
    }
  }, [diaryDate, existingLog]);

  const shiftMonth = useCallback((months) => {
    setListMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + months);
      return d;
    });
  }, []);

  // 一覧から日付を開く（新規作成＝今日 / 既存＝その日）
  const openDiary = useCallback(
    (dateStr) => {
      setDiaryDate(dateStr);
      setDiaryMode("edit");
    },
    [setDiaryDate],
  );

  const toggleReinforcement = useCallback((item) => {
    setDiaryInput((prev) => {
      const current = prev.reinforcements;
      return current.includes(item)
        ? { ...prev, reinforcements: current.filter((i) => i !== item) }
        : { ...prev, reinforcements: [...current, item] };
    });
  }, []);

  const saveDiary = useCallback(async () => {
    if (!diaryInput.menu) return toast.error("メニュー内容は必須です");
    if (isDemoMode) {
      toast.success(
        existingLog ? "【デモ】日誌を更新しました" : "【デモ】日誌を保存しました",
      );
      return;
    }
    setIsSaving(true);
    try {
      await setDoc(docRef("team_logs", diaryDate), {
        ...diaryInput,
        date: diaryDate,
        updatedBy,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef("menus", diaryDate), {
        date: diaryDate,
        text: diaryInput.menu,
      });
      toast.success(existingLog ? "日誌を更新しました！" : "日誌を保存しました！");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSaving(false);
    }
  }, [diaryInput, diaryDate, existingLog, isDemoMode, updatedBy]);

  const handleRestRegister = useCallback(async () => {
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
    setIsSaving(true);
    try {
      await setDoc(docRef("team_logs", diaryDate), {
        ...restData,
        date: diaryDate,
        updatedBy,
        updatedAt: new Date().toISOString(),
      });
      await setDoc(docRef("menus", diaryDate), {
        date: diaryDate,
        text: restData.menu,
      });
      toast.success(`${diaryDate} を休養日として保存しました！`);
      setDiaryMode("list");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSaving(false);
    }
  }, [diaryInput, diaryDate, isDemoMode, updatedBy]);

  const deleteDiary = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      message: `${diaryDate} の日誌を削除しますか？`,
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        if (isDemoMode) {
          toast.success("【デモ】日誌を削除しました");
          setDiaryMode("list");
          return;
        }
        try {
          await deleteDoc(docRef("team_logs", diaryDate));
          await deleteDoc(docRef("menus", diaryDate));
          toast.success("日誌を削除しました");
          setDiaryMode("list");
        } catch (e) {
          toast.error("削除エラー: " + e.message);
        }
      },
    });
  }, [diaryDate, isDemoMode, setConfirmDialog]);

  const generateDiaryWithAI = useCallback(async () => {
    if (!aiImage) return toast.error("練習記録表の画像を選択してください");
    setIsGenerating(true);
    try {
      const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(aiImage);
      });

      const functions = getFunctions();
      const analyzeDiaryImage = httpsCallable(functions, "analyzeDiaryImage");
      const result = await analyzeDiaryImage({
        prompt: AI_PROMPT,
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
      } catch {
        extractedResult = generatedText;
      }

      setDiaryInput((prev) => ({
        ...prev,
        menu: extractedMenu || prev.menu,
        result: extractedResult,
      }));

      toast.success("✨ メニューと記録の自動振り分けが完了しました！");
      setShowAIModal(false);
      setAiImage(null);
    } catch (error) {
      toast.error("生成に失敗しました: " + error.message);
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  }, [aiImage]);

  return {
    // state
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
    reinforcementOptions: REINFORCEMENT_OPTIONS,
    // derived
    existingLog,
    monthlyLogs,
    // handlers
    openDiary,
    toggleReinforcement,
    saveDiary,
    handleRestRegister,
    deleteDiary,
    generateDiaryWithAI,
  };
};
