/*
 * useStats — 練習記録の集計ロジック
 *
 * 練習ログをもとに「走行距離合計」「週間ペース」などの
 * 統計値を計算して返す。表示コンポーネントは数値を受け取るだけでよい。
 */
import { useMemo } from "react";
import { ROLES } from "../utils/constants";
import { getTodayStr, getDatesInRange } from "../utils/dateUtils";

export const useStats = ({
  allLogs,
  allRunners,
  allFeedbacks,
  currentUserId,
  targetPeriod,
  activeQuarters,
  checkDate,
}) => {
  const activeRunners = useMemo(() => {
    return allRunners.filter(
      (r) => r.status !== "retired" && r.lastName !== "admin",
    );
  }, [allRunners]);

  const personalStats = useMemo(() => {
    if (!currentUserId)
      return { daily: [], monthly: 0, period: 0, qs: [0, 0, 0, 0] };
    const myLogs = allLogs.filter((l) => l.runnerId === currentUserId);

    const start = new Date(targetPeriod.start || "2000-01-01");
    const end = new Date(targetPeriod.end || "2100-12-31");
    const periodTotal = myLogs
      .filter((l) => {
        const d = new Date(l.date);
        return d >= start && d <= end;
      })
      .reduce((s, l) => s + (Number(l.distance) || 0), 0);

    const now = new Date();
    const monthlyTotal = myLogs
      .filter((l) => {
        const d = new Date(l.date);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, l) => s + (Number(l.distance) || 0), 0);

    const qs = activeQuarters.map((q) => {
      if (!q.start || !q.end) return 0;
      const qStart = new Date(q.start);
      const qEnd = new Date(q.end);
      return myLogs
        .filter((l) => {
          const d = new Date(l.date);
          return d >= qStart && d <= qEnd;
        })
        .reduce((s, l) => s + (Number(l.distance) || 0), 0);
    });

    const daily = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("sv-SE");
      const dayLogs = myLogs.filter((l) => l.date === dateStr);
      const dayDist = dayLogs.reduce(
        (acc, log) => acc + (Number(log.distance) || 0),
        0,
      );
      daily.push({
        date: dateStr,
        label: dateStr.split("-")[2],
        distance: Math.round(dayDist * 10) / 10,
      });
    }

    return {
      daily,
      monthly: Math.round(monthlyTotal * 10) / 10,
      period: Math.round(periodTotal * 10) / 10,
      qs: qs.map((v) => Math.round(v * 10) / 10),
    };
  }, [allLogs, currentUserId, targetPeriod, activeQuarters]);

  const missingDates = useMemo(() => {
    if (!currentUserId || !targetPeriod || !targetPeriod.start) return [];

    const missing = [];
    const myLogs = allLogs.filter((l) => l.runnerId === currentUserId);
    const logDateSet = new Set(myLogs.map((l) => l.date));

    const current = new Date(targetPeriod.start);
    current.setHours(0, 0, 0, 0);

    const periodEnd = new Date(targetPeriod.end);
    periodEnd.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const checkEndDate = periodEnd < yesterday ? periodEnd : yesterday;

    if (isNaN(current.getTime()) || current > checkEndDate) return [];

    let safetyCounter = 0;
    while (current <= checkEndDate && safetyCounter < 370) {
      const dateStr = current.toLocaleDateString("sv-SE");
      if (!logDateSet.has(dateStr)) {
        missing.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
      safetyCounter++;
    }

    return missing.sort();
  }, [allLogs, currentUserId, targetPeriod]);

  const currentFeedback = useMemo(() => {
    if (!currentUserId || !targetPeriod) return null;
    const feedbackId = `${targetPeriod.id}_${currentUserId}`;
    return allFeedbacks.find((f) => f.id === feedbackId) || { id: feedbackId };
  }, [allFeedbacks, targetPeriod, currentUserId]);

  const periodLogs = useMemo(() => {
    if (!currentUserId || !targetPeriod) return [];
    const start = new Date(targetPeriod.start);
    const end = new Date(targetPeriod.end);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    return allLogs
      .filter((l) => l.runnerId === currentUserId)
      .filter((l) => {
        const d = new Date(l.date);
        return d >= start && d <= end;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [allLogs, currentUserId, targetPeriod]);

  const rankingData = useMemo(() => {
    const start = new Date(targetPeriod.start || "2000-01-01");
    const end = new Date(targetPeriod.end || "2100-12-31");
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    return activeRunners
      .filter((r) => r.role !== ROLES.MANAGER)
      .map((r) => {
        const total = allLogs
          .filter(
            (l) =>
              l.runnerId === r.id &&
              new Date(l.date) >= start &&
              new Date(l.date) <= end,
          )
          .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);
        return {
          name: `${r.lastName} ${r.firstName}`,
          id: r.id,
          total: Math.round(total * 10) / 10,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [activeRunners, allLogs, targetPeriod]);

  const reportChartData = useMemo(() => {
    const start = new Date(targetPeriod.start || "2000-01-01");
    const end = new Date(targetPeriod.end || "2100-12-31");
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    const athletes = activeRunners.filter((r) => r.role !== ROLES.MANAGER);

    const data = athletes.map((r) => {
      const total = allLogs
        .filter(
          (l) =>
            l.runnerId === r.id &&
            new Date(l.date) >= start &&
            new Date(l.date) <= end,
        )
        .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);

      const row = {
        name: `${r.lastName} ${r.firstName}`,
        id: r.id,
        total: Math.round(total * 10) / 10,
      };

      if (activeQuarters.length > 0) {
        activeQuarters.forEach((q, idx) => {
          if (!q.start || !q.end) {
            row[`q${idx + 1}`] = 0;
            return;
          }
          const qStart = new Date(q.start);
          const qEnd = new Date(q.end);
          qEnd.setHours(23, 59, 59, 999);

          const qSum = allLogs
            .filter(
              (l) =>
                l.runnerId === r.id &&
                new Date(l.date) >= qStart &&
                new Date(l.date) <= qEnd,
            )
            .reduce((sum, l) => sum + (Number(l.distance) || 0), 0);

          row[`q${idx + 1}`] = Math.round(qSum * 10) / 10;
        });
      }
      return row;
    });

    return data.sort((a, b) => a.id.localeCompare(b.id));
  }, [activeRunners, allLogs, targetPeriod, activeQuarters]);

  const reportDates = useMemo(() => {
    return getDatesInRange(targetPeriod.start, targetPeriod.end);
  }, [targetPeriod]);

  const reportMatrix = useMemo(() => {
    const sortedRunners = activeRunners
      .filter((r) => r.role !== ROLES.MANAGER)
      .sort((a, b) =>
        (a.memberCode || a.id).localeCompare(b.memberCode || b.id),
      );
    const runnerIds = sortedRunners.map((r) => r.id);

    const matrix = reportDates.map((date) => {
      const row = { date };
      runnerIds.forEach((id) => {
        const logs = allLogs.filter(
          (l) => l.runnerId === id && l.date === date,
        );
        if (logs.length === 0) {
          row[id] = "未";
        } else {
          const total = logs.reduce(
            (sum, l) => sum + (Number(l.distance) || 0),
            0,
          );
          if (logs.some((l) => l.category === "完全休養")) {
            row[id] = "休";
          } else if (total === 0) {
            row[id] = "0";
          } else {
            row[id] = Math.round(total * 10) / 10;
          }
        }
      });
      return row;
    });

    let grandTotal = 0;
    const totals = { date: "TOTAL" };
    runnerIds.forEach((id) => {
      const sum = allLogs
        .filter((l) => l.runnerId === id && reportDates.includes(l.date))
        .reduce((s, l) => s + (Number(l.distance) || 0), 0);
      totals[id] = Math.round(sum * 10) / 10;
      grandTotal += totals[id];
    });
    totals.grandTotal = Math.round(grandTotal * 10) / 10;

    const qTotals = activeQuarters.map((q, idx) => {
      const row = { date: `${idx + 1}期合計` };
      runnerIds.forEach((id) => {
        const sum = allLogs
          .filter(
            (l) => l.runnerId === id && l.date >= q.start && l.date <= q.end,
          )
          .reduce((s, l) => s + (Number(l.distance) || 0), 0);
        row[id] = Math.round(sum * 10) / 10;
      });
      return row;
    });

    return { matrix, totals, qTotals };
  }, [reportDates, activeRunners, allLogs, activeQuarters]);

  const cumulativeData = useMemo(() => {
    const data = [];
    reportDates.forEach((date) => {
      data.push({ date: date.slice(5).replace("-", "/") });
    });

    const athletes = activeRunners.filter((r) => r.role !== ROLES.MANAGER);

    athletes.forEach((r) => {
      let sum = 0;
      reportDates.forEach((date, idx) => {
        const dayLogs = allLogs.filter(
          (l) => l.runnerId === r.id && l.date === date,
        );
        const dayDist = dayLogs.reduce(
          (acc, log) => acc + (Number(log.distance) || 0),
          0,
        );
        sum += dayDist;
        if (data[idx]) {
          data[idx][r.id] = Math.round(sum * 10) / 10;
        }
      });
    });
    return data;
  }, [reportDates, activeRunners, allLogs]);

  const monthlyTrendData = useMemo(() => {
    if (!targetPeriod || targetPeriod.type !== "month") return [];

    const match = (targetPeriod.id || "").match(/month_(\d{4})_(\d{1,2})/);
    let y = new Date().getFullYear(),
      m = new Date().getMonth() + 1;
    if (match) {
      y = parseInt(match[1], 10);
      m = parseInt(match[2], 10);
    }

    const past12Months = [];
    for (let i = 11; i >= 0; i--) {
      let d = new Date(y, m - 1 - i, 1);
      past12Months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }

    const athletes = activeRunners.filter((r) => r.role !== ROLES.MANAGER);
    const monthlyMap = {};

    past12Months.forEach((yyyymm) => {
      monthlyMap[yyyymm] = { date: yyyymm };
      athletes.forEach((r) => (monthlyMap[yyyymm][r.id] = null));
    });

    allLogs.forEach((log) => {
      const yyyymm = log.date.substring(0, 7);
      if (monthlyMap[yyyymm]) {
        athletes.forEach((r) => {
          if (log.runnerId === r.id) {
            const val = parseFloat(log.distance);
            if (!isNaN(val) && val > 0) {
              monthlyMap[yyyymm][r.id] = (monthlyMap[yyyymm][r.id] || 0) + val;
            }
          }
        });
      }
    });

    return past12Months.map((yyyymm) => {
      const row = monthlyMap[yyyymm];
      const newRow = { date: row.date };
      athletes.forEach((r) => {
        newRow[r.id] =
          row[r.id] === null ? null : Math.round(row[r.id] * 10) / 10;
      });
      return newRow;
    });
  }, [allLogs, targetPeriod, activeRunners]);

  const checkListData = useMemo(() => {
    return activeRunners
      .filter((r) => r.role !== ROLES.MANAGER)
      .map((runner) => {
        const logs = allLogs.filter(
          (l) => l.runnerId === runner.id && l.date === checkDate,
        );

        let status = "unsubmitted";
        let detail = "-";

        if (logs.length > 0) {
          const totalDist = logs.reduce(
            (sum, l) => sum + (Number(l.distance) || 0),
            0,
          );
          const isRest = logs.some((l) => l.category === "完全休養");

          if (totalDist > 0) {
            status = "active";
            detail = `${Math.round(totalDist * 10) / 10}km`;
          } else if (isRest) {
            status = "rest";
            detail = "休み";
          } else {
            status = "rest";
            detail = "0km";
          }
        }
        return { ...runner, status, detail };
      });
  }, [activeRunners, allLogs, checkDate]);

  const coachStats = useMemo(() => {
    const todayStr = getTodayStr();
    const athletes = activeRunners.filter((r) => r.role !== ROLES.MANAGER);

    const reportedCount = athletes.filter((r) => {
      return allLogs.some((l) => l.runnerId === r.id && l.date === todayStr);
    }).length;
    const reportRate =
      athletes.length > 0
        ? Math.round((reportedCount / athletes.length) * 100)
        : 0;

    const todaysLogs = allLogs.filter(
      (l) => l.date === todayStr && athletes.some((r) => r.id === l.runnerId),
    );
    const validRpeLogs = todaysLogs.filter(
      (l) => typeof l.rpe === "number" && l.category !== "完全休養",
    );
    const avgRpe =
      validRpeLogs.length > 0
        ? Math.round(
            (validRpeLogs.reduce((sum, l) => sum + l.rpe, 0) /
              validRpeLogs.length) *
              10,
          ) / 10
        : 0;

    const alertList = athletes
      .map((runner) => {
        const runnerLogs = allLogs.filter((l) => l.runnerId === runner.id);
        runnerLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        const alerts = [];

        if (runnerLogs.length > 0 && runnerLogs[0].pain >= 3) {
          alerts.push({
            type: "pain",
            label: `Pain ${runnerLogs[0].pain}`,
            color: "bg-rose-600 text-white animate-pulse",
          });
        }

        if (
          runnerLogs.length >= 3 &&
          runnerLogs[0].rpe >= 8 &&
          runnerLogs[1].rpe >= 8 &&
          runnerLogs[2].rpe >= 8
        ) {
          alerts.push({
            type: "fatigue",
            label: "3日連続 高負荷(RPE8+)",
            color: "bg-orange-500 text-white",
          });
        }

        const lastLogDate =
          runnerLogs.length > 0
            ? new Date(runnerLogs[0].date)
            : new Date("2000-01-01");
        const today = new Date(todayStr);
        const diffDays = Math.floor(
          (today - lastLogDate) / (1000 * 60 * 60 * 24),
        );

        if (diffDays >= 3) {
          alerts.push({
            type: "missing",
            label: `${diffDays}日間 未提出`,
            color: "bg-slate-500 text-white",
          });
        }

        if (alerts.length > 0) {
          return { runner, latestLog: runnerLogs[0], alerts };
        }
        return null;
      })
      .filter(Boolean);

    return { reportRate, reportedCount, alertList, avgRpe };
  }, [activeRunners, allLogs]);

  return {
    activeRunners,
    personalStats,
    missingDates,
    currentFeedback,
    periodLogs,
    rankingData,
    reportChartData,
    reportDates,
    reportMatrix,
    cumulativeData,
    monthlyTrendData,
    checkListData,
    coachStats,
  };
};
