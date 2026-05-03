/*
 * RaceCardEntry — 大会振り返りシート入力画面
 *
 * 選手が大会ごとに「レースプラン → 当日コンディション → 結果 → 反省 → 次の目標」
 * を入力する画面。LAPタイムの入力には SmartLapInput を使用する。
 * 保存処理は App.js の handleSaveRaceCard が担う。
 */
import { useState, useMemo } from "react";
import SmartLapInput from "./SmartLapInput";
import {
  Calendar,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  Target,
  Timer,
  Edit,
  Cloud,
  Thermometer,
  Droplets,
  Users,
  Save,
  Trash2,
  Award,
} from "lucide-react";
import { RACE_TYPES, RACE_DISTANCES } from "../utils/constants";

const RaceCardEntry = ({
  setView,
  tournaments,
  raceCardInput,
  setRaceCardInput,
  editingRaceCardId,
  isSubmitting,
  handleSaveRaceCard,
  handleDeleteRaceCard,
  raceCards,
  currentUserId,
}) => {
  const [isRaceFeedbackOpen, setIsRaceFeedbackOpen] = useState(false);
  const [isPrevCardOpen, setIsPrevCardOpen] = useState(false);

  // 時系列で1つ前の大会ノートを取得する
  const prevCard = useMemo(() => {
    if (!raceCards || !currentUserId || !tournaments) return null;

    const getTournamentDate = (tournamentId) =>
      tournaments.find((t) => t.id === tournamentId)?.startDate ?? "";

    const currentDate = getTournamentDate(raceCardInput.tournamentId);

    const candidates = raceCards
      .filter((c) => c.runnerId === currentUserId && c.id !== editingRaceCardId)
      .map((c) => ({ ...c, _date: getTournamentDate(c.tournamentId) }))
      .filter((c) => c._date !== "")
      .sort((a, b) => b._date.localeCompare(a._date));

    // 新規作成中（editingRaceCardId が null）は最新カードを表示
    if (!currentDate) return candidates[0] ?? null;
    return candidates.find((c) => c._date < currentDate) ?? null;
  }, [raceCards, currentUserId, editingRaceCardId, raceCardInput.tournamentId, tournaments]);

  const currentTour = tournaments.find(
    (t) => t.id === raceCardInput.tournamentId,
  );
  const tourName = currentTour ? currentTour.name : "大会情報読み込み中...";
  const tourDates = currentTour
    ? `${currentTour.startDate.replace(/-/g, "/")} 〜 ${currentTour.endDate.replace(/-/g, "/")}`
    : "日程未定";

  const formatTimeInput = (text) => {
    if (!text) return "";
    let normalized = text.replace(/['"：:]/g, ".");
    const parts = normalized.split(".");
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]}"${parts[1]}`;
    if (parts.length === 3) return `${parts[0]}'${parts[1]}"${parts[2]}`;
    return text;
  };

  return (
    <div className="bg-white p-6 rounded-[3rem] shadow-sm space-y-6 animate-in slide-in-from-bottom-8 pb-24">
      {/* 大会名と期日のバナー */}
      <div className="bg-white px-5 py-3.5 rounded-2xl shadow-sm flex items-center justify-between border border-slate-200 mb-4">
        <h2 className="font-black text-sm text-slate-800 tracking-tight truncate pr-4">
          {tourName}
        </h2>
        <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
          <Calendar size={12} className="text-blue-500" />
          {tourDates}
        </p>
      </div>

      {/* 監督からのフィードバック表示 */}
      {editingRaceCardId && raceCardInput.coachFeedback && (
        <div className="mb-4">
          <button
            onClick={() => setIsRaceFeedbackOpen(!isRaceFeedbackOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 border active:scale-95 transition-all ${
              isRaceFeedbackOpen
                ? "bg-indigo-50 border-indigo-200 rounded-t-2xl"
                : "bg-indigo-50/50 border-indigo-100 rounded-2xl hover:bg-indigo-50"
            }`}
          >
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare size={14} /> 監督からのフィードバック
            </span>
            <ChevronRight
              size={16}
              className={`text-indigo-400 transition-transform duration-300 ${
                isRaceFeedbackOpen ? "rotate-90" : ""
              }`}
            />
          </button>

          {isRaceFeedbackOpen && (
            <div className="bg-white border border-t-0 border-indigo-200 p-5 rounded-b-2xl shadow-inner animate-in slide-in-from-top-2">
              <p className="font-bold text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {raceCardInput.coachFeedback}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 前大会の記録（参考表示） */}
      {prevCard && (
        <div className="mb-4">
          <button
            onClick={() => setIsPrevCardOpen(!isPrevCardOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 border active:scale-95 transition-all ${
              isPrevCardOpen
                ? "bg-amber-50 border-amber-200 rounded-t-2xl"
                : "bg-amber-50/50 border-amber-100 rounded-2xl hover:bg-amber-50"
            }`}
          >
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> 前大会の記録を見る
            </span>
            <ChevronRight
              size={16}
              className={`text-amber-400 transition-transform duration-300 ${
                isPrevCardOpen ? "rotate-90" : ""
              }`}
            />
          </button>

          {isPrevCardOpen && (
            <div className="bg-amber-50/30 border border-t-0 border-amber-200 p-5 rounded-b-2xl space-y-3 animate-in slide-in-from-top-2">
              {/* 大会名・種目 */}
              <div className="flex items-center justify-between gap-2">
                <p className="font-black text-xs text-slate-700 truncate">
                  {tournaments.find((t) => t.id === prevCard.tournamentId)?.name ?? "大会名不明"}
                </p>
                <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                  {prevCard.raceType} {prevCard.distance || prevCard.ekidenDistance}
                </span>
              </div>

              {/* 結果タイム */}
              {prevCard.resultTime && (
                <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                  <Timer size={12} className="text-blue-500 flex-shrink-0" />
                  <span className="text-[10px] font-black text-slate-500">結果</span>
                  <span className="font-black text-sm text-slate-800 ml-auto">
                    {prevCard.resultTime}
                  </span>
                </div>
              )}

              {/* コンディション */}
              {prevCard.condition > 0 && (
                <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                  <span className="text-[10px] font-black text-slate-500">コンディション</span>
                  <span className="ml-auto font-black text-base text-amber-400">
                    {"★".repeat(prevCard.condition)}
                    <span className="text-slate-200">{"★".repeat(5 - prevCard.condition)}</span>
                  </span>
                </div>
              )}

              {/* 前回の課題 */}
              {prevCard.issues && (
                <div className="bg-white rounded-xl px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    前回の課題
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {prevCard.issues}
                  </p>
                </div>
              )}

              {/* 前回立てた目標 */}
              {prevCard.nextGoal && (
                <div className="bg-white rounded-xl px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    前回立てた目標
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {prevCard.nextGoal}
                  </p>
                </div>
              )}

              {/* 監督コメント（前回分） */}
              {prevCard.coachFeedback && (
                <div className="bg-indigo-50 rounded-xl px-3 py-2.5 space-y-1">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    前回の監督コメント
                  </p>
                  <p className="text-xs text-indigo-700 leading-relaxed whitespace-pre-wrap">
                    {prevCard.coachFeedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 戻るボタンとタイトル */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setView("race")}
          className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h3 className="font-black uppercase text-[10px] tracking-widest text-slate-400 text-center tracking-[0.3em]">
          {editingRaceCardId ? "Edit Race Card" : "New Race Card"}
        </h3>
        <div className="w-9" />
      </div>

      {/* 種目選択 */}
      <div className="space-y-4 bg-slate-50 p-5 rounded-3xl border border-slate-100">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">
              区分
            </label>
            <select
              className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500"
              value={raceCardInput.raceType}
              onChange={(e) =>
                setRaceCardInput({
                  ...raceCardInput,
                  raceType: e.target.value,
                  // 区分を変えたら、自動的にその区分の最初の種目にセット
                  distance: RACE_DISTANCES[e.target.value][0],
                  // リセット
                  ekidenDistance: "",
                })
              }
            >
              {Object.values(RACE_TYPES).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase">
              種目/区間
            </label>
            <select
              className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500"
              value={raceCardInput.distance}
              onChange={(e) =>
                setRaceCardInput({
                  ...raceCardInput,
                  distance: e.target.value,
                  // 「その他」を選んだ瞬間に詳細枠をリセット
                  ekidenDistance:
                    e.target.value === "その他"
                      ? ""
                      : raceCardInput.ekidenDistance,
                })
              }
            >
              {RACE_DISTANCES[raceCardInput.raceType].map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(raceCardInput.raceType === RACE_TYPES.EKIDEN ||
          raceCardInput.distance === "その他") && (
          <div className="space-y-1 animate-in fade-in">
            <label className="text-[10px] font-black text-slate-400 uppercase">
              {raceCardInput.distance === "その他"
                ? "種目名 (手入力)"
                : "区間距離 (km)"}
            </label>
            <input
              type="text"
              placeholder={
                raceCardInput.distance === "その他"
                  ? "例: 100m、走幅跳など"
                  : "例: 3.0"
              }
              className="w-full p-3 bg-white rounded-xl font-bold text-sm outline-none focus:ring-2 ring-blue-500 border border-slate-100"
              value={raceCardInput.ekidenDistance} // 保存場所は ekidenDistance をそのまま再利用します
              onChange={(e) =>
                setRaceCardInput({
                  ...raceCardInput,
                  ekidenDistance: e.target.value,
                })
              }
            />
          </div>
        )}
      </div>

      {/* 出場日・スタート時刻 */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
            <Calendar size={12} className="text-indigo-400" /> 出場日
          </label>
          <input
            type="date"
            // 値がない時は、自動的にその大会の開始日(startDate)をセットしてあげる親切設計！
            value={
              raceCardInput.date || (currentTour ? currentTour.startDate : "")
            }
            onChange={(e) =>
              setRaceCardInput({
                ...raceCardInput,
                date: e.target.value,
              })
            }
            className="w-full p-4 bg-indigo-50/30 rounded-2xl font-black text-sm text-indigo-700 outline-none border border-indigo-100 focus:border-indigo-400 shadow-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1">
            <Timer size={12} className="text-indigo-400" /> スタート予定
          </label>
          <input
            type="time"
            value={raceCardInput.startTime || ""}
            onChange={(e) =>
              setRaceCardInput({
                ...raceCardInput,
                startTime: e.target.value,
              })
            }
            className="w-full p-4 bg-indigo-50/30 rounded-2xl font-black text-xl text-indigo-700 outline-none border border-indigo-100 focus:border-indigo-400 text-center shadow-sm"
          />
        </div>
      </div>
      <p className="text-[9px] text-center text-slate-400 font-bold mt-1">
        ※この時刻から逆算してW-upを計画しましょう
      </p>

      {/* レース前 */}
      <div className="space-y-4">
        <h4 className="font-black text-sm text-amber-600 flex items-center gap-2 border-b border-amber-100 pb-2">
          <Target size={18} /> レース前
        </h4>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">
            目標タイム
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="例: 15.20.00"
            className="w-full p-3 bg-amber-50/50 rounded-xl font-black text-lg text-slate-700 outline-none border border-amber-100 focus:border-amber-400 text-center tracking-wider"
            value={raceCardInput.targetTime || ""}
            onChange={(e) =>
              setRaceCardInput({
                ...raceCardInput,
                targetTime: formatTimeInput(e.target.value),
              })
            }
          />
        </div>
        <div className="space-y-2 pt-2">
          <label className="text-[10px] font-black text-slate-400 uppercase">
            PEAKING
          </label>
          <div className="flex gap-2">
            {[
              {
                val: 1,
                en: "BAD",
                jp: "不調",
                textCol: "text-slate-500",
                activeBg: "bg-slate-600",
                activeBorder: "border-slate-600",
              },
              {
                val: 2,
                en: "POOR",
                jp: "いまいち",
                textCol: "text-orange-500",
                activeBg: "bg-orange-500",
                activeBorder: "border-orange-500",
              },
              {
                val: 3,
                en: "FAIR",
                jp: "普通",
                textCol: "text-emerald-500",
                activeBg: "bg-emerald-500",
                activeBorder: "border-emerald-500",
              },
              {
                val: 4,
                en: "GOOD",
                jp: "好調",
                textCol: "text-blue-500",
                activeBg: "bg-blue-500",
                activeBorder: "border-blue-500",
              },
              {
                val: 5,
                en: "PEAK",
                jp: "絶好調",
                textCol: "text-indigo-600",
                activeBg: "bg-indigo-600",
                activeBorder: "border-indigo-600",
              },
            ].map((item) => {
              const isSelected = raceCardInput.condition === item.val;
              return (
                <button
                  key={item.val}
                  onClick={() =>
                    setRaceCardInput({
                      ...raceCardInput,
                      condition: item.val,
                    })
                  }
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? `${item.activeBg} ${item.activeBorder} text-white shadow-md transform scale-105`
                      : `bg-white border-slate-100 hover:border-slate-300`
                  }`}
                >
                  <span
                    className={`text-[10px] font-black tracking-wider ${isSelected ? "text-white" : item.textCol}`}
                  >
                    {item.en}
                  </span>
                  <span
                    className={`text-[8px] font-bold mt-0.5 ${isSelected ? "text-white/80" : "text-slate-400"}`}
                  >
                    {item.jp}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-black text-slate-400 uppercase">
              W-up計画
            </label>
            <button
              type="button"
              onClick={() => {
                const template =
                  "・60分前：ジョグ (15分)\n・40分前：体操・ドリル\n・25分前：流し (100m×3本)\n・15分前：招集・スパイク履き替え\n・ 5分前：50mD";
                if (
                  !raceCardInput.wupPlan ||
                  window.confirm("入力内容をテンプレートで上書きしますか？")
                ) {
                  setRaceCardInput({
                    ...raceCardInput,
                    wupPlan: template,
                  });
                }
              }}
              className="text-[9px] bg-amber-100/80 text-amber-700 px-2 py-1.5 rounded-lg font-bold active:scale-95 transition-all flex items-center gap-1 shadow-sm"
            >
              <Edit size={10} /> テンプレート
            </button>
          </div>
          <textarea
            placeholder={`以下の例を使用したい場合は「テンプレート」をタップ。\n・60分前：ジョグ (15分)\n・40分前：体操・ドリル\n・25分前：流し (100m×3本)\n・15分前：招集・スパイク履き替え\n・ 5分前：50mD`}
            className="w-full p-4 bg-amber-50/50 rounded-xl font-bold text-xs outline-none border border-amber-100 focus:border-amber-400 h-36 resize-none leading-relaxed tracking-wide"
            value={raceCardInput.wupPlan}
            onChange={(e) =>
              setRaceCardInput({ ...raceCardInput, wupPlan: e.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">
            レースプラン・意識すること
          </label>
          <textarea
            placeholder="例: 最初の入りは積極的に、3000mから粘る"
            className="w-full p-4 bg-amber-50/50 rounded-xl font-bold text-xs outline-none border border-amber-100 focus:border-amber-400 h-24 resize-none"
            value={raceCardInput.racePlan}
            onChange={(e) =>
              setRaceCardInput({ ...raceCardInput, racePlan: e.target.value })
            }
          />
        </div>
      </div>

      {/* 当日入力 */}
      <div className="space-y-4 pt-4">
        <h4 className="font-black text-sm text-slate-600 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Cloud size={18} /> CONDITION
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400">天気</label>
            <select
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none"
              value={raceCardInput.weather}
              onChange={(e) =>
                setRaceCardInput({ ...raceCardInput, weather: e.target.value })
              }
            >
              {["晴れ", "曇り", "小雨", "本降り", "雪"].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400">風</label>
            <select
              className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none"
              value={raceCardInput.wind}
              onChange={(e) =>
                setRaceCardInput({ ...raceCardInput, wind: e.target.value })
              }
            >
              {["無風", "弱風", "強風"].map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 flex items-center bg-slate-50 rounded-xl px-3 border border-slate-100">
            <Thermometer size={14} className="text-rose-400" />
            <input
              type="number"
              placeholder="気温"
              className="w-full p-2 bg-transparent font-bold text-sm outline-none text-right"
              value={raceCardInput.temp}
              onChange={(e) =>
                setRaceCardInput({ ...raceCardInput, temp: e.target.value })
              }
            />
            <span className="text-xs font-bold text-slate-400 ml-1">℃</span>
          </div>
          <div className="space-y-1 flex items-center bg-slate-50 rounded-xl px-3 border border-slate-100">
            <Droplets size={14} className="text-blue-400" />
            <input
              type="number"
              placeholder="湿度"
              className="w-full p-2 bg-transparent font-bold text-sm outline-none text-right"
              value={raceCardInput.humidity}
              onChange={(e) =>
                setRaceCardInput({ ...raceCardInput, humidity: e.target.value })
              }
            />
            <span className="text-xs font-bold text-slate-400 ml-1">%</span>
          </div>
        </div>
      </div>

      {/* レース後 */}
      <div className="space-y-4 pt-4">
        <h4 className="font-black text-sm text-indigo-600 flex items-center gap-2 border-b border-indigo-100 pb-2">
          <Timer size={18} /> レース後
        </h4>

        {/* Race Status */}
        <div className="space-y-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Race Status
            </label>
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200">
              {[
                { id: "finish", label: "Finish", color: "text-emerald-600" },
                { id: "dns", label: "DNS", color: "text-rose-500" },
                { id: "dnf", label: "DNF", color: "text-amber-600" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setRaceCardInput({ ...raceCardInput, status: s.id })
                  }
                  className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${
                    (raceCardInput.status || "finish") === s.id
                      ? "bg-slate-800 text-white shadow-sm"
                      : `bg-transparent text-slate-400 hover:bg-slate-50`
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* DNS：理由選択 */}
          {raceCardInput.status === "dns" && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-rose-500 flex items-center gap-1">
                DNS REASON (欠場理由)
              </label>
              <div className="flex flex-wrap gap-2">
                {["体調不良", "故障", "家事都合", "その他"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() =>
                      setRaceCardInput({ ...raceCardInput, dnsReason: reason })
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      raceCardInput.dnsReason === reason
                        ? "bg-rose-500 text-white shadow-md scale-105"
                        : "bg-white text-rose-400 border border-rose-200 hover:bg-rose-50"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DNF：棄権地点 */}
          {raceCardInput.status === "dnf" && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black text-amber-500 flex items-center gap-1">
                DNF POINT (途中棄権地点)
              </label>
              <input
                type="text"
                placeholder="例：3000m地点、2区5km地点など"
                className="w-full p-4 bg-white rounded-2xl font-bold text-sm outline-none border border-amber-200 focus:border-amber-400 transition-all"
                value={raceCardInput.dnfPoint || ""}
                onChange={(e) =>
                  setRaceCardInput({
                    ...raceCardInput,
                    dnfPoint: e.target.value,
                  })
                }
              />
            </div>
          )}
        </div>

        {/* 統合版！RESULT & LAP TIMES (DNSの時は非表示) */}
        {raceCardInput.status !== "dns" && (
          <div className="space-y-3 animate-in slide-in-from-top-2 pt-2">
            <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
              <Timer size={12} /> Result & Lap Times
            </label>

            {/* 「その他」の場合は自由記述に切り替える */}
            {raceCardInput.distance === "その他" ? (
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-4">
                <p className="text-[10px] font-bold text-slate-400 px-1">
                  💡
                  自由記述形式です。試技の記録やラップを自由に文字で入力してください。
                </p>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 ml-1">
                    LAP / 試技記録など
                  </label>
                  <textarea
                    className="w-full p-4 bg-white rounded-2xl font-mono text-sm outline-none border border-slate-200 focus:border-indigo-400 min-h-[120px] resize-none"
                    placeholder={`例:\n1本目: 6m50\n2本目: F\n3本目: 6m80`}
                    value={raceCardInput.lapTimes || ""}
                    onChange={(e) =>
                      setRaceCardInput((prev) => ({
                        ...prev,
                        lapTimes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 ml-1">
                    Official Result
                  </label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white rounded-2xl font-black text-xl text-indigo-600 outline-none border border-slate-200 focus:border-indigo-400"
                    placeholder="例: 6m80, 11.50"
                    value={raceCardInput.resultTime || ""}
                    onChange={(e) =>
                      setRaceCardInput((prev) => ({
                        ...prev,
                        resultTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ) : (
              /* それ以外（長距離・中距離・駅伝）の時はSmartLapInputを表示 */
              <SmartLapInput
                value={raceCardInput.lapTimes || ""}
                resultValue={raceCardInput.resultTime || ""}
                onChange={(newValue) =>
                  setRaceCardInput((prev) => ({ ...prev, lapTimes: newValue }))
                }
                onResultChange={(newResult) =>
                  setRaceCardInput((prev) => ({
                    ...prev,
                    resultTime: newResult,
                  }))
                }
                raceType={raceCardInput.raceType}
                distance={
                  raceCardInput.raceType === "駅伝"
                    ? raceCardInput.ekidenDistance
                    : raceCardInput.distance
                }
              />
            )}
          </div>
        )}

        {/* 達成バッジ選択機能 */}
        <div className="space-y-3 pt-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <Award size={12} /> Achievements (達成バッジ)
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "自己ベスト", color: "bg-orange-500" },
              { label: "組1位", color: "bg-blue-500" },
              { label: "県大会出場！", color: "bg-emerald-500" },
            ].map((b) => (
              <button
                key={b.label}
                type="button"
                onClick={() => {
                  const currentBadges = raceCardInput.badges || [];
                  const nextBadges = currentBadges.includes(b.label)
                    ? currentBadges.filter((item) => item !== b.label)
                    : [...currentBadges, b.label];
                  setRaceCardInput({ ...raceCardInput, badges: nextBadges });
                }}
                className={`px-4 py-2 rounded-full text-[10px] font-black transition-all ${
                  (raceCardInput.badges || []).includes(b.label)
                    ? `${b.color} text-white shadow-md scale-105`
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* 振り返りテキストエリア群 */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">
            良かった点・収穫
          </label>
          <textarea
            className="w-full p-4 bg-indigo-50/50 rounded-xl font-bold text-xs outline-none border border-indigo-100 focus:border-indigo-400 h-24 resize-none"
            value={raceCardInput.goodPoints}
            onChange={(e) =>
              setRaceCardInput({ ...raceCardInput, goodPoints: e.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">
            課題・反省点
          </label>
          <textarea
            className="w-full p-4 bg-indigo-50/50 rounded-xl font-bold text-xs outline-none border border-indigo-100 focus:border-indigo-400 h-24 resize-none"
            value={raceCardInput.issues}
            onChange={(e) =>
              setRaceCardInput({ ...raceCardInput, issues: e.target.value })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
            <Users size={12} /> 仲間の良かった点
          </label>
          <textarea
            placeholder="〇〇先輩のラストスパートが凄かった！自分もあんな風に..."
            className="w-full p-4 bg-emerald-50/50 rounded-xl font-bold text-xs outline-none border border-emerald-100 focus:border-emerald-400 h-20 resize-none"
            value={raceCardInput.teammateGoodPoints}
            onChange={(e) =>
              setRaceCardInput({
                ...raceCardInput,
                teammateGoodPoints: e.target.value,
              })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase">
            次に向けての目標
          </label>
          <textarea
            className="w-full p-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border border-slate-200 focus:border-slate-400 h-20 resize-none"
            value={raceCardInput.nextGoal}
            onChange={(e) =>
              setRaceCardInput({ ...raceCardInput, nextGoal: e.target.value })
            }
          />
        </div>
      </div>

      {/* 保存ボタン */}
      <div className="pt-4 space-y-3">
        <button
          onClick={handleSaveRaceCard}
          disabled={isSubmitting}
          className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all ${
            isSubmitting
              ? "bg-slate-300 text-white"
              : "bg-slate-900 text-white active:scale-95"
          }`}
        >
          <Save size={20} />{" "}
          {editingRaceCardId ? "シートを更新する" : "シートを作成する"}
        </button>
        {editingRaceCardId && (
          <button
            onClick={() => handleDeleteRaceCard(editingRaceCardId)}
            className="w-full py-4 text-rose-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-50 rounded-2xl transition-colors"
          >
            <Trash2 size={16} /> このシートを削除
          </button>
        )}
      </div>
    </div>
  );
};

export default RaceCardEntry;
