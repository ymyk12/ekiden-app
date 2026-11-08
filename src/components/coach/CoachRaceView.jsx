/*
 * CoachRaceView — 監督の大会（レース）管理画面
 *
 * CoachView から coach-race ビューの JSX を分離。大会の登録/編集/削除、
 * 月フィルター、提出枚数・フィードバック状況の表示を扱う。
 * この画面専用の UI 状態（登録モーダルの開閉・月フィルター・編集中の大会）は
 * 子で保持し、大会データや遷移系の setter は CoachView から props で受け取る。
 */
import { useState } from "react";
import {
  Plus,
  Flag,
  X,
  BarChart2,
  ClipboardCheck,
  MessageSquare,
  Check,
  Edit,
  Trash2,
  Settings2,
  Lock,
} from "lucide-react";
import { updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { docRef } from "../../utils/firestore";
import TournamentMonthFilter from "../shared/TournamentMonthFilter";
import {
  buildPresetOptions,
  findPreset,
  BUILTIN_EKIDEN_PRESETS,
} from "../../data/ekidenPresets";

// 区間距離の文字列入力("10.0, 3.0, ...")を number[] に変換する
const parseLegsInput = (str) =>
  (str || "")
    .split(/[,、\s]+/)
    .map((s) => parseFloat(s))
    .filter((n) => Number.isFinite(n) && n > 0);

const CoachRaceView = ({
  tournaments,
  raceCards,
  newTournamentInput,
  setNewTournamentInput,
  handleSaveTournament,
  handleDeleteTournament,
  isSubmitting,
  setShowTeamReportId,
  setSelectedTourId,
  setOnlyPendingFeedback,
  ekidenPresets = [],
  handleSaveEkidenPresets,
}) => {
  const presetOptions = buildPresetOptions(ekidenPresets);
  const [isNewTournamentModalOpen, setIsNewTournamentModalOpen] =
    useState(false);
  const [editingTourId, setEditingTourId] = useState(null);
  const [editingTourInput, setEditingTourInput] = useState({ name: "", startDate: "", endDate: "", ekidenPreset: "", teams: [] });
  const [raceMonthFilter, setRaceMonthFilter] = useState("all");

  // ── 駅伝プリセット管理モーダル ──
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState(null); // null=新規
  const EMPTY_PRESET_FORM = { label: "", male: "", female: "" };
  const [presetForm, setPresetForm] = useState(EMPTY_PRESET_FORM);
  const builtinPresets = Object.values(BUILTIN_EKIDEN_PRESETS);

  const startNewPreset = () => {
    setEditingPresetId(null);
    setPresetForm(EMPTY_PRESET_FORM);
  };
  const startEditPreset = (p) => {
    setEditingPresetId(p.id);
    setPresetForm({
      label: p.label || "",
      male: (p.legs?.男 || []).join(", "),
      female: (p.legs?.女 || []).join(", "),
    });
  };
  const submitPreset = () => {
    const label = presetForm.label.trim();
    if (!label) {
      toast.error("プリセット名を入力してください");
      return;
    }
    const male = parseLegsInput(presetForm.male);
    const female = parseLegsInput(presetForm.female);
    if (!male.length && !female.length) {
      toast.error("男子か女子のどちらかの区間距離を入力してください");
      return;
    }
    const legs = {};
    if (male.length) legs.男 = male;
    if (female.length) legs.女 = female;
    const next = editingPresetId
      ? ekidenPresets.map((p) =>
          p.id === editingPresetId ? { ...p, label, legs } : p,
        )
      : [...ekidenPresets, { id: `preset_${Date.now()}`, label, legs }];
    handleSaveEkidenPresets(next);
    startNewPreset();
  };
  const deletePreset = (id) => {
    handleSaveEkidenPresets(ekidenPresets.filter((p) => p.id !== id));
    if (editingPresetId === id) startNewPreset();
  };

  // ── 駅伝チーム編集（複数チーム・男女混合用）。新規/編集フォーム共用 ──
  const TEAM_CATEGORIES = ["男子", "女子", "混合"];
  const renderTeamsEditor = (teams, setTeams) => {
    const list = Array.isArray(teams) ? teams : [];
    return (
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          駅伝チーム（複数チーム・男女混合用・任意）
        </label>
        <div className="space-y-2">
          {list.map((t, i) => (
            <div key={t.id || i} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`チーム名 (例: A)`}
                value={t.name || ""}
                onChange={(e) => {
                  const next = list.map((x, j) =>
                    j === i ? { ...x, name: e.target.value } : x,
                  );
                  setTeams(next);
                }}
                className="flex-1 min-w-0 p-2.5 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-sm"
              />
              <select
                value={t.category || "男子"}
                onChange={(e) => {
                  const next = list.map((x, j) =>
                    j === i ? { ...x, category: e.target.value } : x,
                  );
                  setTeams(next);
                }}
                className="p-2.5 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-sm"
              >
                {TEAM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setTeams(list.filter((_, j) => j !== i))}
                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                title="チームを削除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setTeams([
                ...list,
                {
                  id: `team_${Date.now()}_${list.length}`,
                  name: "",
                  category: "男子",
                },
              ])
            }
            className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl font-black text-xs flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors"
          >
            <Plus size={14} /> チームを追加
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-5 rounded-[2rem] shadow-sm space-y-3 animate-in fade-in">
      <button
        onClick={() => setIsNewTournamentModalOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200"
      >
        <Plus size={15} strokeWidth={3} /> 新しい大会を登録する
      </button>

      {/* 大会登録モーダル */}
      {isNewTournamentModalOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsNewTournamentModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-[2rem] p-6 space-y-4 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
                <Flag size={14} /> 新しい大会を登録する
              </h4>
              <button
                onClick={() => setIsNewTournamentModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="大会名 (例: 秋季県大会)"
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-sm"
              value={newTournamentInput.name}
              onChange={(e) =>
                setNewTournamentInput({
                  ...newTournamentInput,
                  name: e.target.value,
                })
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                value={newTournamentInput.startDate}
                onChange={(e) =>
                  setNewTournamentInput({
                    ...newTournamentInput,
                    startDate: e.target.value,
                  })
                }
              />
              <input
                type="date"
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                value={newTournamentInput.endDate}
                onChange={(e) =>
                  setNewTournamentInput({
                    ...newTournamentInput,
                    endDate: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  駅伝プリセット
                </label>
                <button
                  type="button"
                  onClick={() => {
                    startNewPreset();
                    setIsPresetModalOpen(true);
                  }}
                  className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:text-blue-700 active:scale-95 transition-all"
                >
                  <Settings2 size={12} /> 管理
                </button>
              </div>
              <select
                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                value={newTournamentInput.ekidenPreset || ""}
                onChange={(e) =>
                  setNewTournamentInput({
                    ...newTournamentInput,
                    ekidenPreset: e.target.value,
                  })
                }
              >
                {presetOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-[9px] font-bold text-slate-400 ml-1">
                ※高校駅伝などを選ぶと、選手の区間距離が自動入力されます
              </p>
            </div>
            {renderTeamsEditor(newTournamentInput.teams, (next) =>
              setNewTournamentInput({ ...newTournamentInput, teams: next }),
            )}
            <button
              onClick={async () => {
                await handleSaveTournament();
                setIsNewTournamentModalOpen(false);
              }}
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-black text-sm transition-all ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"}`}
            >
              {isSubmitting ? "登録中..." : "登録・通知"}
            </button>
          </div>
        </div>
      )}

      {/* 駅伝プリセット管理モーダル（CRUD） */}
      {isPresetModalOpen && (
        <div
          className="fixed inset-0 z-[210] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsPresetModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-[2rem] p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-700 text-sm flex items-center gap-1.5">
                <Settings2 size={14} /> 駅伝プリセット管理
              </h4>
              <button
                onClick={() => setIsPresetModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* 既存プリセット一覧 */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                登録済みプリセット
              </h5>
              {builtinPresets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-100"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-600 truncate flex items-center gap-1">
                      <Lock size={10} className="text-slate-400 shrink-0" />
                      {p.label}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">
                      男{p.legs?.男?.length || 0}区 / 女{p.legs?.女?.length || 0}区（組み込み）
                    </p>
                  </div>
                </div>
              ))}
              {ekidenPresets.length === 0 ? (
                <p className="text-center text-[10px] text-slate-400 font-bold py-3 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                  カスタムプリセットはまだありません
                </p>
              ) : (
                ekidenPresets.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 border ${editingPresetId === p.id ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">
                        {p.label}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400">
                        男{p.legs?.男?.length || 0}区 / 女{p.legs?.女?.length || 0}区
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditPreset(p)}
                        className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="編集"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => deletePreset(p.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 追加・編集フォーム */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                {editingPresetId ? "プリセットを編集" : "新しいプリセットを追加"}
              </h5>
              <input
                type="text"
                placeholder="プリセット名 (例: 県高校駅伝)"
                className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-sm"
                value={presetForm.label}
                onChange={(e) =>
                  setPresetForm((f) => ({ ...f, label: e.target.value }))
                }
              />
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-1">
                  男子 区間距離 (km・カンマ区切り)
                </label>
                <input
                  type="text"
                  placeholder="例: 10, 3, 8.1075, 8.0875, 3, 5, 5"
                  className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-xs"
                  value={presetForm.male}
                  onChange={(e) =>
                    setPresetForm((f) => ({ ...f, male: e.target.value }))
                  }
                />
                <p className="text-[9px] font-bold text-slate-400 ml-1">
                  {(() => {
                    const legs = parseLegsInput(presetForm.male);
                    return legs.length
                      ? `${legs.length}区 / 計 ${legs.reduce((a, b) => a + b, 0).toFixed(4).replace(/\.?0+$/, "")}km`
                      : "未入力なら男子は登録しません";
                  })()}
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 ml-1">
                  女子 区間距離 (km・カンマ区切り)
                </label>
                <input
                  type="text"
                  placeholder="例: 6, 4.0975, 3, 3, 5"
                  className="w-full p-2.5 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 text-xs"
                  value={presetForm.female}
                  onChange={(e) =>
                    setPresetForm((f) => ({ ...f, female: e.target.value }))
                  }
                />
                <p className="text-[9px] font-bold text-slate-400 ml-1">
                  {(() => {
                    const legs = parseLegsInput(presetForm.female);
                    return legs.length
                      ? `${legs.length}区 / 計 ${legs.reduce((a, b) => a + b, 0).toFixed(4).replace(/\.?0+$/, "")}km`
                      : "未入力なら女子は登録しません";
                  })()}
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={submitPreset}
                  disabled={isSubmitting}
                  className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${isSubmitting ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"}`}
                >
                  {editingPresetId ? "更新" : "追加"}
                </button>
                {editingPresetId && (
                  <button
                    onClick={startNewPreset}
                    className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-black hover:bg-slate-200 active:scale-95 transition-all"
                  >
                    新規に戻す
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 pt-3 border-t border-slate-100">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Registered Races
        </h4>
        <TournamentMonthFilter
          tournaments={tournaments}
          value={raceMonthFilter}
          onChange={setRaceMonthFilter}
        />
        <div className="overflow-y-auto max-h-[calc(100dvh-300px)] space-y-3 pr-1">
          {tournaments.length === 0 ? (
            <p className="text-center text-xs text-slate-400 font-bold py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
              大会はまだ登録されていません
            </p>
          ) : (
            <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
              {tournaments
                .filter(
                  (t) =>
                    raceMonthFilter === "all" ||
                    t.startDate?.slice(0, 7) === raceMonthFilter,
                )
                .map((tour) => (
                  <div
                    key={tour.id}
                    className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm"
                  >
                    {editingTourId === tour.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingTourInput.name}
                          onChange={(e) => setEditingTourInput((p) => ({ ...p, name: e.target.value }))}
                          className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                          placeholder="大会名"
                          autoFocus
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={editingTourInput.startDate} onChange={(e) => setEditingTourInput((p) => ({ ...p, startDate: e.target.value }))} className="p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400" />
                          <input type="date" value={editingTourInput.endDate} onChange={(e) => setEditingTourInput((p) => ({ ...p, endDate: e.target.value }))} className="p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-500 outline-none border border-slate-200 focus:border-blue-400" />
                        </div>
                        <select
                          value={editingTourInput.ekidenPreset || ""}
                          onChange={(e) => setEditingTourInput((p) => ({ ...p, ekidenPreset: e.target.value }))}
                          className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                        >
                          {presetOptions.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        {renderTeamsEditor(editingTourInput.teams, (next) =>
                          setEditingTourInput((p) => ({ ...p, teams: next })),
                        )}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={async () => {
                              if (!editingTourInput.name) return;
                              const presetId = editingTourInput.ekidenPreset || "";
                              await updateDoc(docRef("tournaments", tour.id), {
                                name: editingTourInput.name,
                                startDate: editingTourInput.startDate,
                                endDate: editingTourInput.endDate,
                                ekidenPreset: presetId,
                                // プリセットの区間距離を大会に非正規化保存
                                ekidenLegs: presetId
                                  ? findPreset(presetId, ekidenPresets)?.legs || null
                                  : null,
                                teams: Array.isArray(editingTourInput.teams)
                                  ? editingTourInput.teams
                                  : [],
                              });
                              setEditingTourId(null);
                            }}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 active:scale-95 transition-all"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingTourId(null)}
                            className="px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-black hover:bg-slate-200 active:scale-95 transition-all"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div className="flex justify-between items-center">
                    <div
                      className="flex-1 cursor-pointer group pr-4"
                      onClick={() => setShowTeamReportId(tour.id)}
                    >
                      <h5 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                        {tour.name}{" "}
                        <BarChart2
                          size={16}
                          className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        />
                      </h5>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        {tour.startDate.replace(/-/g, "/")} 〜{" "}
                        {tour.endDate?.replace(/-/g, "/") || ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => { setSelectedTourId(tour.id); setOnlyPendingFeedback(false); }}
                          className="active:scale-95 transition-all"
                        >
                          <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1 hover:bg-indigo-100 shadow-sm">
                            <ClipboardCheck size={12} />
                            {raceCards.filter((card) => card.tournamentId === tour.id).length}{" "}枚提出
                          </span>
                        </button>
                        {(() => {
                          const pending = raceCards.filter((card) => card.tournamentId === tour.id && !card.coachFeedback && !card.feedbackSkipped).length;
                          return pending > 0 ? (
                            <button
                              onClick={() => { setSelectedTourId(tour.id); setOnlyPendingFeedback(true); }}
                              className="active:scale-95 transition-all"
                            >
                              <span className="text-[10px] font-black bg-amber-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm hover:bg-amber-600">
                                <MessageSquare size={10} /> FB未 {pending}件
                              </span>
                            </button>
                          ) : raceCards.filter((card) => card.tournamentId === tour.id).length > 0 ? (
                            <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                              <Check size={10} /> FB完了
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <button
                        onClick={() => {
                          setEditingTourId(tour.id);
                          setEditingTourInput({ name: tour.name, startDate: tour.startDate, endDate: tour.endDate || "", ekidenPreset: tour.ekidenPreset || "", teams: Array.isArray(tour.teams) ? tour.teams : [] });
                        }}
                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="大会情報を編集する"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteTournament(tour.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="大会を削除する"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachRaceView;
