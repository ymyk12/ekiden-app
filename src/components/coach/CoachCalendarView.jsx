/*
 * CoachCalendarView — 監督のカレンダー画面（表示専用の薄いラッパー）
 *
 * CoachView から coach-calendar ビューを分離。選手を選んでいればその選手の
 * 記録を、未選択ならチーム全体を、既存の CalendarView で表示する。
 */
import CalendarView from "../CalendarView";

const CoachCalendarView = ({
  selectedRunner,
  allLogs,
  teamLogs,
  tournaments,
  setShowTeamReportId,
}) => {
  return (
    <div className="animate-in fade-in">
      {selectedRunner && (
        <p className="text-xs font-bold text-slate-400 mb-3 px-1">
          {selectedRunner.lastName} {selectedRunner.firstName}{" "}
          の記録を表示中
        </p>
      )}
      <CalendarView
        allLogs={allLogs}
        teamLogs={teamLogs}
        tournaments={tournaments}
        role="coach"
        currentUserId={selectedRunner?.id || null}
        onTournamentClick={(id) => setShowTeamReportId(id)}
      />
    </div>
  );
};

export default CoachCalendarView;
