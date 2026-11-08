/*
 * TeamDiaryView — チーム練習日誌（監督・マネージャー共通）
 *
 * 旧 CoachDiaryView / ManagerDiaryView を1本化。state・ハンドラは useTeamDiary
 * から受け取り、配色のみ accent（"blue"=監督 / "indigo"=マネージャー）で出し分ける。
 * 左=月別一覧、右=編集フォーム（lgで横並び、モバイルは list/edit を切替）。AI読み取り
 * モーダルも内蔵する。
 */
import {
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Dumbbell,
  Sparkles,
  Save,
  Wind,
  X,
} from "lucide-react";
import { getTodayStr } from "../../utils/dateUtils";
import DiaryListItem from "../DiaryListItem";

const THEMES = {
  blue: {
    icon: "text-blue-500",
    ring: "focus:ring-2 ring-blue-500",
    focusBorder: "focus:border-blue-500",
    primary: "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700",
    reinforceOn: "bg-blue-500 text-white border-blue-500 shadow-sm",
    aiBtn: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    windText: "text-blue-600",
    windAccent: "accent-blue-500",
    resultBg: "bg-blue-50",
    resultText: "text-blue-900",
    detailBorder: "border-blue-100 focus:border-blue-500",
    modalHeader: "bg-blue-600",
  },
  indigo: {
    icon: "text-indigo-500",
    ring: "focus:ring-2 ring-indigo-500",
    focusBorder: "focus:border-indigo-500",
    primary: "bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700",
    reinforceOn: "bg-indigo-500 text-white border-indigo-500 shadow-sm",
    aiBtn: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
    windText: "text-indigo-600",
    windAccent: "accent-indigo-500",
    resultBg: "bg-indigo-50",
    resultText: "text-indigo-900",
    detailBorder: "border-indigo-100 focus:border-indigo-500",
    modalHeader: "bg-indigo-600",
  },
};

