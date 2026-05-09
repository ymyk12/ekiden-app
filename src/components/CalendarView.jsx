/*
 * CalendarView — 月次カレンダー（全ロール共通）
 *
 * 練習記録・チーム日誌・大会・完全休養を月単位で一覧表示。
 * 日付タップで詳細ポップアップを表示。
 */
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, X, Plus } from "lucide-react";
import { ROLES, CATEGORY } from "../utils/constants";
import { getDatesInRange, getTodayStr } from "../utils/dateUtils";

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];
const WEEKDAY_COLORS = ["text-slate-600", "text-slate-600", "text-slate-600", "text-slate-600", "text-slate-600", "text-blue-400", "text-rose-400"];

function CalendarView({
  allLogs,
  teamLogs,
  tournaments,
  role,
  currentUserId,
  onEntryRequest,
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const todayStr = getTodayStr();

  // 自分の練習記録マップ { "YYYY-MM-DD": log }
  const myLogMap = useMemo(() => {
    const map = {};
    (allLogs || [])
      .filter((l) => l.runnerId === currentUserId)
      .forEach((l) => {
        map[l.date] = l;
      });
    return map;
  }, [allLogs, currentUserId]);

  // チーム日誌があるSet<"YYYY-MM-DD">
  const teamLogMap = useMemo(() => {
    const map = {};
    (teamLogs || []).forEach((l) => {
      map[l.date] = l;
    });
    return map;
  }, [teamLogs]);

  // 大会期間マップ { "YYYY-MM-DD": tournamentName }
  const tournamentDateMap = useMemo(() => {
    const map = {};
    (tournaments || []).forEach((t) => {
      getDatesInRange(t.startDate, t.endDate).forEach((d) => {
        map[d] = t.name;
      });
    });
    return map;
  }, [tournaments]);

  // カレンダーグリッド生成（月曜始まり）
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // getDay() returns 0=Sun...6=Sat → Mon=0 offset: (getDay() + 6) % 7
    const startOffset = (firstDay.getDay() + 6) % 7;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push(dateStr);
    }
    return days;
  }, [currentMonth]);

  const prevMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const monthLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

  const selectedLog = selectedDate ? myLogMap[selectedDate] : null;
  const selectedTeamLog = selectedDate ? teamLogMap[selectedDate] : null;
  const selectedTournament = selectedDate ? tournamentDateMap[selectedDate] : null;
  const isRest = selectedLog?.category === CATEGORY.REST;

  const dayOfWeekLabel = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return "";
    const [, m, day] = dateStr.split("-");
    return `${parseInt(m)}月${parseInt(day)}日（${dayOfWeekLabel(dateStr)}）`;
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-290px)]">
      {/* ヘッダー: 月ナビ（固定） */}
      <div className="bg-white rounded-[2rem] shadow-sm p-5 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-black text-slate-800">{monthLabel}</h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((label, idx) => (
            <div
              key={label}
              className={`text-center text-[10px] font-black py-1 ${WEEKDAY_COLORS[idx]}`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map((dateStr, idx) => {
            if (!dateStr) {
              return <div key={`empty-${idx}`} />;
            }

            const myLog = myLogMap[dateStr];
            const hasTeamLog = !!teamLogMap[dateStr];
            const hasTournament = !!tournamentDateMap[dateStr];
            const dayIsRest = myLog?.category === CATEGORY.REST;
            const hasLog = !!myLog && !dayIsRest;
            const isToday = dateStr === todayStr;
            const colIdx = idx % 7;
            const isSat = colIdx === 5;
            const isSun = colIdx === 6;

            return (
              <button
                key={dateStr}
                onClick={() =>
                  setSelectedDate((prev) => (prev === dateStr ? null : dateStr))
                }
                className={`
                  relative flex flex-col items-center py-1.5 rounded-xl transition-all active:scale-95
                  ${hasTeamLog ? "bg-sky-50" : ""}
                  ${selectedDate === dateStr ? "ring-2 ring-blue-400 ring-offset-1" : ""}
                `}
              >
                {/* 日付数字 */}
                <span
                  className={`
                    text-[13px] font-bold leading-none mb-1
                    ${isToday ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[11px]" : ""}
                    ${!isToday && isSat ? "text-blue-400" : ""}
                    ${!isToday && isSun ? "text-rose-400" : ""}
                    ${!isToday && !isSat && !isSun ? "text-slate-700" : ""}
                  `}
                >
                  {parseInt(dateStr.split("-")[2])}
                </span>

                {/* インジケーター行 */}
                <div className="flex items-center gap-0.5 h-3">
                  {hasLog && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                  {dayIsRest && (
                    <span className="text-[8px] leading-none">💤</span>
                  )}
                  {hasTournament && (
                    <span className="text-[8px] leading-none">🏅</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            練習あり
          </span>
          <span className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
            <span className="text-[9px]">💤</span>
            完全休養
          </span>
          <span className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
            <span className="text-[9px]">🏅</span>
            大会
          </span>
          <span className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold">
            <span className="w-3 h-3 rounded bg-sky-50 border border-sky-100" />
            日誌あり
          </span>
        </div>
      </div>

      {/* 詳細（スクロール領域） */}
      <div className="flex-1 overflow-y-auto mt-4 pb-4">
      {selectedDate && (
        <div className="bg-white rounded-[2rem] shadow-sm p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800">
                {formatDateLabel(selectedDate)}
              </h3>
              {selectedTeamLog && (selectedTeamLog.weather || selectedTeamLog.temp || selectedTeamLog.humidity) && (
                <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                  {selectedTeamLog.weather && <span>{selectedTeamLog.weather}</span>}
                  {selectedTeamLog.temp && <span>{selectedTeamLog.temp}℃</span>}
                  {selectedTeamLog.humidity && <span>{selectedTeamLog.humidity}%</span>}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-400"
            >
              <X size={16} />
            </button>
          </div>

          {/* 大会バッジ */}
          {selectedTournament && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <span className="text-base">🏅</span>
              <div>
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                  Tournament
                </p>
                <p className="text-sm font-bold text-amber-900">{selectedTournament}</p>
              </div>
            </div>
          )}

          {/* 個人ログ */}
          {selectedLog ? (
            <div
              className={`rounded-2xl px-4 py-3 space-y-2 ${
                isRest
                  ? "bg-emerald-50 border border-emerald-100"
                  : "bg-blue-50 border border-blue-100"
              }`}
            >
              <p
                className={`text-[9px] font-black uppercase tracking-widest ${
                  isRest ? "text-emerald-600" : "text-blue-600"
                }`}
              >
                My Log
              </p>
              {isRest ? (
                <p className="text-sm font-bold text-emerald-700">
                  💤 完全休養
                </p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-blue-700">
                      {selectedLog.distance}
                    </span>
                    <span className="text-xs font-bold text-blue-500">km</span>
                    <span className="ml-auto text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-100">
                      {selectedLog.category}
                    </span>
                  </div>
                  {selectedLog.menuDetail && (
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedLog.menuDetail}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {selectedLog.rpe > 0 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${selectedLog.rpe >= 8 ? "bg-rose-100 text-rose-600 border-rose-200" : selectedLog.rpe >= 5 ? "bg-orange-100 text-orange-600 border-orange-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        RPE {selectedLog.rpe}
                      </span>
                    )}
                    {selectedLog.pain > 1 && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${selectedLog.pain >= 4 ? "bg-purple-100 text-purple-600 border-purple-200" : selectedLog.pain >= 3 ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
                        Pain {selectedLog.pain}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            role === ROLES.RUNNER && (
              <div className="rounded-2xl px-4 py-3 bg-slate-50 border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-bold text-center">
                  この日の記録はありません
                </p>
              </div>
            )
          )}

          {/* チーム日誌 */}
          {selectedTeamLog && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 space-y-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Team Diary
              </p>
              {selectedTeamLog.isRestDay ? (
                <p className="text-sm font-bold text-slate-600">💤 チームオフ</p>
              ) : (
                <>
                  {(selectedTeamLog.startTime || selectedTeamLog.location) && (
                    <p className="text-[11px] text-slate-500 font-bold">
                      {[
                        selectedTeamLog.startTime && selectedTeamLog.endTime
                          ? `${selectedTeamLog.startTime}〜${selectedTeamLog.endTime}`
                          : selectedTeamLog.startTime,
                        selectedTeamLog.location,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {selectedTeamLog.menu && (
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {selectedTeamLog.menu}
                    </p>
                  )}
                  {selectedTeamLog.result && (
                    <div className="bg-white rounded-xl px-3 py-2 border border-slate-200">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Results / Notes</p>
                      <p className="text-xs font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedTeamLog.result}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 記録入力ボタン（選手のみ・未記録の日のみ） */}
          {role === ROLES.RUNNER && !selectedLog && onEntryRequest && (
            <button
              onClick={() => {
                onEntryRequest(selectedDate);
                setSelectedDate(null);
              }}
              className="w-full bg-gradient-to-br from-blue-500 to-blue-700 text-white py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Plus size={16} strokeWidth={3} />
              この日に記録を入力
            </button>
          )}

          {/* 何もない日 */}
          {!selectedLog && !selectedTeamLog && !selectedTournament && role !== ROLES.RUNNER && (
            <p className="text-xs text-slate-400 font-bold text-center py-2">
              この日の記録はありません
            </p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default CalendarView;
