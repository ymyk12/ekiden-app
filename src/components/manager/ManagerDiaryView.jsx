/*
 * ManagerDiaryView — マネージャーの練習日誌（diary）ビュー（表示専用）
 *
 * ManagerDashboard から diary ビュー（一覧＋編集フォーム）を分離。
 * AI 読み取りモーダルは親に残し、ここは起動ボタン(setShowAIModal)のみ持つ。
 * 状態・派生データ・ハンドラは props で受け取る（挙動は従来と同一）。
 */
import {
  ArrowLeft,
  ChevronRight,
  Plus,
  Trash2,
  BookOpen,
  Home,
  Loader2,
  Wind,
  MapPin,
  Dumbbell,
  Sparkles,
  Save,
} from "lucide-react";
import { getTodayStr } from "../../utils/dateUtils";
import DiaryListItem from "../DiaryListItem";

const ManagerDiaryView = ({
  diaryMode,
  setDiaryMode,
  listMonth,
  shiftMonth,
  checkDate,
  setCheckDate,
  monthlyLogs,
  existingLog,
  deleteDiary,
  handleRestRegister,
  isSaving,
  diaryInput,
  setDiaryInput,
  reinforcementOptions,
  toggleReinforcement,
  saveDiary,
  setShowAIModal,
}) => {
  return (
          <div className="h-full flex flex-col">
            {diaryMode === "list" && (
              <div className="h-full flex flex-col gap-4 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] shadow-sm flex-shrink-0">
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
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 flex-shrink-0"
                >
                  <Plus size={20} /> 本日の練習を記録する
                </button>

                <div className="flex-1 overflow-y-auto space-y-3 pb-4">
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
              <div className="h-full flex flex-col animate-in slide-in-from-right-10">
                <div className="bg-white rounded-[2rem] shadow-sm flex-1 overflow-hidden flex flex-col relative">
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
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
                        disabled={isSaving}
                        className={`py-3 px-5 rounded-xl font-black shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 ${isSaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
                      >
                        {isSaving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Home size={16} />
                        )}
                        {isSaving ? "保存中..." : "休養日"}
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
                            setDiaryInput({
                              ...diaryInput,
                              temp: e.target.value,
                            })
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
                          setDiaryInput({
                            ...diaryInput,
                            location: e.target.value,
                          })
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
                          setDiaryInput({
                            ...diaryInput,
                            result: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t border-slate-100">
                    <button
                      onClick={saveDiary}
                      disabled={isSaving}
                      className={`w-full py-4 rounded-xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isSaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-indigo-600 text-white shadow-indigo-200"}`}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />{" "}
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save size={18} />{" "}
                          {existingLog ? "日誌を更新" : "日誌を保存・公開"}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
  );
};

export default ManagerDiaryView;