const TeamDiaryView = ({
  accent = "blue",
  diaryDate,
  setDiaryDate,
  diaryMode,
  setDiaryMode,
  listMonth,
  shiftMonth,
  monthlyLogs,
  existingLog,
  diaryInput,
  setDiaryInput,
  isSaving,
  reinforcementOptions,
  showAIModal,
  setShowAIModal,
  aiImage,
  setAiImage,
  isGenerating,
  openDiary,
  toggleReinforcement,
  saveDiary,
  handleRestRegister,
  deleteDiary,
  generateDiaryWithAI,
}) => {
  const t = THEMES[accent] || THEMES.blue;
  const year = listMonth.getFullYear();
  const month = listMonth.getMonth() + 1;

  return (
    <>
      <div className="animate-in fade-in lg:grid lg:grid-cols-2 lg:gap-6">
        {/* LEFT: 一覧 */}
        <div className={diaryMode === "edit" ? "hidden lg:block" : ""}>
          <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 flex items-center gap-2">
                <BookOpen size={14} /> Team Diary Check &amp; Edit
              </h3>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Target Month
                </p>
                <h2 className="text-lg font-black text-slate-800">
                  {year}年 {month}月
                </h2>
              </div>
              <button
                onClick={() => shiftMonth(1)}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <button
              onClick={() => openDiary(getTodayStr())}
              className={`w-full py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${t.primary}`}
            >
              <Plus size={20} /> 今日の日誌をチェック・作成する
            </button>
            <div className="space-y-3 pt-4 border-t border-slate-100">
              {monthlyLogs.length > 0 ? (
                monthlyLogs.map((log) => (
                  <DiaryListItem
                    key={log.date}
                    log={log}
                    isExpanded={false}
                    showChevron={true}
                    onClick={() => openDiary(log.date)}
                  />
                ))
              ) : (
                <div className="text-center py-10 text-slate-300 font-bold text-sm">
                  この月の日誌はありません
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: 編集フォーム or プレースホルダー */}
        {diaryMode === "list" ? (
          <div className="hidden lg:flex items-center justify-center bg-white rounded-[3rem] shadow-sm flex-col gap-3 text-slate-300 min-h-[400px]">
            <BookOpen size={48} />
            <p className="text-sm font-bold">日誌を選択してください</p>
          </div>
        ) : (
          <div
            className={`bg-white p-8 rounded-[3rem] shadow-sm space-y-5 animate-in slide-in-from-right-10 relative ${diaryMode === "edit" ? "" : "hidden lg:block"}`}
          >
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={() => setDiaryMode("list")}
                className="lg:hidden flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
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
              <BookOpen size={18} className={t.icon} />
              <h2 className="text-sm font-black text-slate-700">
                練習日誌の記録
              </h2>
            </div>

            {/* Date + 休養日ボタン */}
            <div className="flex items-end gap-3 mb-6">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                  Date
                </label>
                <input
                  type="date"
                  className={`w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border-2 border-transparent ${t.focusBorder}`}
                  value={diaryDate}
                  onChange={(e) => setDiaryDate(e.target.value)}
                />
              </div>
              <button
                onClick={handleRestRegister}
                disabled={isSaving}
                className={`py-3 px-5 rounded-xl font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 ${isSaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <BookOpen size={16} />
                )}
                休養日
              </button>
            </div>

            {/* 天気・気温・湿度 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                  Weather
                </label>
                <select
                  className={`w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none ${t.ring}`}
                  value={diaryInput.weather}
                  onChange={(e) =>
                    setDiaryInput({ ...diaryInput, weather: e.target.value })
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
                  className={`w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none ${t.ring}`}
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
                  className={`w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none ${t.ring}`}
                  value={diaryInput.humidity}
                  onChange={(e) =>
                    setDiaryInput({ ...diaryInput, humidity: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 風速 */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                  <Wind size={12} /> Wind Strength
                </label>
                <span className={`text-xs font-black ${t.windText}`}>
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
                className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer ${t.windAccent}`}
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

            {/* 開始・終了時刻 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                  Start
                </label>
                <input
                  type="time"
                  className={`w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none ${t.ring}`}
                  value={diaryInput.startTime}
                  onChange={(e) =>
                    setDiaryInput({ ...diaryInput, startTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">
                  End
                </label>
                <input
                  type="time"
                  className={`w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none ${t.ring}`}
                  value={diaryInput.endTime}
                  onChange={(e) =>
                    setDiaryInput({ ...diaryInput, endTime: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 場所 */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1">
                <MapPin size={12} /> Location
              </label>
              <select
                className={`w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none ${t.ring}`}
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
                  className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-slate-700 text-sm outline-none mt-2 animate-in fade-in ${t.detailBorder}`}
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

            {/* 補強 */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest flex items-center gap-1">
                <Dumbbell size={12} /> Reinforcement
              </label>
              <div className="flex flex-wrap gap-2">
                {reinforcementOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleReinforcement(option)}
                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${diaryInput.reinforcements.includes(option) ? t.reinforceOn : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {diaryInput.reinforcements.includes("その他") && (
                <input
                  type="text"
                  placeholder="その他の補強内容..."
                  className={`w-full p-3 bg-white border-2 rounded-xl font-bold text-slate-700 text-sm outline-none mt-2 animate-in fade-in ${t.detailBorder}`}
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

            {/* AI アシスタント */}
            <div className="flex justify-end pt-2 pb-1">
              <button
                onClick={() => setShowAIModal(true)}
                className={`text-xs px-4 py-2.5 rounded-xl font-black flex items-center gap-1.5 active:scale-95 transition-all shadow-sm ${t.aiBtn}`}
              >
                <Sparkles size={16} /> AIアシスタントで文章を自動作成
              </button>
            </div>

            {/* メニュー */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                Menu Plan
              </label>
              <textarea
                className={`w-full p-4 bg-slate-50 rounded-xl h-32 font-bold text-slate-600 outline-none text-sm resize-none ${t.ring}`}
                placeholder="本日の練習メニューを入力..."
                value={diaryInput.menu}
                onChange={(e) =>
                  setDiaryInput({ ...diaryInput, menu: e.target.value })
                }
              />
            </div>

            {/* 結果・所感 */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-widest">
                Results / Notes
              </label>
              <textarea
                className={`w-full p-4 rounded-xl h-52 font-mono outline-none text-xs resize-y overflow-x-auto ${t.resultBg} ${t.resultText} ${t.ring}`}
                placeholder="練習の結果、雰囲気、ポイント練習のタイム設定など..."
                value={diaryInput.result}
                wrap="off"
                onChange={(e) =>
                  setDiaryInput({ ...diaryInput, result: e.target.value })
                }
              />
            </div>

            {/* 保存ボタン */}
            <button
              onClick={saveDiary}
              disabled={isSaving}
              className={`w-full py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isSaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : t.primary}`}
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> 保存中...
                </>
              ) : (
                <>
                  <Save size={18} />{" "}
                  {existingLog ? "日誌を更新" : "日誌を保存・公開"}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* AI アシスタント モーダル */}
      {showAIModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className={`p-4 flex justify-between items-center text-white ${t.modalHeader}`}>
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
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAiImage(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
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
                  className={`flex-[2] py-3 rounded-xl font-black shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 ${t.primary}`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> 読み取り中...
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
    </>
  );
};

export default TeamDiaryView;
