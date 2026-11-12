/*
 * CoachRunnerDetailView — 監督の選手個別・管理画面（表示専用）
 *
 * CoachView から coach-runner-detail ビューの JSX を分離。ROSTER で選手を
 * 選んだときに開く個別ページ。プロフィール編集・目標値設定・最近の記録表示/修正・
 * ステータス（引退）・ロール転向をまとめて扱う。
 * 状態・ハンドラは CoachView 側に残し props で受け取る（挙動は従来と同一）。
 */
import { useEffect } from "react";
import { useLogRange } from "../../hooks/useLogRange";
import {
  ArrowLeft,
  Target,
  FileText,
  HeartPulse,
  Edit,
  Settings,
  UserMinus,
  Users,
  Loader2,
} from "lucide-react";
import { updateDoc } from "firebase/firestore";
import { docRef } from "../../utils/firestore";
import { ROLES } from "../../utils/constants";

const CoachRunnerDetailView = ({
  selectedRunner,
  setView,
  coachEditFormData,
  setCoachEditFormData,
  handleCoachSaveProfile,
  isSubmitting,
  selectedPeriod,
  setSelectedPeriod,
  availablePeriods,
  targetPeriod,
  coachGoalInput,
  setCoachGoalInput,
  activeQuarters,
  handleCoachSaveGoals,
  allLogs,
  openCoachEditModal,
  setConfirmDialog,
  handleCoachChangeRole,
}) => {
  // 「最近の記録」は直近3か月より前の選手でも出せるよう、この選手の全期間を読み込む
  // （記録が3か月以上ない選手が「記録がありません」と誤表示されるのを防ぐ）
  const { ensureRunnerLogs } = useLogRange();
  useEffect(() => {
    if (selectedRunner?.id) ensureRunnerLogs(selectedRunner.id);
  }, [selectedRunner?.id, ensureRunnerLogs]);

  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in slide-in-from-right-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setView("menu")}
          className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h3 className="font-black uppercase text-[10px] text-slate-400 text-center tracking-[0.3em]">
          Athlete Detail
        </h3>
        <div className="w-9" />
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">
              Last Name
            </label>
            <input
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none"
              value={coachEditFormData.lastName}
              onChange={(e) =>
                setCoachEditFormData({
                  ...coachEditFormData,
                  lastName: e.target.value,
                })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">
              First Name
            </label>
            <input
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none"
              value={coachEditFormData.firstName}
              onChange={(e) =>
                setCoachEditFormData({
                  ...coachEditFormData,
                  firstName: e.target.value,
                })
              }
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">
            Login PIN
          </label>
          <input
            type="tel"
            maxLength={4}
            className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none"
            value={coachEditFormData.pin}
            onChange={(e) =>
              setCoachEditFormData({
                ...coachEditFormData,
                pin: e.target.value,
              })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">
            Gender
          </label>
          <div className="grid grid-cols-2 gap-3">
            {["男", "女"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() =>
                  setCoachEditFormData({
                    ...coachEditFormData,
                    gender: g,
                  })
                }
                className={`py-2.5 rounded-xl font-black text-sm transition-all active:scale-95 ${
                  coachEditFormData.gender === g
                    ? g === "男"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "bg-pink-500 text-white shadow-md shadow-pink-200"
                    : "bg-slate-50 text-slate-400 border border-slate-200"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleCoachSaveProfile}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5 ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-blue-600 text-white active:scale-95"}`}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={13} className="animate-spin" /> 更新中...
            </>
          ) : (
            "プロフィール更新"
          )}
        </button>
      </div>
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
            <Target size={16} /> Goal Management
          </h4>
          <select
            className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg px-2 py-1 outline-none focus:border-blue-500"
            value={selectedPeriod?.id || ""}
            onChange={(e) => {
              const period = availablePeriods.find(
                (p) => p.id === e.target.value,
              );
              if (period) setSelectedPeriod(period);
            }}
          >
            {availablePeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Monthly Goal (Global)
            </label>
            <input
              type="number"
              placeholder="例: 200"
              className="w-full p-3 bg-white rounded-xl font-black text-blue-600 outline-none border border-slate-200 focus:border-blue-400"
              value={coachGoalInput.monthly || ""}
              onChange={(e) =>
                setCoachGoalInput({
                  ...coachGoalInput,
                  monthly: e.target.value,
                })
              }
            />
          </div>
          {/* Total Goal は保存対象が custom/global のみ（App.js handleCoachSaveGoals）。
              year/month では保存されず無言で破棄されるため入力欄を出さない。 */}
          {(targetPeriod.type === "custom" ||
            targetPeriod.type === "global") && (
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Total Goal ({targetPeriod.name})
              </label>
              <input
                type="number"
                placeholder="例: 1000"
                className="w-full p-3 bg-white rounded-xl font-black text-emerald-600 outline-none border border-slate-200 focus:border-emerald-400"
                value={coachGoalInput.period || ""}
                onChange={(e) =>
                  setCoachGoalInput({
                    ...coachGoalInput,
                    period: e.target.value,
                  })
                }
              />
            </div>
          )}
          {(targetPeriod.type === "custom" ||
            targetPeriod.type === "global") &&
            activeQuarters.length > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                {activeQuarters.map((q, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="ml-1 flex items-baseline gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Q{idx + 1} Goal
                      </span>
                      {q.start && q.end && (
                        <span className="text-[9px] font-bold text-slate-400 normal-case tracking-normal">
                          {q.start.slice(5).replace("-", "/")}-
                          {q.end.slice(5).replace("-", "/")}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 bg-white rounded-lg font-bold text-slate-700 outline-none border border-slate-200 focus:border-emerald-400 text-sm"
                      value={coachGoalInput[`q${idx + 1}`] || ""}
                      onChange={(e) =>
                        setCoachGoalInput({
                          ...coachGoalInput,
                          [`q${idx + 1}`]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          <button
            onClick={handleCoachSaveGoals}
            disabled={isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all mt-2 flex items-center justify-center gap-1.5 ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-emerald-600 text-white active:scale-95"}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> 保存中...
              </>
            ) : (
              "目標値を保存"
            )}
          </button>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-6 space-y-4">
        <h4 className="text-xs font-black uppercase text-slate-500 flex items-center gap-2">
          <FileText size={16} /> Recent Logs
        </h4>
        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {allLogs
            .filter((l) => l.runnerId === selectedRunner.id)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 30)
            .map((l) => (
              <div
                key={l.id}
                className="bg-slate-50 p-3 rounded-xl flex justify-between items-start group relative hover:border hover:border-blue-200 border border-transparent transition-all"
              >
                <div className="w-full">
                  <div className="flex justify-between items-center pr-2">
                    <p className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                      {l.date.slice(5).replace("-", "/")}{" "}
                      <span className="px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-600 text-[9px]">
                        {l.category}
                      </span>
                    </p>
                    <p className="text-sm font-black text-blue-600">
                      {l.distance}km
                    </p>
                  </div>
                  <div className="flex gap-2 mt-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${
                        l.rpe >= 8
                          ? "bg-rose-100 text-rose-600 border-rose-200"
                          : l.rpe >= 5
                            ? "bg-orange-100 text-orange-600 border-orange-200"
                            : "bg-blue-50 text-blue-600 border-blue-100"
                      }`}
                    >
                      RPE {l.rpe}
                    </span>
                    {l.pain > 1 && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black border flex items-center gap-1 ${
                          l.pain >= 4
                            ? "bg-purple-100 text-purple-600 border-purple-200 animate-pulse"
                            : l.pain === 3
                              ? "bg-rose-100 text-rose-600 border-rose-200"
                              : "bg-yellow-100 text-yellow-700 border-yellow-200"
                        }`}
                      >
                        <HeartPulse size={10} /> Pain {l.pain}
                      </span>
                    )}
                  </div>
                  {l.menuDetail && (
                    <p className="text-[10px] text-slate-500 bg-white/60 p-1.5 rounded-lg leading-relaxed">
                      {l.menuDetail}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => openCoachEditModal(l)}
                  className="absolute right-2 top-2 bg-white p-1.5 rounded-lg text-slate-400 md:text-slate-300 hover:text-blue-600 shadow-sm border border-slate-100 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  title="修正する"
                >
                  <Edit size={14} />
                </button>
              </div>
            ))}
          {allLogs.filter((l) => l.runnerId === selectedRunner.id)
            .length === 0 && (
            <p className="text-center text-xs text-slate-300">
              記録がありません
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 pt-8 mt-4 space-y-4">
        <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
          <Settings size={16} /> Status Management
        </h4>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <p className="text-xs text-slate-500 font-bold">
            この選手が部を離れる場合、または引退する場合はこちらからステータスを変更してください。データは保持されます。
          </p>
          <button
            onClick={() => {
              setConfirmDialog({
                isOpen: true,
                message: `${selectedRunner.lastName}選手を引退(アーカイブ)扱いにしますか？\n(現役リストから外れ、引退リストに移動します)`,
                onConfirm: async () => {
                  await updateDoc(
                    docRef("runners", selectedRunner.id),
                    {
                      status: "retired",
                    },
                  );
                  setConfirmDialog({
                    isOpen: false,
                    message: "",
                    onConfirm: null,
                  });
                  import("react-hot-toast").then((module) => {
                    module.toast.success(
                      `${selectedRunner.lastName}選手をアーカイブしました`,
                    );
                  });
                  setView("coach-roster");
                },
              });
            }}
            className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
          >
            <UserMinus size={16} /> 引退・登録解除 (アーカイブ)
          </button>
        </div>
      </div>
      <div className="border-t border-slate-100 pt-6 space-y-3">
        <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
          <Users size={16} /> Role
        </h4>
        <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-700 text-sm">
              {selectedRunner.role === ROLES.MANAGER
                ? "マネージャー"
                : "選手"}
            </p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
              次回ログイン時に反映されます
            </p>
          </div>
          <button
            onClick={() =>
              handleCoachChangeRole(
                selectedRunner,
                selectedRunner.role === ROLES.MANAGER
                  ? "athlete"
                  : ROLES.MANAGER,
              )
            }
            className={`px-4 py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
              selectedRunner.role === ROLES.MANAGER
                ? "bg-blue-500 text-white"
                : "bg-indigo-100 text-indigo-700"
            }`}
          >
            {selectedRunner.role === ROLES.MANAGER
              ? "選手に転向"
              : "マネージャーに転向"}
          </button>
        </div>
      </div>
      <button
        onClick={() => setView("coach-roster")}
        className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest"
      >
        一覧に戻る
      </button>
    </div>
  );
};

export default CoachRunnerDetailView;
