/*
 * TeamRaceReport — チーム大会レポート画面
 *
 * チーム全員の大会振り返りシートを一覧で表示する画面。
 * 日付ごとにグループ化して並べ、印刷・PDF出力にも対応している。
 */
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Trash2,
} from "lucide-react";
import LapTimeModal from "./LapTimeModal";
import { RACE_TYPES, RACE_DISTANCES } from "../utils/constants";
import {
  getTournamentLegs,
  legsLabels,
  legsDistance,
  legIndexFromLabel,
} from "../data/ekidenPresets";
import {
  timeToSeconds,
  secondsToTime,
  analyzeLaps,
  buildSplits,
  flexTimeToSeconds,
  normalizeQuotes,
} from "../utils/lapUtils";

// SmartLapInput と同じロジックで resultTime に合わせて最終 LAP を逆算する
const adjustLapTimesForResult = (lapTimesStr, newResultTime, raceType, distanceStr, ekidenDist) => {
  if (!lapTimesStr || !newResultTime) return lapTimesStr;

  const ts = timeToSeconds;
  const st = secondsToTime;

  const splits = buildSplits(raceType, distanceStr, ekidenDist);
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
  { label: "学校記録", color: "bg-rose-500" },
  { label: "県大会出場", color: "bg-emerald-500" },
];

const EMPTY_ADD = { runnerId: "", teamId: "", raceType: RACE_TYPES.TRACK, distance: "1500m", ekidenDistance: "", date: "", status: "finish", resultTime: "", targetTime: "", dnsReason: "", dnfPoint: "" };

const BadgeChips = ({ badges }) =>
  (badges || []).length === 0 ? null : (
    <span className="inline-flex gap-1 align-middle">
      {badges.map((b) => (
        <span
          key={b}
          className={`text-[8px] font-black px-1.5 py-0.5 rounded-md text-white print:border print:text-slate-700 print:bg-white ${
            b === "自己ベスト" ? "bg-orange-500" : b === "組1位" ? "bg-blue-500" : b === "学校記録" ? "bg-rose-500" : "bg-emerald-500"
          }`}
        >
          {b}
        </span>
      ))}
    </span>
  );

