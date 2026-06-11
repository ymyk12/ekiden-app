/*
 * TeamRaceReport — チーム大会レポート画面
 *
 * チーム全員の大会振り返りシートを一覧で表示する画面。
 * 日付ごとにグループ化して並べ、印刷・PDF出力にも対応している。
 */
import React, { useState } from "react";
import {
  ArrowLeft,
  Printer,
  Thermometer,
  Droplets,
  Timer,
  Calendar,
  Edit,
  X,
  Save,
  Award,
  Plus,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";
import LapTimeModal from "./LapTimeModal";
import { RACE_TYPES, RACE_DISTANCES } from "../utils/constants";
import { timeToSeconds, analyzeLaps } from "../utils/lapUtils";

// SmartLapInput と同じロジックで resultTime に合わせて最終 LAP を逆算する
const adjustLapTimesForResult = (lapTimesStr, newResultTime, raceType, distanceStr, ekidenDist) => {
  if (!lapTimesStr || !newResultTime) return lapTimesStr;

  const ts = (str) => {
    if (!str) return 0;
    const c = str.replace(/[()（）]/g, "");
    const m = c.match(/(?:(\d+)')?(?:(\d+)")?(\d+)?/);
    if (!m) return 0;
    return parseFloat(m[1] || 0) * 60 + parseFloat(m[2] || 0) + parseFloat(m[3] || 0) / 100;
  };
  const st = (sec) => {
    if (sec <= 0) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const c = Math.round((sec % 1) * 100);
    return m > 0 ? `${m}'${String(s).padStart(2,"0")}"${String(c).padStart(2,"0")}` : `${s}"${String(c).padStart(2,"0")}`;
  };

  // 距離を m 換算
  const dStr = ekidenDist ? String(ekidenDist) : distanceStr || "";
  let totalDist = parseInt(dStr.replace(/[^0-9]/g, "")) || 0;
  if (dStr.toLowerCase().includes("km")) totalDist *= 1000;

  // 区間リスト生成（SmartLapInput と同一ロジック）
  let splits = [];
  const t = (raceType || "").toLowerCase();
  // SC(障害)は raceType ではなく distance 側に入るため dStr で判定する
  const dLower = dStr.toLowerCase();
  if (totalDist > 0) {
    if (t.includes("駅伝") || t.includes("ロード") || dLower.includes("sc")) {
      for (let i = 1000; i <= totalDist; i += 1000) splits.push(i);
      if (totalDist % 1000 !== 0) splits.push(totalDist);
    } else if (totalDist === 800) {
      splits = [200, 400, 600, 800];
    } else if (totalDist === 1500) {
      splits = [400, 800, 1000, 1200, 1500];
    } else if (totalDist >= 3000) {
      for (let i = 400; i <= totalDist; i += 400) {
        splits.push(i);
        const nextK = Math.ceil(i / 1000) * 1000;
        if (nextK > i && nextK < i + 400 && nextK <= totalDist) splits.push(nextK);
      }
      if (splits[splits.length - 1] !== totalDist) splits.push(totalDist);
    }
  }
  if (splits.length === 0) return lapTimesStr;

  // 既存 lapTimes を解析
  const lapMap = {};
  lapTimesStr.split(/\s+/).forEach((line) => {
    const m = line.match(/^(\d+)m:(.*?)(?:\(|$)/);
    if (m) lapMap[parseInt(m[1])] = m[2];
  });

  // 最終 LAP を逆算
  const resSec = ts(newResultTime);
  if (resSec <= 0) return lapTimesStr;
  let prevSec = 0;
  splits.slice(0, -1).forEach((d) => { prevSec += ts(lapMap[d] || ""); });
  const lastDist = splits[splits.length - 1];
  const lastSec = resSec - prevSec;
  lapMap[lastDist] = lastSec > 0 ? st(lastSec) : "";

  // lapTimes 文字列を再構築
  let cumSec = 0;
  return splits.map((d, idx) => {
    const seg = lapMap[d] || "";
    cumSec += ts(seg);
    const isLast = idx === splits.length - 1;
    const paren = isLast && newResultTime ? `(${newResultTime})` : cumSec > 0 && ts(seg) > 0 ? `(${st(cumSec)})` : "";
    return `${d}m:${seg}${paren}`;
  }).join(" ");
};

const BADGE_OPTIONS = [
  { label: "自己ベスト", color: "bg-orange-500" },
  { label: "組1位", color: "bg-blue-500" },
  { label: "県大会出場！", color: "bg-emerald-500" },
];

const EMPTY_ADD = { runnerId: "", raceType: RACE_TYPES.TRACK, distance: "1500m", ekidenDistance: "", date: "", status: "finish", resultTime: "", targetTime: "", dnsReason: "", dnfPoint: "" };

const TeamRaceReport = ({ reportTour, reportCards, onClose, handlePrint, canEdit, onSaveCard, onEditCard, onOpenCard, allRunners, onAddCard }) => {
  const [editingCard, setEditingCard] = useState(null);
  const [lapInput, setLapInput] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [addCardInput, setAddCardInput] = useState(EMPTY_ADD);
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  const submittedRunnerIds = new Set(reportCards.map((c) => c.runnerId));
  const unsubmittedRunners = (allRunners || []).filter((r) => !submittedRunnerIds.has(r.id));

  const [isOfficialResultOpen, setIsOfficialResultOpen] = useState(false);
  const [officialResultText, setOfficialResultText] = useState("");
  const [parsedResults, setParsedResults] = useState(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // 任意形式のタイム文字列を「分'秒"コンマ秒」形式に統一する
  const normalizeTimeStr = (str) => {
    if (!str || str === "DNS" || str === "DNF") return str;
    const s = str.replace(/[()（）\s]/g, "");
    let min = 0, sec = 0, hun = 0;

    const m1 = s.match(/^(\d+)[:'′](\d{2})[,."″](\d{1,2})$/);
    const m2 = s.match(/^(\d+)[:'′](\d{2})$/);
    const m3 = s.match(/^(\d+)[,."″](\d{1,2})$/);

    if (m1) {
      min = parseInt(m1[1]); sec = parseInt(m1[2]); hun = parseInt(m1[3].padEnd(2, "0"));
    } else if (m2) {
      min = parseInt(m2[1]); sec = parseInt(m2[2]);
    } else if (m3) {
      sec = parseInt(m3[1]); hun = parseInt(m3[2].padEnd(2, "0"));
    } else {
      return str;
    }

    // 秒が60以上なら分に繰り上げ
    min += Math.floor(sec / 60);
    sec = sec % 60;

    const ss = String(sec).padStart(2, "0");
    const cc = String(hun).padStart(2, "0");
    return min > 0 ? `${min}'${ss}"${cc}` : `${ss}"${cc}`;
  };

  const parseOfficialResult = (text) => {
    // 全角スペース・タブを半角スペースに統一して行分割
    const lines = text
      .replace(/　/g, " ").replace(/\t/g, " ")
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const nn = (s) => s.replace(/\s/g, "");
    const cardDist = (c) =>
      ((c.distance === "その他" ? c.ekidenDistance : c.distance) || "")
        .replace(/\s/g, "").toLowerCase();

    // タイム（例: 16:45.94 / 2:35.14 / 9'52"23）または DNS/DNF をアンカーとして使う
    const TIME_RE  = /\d{1,3}[:'′]\d{2}[\d"″.'']*/;
    const DNSDFN_RE = /\b(DNS|DNF)\b/i;
    const EVENT_RE  = /^\d+m(?:SC|W|HH|LH|H)?\b/i;
    const RANK_FRONT = /^(\d+位|[—ー－])\s*/;
    const RANK_BACK  = /\s*(\d+位)\s*$/;
    const HAS_JP     = (s) => /[぀-鿿一-鿿]/.test(s);

    const entries = [];
    for (const line of lines) {
      const timeMatch = line.match(TIME_RE);
      const dnsMatch  = line.match(DNSDFN_RE);

      if (!timeMatch && !dnsMatch) continue;

      // アンカー位置を特定（タイム優先）
      const anchor     = timeMatch ?? dnsMatch;
      const anchorStr  = timeMatch ? timeMatch[0] : dnsMatch[1].toUpperCase();
      const anchorIdx  = line.indexOf(anchor[0]);

      let before = line.slice(0, anchorIdx).trim();
      const after  = line.slice(anchorIdx + anchor[0].length).trim();

      // --- 順位の抽出（前 or 後） ---
      let rankVal = null;
      const rfFront = before.match(RANK_FRONT);
      if (rfFront) {
        rankVal = /\d+位/.test(rfFront[1]) ? parseInt(rfFront[1]) : null;
        before  = before.slice(rfFront[0].length).trim();
      }
      const rfBack = after.match(RANK_BACK);
      if (rfBack && rankVal === null) rankVal = parseInt(rfBack[1]);

      // --- 種目の抽出（先頭にある場合） ---
      let eventStr = "";
      const evM = before.match(EVENT_RE);
      if (evM) {
        eventStr = evM[0].replace(/\s/g, "");
        before   = before.slice(evM[0].length).trim();
      }

      // --- 残りが選手名 ---
      // 学校名等の余分な情報が混入する場合に備えて日本語部分のみ抽出
      const name = before.replace(/[a-zA-Z0-9()（）\-_/\\・]/g, " ").replace(/\s+/g, " ").trim();
      if (!name || !HAS_JP(name)) continue;

      const isDns = !timeMatch || (dnsMatch && !timeMatch);
      const isDnf = dnsMatch && dnsMatch[1].toUpperCase() === "DNF";

      // --- カード検索：名前 + 種目 → 名前のみ にフォールバック ---
      const card =
        reportCards.find((c) =>
          nn(c.runnerName).includes(nn(name)) &&
          eventStr && cardDist(c) === eventStr.toLowerCase()
        ) ||
        reportCards.find((c) =>
          nn(c.runnerName).includes(nn(name)) ||
          nn(name).includes(nn(c.runnerName))
        );

      entries.push({
        rank: rankVal,
        name,
        event: eventStr,
        resultTime: (isDns || isDnf) ? "" : normalizeTimeStr(anchorStr),
        status: isDnf ? "dnf" : isDns ? "dns" : "finish",
        card,
      });
    }
    return entries;
  };
  const [editingFullCard, setEditingFullCard] = useState(null);
  const [fullEditInput, setFullEditInput] = useState({});
  const [isSavingFull, setIsSavingFull] = useState(false);

  const openEdit = (card) => {
    setEditingCard({ ...card });
    setLapInput(card.lapTimes || "");
  };

  const openFullEdit = (card) => {
    setEditingFullCard(card);
    setFullEditInput({
      date: card.date || "",
      status: card.status || "finish",
      dnsReason: card.dnsReason || "",
      dnfPoint: card.dnfPoint || "",
      resultTime: card.resultTime || "",
      lapTimes: card.lapTimes || "",
      targetTime: card.targetTime || "",
      racePlan: card.racePlan || "",
      wupPlan: card.wupPlan || "",
      goodPoints: card.goodPoints || "",
      issues: card.issues || "",
      nextGoal: card.nextGoal || "",
      teammateGoodPoints: card.teammateGoodPoints || "",
      badges: card.badges || [],
    });
  };

  const toggleBadge = (label) => {
    setFullEditInput((prev) => {
      const cur = prev.badges || [];
      return {
        ...prev,
        badges: cur.includes(label) ? cur.filter((b) => b !== label) : [...cur, label],
      };
    });
  };

  const saveFullEdit = async () => {
    if (!onEditCard) return;
    setIsSavingFull(true);
    try {
      await onEditCard(editingFullCard.id, fullEditInput);
      setEditingFullCard(null);
    } finally {
      setIsSavingFull(false);
    }
  };

  if (!reportTour) return null;

  // コンディション表示用のグループ化
  const conditionsMap = {};
  reportCards.forEach((c) => {
    const actualDate = c.date || reportTour.startDate;
    const actualWeather = c.weather || "晴れ";
    const actualWind = c.wind || "無風";

    let score = 0;
    if (c.temp) score += 10;
    if (c.humidity) score += 10;
    if (c.weather) score += 1;
    if (c.wind) score += 1;

    const key = actualDate || "single";
    if (!conditionsMap[key] || score > conditionsMap[key].score) {
      conditionsMap[key] = {
        date: actualDate,
        weather: actualWeather,
        wind: actualWind,
        temp: c.temp,
        humidity: c.humidity,
        score: score,
      };
    }
  });

  const conditionList = Object.values(conditionsMap).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date > b.date ? 1 : -1;
  });

  const parseMeters = (d) => {
    if (!d) return 0;
    const s = String(d).toLowerCase();
    if (s.includes("ハーフ")) return 21097.5;
    if (s.includes("フル")) return 42195;
    const val = parseFloat(s.replace(/[^0-9.]/g, ""));
    if (isNaN(val)) return 0;
    if (s.includes("km")) return val * 1000;
    if (val < 100) return val * 1000;
    return val;
  };

  // 日付でグループ化
  const cardsByDate = {};
  reportCards.forEach((card) => {
    const cardDate = card.date || reportTour.startDate || "日付不明";
    if (!cardsByDate[cardDate]) cardsByDate[cardDate] = [];
    cardsByDate[cardDate].push(card);
  });

  // 日付昇順
  const sortedDates = Object.keys(cardsByDate).sort((a, b) => (a > b ? 1 : -1));

  // 各日付内: 距離昇順 → 記録昇順（DNS/DNF は末尾）
  sortedDates.forEach((d) => {
    cardsByDate[d].sort((a, b) => {
      const dm = parseMeters(a.distance) - parseMeters(b.distance);
      if (dm !== 0) return dm;
      // 記録昇順（未入力・DNS/DNF は末尾）
      const ta = timeToSeconds(a.resultTime);
      const tb = timeToSeconds(b.resultTime);
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return ta - tb;
    });
  });

  return (<>
    <div className="fixed inset-0 z-[120] bg-slate-50 flex flex-col animate-in fade-in print:absolute print:inset-auto print:top-0 print:left-0 print:w-full print:h-auto print:bg-white print:overflow-visible">
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md pt-12 pb-6 print:hidden">
        <button
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
            Team Race Report
          </p>
          <h2 className="font-bold text-sm">今大会チームレポート</h2>
        </div>

        <button
          onClick={() => {
            const yyyymmdd = (reportTour.startDate || "").replace(/-/g, "");
            if (handlePrint) {
              handlePrint(`${yyyymmdd}_${reportTour.name || "大会"}_result`);
            } else {
              window.print();
            }
          }}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
          title="レポートを印刷（PDF保存）"
        >
          <Printer size={20} />
        </button>
        {canEdit && onEditCard && (
          <button
            onClick={() => { setOfficialResultText(""); setParsedResults(null); setIsOfficialResultOpen(true); }}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors print:hidden"
            title="公式記録を一括入力"
          >
            <FileText size={20} />
          </button>
        )}
        {canEdit && onAddCard && unsubmittedRunners.length > 0 && (
          <button
            onClick={() => { setAddCardInput({ ...EMPTY_ADD, date: reportTour.startDate || "" }); setIsAddingCard(true); }}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors print:hidden"
            title="未提出選手のカードを追加"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-20 max-w-7xl mx-auto w-full print:p-0 print:overflow-visible print:block print:h-auto">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:shadow-none print:border-none print:p-2">
          <h1 className="text-2xl font-black text-slate-800 mb-2">
            {reportTour.name}
          </h1>
          <p className="text-sm font-bold text-slate-400 mb-4">
            {reportTour.startDate.replace(/-/g, "/")} 〜{" "}
            {reportTour.endDate?.replace(/-/g, "/") || ""}
          </p>

          {/* コンディション表示部 */}
          {conditionList.length === 0 ? (
            <div className="bg-slate-50 p-4 rounded-2xl text-center print:bg-white print:border print:border-slate-200">
              <p className="text-xs font-bold text-slate-400">
                コンディション未入力
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conditionList.map((cond, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl print:bg-white print:border print:border-slate-200"
                >
                  {cond.date && (
                    <div className="font-black text-slate-500 w-12 text-center border-r border-slate-200 pr-2">
                      <p className="text-[10px] leading-tight">
                        {cond.date.slice(5).replace("-", "/")}
                      </p>
                    </div>
                  )}
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Weather
                      </p>
                      <p className="font-bold text-slate-700 text-sm">
                        {cond.weather || "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Wind
                      </p>
                      <p className="font-bold text-slate-700 text-sm">
                        {cond.wind || "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 flex items-center justify-center gap-0.5">
                        <Thermometer size={10} className="text-rose-400" /> Temp
                      </p>
                      <p className="font-bold text-slate-700 text-sm">
                        {cond.temp ? `${cond.temp}℃` : "-"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black text-slate-400 flex items-center justify-center gap-0.5">
                        <Droplets size={10} className="text-blue-400" /> Humid
                      </p>
                      <p className="font-bold text-slate-700 text-sm">
                        {cond.humidity ? `${cond.humidity}%` : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 選手記録一覧（日付ごとグループ化） */}
        <div>
          {sortedDates.length === 0 ? (
            <p className="text-center py-10 text-slate-300 font-bold bg-white rounded-3xl border border-slate-100">
              まだ記録がありません
            </p>
          ) : (
            <div className="space-y-12">
              {sortedDates.map((dateStr) => (
                <div key={dateStr} className="space-y-4">
                  {/* 日付ごとの美しい見出しバー */}
                  <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest ml-2 flex items-center gap-2 border-b-2 border-indigo-100 pb-2 print:text-slate-800 print:border-slate-800">
                    <Calendar size={18} />
                    {dateStr === "日付不明"
                      ? dateStr
                      : `${dateStr.replace(/-/g, "/")} `}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
                    {cardsByDate[dateStr].map((card) => {
                      const analysis = analyzeLaps(
                        card.lapTimes,
                        card.raceType,
                        card.distance,
                        card.ekidenDistance,
                      );

                      return (
                        <div
                          key={card.id}
                          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col print:shadow-none print:break-inside-avoid print:border print:p-4 w-full overflow-hidden"
                        >
                          <div className="flex justify-between items-start border-b border-slate-50 pb-3 mb-3 print:border-slate-200">
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-black text-xl text-slate-800">
                                  {card.runnerName}
                                </p>
                                <div className="flex items-center gap-1 print:hidden">
                                  {onOpenCard && (
                                    <button
                                      onClick={() => onOpenCard(card)}
                                      className="flex-shrink-0 flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                                    >
                                      詳細 →
                                    </button>
                                  )}
                                  {canEdit && onEditCard && (
                                    <button
                                      onClick={() => openFullEdit(card)}
                                      className="flex-shrink-0 flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                                    >
                                      <Edit size={12} /> 編集
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1 mb-1">
                                {(card.badges || []).map((badge) => (
                                  <span
                                    key={badge}
                                    className={`text-[8px] font-black px-2 py-0.5 rounded-md text-white print:border print:text-slate-700 ${
                                      badge === "自己ベスト"
                                        ? "bg-orange-500 print:border-orange-500"
                                        : badge === "組1位"
                                          ? "bg-blue-500 print:border-blue-500"
                                          : "bg-emerald-500 print:border-emerald-500"
                                    }`}
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                              <p className="text-[10px] font-bold text-indigo-500 mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded-md print:bg-transparent print:px-0">
                                {card.raceType} /{" "}
                                {card.distance === "その他"
                                  ? card.ekidenDistance
                                  : card.raceType === "駅伝"
                                    ? `${card.distance}(${card.ekidenDistance}km)`
                                    : card.distance}
                              </p>
                            </div>
                            <div className="text-right bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 print:bg-transparent print:border-none print:p-0 relative">
                              <p className="text-[10px] font-black text-slate-400 mb-0.5 flex items-center justify-end gap-1">
                                RESULT
                                {canEdit && (
                                  <button
                                    onClick={() => openEdit(card)}
                                    className="ml-1 text-slate-300 hover:text-blue-500 transition-colors print:hidden"
                                  >
                                    <Edit size={11} />
                                  </button>
                                )}
                              </p>
                              <p
                                className={`whitespace-nowrap print:text-slate-800 ${
                                  card.status === "dns"
                                    ? "text-xs font-bold text-slate-400"
                                    : card.status === "dnf"
                                      ? "text-sm font-bold text-slate-500"
                                      : "text-xl font-black tracking-tighter text-indigo-600"
                                }`}
                              >
                                {card.status === "dns"
                                  ? `DNS (${card.dnsReason || "棄権"})`
                                  : card.status === "dnf"
                                    ? `DNF (${card.dnfPoint || "途中棄権"})`
                                    : card.resultTime || "未入力"}
                              </p>
                            </div>
                          </div>

                          {card.lapTimes ? (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex-1 print:bg-white print:p-2 print:border-none w-full">
                              <p className="text-[9px] font-black text-slate-400 flex items-center gap-1 mb-2">
                                <Timer size={10} /> LAP TIMES
                              </p>
                              <div className="flex flex-col gap-0.5">
                                {analysis && analysis.formattedLines
                                  ? analysis.formattedLines.map((lap, idx) => (
                                      <span
                                        key={idx}
                                        className={`text-xs font-mono font-bold block tracking-tight ${
                                          lap.startsWith("AVG")
                                            ? "text-indigo-500 mt-1"
                                            : "text-slate-600"
                                        }`}
                                      >
                                        {lap}
                                      </span>
                                    ))
                                  : card.lapTimes
                                      .split(/\n/)
                                      .map((lap, idx) => (
                                        <span
                                          key={idx}
                                          className="text-xs font-mono text-slate-600 font-bold block tracking-tight"
                                        >
                                          {lap}
                                        </span>
                                      ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-center">
                              <p className="text-xs text-slate-300 font-bold bg-slate-50 px-4 py-2 rounded-xl">
                                LAP未入力
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    {/* 監督用 Result / LAP 編集モーダル */}
    {canEdit && editingCard && (
      <LapTimeModal
        key={editingCard.id}
        editingCard={editingCard}
        onClose={() => setEditingCard(null)}
        lapInput={lapInput}
        setLapInput={setLapInput}
        onSave={async () => {
          if (onSaveCard) {
            await onSaveCard(editingCard.id, {
              resultTime: editingCard.resultTime || "",
              lapTimes: lapInput,
            });
          }
          setEditingCard(null);
        }}
        onResultChange={(newResult) =>
          setEditingCard({ ...editingCard, resultTime: newResult })
        }
      />
    )}

    {/* フルカード編集モーダル */}
    {canEdit && editingFullCard && (
      <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-lg max-h-[90dvh] rounded-[2rem] flex flex-col shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カード編集</p>
              <p className="font-black text-lg text-slate-800">{editingFullCard.runnerName}</p>
            </div>
            <button onClick={() => setEditingFullCard(null)} className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">レース日</label>
              <input type="date" value={fullEditInput.date} onChange={(e) => setFullEditInput((p) => ({ ...p, date: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">ステータス</label>
              <div className="flex gap-2">
                {[{ id: "finish", label: "Finish" }, { id: "dns", label: "DNS" }, { id: "dnf", label: "DNF" }].map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setFullEditInput((p) => ({ ...p, status: s.id }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${(fullEditInput.status || "finish") === s.id ? "bg-slate-800 text-white shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              {fullEditInput.status === "dns" && (
                <div className="mt-2">
                  <label className="text-[10px] font-black text-rose-500 block mb-1">欠場理由</label>
                  <div className="flex flex-wrap gap-2">
                    {["体調不良", "故障", "家事都合", "その他"].map((r) => (
                      <button key={r} type="button"
                        onClick={() => setFullEditInput((p) => ({ ...p, dnsReason: r }))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${fullEditInput.dnsReason === r ? "bg-rose-500 text-white" : "bg-white text-rose-400 border border-rose-200 hover:bg-rose-50"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {fullEditInput.status === "dnf" && (
                <div className="mt-2">
                  <label className="text-[10px] font-black text-amber-500 block mb-1">途中棄権地点</label>
                  <input type="text" value={fullEditInput.dnfPoint} onChange={(e) => setFullEditInput((p) => ({ ...p, dnfPoint: e.target.value }))} placeholder="例：3000m地点" className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-amber-200 focus:border-amber-400" />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">目標タイム</label>
                <input type="text" value={fullEditInput.targetTime} onChange={(e) => setFullEditInput((p) => ({ ...p, targetTime: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">実際のタイム</label>
                <input type="text" value={fullEditInput.resultTime} onChange={(e) => setFullEditInput((p) => ({ ...p, resultTime: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ラップタイム</label>
              <textarea value={fullEditInput.lapTimes} onChange={(e) => setFullEditInput((p) => ({ ...p, lapTimes: e.target.value }))} rows={4} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-mono font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 resize-none" />
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
                <textarea value={fullEditInput[key]} onChange={(e) => setFullEditInput((p) => ({ ...p, [key]: e.target.value }))} rows={2} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 resize-none" />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2"><Award size={10} /> 達成バッジ</label>
              <div className="flex flex-wrap gap-2">
                {BADGE_OPTIONS.map((b) => (
                  <button key={b.label} type="button" onClick={() => toggleBadge(b.label)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${(fullEditInput.badges || []).includes(b.label) ? `${b.color} text-white shadow-md scale-105` : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button onClick={saveFullEdit} disabled={isSavingFull}
              className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 shadow-md">
              <Save size={16} /> {isSavingFull ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* 公式記録一括入力モーダル */}
    {isOfficialResultOpen && (
      <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-lg max-h-[90dvh] rounded-[2rem] flex flex-col shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Official Result 一括入力</p>
              <p className="font-black text-lg text-slate-800">{reportTour.name}</p>
            </div>
            <button onClick={() => setIsOfficialResultOpen(false)} className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
            {!parsedResults ? (
              <>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  公式結果のテキストをそのまま貼り付けてください。<br/>
                  例：【少年A女子800m】26位矢冨 想良菜2:35.14 6組 6レーン…
                </p>
                <textarea
                  value={officialResultText}
                  onChange={(e) => setOfficialResultText(e.target.value)}
                  placeholder="ここに公式結果を貼り付け..."
                  rows={6}
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm font-mono text-slate-700 outline-none border border-slate-200 focus:border-blue-400 resize-none"
                />
                <button
                  onClick={() => setParsedResults(parseOfficialResult(officialResultText))}
                  disabled={!officialResultText.trim()}
                  className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  解析する
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {parsedResults.length === 0 && (
                    <p className="text-sm text-rose-500 font-bold text-center py-4">解析できるデータが見つかりませんでした。形式を確認してください。</p>
                  )}
                  {parsedResults.map((entry, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border ${entry.card ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${entry.card ? "bg-emerald-500" : "bg-rose-400"}`}>
                        {entry.card ? <Check size={14} className="text-white" /> : <AlertCircle size={14} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800">{entry.name}</p>
                        <p className="text-[10px] font-bold text-slate-500">
                          {entry.event && <span className="mr-1">{entry.event}</span>}
                          {entry.status === "dns" ? "DNS" : entry.status === "dnf" ? "DNF" : entry.resultTime}
                          {entry.rank && ` · ${entry.rank}位`}
                        </p>
                      </div>
                      {!entry.card && <span className="text-[10px] font-black text-rose-500 flex-shrink-0">カードなし</span>}
                    </div>
                  ))}
                  {/* テキストに記録がないカード */}
                  {(() => {
                    const matchedCardIds = new Set(parsedResults.filter((e) => e.card).map((e) => e.card.id));
                    const unmatched = reportCards.filter((c) => !matchedCardIds.has(c.id));
                    if (unmatched.length === 0) return null;
                    return (
                      <div className="mt-2 pt-3 border-t border-slate-100 space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">記録テキストに含まれていないカード</p>
                        {unmatched.map((c) => (
                          <div key={c.id} className="flex items-center gap-3 p-3 rounded-2xl border bg-slate-50 border-slate-200 opacity-60">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center">
                              <span className="text-white text-[10px] font-black">—</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-slate-600">{c.runnerName}</p>
                              <p className="text-[10px] font-bold text-slate-400">
                                {c.distance}{c.ekidenDistance ? `(${c.ekidenDistance})` : ""}
                                {c.resultTime ? ` · ${c.resultTime}` : " · 記録未入力"}
                              </p>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 flex-shrink-0">テキスト未掲載</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setParsedResults(null)} className="flex-1 py-2.5 rounded-2xl font-black text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all">
                    やり直す
                  </button>
                  <button
                    onClick={async () => {
                      setIsSavingBatch(true);
                      try {
                        const matched = parsedResults.filter((e) => e.card);
                        for (const entry of matched) {
                          const card = entry.card;
                          const adjustedLapTimes = entry.status === "finish" && card.lapTimes
                            ? adjustLapTimesForResult(
                                card.lapTimes,
                                entry.resultTime,
                                card.raceType,
                                card.distance,
                                card.ekidenDistance,
                              )
                            : undefined;
                          await onEditCard(card.id, {
                            resultTime: entry.resultTime,
                            status: entry.status,
                            ...(adjustedLapTimes != null ? { lapTimes: adjustedLapTimes } : {}),
                            ...(entry.status === "dns" ? { dnsReason: "棄権" } : {}),
                          });
                        }
                        setIsOfficialResultOpen(false);
                        setParsedResults(null);
                        setOfficialResultText("");
                      } finally {
                        setIsSavingBatch(false);
                      }
                    }}
                    disabled={!parsedResults.some((e) => e.card) || isSavingBatch}
                    className="flex-1 py-2.5 rounded-2xl font-black text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Save size={14} /> {isSavingBatch ? "反映中..." : `${parsedResults.filter((e) => e.card).length}件を反映`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}

    {/* 未提出選手カード追加モーダル */}
    {isAddingCard && (
      <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-lg max-h-[90dvh] rounded-[2rem] flex flex-col shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">カード追加</p>
              <p className="font-black text-lg text-slate-800">{reportTour.name}</p>
            </div>
            <button onClick={() => setIsAddingCard(false)} className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            {/* 選手選択 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">選手</label>
              <select
                value={addCardInput.runnerId}
                onChange={(e) => {
                  const r = unsubmittedRunners.find((r) => r.id === e.target.value);
                  setAddCardInput((p) => ({ ...p, runnerId: e.target.value, runnerName: r ? `${r.lastName} ${r.firstName}` : "" }));
                }}
                className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
              >
                <option value="">選手を選択...</option>
                {unsubmittedRunners.map((r) => (
                  <option key={r.id} value={r.id}>{r.lastName} {r.firstName}</option>
                ))}
              </select>
            </div>
            {/* レース日 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">レース日</label>
              <input type="date" value={addCardInput.date} onChange={(e) => setAddCardInput((p) => ({ ...p, date: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
            </div>
            {/* 種目 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">区分</label>
                <select
                  value={addCardInput.raceType}
                  onChange={(e) => setAddCardInput((p) => ({ ...p, raceType: e.target.value, distance: RACE_DISTANCES[e.target.value][0], ekidenDistance: "" }))}
                  className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                >
                  {Object.values(RACE_TYPES).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">距離・種目</label>
                <select
                  value={addCardInput.distance}
                  onChange={(e) => setAddCardInput((p) => ({ ...p, distance: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                >
                  {RACE_DISTANCES[addCardInput.raceType].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            {(addCardInput.distance === "その他") && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">詳細</label>
                <input type="text" value={addCardInput.ekidenDistance} onChange={(e) => setAddCardInput((p) => ({ ...p, ekidenDistance: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
              </div>
            )}
            {/* ステータス */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">ステータス</label>
              <div className="flex gap-2">
                {[{ id: "finish", label: "Finish" }, { id: "dns", label: "DNS" }, { id: "dnf", label: "DNF" }].map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => setAddCardInput((p) => ({ ...p, status: s.id }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${addCardInput.status === s.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              {addCardInput.status === "dns" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {["体調不良", "故障", "家事都合", "その他"].map((r) => (
                    <button key={r} type="button" onClick={() => setAddCardInput((p) => ({ ...p, dnsReason: r }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${addCardInput.dnsReason === r ? "bg-rose-500 text-white" : "bg-white text-rose-400 border border-rose-200 hover:bg-rose-50"}`}>{r}</button>
                  ))}
                </div>
              )}
              {addCardInput.status === "dnf" && (
                <input type="text" value={addCardInput.dnfPoint} onChange={(e) => setAddCardInput((p) => ({ ...p, dnfPoint: e.target.value }))} placeholder="例：3000m地点" className="mt-2 w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-amber-200 focus:border-amber-400" />
              )}
            </div>
            {/* タイム */}
            {addCardInput.status !== "dns" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">目標タイム</label>
                  <input type="text" value={addCardInput.targetTime} onChange={(e) => setAddCardInput((p) => ({ ...p, targetTime: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">実際のタイム</label>
                  <input type="text" value={addCardInput.resultTime} onChange={(e) => setAddCardInput((p) => ({ ...p, resultTime: e.target.value }))} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
            <button
              onClick={async () => {
                if (!addCardInput.runnerId) return;
                setIsSavingAdd(true);
                try {
                  await onAddCard({ ...addCardInput, tournamentId: reportTour.id });
                  setIsAddingCard(false);
                } finally {
                  setIsSavingAdd(false);
                }
              }}
              disabled={!addCardInput.runnerId || isSavingAdd}
              className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 shadow-md"
            >
              <Save size={16} /> {isSavingAdd ? "登録中..." : "カードを登録する"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>);
};

export default TeamRaceReport;
