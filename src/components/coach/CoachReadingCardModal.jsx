/*
 * CoachReadingCardModal — 選手レースカードの閲覧・添削モーダル（表示専用）
 *
 * CoachView から selectedTourId の全画面モーダルを分離。大会ごとの提出カード一覧、
 * カード詳細（PRE/CONDITION/POST・LAP）の閲覧、コーチフィードバック入力、
 * 大会変更・カード修正サブモーダルを含む。状態・ハンドラは CoachView 側に残し
 * props で受け取る（挙動は従来と同一）。
 */
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  X,
  Edit,
  Target,
  Timer,
  Cloud,
  Thermometer,
  Droplets,
  Flag,
  Users,
  MessageSquare,
  Save,
  CheckSquare,
  Square,
  ClipboardCheck,
  Check,
} from "lucide-react";
import { updateDoc } from "firebase/firestore";
import { docRef } from "../../utils/firestore";
import { analyzeLaps } from "../../utils/lapUtils";

const CoachReadingCardModal = ({
  selectedTourId,
  setSelectedTourId,
  tournaments,
  raceCards,
  onlyPendingFeedback,
  setOnlyPendingFeedback,
  readingCard,
  setReadingCard,
  readingNavIds,
  setReadingNavIds,
  isReassigningCard,
  setIsReassigningCard,
  reassignTourId,
  setReassignTourId,
  isEditingReadingCard,
  setIsEditingReadingCard,
  readingCardEditInput,
  setReadingCardEditInput,
  coachFeedbackInput,
  setCoachFeedbackInput,
  isSubmitting,
  handleSaveRaceCardFeedback,
  setEditingLapCard,
  setLapInput,
}) => {
          const currentTour = tournaments.find((t) => t.id === selectedTourId);
          const allSubmittedCards = raceCards.filter(
            (c) => c.tournamentId === selectedTourId,
          );
          const submittedCards = onlyPendingFeedback
            ? allSubmittedCards.filter((c) => !c.coachFeedback && !c.feedbackSkipped)
            : allSubmittedCards;

          // ナビ用フラットリスト（一覧と同じ日付昇順・距離昇順）
          const distToM = (card) => {
            const d = card.raceType === "駅伝" || card.distance === "その他"
              ? card.ekidenDistance : card.distance;
            if (!d) return 99999;
            const km = d.match(/^([\d.]+)km$/i);
            if (km) return parseFloat(km[1]) * 1000;
            const m = d.match(/^([\d.]+)m/i);
            if (m) return parseFloat(m[1]);
            return 99999;
          };
          const cardsByDate = submittedCards.reduce((acc, card) => {
            const d = card.date || currentTour?.startDate || "日付不明";
            if (!acc[d]) acc[d] = [];
            acc[d].push(card);
            return acc;
          }, {});
          const liveFlatCards = Object.keys(cardsByDate).sort().flatMap((d) =>
            [...cardsByDate[d]].sort((a, b) => distToM(a) - distToM(b))
          );
          // カードを開いている間は開いた時点の並びを使う
          // （FB未入力のみ表示中にFBを送信してもカード送りの位置が崩れない）
          const flatCards =
            readingCard && readingNavIds
              ? readingNavIds
                  .map((id) => allSubmittedCards.find((c) => c.id === id))
                  .filter(Boolean)
              : liveFlatCards;
          const currentIdx = readingCard ? flatCards.findIndex((c) => c.id === readingCard.id) : -1;
          const prevCard = currentIdx > 0 ? flatCards[currentIdx - 1] : null;
          const nextCard = currentIdx < flatCards.length - 1 ? flatCards[currentIdx + 1] : null;

          const goToCard = (card) => {
            setReadingCard(card);
            setCoachFeedbackInput(card.coachFeedback || "");
            setIsReassigningCard(false);
            setReassignTourId("");
            setIsEditingReadingCard(false);
          };

          return (
            <>
            <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col animate-in slide-in-from-bottom-4">
              <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md pt-12 pb-4">
                {readingCard ? (
                  <>
                    <button
                      onClick={() => { setReadingCard(null); setReadingNavIds(null); setIsReassigningCard(false); setReassignTourId(""); setIsEditingReadingCard(false); }}
                      className="flex items-center gap-1 text-[11px] font-black text-slate-300 hover:text-white transition-colors px-2 py-1.5 rounded-xl hover:bg-white/10"
                    >
                      <ArrowLeft size={14} /> 一覧
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => prevCard && goToCard(prevCard)}
                        disabled={!prevCard}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors disabled:opacity-30"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="text-center min-w-[120px]">
                        <p className="font-black text-sm leading-tight">{readingCard.runnerName}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{currentIdx + 1} / {flatCards.length}</p>
                      </div>
                      <button
                        onClick={() => nextCard && goToCard(nextCard)}
                        disabled={!nextCard}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors disabled:opacity-30"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <div className="w-16" />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setSelectedTourId(null);
                        setReadingCard(null);
                        setOnlyPendingFeedback(false);
                      }}
                      className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="text-center">
                      <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Submitted Cards</p>
                      <h2 className="font-bold text-sm">{currentTour?.name}</h2>
                      {onlyPendingFeedback && (
                        <button
                          onClick={() => setOnlyPendingFeedback(false)}
                          className="mt-1 text-[9px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 mx-auto"
                        >
                          FB未入力のみ <X size={10} />
                        </button>
                      )}
                    </div>
                    <div className="w-10" />
                  </>
                )}
              </div>

              {readingCard ? (
                <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-6">

                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Runner
                      </p>
                      <h3 className="text-2xl font-black text-slate-800">
                        {readingCard.runnerName}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-black text-white bg-slate-800 px-2 py-1 rounded-lg">
                          {readingCard.raceType}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {readingCard.distance === "その他"
                            ? readingCard.ekidenDistance
                            : readingCard.raceType === "駅伝"
                              ? `${readingCard.distance} (${readingCard.ekidenDistance}km)`
                              : readingCard.distance}
                        </span>
                      </div>
                      {/* 大会変更 */}
                      <div className="mt-3">
                        {isReassigningCard ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={reassignTourId}
                              onChange={(e) => setReassignTourId(e.target.value)}
                              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-400"
                            >
                              <option value="">大会を選択...</option>
                              {tournaments
                                .filter((t) => t.id !== readingCard.tournamentId)
                                .sort((a, b) => a.startDate < b.startDate ? 1 : -1)
                                .map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}（{t.startDate.replace(/-/g, "/")}）
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={async () => {
                                if (!reassignTourId) return;
                                await updateDoc(docRef("raceCards", readingCard.id), {
                                  tournamentId: reassignTourId,
                                  updatedAt: new Date().toISOString(),
                                  updatedBy: "coach",
                                });
                                setReadingCard(null);
                                setReadingNavIds(null);
                                setIsReassigningCard(false);
                                setReassignTourId("");
                              }}
                              disabled={!reassignTourId}
                              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-black disabled:opacity-40 hover:bg-blue-700 active:scale-95 transition-all"
                            >
                              移動
                            </button>
                            <button
                              onClick={() => { setIsReassigningCard(false); setReassignTourId(""); }}
                              className="px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-black hover:bg-slate-200 active:scale-95 transition-all"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => { setIsReassigningCard(true); setReassignTourId(""); }}
                              className="text-[10px] font-black text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                            >
                              <Edit size={11} /> 別の大会に移動する
                            </button>
                            <button
                              onClick={() => {
                                setReadingCardEditInput({
                                  date: readingCard.date || "",
                                  status: readingCard.status || "finish",
                                  dnsReason: readingCard.dnsReason || "",
                                  dnfPoint: readingCard.dnfPoint || "",
                                  resultTime: readingCard.resultTime || "",
                                  lapTimes: readingCard.lapTimes || "",
                                  targetTime: readingCard.targetTime || "",
                                  racePlan: readingCard.racePlan || "",
                                  wupPlan: readingCard.wupPlan || "",
                                  goodPoints: readingCard.goodPoints || "",
                                  issues: readingCard.issues || "",
                                  teammateGoodPoints: readingCard.teammateGoodPoints || "",
                                  nextGoal: readingCard.nextGoal || "",
                                  badges: readingCard.badges || [],
                                });
                                setIsEditingReadingCard(true);
                              }}
                              className="text-[10px] font-black text-slate-400 hover:text-orange-500 flex items-center gap-1 transition-colors"
                            >
                              <Edit size={11} /> カードを修正する
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 space-y-4">
                        <h4 className="font-black text-sm text-amber-600 flex items-center gap-2 border-b border-amber-200/50 pb-2">
                          <Target size={16} /> PRE-RACE (レース前)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-amber-600">
                              目標タイム
                            </p>
                            <p className="font-black text-lg text-slate-700 mt-1">
                              {readingCard.targetTime || "未設定"}
                            </p>
                          </div>
                          {readingCard.startTime && (
                            <div>
                              <p className="text-[10px] font-black text-amber-600">
                                スタート予定
                              </p>
                              <p className="font-bold text-slate-700 mt-1 flex items-center gap-1">
                                <Timer size={14} /> {readingCard.startTime}
                              </p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <p className="text-[10px] font-black text-amber-600">
                              コンディション (調子)
                            </p>
                            <p className="font-bold text-slate-700 mt-1">
                              {readingCard.condition === 1
                                ? "BAD (不調)"
                                : readingCard.condition === 2
                                  ? "POOR (いまいち)"
                                  : readingCard.condition === 3
                                    ? "FAIR (普通)"
                                    : readingCard.condition === 4
                                      ? "GOOD (好調)"
                                      : readingCard.condition === 5
                                        ? "PEAK (絶好調)"
                                        : "未選択"}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-600">
                            W-UP計画
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-amber-100/50">
                            {readingCard.wupPlan || "未記入"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-amber-600">
                            レースプラン
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-amber-100/50">
                            {readingCard.racePlan || "未記入"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="font-black text-sm text-slate-500 flex items-center gap-2 border-b border-slate-200 pb-2">
                          <Cloud size={16} /> CONDITION (気象条件)
                        </h4>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 mb-1">
                              天気
                            </p>
                            <p className="font-bold text-sm text-slate-700">
                              {readingCard.weather || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 mb-1">
                              風
                            </p>
                            <p className="font-bold text-sm text-slate-700">
                              {readingCard.wind || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 flex justify-center items-center gap-0.5 mb-1">
                              <Thermometer
                                size={10}
                                className="text-rose-400"
                              />
                              気温
                            </p>
                            <p className="font-bold text-sm text-slate-700">
                              {readingCard.temp ? `${readingCard.temp}℃` : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 flex justify-center items-center gap-0.5 mb-1">
                              <Droplets size={10} className="text-blue-400" />
                              湿度
                            </p>
                            <p className="font-bold text-sm text-slate-700">
                              {readingCard.humidity
                                ? `${readingCard.humidity}%`
                                : "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-4">
                        <h4 className="font-black text-sm text-indigo-600 flex items-center gap-2 border-b border-indigo-200/50 pb-2">
                          <Flag size={16} /> POST-RACE (レース後)
                        </h4>
                        {readingCard.badges?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {readingCard.badges.map((badge) => (
                              <span
                                key={badge}
                                className={`px-3 py-1 rounded-full text-[10px] font-black text-white ${badge === "自己ベスト" ? "bg-orange-500" : badge === "組1位" ? "bg-blue-500" : "bg-emerald-500"}`}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        )}
                        <div>
                          {readingCard.status === "dns" ? (
                            <>
                              <p className="text-[10px] font-black text-rose-500">
                                レース結果
                              </p>
                              <p className="font-black text-2xl text-rose-500 mt-1">
                                DNS（欠場）
                              </p>
                              {readingCard.dnsReason && (
                                <p className="text-xs font-bold text-rose-400 mt-1">
                                  理由：{readingCard.dnsReason}
                                </p>
                              )}
                            </>
                          ) : readingCard.status === "dnf" ? (
                            <>
                              <p className="text-[10px] font-black text-amber-600">
                                レース結果
                              </p>
                              <p className="font-black text-2xl text-amber-600 mt-1">
                                DNF（途中棄権）
                              </p>
                              {readingCard.dnfPoint && (
                                <p className="text-xs font-bold text-amber-500 mt-1">
                                  棄権地点：{readingCard.dnfPoint}
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-[10px] font-black text-indigo-600">
                                実際のタイム (Result)
                              </p>
                              <p className="font-black text-2xl text-indigo-600 mt-1">
                                {readingCard.resultTime || "未入力"}
                              </p>
                            </>
                          )}
                        </div>

                        {readingCard.lapTimes &&
                          (() => {
                            const analysis = analyzeLaps(
                              readingCard.lapTimes,
                              readingCard.raceType,
                              readingCard.distance,
                              readingCard.ekidenDistance,
                            );
                            return (
                              <div>
                                <p className="text-[10px] font-black text-indigo-600 mb-1">
                                  ラップタイム
                                </p>
                                <div className="bg-white p-3 rounded-xl border border-indigo-100/50 flex flex-col gap-0.5">
                                  {analysis && analysis.formattedLines
                                    ? analysis.formattedLines.map(
                                        (lap, idx) => (
                                          <span
                                            key={idx}
                                            className={`text-xs font-mono font-bold block tracking-tight ${
                                              lap.startsWith("AVG")
                                                ? "text-indigo-500 mt-1"
                                                : "text-slate-700"
                                            }`}
                                          >
                                            {lap}
                                          </span>
                                        ),
                                      )
                                    : readingCard.lapTimes
                                        .split(/\n/)
                                        .map((lap, idx) => (
                                          <span
                                            key={idx}
                                            className="text-xs font-mono text-slate-700 font-bold block tracking-tight"
                                          >
                                            {lap}
                                          </span>
                                        ))}
                                </div>
                              </div>
                            );
                          })()}

                        <button
                          onClick={() => {
                            setEditingLapCard(readingCard);
                            setLapInput(readingCard.lapTimes || "");
                          }}
                          className="mt-3 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1 w-full hover:bg-indigo-200"
                        >
                          <Timer size={14} /> LAPタイムを入力・編集する
                        </button>
                        <div>
                          <p className="text-[10px] font-black text-indigo-600">
                            良かった点・収穫
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100/50">
                            {readingCard.goodPoints || "未入力"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-indigo-600">
                            課題・反省点
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-indigo-100/50">
                            {readingCard.issues || "未入力"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                            <Users size={12} /> 仲間の良かった点・学んだこと
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-emerald-100/50">
                            {readingCard.teammateGoodPoints || "未入力"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                            <Target size={12} /> 次に向けての目標
                          </p>
                          <p className="font-bold text-slate-700 text-sm whitespace-pre-wrap mt-1 leading-relaxed bg-white p-3 rounded-xl border border-emerald-100/50">
                            {readingCard.nextGoal || "未入力"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`lg:hidden p-5 rounded-2xl border space-y-3 mt-4 ${readingCard.coachFeedback ? "bg-indigo-600 border-indigo-700" : "bg-indigo-50 border-indigo-200"}`}
                      >
                        <h4
                          className={`font-black text-sm flex items-center justify-between border-b pb-2 ${readingCard.coachFeedback ? "text-white border-indigo-500" : "text-indigo-700 border-indigo-200/50"}`}
                        >
                          <span className="flex items-center gap-2">
                            <MessageSquare size={16} /> Coach Feedback
                          </span>
                          {readingCard.coachFeedback && (
                            <span className="text-[9px] font-black bg-white/20 text-white px-2 py-1 rounded-lg">
                              送信済み
                            </span>
                          )}
                        </h4>
                        <textarea
                          value={coachFeedbackInput}
                          onChange={(e) =>
                            setCoachFeedbackInput(e.target.value)
                          }
                          placeholder="選手へのアドバイスや労いの言葉を入力..."
                          className={`w-full p-4 rounded-xl font-bold text-sm outline-none border h-24 resize-none ${readingCard.coachFeedback ? "bg-white/10 border-indigo-400 text-white placeholder:text-indigo-300 focus:border-white" : "bg-white border-indigo-200 focus:border-indigo-400"}`}
                        />
                        <button
                          onClick={() => {
                            handleSaveRaceCardFeedback(
                              readingCard.id,
                              coachFeedbackInput,
                            );
                            setReadingCard({
                              ...readingCard,
                              coachFeedback: coachFeedbackInput,
                            });
                          }}
                          disabled={isSubmitting}
                          className={`w-full py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 ${readingCard.coachFeedback ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white"}`}
                        >
                          <Save size={16} />{" "}
                          {readingCard.coachFeedback
                            ? "フィードバックを更新"
                            : "フィードバックを送信"}
                        </button>
                        <button
                          onClick={async () => {
                            const next = !readingCard.feedbackSkipped;
                            await updateDoc(
                              docRef("raceCards", readingCard.id),
                              {
                                feedbackSkipped: next,
                                updatedAt: new Date().toISOString(),
                                updatedBy: "coach",
                              },
                            );
                            setReadingCard({
                              ...readingCard,
                              feedbackSkipped: next,
                            });
                          }}
                          className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${readingCard.feedbackSkipped ? "bg-slate-700 text-white" : "bg-white/60 text-slate-500 border border-slate-200 hover:bg-white"}`}
                        >
                          {readingCard.feedbackSkipped ? (
                            <CheckSquare size={14} />
                          ) : (
                            <Square size={14} />
                          )}
                          フィードバック不要にする
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* 右ペイン: Coach Feedback（PC専用） */}
                <div className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 border-l border-slate-200 bg-white overflow-y-auto p-6 space-y-4">
                  <div className="border-b border-slate-100 pb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Coach Feedback</p>
                    <p className="font-black text-xl text-slate-800 mt-1">{readingCard.runnerName}</p>
                  </div>
                  <div className={`p-5 rounded-2xl border space-y-3 ${readingCard.coachFeedback ? "bg-indigo-600 border-indigo-700" : "bg-indigo-50 border-indigo-200"}`}>
                    <h4 className={`font-black text-sm flex items-center justify-between border-b pb-2 ${readingCard.coachFeedback ? "text-white border-indigo-500" : "text-indigo-700 border-indigo-200/50"}`}>
                      <span className="flex items-center gap-2">
                        <MessageSquare size={16} /> Coach Feedback
                      </span>
                      {readingCard.coachFeedback && (
                        <span className="text-[9px] font-black bg-white/20 text-white px-2 py-1 rounded-lg">送信済み</span>
                      )}
                    </h4>
                    <textarea
                      value={coachFeedbackInput}
                      onChange={(e) => setCoachFeedbackInput(e.target.value)}
                      placeholder="選手へのアドバイスや労いの言葉を入力..."
                      className={`w-full p-4 rounded-xl font-bold text-sm outline-none border h-48 resize-none ${readingCard.coachFeedback ? "bg-white/10 border-indigo-400 text-white placeholder:text-indigo-300 focus:border-white" : "bg-white border-indigo-200 focus:border-indigo-400"}`}
                    />
                    <button
                      onClick={() => {
                        handleSaveRaceCardFeedback(readingCard.id, coachFeedbackInput);
                        setReadingCard({ ...readingCard, coachFeedback: coachFeedbackInput });
                      }}
                      disabled={isSubmitting}
                      className={`w-full py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 ${readingCard.coachFeedback ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white"}`}
                    >
                      <Save size={16} /> {readingCard.coachFeedback ? "フィードバックを更新" : "フィードバックを送信"}
                    </button>
                    <button
                      onClick={async () => {
                        const next = !readingCard.feedbackSkipped;
                        await updateDoc(docRef("raceCards", readingCard.id), {
                          feedbackSkipped: next,
                          updatedAt: new Date().toISOString(),
                          updatedBy: "coach",
                        });
                        setReadingCard({ ...readingCard, feedbackSkipped: next });
                      }}
                      className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 ${readingCard.feedbackSkipped ? "bg-slate-700 text-white" : "bg-white/60 text-slate-500 border border-slate-200 hover:bg-white"}`}
                    >
                      {readingCard.feedbackSkipped ? <CheckSquare size={14} /> : <Square size={14} />}
                      フィードバック不要にする
                    </button>
                  </div>
                </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-24 bg-slate-50">
                  {submittedCards.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                      <ClipboardCheck
                        size={40}
                        className="mx-auto mb-2 text-slate-400"
                      />
                      <p className="text-xs font-bold text-slate-500">
                        まだ提出されていません
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const cardsByDate = submittedCards.reduce((acc, card) => {
                        const d = card.date || currentTour?.startDate || "日付不明";
                        if (!acc[d]) acc[d] = [];
                        acc[d].push(card);
                        return acc;
                      }, {});
                      const sortedDates = Object.keys(cardsByDate).sort((a, b) => a < b ? -1 : 1);
                      const distToM = (card) => {
                        const d = card.raceType === "駅伝" || card.distance === "その他"
                          ? card.ekidenDistance : card.distance;
                        if (!d) return 99999;
                        const km = d.match(/^([\d.]+)km$/i);
                        if (km) return parseFloat(km[1]) * 1000;
                        const m = d.match(/^([\d.]+)m/i);
                        if (m) return parseFloat(m[1]);
                        return 99999;
                      };
                      return sortedDates.map((dateStr) => (
                        <div key={dateStr} className="space-y-2">
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 pt-2">
                            {dateStr === "日付不明" ? dateStr : dateStr.replace(/-/g, "/")}
                          </p>
                          <div className="lg:grid lg:grid-cols-3 lg:gap-3 space-y-2 lg:space-y-0">
                          {[...cardsByDate[dateStr]].sort((a, b) => distToM(a) - distToM(b)).map((card) => (
                            <div
                              key={card.id}
                              onClick={() => {
                                setReadingNavIds(liveFlatCards.map((c) => c.id));
                                setReadingCard(card);
                                setCoachFeedbackInput(card.coachFeedback || "");
                              }}
                              className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between active:scale-95 transition-all cursor-pointer group hover:border-indigo-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                                  {card.runnerName.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-black text-slate-800">
                                    {card.runnerName}
                                  </h4>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                    {card.raceType} /{" "}
                                    {card.raceType === "駅伝"
                                      ? `${card.distance}(${card.ekidenDistance}km)`
                                      : card.distance}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex flex-col items-end gap-1">
                                  {card.resultTime || card.status === "finish" ? (
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                      Resultあり
                                    </span>
                                  ) : card.status === "dns" ? (
                                    <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                                      DNS
                                    </span>
                                  ) : card.status === "dnf" ? (
                                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                      DNF
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                      レース前
                                    </span>
                                  )}
                                  {card.coachFeedback ? (
                                    <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 flex items-center gap-1">
                                      <MessageSquare size={9} /> FB済
                                    </span>
                                  ) : card.feedbackSkipped ? (
                                    <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                                      <Check size={9} /> FB不要
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 flex items-center gap-1">
                                      <MessageSquare size={9} /> FB未
                                    </span>
                                  )}
                                </div>
                                <ChevronRight
                                  size={16}
                                  className="text-slate-300 group-hover:text-indigo-500 transition-colors"
                                />
                              </div>
                            </div>
                          ))}
                          </div>
                        </div>
                      ));
                    })()
                  )}
                </div>
              )}
            </div>

            {/* カード修正モーダル */}
            {isEditingReadingCard && readingCard && (
              <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-lg max-h-[90dvh] rounded-[2rem] flex flex-col shadow-2xl animate-in zoom-in-95">
                  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カード修正</p>
                      <p className="font-black text-lg text-slate-800">{readingCard.runnerName}</p>
                    </div>
                    <button onClick={() => setIsEditingReadingCard(false)} className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="overflow-y-auto px-6 py-4 space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">レース日</label>
                      <input type="date" value={readingCardEditInput.date} onChange={(e) => setReadingCardEditInput((p) => ({ ...p, date: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">ステータス</label>
                      <div className="flex gap-2">
                        {[{ id: "finish", label: "Finish" }, { id: "dns", label: "DNS" }, { id: "dnf", label: "DNF" }].map((s) => (
                          <button key={s.id} type="button"
                            onClick={() => setReadingCardEditInput((p) => ({ ...p, status: s.id }))}
                            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${(readingCardEditInput.status || "finish") === s.id ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {readingCardEditInput.status === "dns" && (
                        <div className="mt-2">
                          <label className="text-[10px] font-black text-rose-500 block mb-1">欠場理由</label>
                          <div className="flex flex-wrap gap-2">
                            {["体調不良", "故障", "家事都合", "その他"].map((r) => (
                              <button key={r} type="button"
                                onClick={() => setReadingCardEditInput((p) => ({ ...p, dnsReason: r }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${readingCardEditInput.dnsReason === r ? "bg-rose-500 text-white" : "bg-white text-rose-400 border border-rose-200 hover:bg-rose-50"}`}>
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {readingCardEditInput.status === "dnf" && (
                        <div className="mt-2">
                          <label className="text-[10px] font-black text-amber-500 block mb-1">途中棄権地点</label>
                          <input type="text" value={readingCardEditInput.dnfPoint} onChange={(e) => setReadingCardEditInput((p) => ({ ...p, dnfPoint: e.target.value }))} placeholder="例：3000m地点" className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-amber-200 focus:border-amber-400" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">目標タイム</label>
                        <input type="text" value={readingCardEditInput.targetTime} onChange={(e) => setReadingCardEditInput((p) => ({ ...p, targetTime: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">実際のタイム</label>
                        <input type="text" value={readingCardEditInput.resultTime} onChange={(e) => setReadingCardEditInput((p) => ({ ...p, resultTime: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ラップタイム</label>
                      <textarea value={readingCardEditInput.lapTimes} onChange={(e) => setReadingCardEditInput((p) => ({ ...p, lapTimes: e.target.value }))} rows={4} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-mono font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 resize-none" />
                    </div>
                    {[
                      { key: "racePlan", label: "レースプラン" },
                      { key: "wupPlan", label: "W-UP計画" },
                      { key: "goodPoints", label: "良かった点・収穫" },
                      { key: "issues", label: "課題・反省点" },
                      { key: "teammateGoodPoints", label: "仲間の良かった点" },
                      { key: "nextGoal", label: "次に向けての目標" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
                        <textarea value={readingCardEditInput[key]} onChange={(e) => setReadingCardEditInput((p) => ({ ...p, [key]: e.target.value }))} rows={2} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 resize-none" />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">達成バッジ</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "自己ベスト", color: "bg-orange-500" },
                          { label: "組1位", color: "bg-blue-500" },
                          { label: "県大会出場！", color: "bg-emerald-500" },
                        ].map((b) => (
                          <button key={b.label} type="button"
                            onClick={() => setReadingCardEditInput((p) => {
                              const cur = p.badges || [];
                              return { ...p, badges: cur.includes(b.label) ? cur.filter((x) => x !== b.label) : [...cur, b.label] };
                            })}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${(readingCardEditInput.badges || []).includes(b.label) ? `${b.color} text-white shadow-md scale-105` : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
                    <button
                      onClick={async () => {
                        await updateDoc(docRef("raceCards", readingCard.id), {
                          ...readingCardEditInput,
                          updatedAt: new Date().toISOString(),
                          updatedBy: "coach",
                        });
                        setReadingCard({ ...readingCard, ...readingCardEditInput });
                        setIsEditingReadingCard(false);
                      }}
                      className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    >
                      <Save size={16} /> 保存する
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
          );

};

export default CoachReadingCardModal;