// チーム総合タイム表示＋（監督のみ）手入力の上書きと学校記録バッジ
const TeamTotalBlock = ({ computed, result, canEdit, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState("");
  const [badges, setBadges] = useState([]);
  const shownTime = (result && result.totalTime) || computed;
  const shownBadges = (result && result.badges) || [];
  const open = () => {
    setTime((result && result.totalTime) || "");
    setBadges(shownBadges);
    setEditing(true);
  };
  const save = async () => {
    await onSave({ totalTime: time.trim(), badges });
    setEditing(false);
  };
  return (
    <div className="text-right">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
        総合タイム
        {canEdit && onSave && !editing && (
          <button type="button" onClick={open} className="ml-2 text-indigo-500 underline print:hidden">編集</button>
        )}
      </p>
      <p className="font-mono font-black text-indigo-600 text-base leading-none">{shownTime}</p>
      {shownBadges.length > 0 && (
        <div className="flex flex-wrap justify-end gap-1 mt-1">
          {shownBadges.map((b) => (
            <span key={b} className="text-[8px] font-black px-2 py-0.5 rounded-md text-white bg-rose-500 print:border print:border-rose-500 print:text-slate-700 print:bg-white">{b}</span>
          ))}
        </div>
      )}
      {editing && (
        <div className="mt-2 p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-left print:hidden">
          <input
            type="text"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder={`手入力（空欄=自動 ${computed}）`}
            className="w-full p-2 bg-slate-50 rounded-lg text-sm font-mono font-bold text-slate-700 outline-none border border-slate-200"
          />
          <div className="flex flex-wrap gap-2">
            {["学校記録"].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setBadges((p) => (p.includes(label) ? p.filter((x) => x !== label) : [...p, label]))}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black ${badges.includes(label) ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg bg-slate-100 text-xs font-black text-slate-500">キャンセル</button>
            <button type="button" onClick={save} className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-xs font-black text-white">保存</button>
          </div>
        </div>
      )}
    </div>
  );
};

const TeamRaceReport = ({ reportTour, reportCards, onClose, handlePrint, canEdit, onSaveTeamResult, onSaveConditions, onSaveCard, onEditCard, onDeleteCard, onOpenCard, allRunners, lookupRunners, onAddCard }) => {
  const [editingCard, setEditingCard] = useState(null);
  const [editingCondDate, setEditingCondDate] = useState(null);
  const [condForm, setCondForm] = useState({ weather: "", wind: "", temp: "", humidity: "" });
  const [lapInput, setLapInput] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [addCardInput, setAddCardInput] = useState(EMPTY_ADD);
  const [isSavingAdd, setIsSavingAdd] = useState(false);

  // 印刷時にアプリ本体(#root)を隠すためのフラグを body に付与する。
  // レポートは document.body 直下へ portal するため、背後の他画面が
  // 印刷範囲に混入しない（他大会名の余計なページ対策）。
  useEffect(() => {
    document.body.classList.add("team-report-open");
    return () => document.body.classList.remove("team-report-open");
  }, []);

  const submittedRunnerIds = new Set(reportCards.map((c) => c.runnerId));
  const unsubmittedRunners = (allRunners || []).filter((r) => !submittedRunnerIds.has(r.id));
  // 提出済みの選手（複数日・複数種目に出た場合、追加カードを登録できるようにする）
  const submittedRunners = (allRunners || []).filter((r) => submittedRunnerIds.has(r.id));
  // 選手ごとの出場種目（提出済みグループに「1500m・5000m」等と表示）
  const eventsByRunner = reportCards.reduce((m, c) => {
    const label =
      c.distance === "その他"
        ? c.ekidenDistance || "その他"
        : c.distance || c.ekidenDistance || "";
    if (!m[c.runnerId]) m[c.runnerId] = [];
    if (label && !m[c.runnerId].includes(label)) m[c.runnerId].push(label);
    return m;
  }, {});

  // 駅伝プリセット（カード追加フォーム用）。選手の性別＋大会プリセットで区間距離を自動反映。
  const addRunner = (allRunners || []).find((r) => r.id === addCardInput.runnerId);
  const addGender = addRunner?.gender;
  const addEkidenLegs = getTournamentLegs(reportTour);
  const addPresetLegs =
    addCardInput.raceType === RACE_TYPES.EKIDEN
      ? legsLabels(addEkidenLegs, addGender)
      : null;
  const addUsingPreset = !!addPresetLegs;
  const addDistanceOptions = addUsingPreset
    ? addPresetLegs
    : RACE_DISTANCES[addCardInput.raceType];

  const [isOfficialResultOpen, setIsOfficialResultOpen] = useState(false);
  const [officialResultText, setOfficialResultText] = useState("");
  const [parsedResults, setParsedResults] = useState(null);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  // LAPタイム一括入力
  const [isLapBatchOpen, setIsLapBatchOpen] = useState(false);
  const [lapBatchText, setLapBatchText] = useState("");
  const [parsedLaps, setParsedLaps] = useState(null);
  const [isSavingLapBatch, setIsSavingLapBatch] = useState(false);

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

  // 手元記録のLAPタイムを一括入力する。
  // 入力例:
  //   男子1500m
  //   小池
  //   64"36
  //   71"80 2'16"16   ← 各行「区間タイム [累積タイム]」
  // 各ブロックのLAP行数が種目の区間数と一致すれば、順に区間へ割り当てる。
  const parseLapText = (text) => {
    // 全角記号を正規化。種目見出しは必ず行頭に来るよう改行を挿入
    let norm = normalizeQuotes(
      (text || "")
        .replace(/　/g, " ")
        .replace(/[Ｓｓ]/g, "S")
        .replace(/[Ｃｃ]/g, "C")
        .replace(/[Ｍｍ]/g, "m"),
    );
    // 性別見出し（男子/女子）が前の行末に連結しているとき改行で切り離す
    norm = norm.replace(/(男子|女子)(?=\s*\d)/g, "\n$1");
    const rawLines = norm.split(/\n/).map((l) => l.trim()).filter(Boolean);

    // 見出し: 「男子1500m」のほか、性別やmの省略、見出しと選手名が同じ行（例「800田村」）にも対応。
    //   g1=距離 / g2=SC / g3=同じ行に続く選手名（任意）
    const HEADER_RE = /^(?:(?:男子|女子|男|女)\s*)?(\d{3,5})\s*m?\s*(SC)?\s*(.*)$/i;
    const HAS_JP = (s) => /[぀-鿿一-龿]/.test(s);
    // 先頭トークンがタイムか判定（区切り記号を含み、秒換算が正のもの）
    const segSeconds = (line) => {
      const tok = line.split(/\s+/)[0] || "";
      if (!/[.:'"′″]/.test(tok)) return 0; // 区切りの無い裸の数字（例 5000）は見出し扱い
      return flexTimeToSeconds(tok);
    };
    const nn = (s) => (s || "").replace(/\s/g, "");
    const cardEvent = (c) =>
      ((c.distance === "その他" ? c.ekidenDistance : c.distance) || "")
        .replace(/\s/g, "").toLowerCase();

    // ブロック分割（1見出しの下に複数選手を並べてもOK）
    const cleanName = (line) =>
      line.replace(/[a-zA-Z0-9()（）\-_/\\・,.]/g, " ").replace(/\s+/g, " ").trim();
    const blocks = [];
    let cur = null;
    for (const line of rawLines) {
      // 先頭がタイムの行（区間タイム）は見出しと誤認しない
      const segSec = segSeconds(line);
      const h = segSec > 0 ? null : line.match(HEADER_RE);
      if (h) {
        if (cur) blocks.push(cur);
        cur = { distanceStr: `${h[1]}m${h[2] ? "SC" : ""}`, name: "", laps: [] };
        const gluedName = cleanName(h[3] || "");
        if (gluedName) cur.name = gluedName; // 「800田村」のように同じ行に選手名があるとき
        continue;
      }
      if (!cur) continue;
      if (segSec > 0) {
        // 各行の先頭（区間タイム）のみ読み取る。以降の累積タイムは無視して自動計算する。
        // 秒・ドット表記（90"99 / 37.72 / 1.12.84）はすべて分表記（1'30"99）へ正規化。
        cur.laps.push({ seg: secondsToTime(segSec) });
        continue;
      }
      if (HAS_JP(line)) {
        const nm = cleanName(line);
        if (!nm) continue;
        if (!cur.name) {
          cur.name = nm;
        } else if (cur.laps.length > 0) {
          // 同一種目の次の選手：現ブロックを確定し、種目を引き継いで新ブロックを開始
          blocks.push(cur);
          cur = { distanceStr: cur.distanceStr, name: nm, laps: [] };
        } else {
          // 名前が連続（LAP無し）→ 上書き
          cur.name = nm;
        }
      }
    }
    if (cur) blocks.push(cur);

    // カードに自動マッチ（プレビューで選び直し・編集できるよう最小限の形で返す）
    return blocks
      .filter((b) => b.name && b.laps.length > 0)
      .map((b) => {
        const evLower = b.distanceStr.toLowerCase();
        const card =
          reportCards.find(
            (c) => nn(c.runnerName).includes(nn(b.name)) && cardEvent(c) === evLower,
          ) ||
          reportCards.find((c) => nn(c.runnerName).includes(nn(b.name)));
        const splits = card ? buildSplits(card.raceType, card.distance, card.ekidenDistance) : [];
        // 各区間にデフォルトの距離を仮設定（確認画面で手修正できる）
        const laps =
          splits.length === b.laps.length
            ? b.laps.map((l, i) => ({ ...l, dist: splits[i] }))
            : b.laps.map((l) => ({ ...l, dist: "" }));
        return { distanceStr: b.distanceStr, name: b.name, cardId: card ? card.id : "", laps };
      });
  };

  // プレビュー行から表示・保存用の値を計算（カード選択・LAP編集のたびに再計算する）
  const normLapTime = (t) =>
    normalizeQuotes(t).replace(/\.\s*$/, "").replace(/\s/g, "");
  const deriveLapEntry = (entry) => {
    const card = reportCards.find((c) => c.id === entry.cardId) || null;
    const defaultSplits = card ? buildSplits(card.raceType, card.distance, card.ekidenDistance) : [];
    const laps = entry.laps || [];
    // 累積は区間タイムの合計で自動計算する（手入力の累積は読み取らない＝入力ミスを防ぐ）
    let run = 0;
    const lapCumuls = laps.map((l) => {
      run += timeToSeconds(normLapTime(l.seg));
      return run > 0 ? secondsToTime(run) : "";
    });
    // 有効条件: すべての区間に有効な距離(>0・昇順)と区間タイムがある
    const dists = laps.map((l) => parseInt(l.dist) || 0);
    const segsValid = laps.length > 0 && laps.every((l) => timeToSeconds(normLapTime(l.seg)) > 0);
    const distsValid =
      dists.length > 0 && dists.every((dd, i) => dd > 0 && (i === 0 || dd > dists[i - 1]));
    const fits = segsValid && distsValid;
    const distsMatchDefault =
      defaultSplits.length === laps.length && dists.every((dd, i) => dd === defaultSplits[i]);
    let lapTimes = "";
    let resultTime = "";
    if (fits) {
      let cumSec = 0;
      lapTimes = laps
        .map((l) => {
          const segSec = timeToSeconds(normLapTime(l.seg));
          cumSec += segSec;
          return `${parseInt(l.dist)}m:${secondsToTime(segSec)}(${secondsToTime(cumSec)})`;
        })
        .join(" ");
      resultTime = secondsToTime(cumSec);
    }
    // 既存データ（上書きになる場合の差分表示用）
    const existingResult = (card && card.resultTime) || "";
    const hasExistingLaps = !!(card && card.lapTimes);
    const resultChanged =
      !!(fits && existingResult) &&
      Math.abs(timeToSeconds(normLapTime(existingResult)) - timeToSeconds(resultTime)) > 0.005;
    return {
      card, defaultSplits, distsMatchDefault, fits, lapTimes, resultTime, lapCumuls,
      existingResult, hasExistingLaps, resultChanged,
    };
  };
  const updateLapEntry = (idx, updater) =>
    setParsedLaps((prev) => prev.map((e, i) => (i === idx ? updater(e) : e)));

  const [editingFullCard, setEditingFullCard] = useState(null);
  const [fullEditInput, setFullEditInput] = useState({});
  const [isSavingFull, setIsSavingFull] = useState(false);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  const openEdit = (card) => {
    setEditingCard({ ...card });
    setLapInput(card.lapTimes || "");
  };

  const openFullEdit = (card) => {
    setEditingFullCard(card);
    setConfirmDeleteCard(false);
    setFullEditInput({
      date: card.date || "",
      teamId: card.teamId || "",
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

  const deleteFullCard = async () => {
    if (!onDeleteCard || !editingFullCard) return;
    setIsDeletingCard(true);
    try {
      await onDeleteCard(editingFullCard.id);
      setEditingFullCard(null);
      setConfirmDeleteCard(false);
    } finally {
      setIsDeletingCard(false);
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

  // 監督が手入力した上書き（tour.conditions[日付]）を優先
  const condOverrides = reportTour.conditions || {};
  Object.keys(condOverrides).forEach((d) => {
    if (!conditionsMap[d]) conditionsMap[d] = { date: d, score: 0 };
  });
  const conditionList = Object.values(conditionsMap)
    .map((c) => {
      const o = condOverrides[c.date || "single"];
      return o ? { ...c, ...o } : c;
    })
    .sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date > b.date ? 1 : -1;
    });
  const canEditCond = !!(canEdit && onSaveConditions);
  const openCondEdit = (cond) => {
    setEditingCondDate(cond.date || "single");
    setCondForm({
      weather: cond.weather || "",
      wind: cond.wind || "",
      temp: cond.temp || "",
      humidity: cond.humidity || "",
    });
  };
  const saveCond = async () => {
    await onSaveConditions(editingCondDate, {
      weather: condForm.weather.trim(),
      wind: condForm.wind.trim(),
      temp: String(condForm.temp).trim(),
      humidity: String(condForm.humidity).trim(),
    });
    setEditingCondDate(null);
  };

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
      // 駅伝: チーム順（大会のチーム登録順、未設定は末尾）→ 区順
      const la = legIndexFromLabel(a.distance);
      const lb = legIndexFromLabel(b.distance);
      if (la >= 0 && lb >= 0) {
        const teamsArr = Array.isArray(reportTour.teams) ? reportTour.teams : [];
        const ti = (c) => {
          const i = teamsArr.findIndex((t) => t.id === c.teamId);
          return i < 0 ? 9999 : i;
        };
        const tdiff = ti(a) - ti(b);
        if (tdiff !== 0) return tdiff;
        // チーム未設定: 男子→女子の順に、区順
        if (teamsArr.length === 0) {
          const gOf = (c) => {
            const r = (lookupRunners || allRunners || []).find((x) => x.id === c.runnerId);
            return r?.gender === "男" ? 0 : r?.gender === "女" ? 1 : 2;
          };
          const gdiff = gOf(a) - gOf(b);
          if (gdiff !== 0) return gdiff;
        }
        if (la !== lb) return la - lb;
      }
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

  // ── 駅伝サマリー：区ごとの平均（完走のみ・男女別） ──
  // プリセット駅伝大会（大会に区間距離あり）のときだけ集計する。
  // 男女で区間距離が異なるため平均タイムが混ざらないよう性別ごとに分ける。
  const ekidenReportLegs = getTournamentLegs(reportTour);
  const isEkidenReport = !!ekidenReportLegs;
  const runnerGenderById = {};
  (lookupRunners || allRunners || []).forEach((r) => {
    runnerGenderById[r.id] = r.gender;
  });
  const legAgg = {}; // { 男: { "1区": {...} }, 女: {...} }
  if (isEkidenReport) {
    reportCards.forEach((c) => {
      if (c.raceType !== RACE_TYPES.EKIDEN) return;
      if (c.status && c.status !== "finish") return; // DNS/DNF は除外
      const label = c.distance;
      if (!/^\d+区$/.test(label || "")) return;
      const sec = timeToSeconds(c.resultTime);
      if (!sec) return;
      const g = runnerGenderById[c.runnerId] || c.gender || "未設定";
      let km = parseFloat(c.ekidenDistance);
      if (!(km > 0)) km = legsDistance(ekidenReportLegs, g, label) || 0;
      if (!legAgg[g]) legAgg[g] = {};
      if (!legAgg[g][label]) {
        legAgg[g][label] = {
          leg: legIndexFromLabel(label),
          km,
          count: 0,
          sumSec: 0,
          sumPaceSec: 0,
          paceCount: 0,
          badges: new Set(),
        };
      }
      const slot = legAgg[g][label];
      slot.count += 1;
      (c.badges || []).forEach((b) => slot.badges.add(b));
      slot.sumSec += sec;
      if (km > 0) {
        slot.sumPaceSec += sec / km;
        slot.paceCount += 1;
      }
    });
  }
  const legSummaryByGender = Object.keys(legAgg)
    .sort((a, b) => (a === "男" ? -1 : b === "男" ? 1 : a > b ? 1 : -1))
    .map((g) => ({
      gender: g,
      // 総合タイム = 各区の平均タイムの合計（1区1人なら実際の合計と一致）
      totalTime: formatTotal(
        Object.values(legAgg[g]).reduce((acc, s) => acc + s.sumSec / s.count, 0),
      ),
      rows: Object.values(legAgg[g])
        .sort((a, b) => a.leg - b.leg)
        .map((s) => ({
          label: `${s.leg + 1}区`,
          badges: Array.from(s.badges || []),
          km: s.km,
          count: s.count,
          avgTime: fmtSecOnly(s.sumSec / s.count),
          avgPace: s.paceCount ? fmtSecOnly(s.sumPaceSec / s.paceCount) : "-",
        })),
    }))
    .filter((x) => x.rows.length > 0);

  // ── 駅伝チーム成績：チーム別の区間一覧＋総合タイム ──
  // 総合タイムは長時間になり得るため h:mm:ss で整形する。
  // 駅伝用: 秒まで（コンマ秒なし）。m'ss" 形式に四捨五入
  function fmtSecOnly(sec) {
    if (!(sec > 0)) return "-";
    const t = Math.round(sec);
    return `${Math.floor(t / 60)}'${String(t % 60).padStart(2, "0")}"`;
  }
  function formatTotal(sec) {
    if (!(sec > 0)) return "-";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    const pad = (n) => String(n).padStart(2, "0");
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  const hasTeams =
    Array.isArray(reportTour.teams) && reportTour.teams.length > 0;
  const teamSummary = hasTeams
    ? reportTour.teams
        .map((team) => {
          const cards = reportCards
            .filter((c) => c.teamId === team.id)
            .slice()
            .sort(
              (a, b) => legIndexFromLabel(a.distance) - legIndexFromLabel(b.distance),
            );
          let totalSec = 0;
          let finishCount = 0;
          const legs = cards.map((c) => {
            const isFinish = !c.status || c.status === "finish";
            const sec = isFinish ? timeToSeconds(c.resultTime) : 0;
            if (isFinish && sec > 0) {
              totalSec += sec;
              finishCount += 1;
            }
            return {
              key: c.id,
              card: c,
              badges: c.badges || [],
              label: c.distance || "-",
              runnerName: c.runnerName || "",
              km: c.ekidenDistance,
              pace:
                isFinish && sec > 0 && parseFloat(c.ekidenDistance) > 0
                  ? fmtSecOnly(sec / parseFloat(c.ekidenDistance))
                  : "-",
              time:
                c.status === "dns"
                  ? `DNS`
                  : c.status === "dnf"
                    ? `DNF`
                    : (timeToSeconds(c.resultTime) > 0 ? fmtSecOnly(timeToSeconds(c.resultTime)) : c.resultTime || "未入力"),
            };
          });
          return {
            team,
            legs,
            totalTime: formatTotal(totalSec),
            legCount: cards.length,
            finishCount,
          };
        })
        .filter((t) => t.legs.length > 0)
    : [];

  return createPortal(<>
    <div className="team-report-overlay fixed inset-0 z-[120] bg-slate-50 flex flex-col animate-in fade-in print:absolute print:inset-auto print:top-0 print:left-0 print:w-full print:h-auto print:bg-white print:overflow-visible">
      <div className="bg-slate-900 text-white p-4 flex items-center justify-between gap-2 shadow-md pt-12 pb-6 print:hidden [&_button]:shrink-0 [&_button_span]:whitespace-nowrap">
        <button
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center min-w-0 flex-1">
          <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase whitespace-nowrap">
            Team Race Report
          </p>
          <h2 className="font-bold text-sm whitespace-nowrap truncate">チームレポート</h2>
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
            className="flex items-center gap-1 pl-2 pr-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors print:hidden"
            title="公式記録（順位・公式タイム）を一括入力"
          >
            <FileText size={18} />
            <span className="text-xs font-semibold">公式記録</span>
          </button>
        )}
        {canEdit && onEditCard && !isEkidenReport && (
          <button
            onClick={() => { setLapBatchText(""); setParsedLaps(null); setIsLapBatchOpen(true); }}
            className="flex items-center gap-1 pl-2 pr-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors print:hidden"
            title="手元で計測したLAP（区間タイム）を一括入力"
          >
            <Timer size={18} />
            <span className="text-xs font-semibold">LAP</span>
          </button>
        )}
        {canEdit && onAddCard && (allRunners || []).length > 0 && (
          <button
            onClick={() => {
              // プリセット駅伝大会なら既定を「駅伝/1区」に（区間距離は選手選択時に自動反映）
              const isPresetEkiden = !!getTournamentLegs(reportTour);
              setAddCardInput({
                ...EMPTY_ADD,
                date: reportTour.startDate || "",
                raceType: isPresetEkiden ? RACE_TYPES.EKIDEN : EMPTY_ADD.raceType,
                distance: isPresetEkiden ? "1区" : EMPTY_ADD.distance,
              });
              setIsAddingCard(true);
            }}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors print:hidden"
            title="カードを追加（未提出・別日/別種目の追加とも）"
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
              {canEditCond && (
                <button
                  type="button"
                  onClick={() => openCondEdit({ date: reportTour.startDate })}
                  className="mt-2 text-xs font-black text-indigo-500 underline print:hidden"
                >
                  入力する
                </button>
              )}
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
                  {canEditCond && (
                    <button
                      type="button"
                      onClick={() => openCondEdit(cond)}
                      className="text-[10px] font-black text-indigo-500 underline shrink-0 print:hidden"
                    >
                      編集
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {editingCondDate && (
            <div className="mt-3 p-4 bg-white border border-slate-200 rounded-2xl space-y-3 print:hidden">
              <p className="text-[10px] font-black text-slate-400">
                コンディション編集{editingCondDate !== "single" ? ` (${editingCondDate.slice(5).replace("-", "/")})` : ""}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["weather", "天候", "晴れ"],
                  ["wind", "風", "無風"],
                  ["temp", "気温(℃)", "20"],
                  ["humidity", "湿度(%)", "50"],
                ].map(([k, label, ph]) => (
                  <div key={k}>
                    <label className="text-[9px] font-black text-slate-400 block mb-1">{label}</label>
                    <input
                      type="text"
                      value={condForm[k]}
                      onChange={(e) => setCondForm((p) => ({ ...p, [k]: e.target.value }))}
                      placeholder={ph}
                      className="w-full p-2 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 outline-none border border-slate-200"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingCondDate(null)} className="flex-1 py-2 rounded-lg bg-slate-100 text-xs font-black text-slate-500">キャンセル</button>
                <button type="button" onClick={saveCond} className="flex-1 py-2 rounded-lg bg-indigo-600 text-xs font-black text-white">保存</button>
              </div>
            </div>
          )}
        </div>

        {/* 駅伝チーム成績：チーム別の区間一覧＋総合タイム */}
        {isEkidenReport && hasTeams && teamSummary.length > 0 && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:shadow-none print:border print:border-slate-200 print:p-3">
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2 print:text-slate-800">
              <Award size={16} /> チーム成績
            </h3>
            <div className="space-y-5">
              {teamSummary.map((t) => (
                <div
                  key={t.team.id}
                  className="border border-slate-100 rounded-2xl overflow-hidden print:border-slate-200"
                >
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 print:bg-white">
                    <p className="font-black text-slate-700 text-sm">
                      {t.team.name}
                      {t.team.category ? (
                        <span className="ml-2 text-[10px] font-black text-slate-400">
                          {t.team.category}
                        </span>
                      ) : null}
                    </p>
                    <TeamTotalBlock
                      computed={t.totalTime}
                      result={(reportTour.teamResults || {})[t.team.id]}
                      canEdit={canEdit}
                      onSave={onSaveTeamResult ? (d) => onSaveTeamResult(t.team.id, d) : null}
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[460px] whitespace-nowrap text-sm border-collapse">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="text-right py-2 px-3">区間</th>
                          <th className="text-right py-2 px-3 w-px">選手</th>
                          <th className="text-right py-2 px-2">距離</th>
                          <th className="text-right py-2 px-2">記録</th>
                          <th className="text-right py-2 px-3">AVG</th>
                          <th className="text-right py-2 px-3">備考</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.legs.map((l) => (
                          <tr
                            key={l.key}
                            className="border-b border-slate-50 last:border-0"
                          >
                            <td className="text-right py-2 px-3 font-black text-slate-700">
                              {l.label}
                            </td>
                            <td className="text-right py-2 px-3 w-px font-bold text-slate-600">
                              {l.runnerName || "-"}
                              {canEdit && onEditCard && (
                                <button type="button" onClick={() => openFullEdit(l.card)} className="ml-2 text-[10px] font-black text-indigo-500 underline print:hidden">編集</button>
                              )}
                            </td>
                            <td className="text-right py-2 px-2 font-bold text-slate-500">
                              {l.km ? `${l.km}km` : "-"}
                            </td>
                            <td className="text-right py-2 px-2 font-mono font-bold text-slate-700 whitespace-nowrap">
                              {l.time}
                            </td>
                            <td className="text-right py-2 px-3 font-mono font-bold text-indigo-500">
                              {l.pace}
                            </td>
                            <td className="text-right py-2 px-3">
                              <BadgeChips badges={l.badges} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 駅伝サマリー：区ごとの平均（完走のみ・男女別）。チーム未設定のときのみ表示 */}
        {isEkidenReport && !hasTeams && legSummaryByGender.length > 0 && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 print:shadow-none print:border print:border-slate-200 print:p-3">
            <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2 print:text-slate-800">
              <Award size={16} /> チーム成績
            </h3>
            <div className="space-y-5">
              {legSummaryByGender.map((grp) => (
                <div key={grp.gender} className="space-y-2">
                  <div className="flex items-end justify-between">
                    <p className="text-xs font-black text-slate-500">
                      {grp.gender === "男"
                        ? "男子"
                        : grp.gender === "女"
                          ? "女子"
                          : grp.gender}
                    </p>
                    <TeamTotalBlock
                      computed={grp.totalTime}
                      result={(reportTour.teamResults || {})[grp.gender]}
                      canEdit={canEdit}
                      onSave={onSaveTeamResult ? (d) => onSaveTeamResult(grp.gender, d) : null}
                    />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[460px] whitespace-nowrap text-sm border-collapse">
                      <thead>
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="text-right py-2 pr-2">区間</th>
                          <th className="text-right py-2 px-2">距離</th>
                          <th className="text-right py-2 px-2">記録</th>
                          <th className="text-right py-2 pl-2">AVG</th>
                          <th className="text-right py-2 pl-3">備考</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grp.rows.map((r) => (
                          <tr
                            key={r.label}
                            className="border-b border-slate-50 last:border-0"
                          >
                            <td className="text-right py-2 pr-2 font-black text-slate-700">
                              {r.label}
                            </td>
                            <td className="text-right py-2 px-2 font-bold text-slate-500">
                              {r.km > 0 ? `${r.km}km` : "-"}
                            </td>
                            <td className="text-right py-2 px-2 font-mono font-bold text-slate-700 whitespace-nowrap">
                              {r.avgTime || "-"}
                            </td>
                            <td className="text-right py-2 pl-2 font-mono font-bold text-indigo-500">
                              {r.avgPace}
                            </td>
                            <td className="text-right py-2 pl-3">
                              <BadgeChips badges={r.badges} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 選手記録一覧（日付ごとグループ化）。駅伝はチーム成績のみ表示 */}
        {!isEkidenReport && <div>
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
                                          : badge === "学校記録"
                                            ? "bg-rose-500 print:border-rose-500"
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
                          ) : isEkidenReport ? null : (
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
        </div>}
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
            <button onClick={() => { setEditingFullCard(null); setConfirmDeleteCard(false); }} className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            {Array.isArray(reportTour.teams) && reportTour.teams.length > 0 && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">出場チーム</label>
                <select
                  value={fullEditInput.teamId || ""}
                  onChange={(e) => setFullEditInput((p) => ({ ...p, teamId: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                >
                  <option value="">チームを選択...</option>
                  {reportTour.teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.category ? `（${t.category}）` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">レース日</label>
              <input type="date" value={fullEditInput.date} onChange={(e) => setFullEditInput((p) => ({ ...p, date: e.target.value }))} className="block w-full min-w-0 max-w-full appearance-none box-border text-left min-h-[42px] p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
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
            {editingFullCard?.raceType !== RACE_TYPES.EKIDEN && <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">ラップタイム</label>
              <textarea value={fullEditInput.lapTimes} onChange={(e) => setFullEditInput((p) => ({ ...p, lapTimes: e.target.value }))} rows={4} className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-mono font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400 resize-none" />
            </div>}
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
          <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0 space-y-3">
            {confirmDeleteCard ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 space-y-2">
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle size={13} className="flex-shrink-0" />
                  このカードを削除します。元に戻せません。
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDeleteCard(false)} disabled={isDeletingCard}
                    className="flex-1 py-2.5 rounded-xl font-black text-xs bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50">
                    やめる
                  </button>
                  <button onClick={deleteFullCard} disabled={isDeletingCard}
                    className="flex-1 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 bg-rose-600 text-white hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50">
                    <Trash2 size={14} /> {isDeletingCard ? "削除中..." : "削除する"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={saveFullEdit} disabled={isSavingFull}
                className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 shadow-md">
                <Save size={16} /> {isSavingFull ? "保存中..." : "保存する"}
              </button>
            )}
            {onDeleteCard && !confirmDeleteCard && (
              <button onClick={() => setConfirmDeleteCard(true)} disabled={isSavingFull}
                className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 text-rose-500 hover:bg-rose-50 active:scale-95 transition-all disabled:opacity-50">
                <Trash2 size={13} /> このカードを削除
              </button>
            )}
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
                        <p className="text-sm font-black text-slate-800">
                          {entry.card?.raceType === RACE_TYPES.EKIDEN && entry.card.distance
                            ? `${entry.card.distance} ${String(entry.name || "").replace(/^区s*/, "")}`
                            : entry.name}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">
                          {entry.event && !(entry.card?.raceType === RACE_TYPES.EKIDEN) && <span className="mr-1">{entry.event}</span>}
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

    {/* LAPタイム一括入力モーダル */}
    {isLapBatchOpen && (
      <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white w-full max-w-lg max-h-[90dvh] rounded-[2rem] flex flex-col shadow-2xl animate-in zoom-in-95">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LAP Times 一括入力</p>
              <p className="font-black text-lg text-slate-800">{reportTour.name}</p>
            </div>
            <button onClick={() => setIsLapBatchOpen(false)} className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
            {!parsedLaps ? (
              <>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  種目見出し → 選手名 → 各行にLAP（区間タイム）の順で貼り付けてください。<br/>
                  <span className="text-blue-600">同じ種目に複数の選手</span>を続けて書けます（見出しは1回でOK）。複数種目もまとめて貼り付け可。<br/>
                  <span className="text-amber-600">累積タイムは区間の合計から自動計算</span>します（貼り付けに含まれていても読み取りません）。<br/>
                  <span className="text-slate-400">例：</span> <span className="font-mono text-slate-400">男子1500m / 小池 / 64"36 / 71"80 … / 田沼 / 65"00 …</span>
                </p>
                <textarea
                  value={lapBatchText}
                  onChange={(e) => setLapBatchText(e.target.value)}
                  placeholder={"男子1500m\n小池\n64\"36\n71\"80 2'16\"16\n…"}
                  rows={8}
                  className="w-full p-3 bg-slate-50 rounded-xl text-sm font-mono text-slate-700 outline-none border border-slate-200 focus:border-blue-400 resize-none"
                />
                <button
                  onClick={() => setParsedLaps(parseLapText(lapBatchText))}
                  disabled={!lapBatchText.trim()}
                  className="w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  解析する
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {parsedLaps.length === 0 && (
                    <p className="text-sm text-rose-500 font-bold text-center py-4">解析できるデータが見つかりませんでした。形式を確認してください。</p>
                  )}
                  {parsedLaps.map((entry, i) => {
                    const d = deriveLapEntry(entry);
                    const ok = d.card && d.fits;
                    return (
                      <div key={i} className={`rounded-2xl border p-3 space-y-2 ${ok ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-200"}`}>
                        {/* ステータス行 */}
                        <div className="flex items-center gap-2">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${ok ? "bg-emerald-500" : "bg-amber-500"}`}>
                            {ok ? <Check size={13} className="text-white" /> : <AlertCircle size={13} className="text-white" />}
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 flex-1 min-w-0 truncate">
                            解析: {entry.name}（{entry.distanceStr}）
                          </p>
                          <span className={`text-[10px] font-black flex-shrink-0 ${ok ? "text-emerald-600" : "text-amber-600"}`}>
                            {!d.card
                              ? "カード未選択"
                              : d.fits
                                ? `${entry.laps.length}区間 · ${d.resultTime}`
                                : "距離・タイムを確認"}
                          </span>
                        </div>
                        {/* 既存データがある場合は差分・上書き警告 */}
                        {d.card && (d.existingResult || d.hasExistingLaps) && (
                          <div className="text-[10px] font-bold text-amber-700 bg-amber-100/70 rounded-lg px-2 py-1.5 space-y-0.5">
                            <p className="flex items-center gap-1">
                              <AlertCircle size={11} className="flex-shrink-0" />
                              既に記録あり{d.fits ? "・上書きします" : ""}
                            </p>
                            {d.existingResult && (
                              <p className="font-mono pl-4">
                                結果 {d.existingResult}
                                {d.fits
                                  ? d.resultChanged
                                    ? ` → ${d.resultTime}`
                                    : "（変更なし）"
                                  : ""}
                              </p>
                            )}
                            {d.hasExistingLaps && (
                              <p className="pl-4">既存のLAPを{d.fits ? "置き換えます" : "保持（未反映）"}</p>
                            )}
                          </div>
                        )}
                        {/* 対象カード選択 */}
                        <select
                          value={entry.cardId}
                          onChange={(e) => {
                            const cid = e.target.value;
                            const c = reportCards.find((x) => x.id === cid);
                            const sp = c ? buildSplits(c.raceType, c.distance, c.ekidenDistance) : [];
                            updateLapEntry(i, (en) => ({
                              ...en,
                              cardId: cid,
                              laps:
                                sp.length === en.laps.length
                                  ? en.laps.map((l, k) => ({ ...l, dist: sp[k] }))
                                  : en.laps,
                            }));
                          }}
                          className="w-full p-2 bg-white rounded-lg text-xs font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                        >
                          <option value="">カードを選択...</option>
                          {reportCards.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.runnerName}（{c.distance === "その他" ? c.ekidenDistance : c.distance}）
                            </option>
                          ))}
                        </select>
                        {/* LAP 行（区間・累積を手直し／追加・削除できる） */}
                        <div className="space-y-1">
                          {entry.laps.map((lap, li) => (
                            <div key={li} className="flex items-center gap-1">
                              <input
                                value={lap.dist ?? ""}
                                onChange={(e) => updateLapEntry(i, (en) => ({ ...en, laps: en.laps.map((l, k) => (k === li ? { ...l, dist: e.target.value.replace(/[^0-9]/g, "") } : l)) }))}
                                inputMode="numeric"
                                placeholder="m"
                                title="区間の距離(m)"
                                className="w-12 p-1.5 bg-white rounded-lg text-[11px] font-mono text-slate-600 text-right outline-none border border-slate-200 focus:border-blue-400 flex-shrink-0"
                              />
                              <span className="text-[10px] text-slate-400 flex-shrink-0">m</span>
                              <input
                                value={lap.seg}
                                onChange={(e) => updateLapEntry(i, (en) => ({ ...en, laps: en.laps.map((l, k) => (k === li ? { ...l, seg: e.target.value } : l)) }))}
                                placeholder="区間"
                                className="flex-1 min-w-0 p-1.5 bg-white rounded-lg text-xs font-mono text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                              />
                              <span className="w-16 flex-shrink-0 p-1.5 text-[11px] font-mono text-slate-400 truncate text-right" title="累積（自動計算）">
                                {d.lapCumuls[li] || ""}
                              </span>
                              <button
                                onClick={() => updateLapEntry(i, (en) => ({ ...en, laps: en.laps.filter((_, k) => k !== li) }))}
                                className="p-1 text-slate-300 hover:text-rose-500 flex-shrink-0"
                                title="この区間を削除"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-3 mt-1">
                            <button
                              onClick={() => updateLapEntry(i, (en) => ({ ...en, laps: [...en.laps, { seg: "", dist: "" }] }))}
                              className="text-[10px] font-black text-blue-500 hover:text-blue-600 flex items-center gap-1"
                            >
                              <Plus size={11} /> 区間を追加
                            </button>
                            {d.card && d.defaultSplits.length === entry.laps.length && !d.distsMatchDefault && (
                              <button
                                onClick={() => updateLapEntry(i, (en) => ({ ...en, laps: en.laps.map((l, k) => ({ ...l, dist: d.defaultSplits[k] })) }))}
                                className="text-[10px] font-black text-slate-400 hover:text-slate-600"
                                title="距離を種目の既定値に戻す"
                              >
                                デフォルト距離に戻す
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setParsedLaps(null)} className="flex-1 py-2.5 rounded-2xl font-black text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all">
                    やり直す
                  </button>
                  <button
                    onClick={async () => {
                      setIsSavingLapBatch(true);
                      try {
                        for (const entry of parsedLaps) {
                          const d = deriveLapEntry(entry);
                          if (!d.card || !d.fits) continue;
                          await onEditCard(d.card.id, {
                            lapTimes: d.lapTimes,
                            ...(d.resultTime ? { resultTime: d.resultTime } : {}),
                          });
                        }
                        setIsLapBatchOpen(false);
                        setParsedLaps(null);
                        setLapBatchText("");
                      } finally {
                        setIsSavingLapBatch(false);
                      }
                    }}
                    disabled={!parsedLaps.some((e) => deriveLapEntry(e).fits) || isSavingLapBatch}
                    className="flex-1 py-2.5 rounded-2xl font-black text-sm bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <Save size={14} /> {isSavingLapBatch ? "反映中..." : `${parsedLaps.filter((e) => deriveLapEntry(e).fits).length}件を反映`}
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
                  const r = (allRunners || []).find((r) => r.id === e.target.value);
                  setAddCardInput((p) => {
                    // 駅伝プリセット大会なら、選手の性別に応じて区間距離を再反映
                    const legs =
                      p.raceType === RACE_TYPES.EKIDEN
                        ? legsLabels(addEkidenLegs, r?.gender)
                        : null;
                    return {
                      ...p,
                      runnerId: e.target.value,
                      runnerName: r ? `${r.lastName} ${r.firstName}` : "",
                      ekidenDistance: legs
                        ? String(
                            legsDistance(addEkidenLegs, r?.gender, p.distance) ??
                              "",
                          )
                        : p.ekidenDistance,
                    };
                  });
                }}
                className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
              >
                <option value="">選手を選択...</option>
                {unsubmittedRunners.length > 0 && (
                  <optgroup label="未提出">
                    {unsubmittedRunners.map((r) => (
                      <option key={r.id} value={r.id}>{r.lastName} {r.firstName}</option>
                    ))}
                  </optgroup>
                )}
                {submittedRunners.length > 0 && (
                  <optgroup label="提出済み（別日・別種目を追加）">
                    {submittedRunners.map((r) => (
                      <option key={r.id} value={r.id}>{r.lastName} {r.firstName}（{(eventsByRunner[r.id] || []).join("・")}）</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            {/* 出場チーム */}
            {Array.isArray(reportTour.teams) && reportTour.teams.length > 0 && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">出場チーム</label>
                <select
                  value={addCardInput.teamId || ""}
                  onChange={(e) => setAddCardInput((p) => ({ ...p, teamId: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                >
                  <option value="">チームを選択...</option>
                  {reportTour.teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.category ? `（${t.category}）` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            {/* レース日 */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">レース日</label>
              <input type="date" value={addCardInput.date} onChange={(e) => setAddCardInput((p) => ({ ...p, date: e.target.value }))} className="block w-full min-w-0 max-w-full appearance-none box-border text-left min-h-[42px] p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400" />
            </div>
            {/* 種目 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">区分</label>
                <select
                  value={addCardInput.raceType}
                  onChange={(e) => {
                    const newType = e.target.value;
                    const legs =
                      newType === RACE_TYPES.EKIDEN
                        ? legsLabels(addEkidenLegs, addGender)
                        : null;
                    const firstDist = legs ? legs[0] : RACE_DISTANCES[newType][0];
                    setAddCardInput((p) => ({
                      ...p,
                      raceType: newType,
                      distance: firstDist,
                      ekidenDistance: legs
                        ? String(
                            legsDistance(addEkidenLegs, addGender, firstDist) ?? "",
                          )
                        : "",
                    }));
                  }}
                  className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                >
                  {Object.values(RACE_TYPES).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">距離・種目</label>
                <select
                  value={addCardInput.distance}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAddCardInput((p) => ({
                      ...p,
                      distance: val,
                      ekidenDistance: addUsingPreset
                        ? String(
                            legsDistance(addEkidenLegs, addGender, val) ?? "",
                          )
                        : p.ekidenDistance,
                    }));
                  }}
                  className="w-full p-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 outline-none border border-slate-200 focus:border-blue-400"
                >
                  {addDistanceOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            {addUsingPreset && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">区間距離 (km) ※自動反映</label>
                <input type="text" readOnly value={addCardInput.ekidenDistance} className="w-full p-2.5 bg-slate-100 rounded-xl text-sm font-bold text-slate-500 outline-none border border-slate-200 cursor-not-allowed" />
              </div>
            )}
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
  </>, document.body);
};

export default TeamRaceReport;
