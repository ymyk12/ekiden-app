/*
 * CoachSettingsView — 監督の設定画面（表示専用に近い切り出し）
 *
 * CoachView から coach-settings ビューの JSX を分離。
 * 初期表示期間・カスタム期間の追加/編集、パスコード、管理ツール（プレビュー）を扱う。
 * 期間関連の状態・ハンドラは CoachView（usePeriod 由来）から props で受け取り、
 * この画面専用の UI 状態（展開トグル・保存中フラグ）のみ内部で保持する。
 */
import { useState } from "react";
import {
  RotateCcw,
  Calendar,
  Loader2,
  ChevronDown,
  Edit,
  Trash2,
  Eye,
  Users,
} from "lucide-react";
import { setDoc } from "firebase/firestore";
import { settingsDocRef } from "../../utils/firestore";

const CoachSettingsView = ({
  appSettings,
  setAppSettings,
  handleSaveDefaultPeriod,
  availablePeriods,
  editingPeriodId,
  newPeriodInput,
  updateNewPeriodInputWithAutoQuarters,
  handleNewPeriodQuarterChange,
  handleCancelEdit,
  handleSaveCustomPeriod,
  isPeriodSaving,
  handleEditCustomPeriod,
  handleDeleteCustomPeriod,
  setDemoMode,
  setView,
  coachFullLogs,
  setCoachFullLogs,
}) => {
  const [isExistingPeriodsOpen, setIsExistingPeriodsOpen] = useState(false);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  return (
    <div className="bg-white p-5 rounded-[2rem] shadow-sm space-y-4 animate-in slide-in-from-right-5 max-w-2xl mx-auto">
      <h3 className="font-black uppercase text-[10px] text-slate-400 text-center tracking-[0.3em]">
        Settings
      </h3>

      <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
        <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
          <RotateCcw size={14} /> Default Display Period
        </h4>
        <select
          className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-white"
          value={appSettings.defaultPeriodId || "dynamic_current"}
          onChange={handleSaveDefaultPeriod}
        >
          <option value="dynamic_current">
            常に「今月」を表示 (Auto Current Month)
          </option>
          {availablePeriods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.start && p.end
                ? ` (${p.start.slice(5).replace("-", "/")}～${p.end.slice(5).replace("-", "/")})`
                : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
        <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
          <Calendar size={14} /> Log Range (この端末のみ)
        </h4>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 w-4 h-4"
            checked={!!coachFullLogs}
            onChange={(e) => setCoachFullLogs(e.target.checked)}
          />
          <span className="text-sm font-bold text-slate-700">
            ログを全期間取得する
            <span className="block text-[11px] font-bold text-slate-400 mt-0.5">
              OFF（既定）は直近3か月を常に読み込み、それより前は、期間の選択・カレンダーや月間レポートで月を開く・選手を選ぶといった操作のときに自動で追加読み込みします。
              すべての画面で全期間を常に使いたいときだけ ON にしてください（ON は読み取りが増え、起動が遅くなります）。
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
          <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
            <Calendar size={14} />{" "}
            {editingPeriodId ? "Edit Period" : "Add Custom Period"}
          </h4>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="期間名 (例: 夏合宿)"
              className="p-2.5 rounded-xl border border-slate-200 text-sm font-bold w-full"
              value={newPeriodInput.name}
              onChange={(e) =>
                updateNewPeriodInputWithAutoQuarters(
                  "name",
                  e.target.value,
                )
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="date"
                className="p-2.5 rounded-xl border border-slate-200 text-sm font-bold w-full"
                value={newPeriodInput.start}
                onChange={(e) =>
                  updateNewPeriodInputWithAutoQuarters(
                    "start",
                    e.target.value,
                  )
                }
              />
              <input
                type="date"
                className="p-2.5 rounded-xl border border-slate-200 text-sm font-bold w-full"
                value={newPeriodInput.end}
                onChange={(e) =>
                  updateNewPeriodInputWithAutoQuarters(
                    "end",
                    e.target.value,
                  )
                }
              />
            </div>
            {newPeriodInput.start && newPeriodInput.end && (
              <div className="bg-white p-3 rounded-xl border border-slate-200 animate-in fade-in">
                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                  Quarter Details (Auto-calculated, Edit if needed)
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {newPeriodInput.quarters.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-black w-8 text-slate-500">
                        Q{idx + 1}
                      </span>
                      <input
                        type="date"
                        className="p-1.5 rounded-lg border border-slate-100 text-xs font-bold w-full"
                        value={q.start}
                        onChange={(e) =>
                          handleNewPeriodQuarterChange(
                            idx,
                            "start",
                            e.target.value,
                          )
                        }
                      />
                      <span className="text-slate-300">-</span>
                      <input
                        type="date"
                        className="p-1.5 rounded-lg border border-slate-100 text-xs font-bold w-full"
                        value={q.end}
                        onChange={(e) =>
                          handleNewPeriodQuarterChange(
                            idx,
                            "end",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              {editingPeriodId && (
                <button
                  onClick={handleCancelEdit}
                  className="w-1/3 py-2.5 bg-slate-200 text-slate-500 rounded-xl font-bold text-xs hover:bg-slate-300 transition-colors"
                >
                  キャンセル
                </button>
              )}
              <button
                onClick={handleSaveCustomPeriod}
                disabled={isPeriodSaving}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 ${isPeriodSaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              >
                {isPeriodSaving ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />{" "}
                    保存中...
                  </>
                ) : editingPeriodId ? (
                  "更新する"
                ) : (
                  "追加する"
                )}
              </button>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-200">
            <button
              onClick={() => setIsExistingPeriodsOpen((v) => !v)}
              className="w-full flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              <span>
                Existing Periods{" "}
                {appSettings.customPeriods?.length > 0
                  ? `(${appSettings.customPeriods.length})`
                  : ""}
              </span>
              <ChevronDown
                size={13}
                className={`transition-transform ${isExistingPeriodsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isExistingPeriodsOpen && (
              <div className="space-y-1.5 mt-2">
                {appSettings.customPeriods &&
                  appSettings.customPeriods.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-slate-100"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-700">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {p.start} ~ {p.end}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEditCustomPeriod(p)}
                          className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomPeriod(p.id)}
                          className="p-1.5 bg-rose-50 rounded-lg text-rose-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                {(!appSettings.customPeriods ||
                  appSettings.customPeriods.length === 0) && (
                  <p className="text-center text-xs text-slate-300 py-1">
                    期間はまだありません
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">
              Passcode
            </label>
            <input
              type="text"
              maxLength={4}
              className="w-full p-3 bg-slate-50 rounded-2xl font-black text-2xl text-center outline-none border-2 border-transparent focus:border-blue-500 font-mono tracking-[0.4em]"
              value={appSettings.coachPass}
              onChange={(e) =>
                setAppSettings({
                  ...appSettings,
                  coachPass: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-emerald-500 uppercase ml-2 tracking-widest">
              Team Join
            </label>
            <input
              type="text"
              className="w-full p-3 bg-slate-50 rounded-2xl font-black text-2xl text-center outline-none border-2 border-transparent focus:border-emerald-500 tracking-[0.4em] text-emerald-600"
              value={appSettings.teamPass}
              onChange={(e) =>
                setAppSettings({
                  ...appSettings,
                  teamPass: e.target.value,
                })
              }
            />
          </div>
        </div>

        <button
          onClick={async () => {
            setIsSettingsSaving(true);
            try {
              await setDoc(settingsDocRef(), appSettings);
              import("react-hot-toast").then((m) =>
                m.toast.success("設定を保存しました"),
              );
            } catch (e) {
              import("react-hot-toast").then((m) =>
                m.toast.error("エラー: " + e.message),
              );
            } finally {
              setIsSettingsSaving(false);
            }
          }}
          disabled={isSettingsSaving}
          className={`w-full py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 ${isSettingsSaving ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-slate-900 text-white active:scale-95"}`}
        >
          {isSettingsSaving ? (
            <>
              <Loader2 size={18} className="animate-spin" /> 保存中...
            </>
          ) : (
            "設定保存"
          )}
        </button>
      </div>

      {/* Admin Tools（デモ／プレビュー）。
          App.js の handleExitDemo がデモ終了時にこの設定画面へ遷移し
          demo-buttons-section へスクロール復帰するため、ここに配置する。 */}
      <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100 space-y-4 mt-2">
        <h4 className="font-black text-sm text-purple-700 flex items-center gap-2">
          <Eye size={18} /> Admin Tools
        </h4>
        <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
          この機能はシステム管理者用です。他のユーザー権限での動作確認や、設定のテストを行うことができます。
        </p>
        <div
          id="demo-buttons-section"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <button
            onClick={() => setDemoMode("manager")}
            className="p-5 bg-amber-50 text-amber-700 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-2 hover:bg-amber-100 border border-amber-200 shadow-sm active:scale-95 transition-all"
          >
            <Users size={24} />
            マネージャープレビュー
          </button>
          <button
            onClick={() => {
              setDemoMode("admin");
              setView("menu");
              window.scrollTo(0, 0);
            }}
            className="p-5 bg-purple-100 text-purple-800 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-2 hover:bg-purple-200 border border-purple-300 shadow-sm active:scale-95 transition-all"
          >
            <Eye size={24} />
            選手プレビュー
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachSettingsView;
