/*
 * CoachRosterView — 監督のチーム名簿画面（表示専用）
 *
 * CoachView から coach-roster ビューの JSX を分離。入学年度ごとの選手一覧・
 * マネージャー一覧・引退/休止選手（現役復帰・完全削除）を表示する。
 * 状態は持たず、データ・ハンドラを CoachView から props で受け取る。
 */
import {
  Eye,
  ChevronRight,
  UserCheck,
  ClipboardList,
  Archive,
  Trash2,
} from "lucide-react";
import { updateDoc, deleteDoc } from "firebase/firestore";
import { docRef } from "../../utils/firestore";
import { ROLES } from "../../utils/constants";

const CoachRosterView = ({
  activeRunners,
  allRunners,
  handleCoachEditRunner,
  handleStartPreview,
  setConfirmDialog,
  setView,
}) => {
  return (
    <div className="bg-white p-8 rounded-[3rem] shadow-sm space-y-8 animate-in fade-in">
      <h3 className="font-black uppercase text-[10px] text-slate-400 text-center tracking-[0.3em]">
        Team Roster
      </h3>
      {(() => {
        const athletes = activeRunners.filter(
          (r) => r.role !== ROLES.MANAGER,
        );
        const managers = activeRunners.filter(
          (r) => r.role === ROLES.MANAGER,
        );
        const entranceYears = [
          ...new Set(
            athletes.map((r) => (r.memberCode || r.id).substring(0, 2)),
          ),
        ].sort();
        const athleteCard = (r) => (
          <div
            key={r.id}
            className="py-4 flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-colors rounded-xl px-2"
            onClick={() => handleCoachEditRunner(r)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center font-black text-blue-600">
                {r.lastName.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-slate-800">
                  {r.lastName} {r.firstName}
                </p>
                <div className="flex items-center gap-2 mt-0.5 mb-0.5">
                  <span className="text-[10px] md:text-xs font-mono font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    ID: {r.memberCode || "-"}
                  </span>
                  {r.gender && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${r.gender === "男" ? "bg-blue-100 text-blue-600" : "bg-pink-100 text-pink-600"}`}
                    >
                      {r.gender}
                    </span>
                  )}
                  <span className="text-[10px] md:text-xs text-slate-400 font-mono">
                    PIN: {r.pin || "----"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold">
                  Goal: {r.goalMonthly}km/mo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartPreview(r);
                }}
                className="text-slate-400 hover:text-blue-600 p-2 rounded-lg bg-slate-50 transition-colors"
                title="本人視点でプレビュー"
              >
                <Eye size={18} />
              </button>
              <ChevronRight className="text-slate-300" size={20} />
            </div>
          </div>
        );
        return (
          <>
            {entranceYears.map((year, idx) => {
              const gOrd = { 男: 0, 女: 1 };
              const group = athletes
                .filter((r) => (r.memberCode || r.id).startsWith(year))
                .sort((a, b) => {
                  const ga = gOrd[a.gender] ?? 2;
                  const gb = gOrd[b.gender] ?? 2;
                  if (ga !== gb) return ga - gb;
                  return (a.memberCode || a.id).localeCompare(
                    b.memberCode || b.id,
                  );
                });
              if (group.length === 0) return null;
              return (
                <div
                  key={year}
                  className={`space-y-2 ${idx > 0 ? "pt-6 border-t border-slate-100" : ""}`}
                >
                  <h4 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2">
                    <UserCheck size={16} /> 20{year}年度入学
                    <span className="text-slate-400 font-bold normal-case">
                      ({group.length}名)
                    </span>
                  </h4>
                  <div className="divide-y divide-slate-100 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:divide-y-0">
                    {group.map(athleteCard)}
                  </div>
                </div>
              );
            })}
            {managers.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase text-indigo-600 flex items-center gap-2">
                  <ClipboardList size={16} /> Managers (
                  {managers.length})
                </h4>
                <div className="divide-y divide-slate-100 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:divide-y-0">
                  {managers.map((r) => (
                    <div
                      key={r.id}
                      className="py-4 flex items-center justify-between group cursor-pointer hover:bg-indigo-50/50 transition-colors rounded-xl px-2"
                      onClick={() => handleCoachEditRunner(r)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-black text-indigo-600">
                          {r.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            {r.lastName} {r.firstName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 mb-0.5">
                            <span className="text-[10px] md:text-xs font-mono font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              ID: {r.memberCode || "-"}
                            </span>
                            <span className="text-[10px] md:text-xs text-slate-400 font-mono">
                              PIN: {r.pin || "----"}
                            </span>
                          </div>
                          <span className="text-[9px] font-black text-white bg-indigo-400 px-2 py-0.5 rounded-full">
                            MANAGER
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartPreview(r);
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-2 rounded-lg bg-slate-50 transition-colors"
                          title="ダッシュボードをプレビュー"
                        >
                          <Eye size={18} />
                        </button>
                        <ChevronRight
                          className="text-slate-300"
                          size={20}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}
      <div className="space-y-4 pt-8 border-t border-slate-100">
        <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
          <Archive size={16} /> Retired / Inactive
        </h4>
        <div className="divide-y divide-slate-100 opacity-60 hover:opacity-100 transition-opacity grid md:grid-cols-2 gap-x-12 gap-y-0">
          {allRunners
            .filter((r) => r.status === "retired")
            .map((r) => (
              <div
                key={r.id}
                className="py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 grayscale">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                    {r.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-600">
                      {r.lastName} {r.firstName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Retired
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        message: `${r.lastName}選手を現役復帰させますか？`,
                        onConfirm: async () => {
                          await updateDoc(docRef("runners", r.id), {
                            status: "active",
                          });
                          setConfirmDialog({
                            isOpen: false,
                            message: "",
                            onConfirm: null,
                          });
                        },
                      })
                    }
                    className="bg-emerald-50 text-emerald-600 p-2 rounded-xl hover:bg-emerald-100 transition-colors"
                    title="現役復帰"
                  >
                    <UserCheck size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setConfirmDialog({
                        isOpen: true,
                        message: `警告: ${r.lastName}選手のデータを完全に削除します。元に戻せません。よろしいですか？`,
                        onConfirm: async () => {
                          await deleteDoc(docRef("runners", r.id));
                          setConfirmDialog({
                            isOpen: false,
                            message: "",
                            onConfirm: null,
                          });
                        },
                      })
                    }
                    className="bg-rose-50 text-rose-600 p-2 rounded-xl hover:bg-rose-100 transition-colors"
                    title="完全削除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          {allRunners.filter((r) => r.status === "retired").length ===
            0 && (
            <p className="text-center text-xs text-slate-300 py-2">
              引退した選手はいません
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => setView("coach-home")}
        className="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest"
      >
        ホームに戻る
      </button>
    </div>
  );
};

export default CoachRosterView;
