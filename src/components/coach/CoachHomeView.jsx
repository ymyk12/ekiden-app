/*
 * CoachHomeView — 監督ダッシュボードのホーム画面（表示専用）
 *
 * CoachView から coach-home ビューの JSX を分離。日付指定の提出状況・アラート、
 * 最近のアクティビティ、未入力リスト（期間指定＋コピー）を表示する。
 * 状態・ハンドラ・派生データ（missingListText など）は CoachView 側に残し
 * props で受け取る（挙動は従来と同一）。
 */
import {
  AlertTriangle,
  Check,
  Activity,
  Edit,
  HeartPulse,
  ClipboardList,
  ChevronDown,
} from "lucide-react";

const CoachHomeView = ({
  checkDate,
  setCheckDate,
  coachStats,
  setIsPainAlertModalOpen,
  isSubmitListOpen,
  setIsSubmitListOpen,
  checkListData,
  allLogs,
  activeRunners,
  openCoachEditModal,
  isMissingListOpen,
  setIsMissingListOpen,
  missingStart,
  setMissingStart,
  missingEnd,
  setMissingEnd,
  missingListText,
  missingCopied,
  setMissingCopied,
}) => {
  return (
    <div className="space-y-6 lg:flex lg:items-start lg:gap-6 lg:space-y-0 animate-in fade-in">
      {/* 左カラム */}
      <div className="lg:flex-1 space-y-6">
      {/* 提出状況 */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="flex-1 p-2.5 bg-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:ring-2 ring-blue-500"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
          />
          <div
            onClick={() => {
              if (coachStats.alertList?.length > 0)
                setIsPainAlertModalOpen(true);
            }}
            className={`px-5 py-2.5 rounded-2xl flex flex-col items-center transition-all ${coachStats.alertList?.length > 0 ? "bg-rose-50 cursor-pointer active:scale-95" : "bg-slate-100"}`}
          >
            <span
              className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-0.5 ${coachStats.alertList?.length > 0 ? "text-rose-500" : "text-slate-400"}`}
            >
              <AlertTriangle size={9} /> Alert
            </span>
            <div className="flex items-end gap-0.5">
              <span
                className={`text-2xl font-black leading-tight ${coachStats.alertList?.length > 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {coachStats.alertList?.length || 0}
              </span>
              <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                名
              </span>
            </div>
          </div>
          <div
            onClick={() => setIsSubmitListOpen((v) => !v)}
            className="px-5 py-2.5 rounded-2xl flex flex-col items-center bg-slate-100 cursor-pointer active:scale-95 transition-all hover:bg-slate-200"
          >
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              提出済
            </span>
            <div className="flex items-end gap-0.5">
              <span className="text-2xl font-black text-emerald-600 leading-tight">
                {
                  checkListData.filter(
                    (r) => r.status !== "unsubmitted",
                  ).length
                }
              </span>
              <span className="text-[10px] font-bold text-slate-400 mb-0.5">
                / {checkListData.length}名
              </span>
            </div>
          </div>
        </div>
        {isSubmitListOpen && (
          <div className="divide-y divide-slate-100 grid md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-2 animate-in fade-in slide-in-from-top-2">
            {checkListData.map((r) => (
              <div
                key={r.id}
                className="py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm ${r.status === "active" ? "bg-blue-500" : r.status === "rest" ? "bg-emerald-400" : "bg-rose-400"}`}
                  >
                    {r.lastName.charAt(0)}
                  </div>
                  <p className="font-bold text-slate-800 text-sm">
                    {r.lastName} {r.firstName}
                  </p>
                </div>
                <div>
                  {r.status === "active" && (
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                      <Check size={12} /> {r.detail}
                    </span>
                  )}
                  {r.status === "rest" && (
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-black">
                      {r.detail}
                    </span>
                  )}
                  {r.status === "unsubmitted" && (
                    <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                      <AlertTriangle size={12} /> 未提出
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 h-[28rem] lg:h-[calc(100dvh-220px)] flex flex-col">
        <div className="p-5 bg-slate-50 border-b flex items-center gap-2">
          <Activity size={16} className="text-slate-400" />
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Recent Activity
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {allLogs
            .filter((l) =>
              activeRunners.some((r) => r.id === l.runnerId),
            )
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50)
            .map((l) => (
              <div
                key={l.id}
                className="p-4 mb-2 bg-white rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors relative group"
              >
                <div className="absolute right-4 top-4 block md:hidden md:group-hover:block">
                  <button
                    onClick={() => openCoachEditModal(l)}
                    className="bg-white border border-slate-200 p-2 rounded-lg text-slate-400 hover:text-blue-600 shadow-sm transition-colors"
                    title="監督修正"
                  >
                    <Edit size={16} />
                  </button>
                </div>
                <div className="flex justify-between items-start mb-1 pr-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${l.pain > 3 ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`}
                    ></div>
                    <span className="font-bold text-slate-700 text-sm">
                      {l.runnerName}
                    </span>
                  </div>
                  <span className="font-black text-blue-600">
                    {l.distance}km
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-5 mb-2">
                  {l.date.slice(5).replace("-", "/")} · {l.category}
                </div>
                <div className="flex gap-2 ml-5 mb-1">
                  <span
                    className={`px-2 py-1 rounded-md text-[10px] font-black ${l.rpe >= 8 ? "bg-rose-100 text-rose-600 border border-rose-200" : l.rpe >= 5 ? "bg-orange-100 text-orange-600 border border-orange-200" : "bg-blue-50 text-blue-600 border border-blue-100"}`}
                  >
                    RPE {l.rpe}
                  </span>
                  {l.pain > 1 && (
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 ${l.pain >= 4 ? "bg-purple-100 text-purple-600 border border-purple-200 animate-pulse" : l.pain === 3 ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-yellow-100 text-yellow-700 border border-yellow-200"}`}
                    >
                      <HeartPulse size={12} /> Pain {l.pain}
                    </span>
                  )}
                </div>
                {l.menuDetail && (
                  <p className="mt-2 ml-5 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                    "{l.menuDetail}"
                  </p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>{/* /左カラム */}
    {/* 右カラム */}
    <div className="lg:flex-1 space-y-6">
      {/* 未入力リスト */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm space-y-3">
        <div
          className="flex items-center justify-between cursor-pointer active:scale-95 transition-all"
          onClick={() => setIsMissingListOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-slate-400" />
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
              未入力リスト
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${isMissingListOpen ? "rotate-180" : ""}`}
          />
        </div>
        {isMissingListOpen && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="p-2.5 bg-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:ring-2 ring-blue-500"
                value={missingStart}
                onChange={(e) => setMissingStart(e.target.value)}
              />
              <input
                type="date"
                className="p-2.5 bg-slate-100 rounded-xl font-bold text-slate-700 text-sm outline-none focus:ring-2 ring-blue-500"
                value={missingEnd}
                onChange={(e) => setMissingEnd(e.target.value)}
              />
            </div>
            {missingListText && (
              <div className="space-y-2">
                <pre className="bg-slate-50 rounded-2xl p-3 text-xs font-bold text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                  {missingListText}
                </pre>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(missingListText);
                    setMissingCopied(true);
                    setTimeout(() => setMissingCopied(false), 2000);
                  }}
                  className="w-full py-2.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95 bg-slate-800 text-white"
                >
                  {missingCopied ? (
                    <>
                      <Check size={14} /> コピーしました
                    </>
                  ) : (
                    <>
                      <ClipboardList size={14} /> テキストをコピー
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>{/* /右カラム */}
  </div>
  );
};

export default CoachHomeView;
