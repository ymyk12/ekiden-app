/*
 * submission — 提出状況の判定（監督基準に統一）
 *
 * 指定日のある選手の提出状況を 1 件分判定して返す。
 * 監督・マネージャーの両画面で同じ基準を使うため共通化したもの。
 *
 * ★ 判定基準は「監督(checkListData)」に合わせる:
 *   - その日の複数ログ（朝練＋午後練など）は距離を合計する
 *   - status: "active"（距離>0）/ "rest"（完全休養 or 0km）/ "unsubmitted"（記録なし）
 *   - detail: 表示用ラベル（"-" / "〇km" / "休み" / "0km"）
 */
export const buildSubmissionRow = (runner, allLogs, dateStr) => {
  const logs = (allLogs || []).filter(
    (l) => l.runnerId === runner.id && l.date === dateStr,
  );

  let status = "unsubmitted";
  let detail = "-";

  if (logs.length > 0) {
    const totalDist = logs.reduce((sum, l) => sum + (Number(l.distance) || 0), 0);
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

  return { status, detail };
};
