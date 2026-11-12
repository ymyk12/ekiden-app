/*
 * AthleteBestsTab — マイログ「記録」タブ（表示専用）
 *
 * 全期間の自分のデータから自己ベストを出す。
 *  - 練習: 1日・週間・月間の最長距離と通算距離（練習ログ）
 *  - 大会: 種目ごとのベストタイム（大会カードの結果タイム。駅伝は区間ごとにコースが違うため対象外）
 */
import { useMemo } from "react";
import { Trophy, Flag } from "lucide-react";
import { flexTimeToSeconds } from "../../utils/lapUtils";
import {
  weekStart,
  sumBy,
  maxEntry,
  round1,
} from "../../utils/logStats";

const fmtDate = (ds) =>
  ds ? `${ds.slice(0, 4)}/${Number(ds.slice(5, 7))}/${Number(ds.slice(8, 10))}` : "";

const Row = ({ label, value, sub }) => (
  <div className="flex items-center justify-between bg-slate-50 rounded-2xl border border-slate-100 px-4 py-3">
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      {sub && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{sub}</p>}
    </div>
    <p className="text-lg font-black text-slate-800 tracking-tighter">{value}</p>
  </div>
);

// 種目の並び順: トラックは 400→800→1500→3000→5000→3000SC、続いてロード（距離順）、その他
const TRACK_ORDER = ["400m", "800m", "1500m", "3000m", "5000m", "3000mSC"];
const eventRank = (g) => {
  const [type, ...rest] = g.key.split(" ");
  const dist = rest.join(" ");
  if (type === "トラック") {
    const i = TRACK_ORDER.findIndex((d) => d.toLowerCase() === dist.toLowerCase());
    return i >= 0 ? i : 50;
  }
  if (type === "ロード") return 100 + (parseFloat(dist) || 0);
  return 1000;
};

const AthleteBestsTab = ({ myLogs, myCards, tournaments }) => {
  const training = useMemo(() => {
    const byDay = sumBy(myLogs, (l) => l.date);
    const byWeek = sumBy(myLogs, (l) => weekStart(l.date));
    const byMonth = sumBy(myLogs, (l) => l.date.slice(0, 7));
    let total = 0;
    byDay.forEach((v) => (total += v));
    return {
      day: maxEntry(byDay),
      week: maxEntry(byWeek),
      month: maxEntry(byMonth),
      total: round1(total),
    };
  }, [myLogs]);

  const raceBests = useMemo(() => {
    const groups = new Map();
    myCards.forEach((c) => {
      if (c.raceType === "駅伝") return;
      // 削除された大会のカードは対象外
      if (!tournaments.some((t) => t.id === c.tournamentId)) return;
      const sec = flexTimeToSeconds(c.resultTime);
      if (!(sec > 0)) return;
      const dist = c.distance === "その他" ? c.ekidenDistance : c.distance;
      if (!dist) return;
      const key = `${c.raceType} ${dist}`;
      const tour = tournaments.find((t) => t.id === c.tournamentId);
      const entry = {
        sec,
        time: c.resultTime,
        date: c.date || tour?.startDate || "",
        tourName: tour?.name || "",
      };
      const g = groups.get(key) || { key, best: entry, count: 0 };
      g.count += 1;
      if (sec < g.best.sec) g.best = entry;
      groups.set(key, g);
    });
    return [...groups.values()].sort(
      (a, b) => eventRank(a) - eventRank(b) || a.key.localeCompare(b.key, "ja"),
    );
  }, [myCards, tournaments]);

  const hasLogs = myLogs.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Trophy size={14} /> Training Bests（全期間）
        </h4>
        {!hasLogs || !training.day ? (
          <p className="text-center text-xs text-slate-300 py-4 font-bold">
            練習の記録がありません
          </p>
        ) : (
          <>
            <Row
              label="1日の最長"
              value={`${round1(training.day.value)} km`}
              sub={fmtDate(training.day.key)}
            />
            <Row
              label="週間の最長"
              value={`${round1(training.week.value)} km`}
              sub={`${fmtDate(training.week.key)} の週`}
            />
            <Row
              label="月間の最長"
              value={`${round1(training.month.value)} km`}
              sub={`${training.month.key.replace("-", "年")}月`}
            />
            <Row label="通算距離" value={`${training.total} km`} />
          </>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Flag size={14} /> Race Bests
        </h4>
        {raceBests.length === 0 ? (
          <p className="text-center text-xs text-slate-300 py-4 font-bold">
            タイムの入った大会の記録がありません
          </p>
        ) : (
          raceBests.map((g) => (
            <Row
              key={g.key}
              label={g.key}
              value={g.best.time}
              sub={`${fmtDate(g.best.date)}${g.best.tourName ? `　${g.best.tourName}` : ""}`}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AthleteBestsTab;
