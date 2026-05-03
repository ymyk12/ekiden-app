/*
 * DiaryListItem — 練習日誌の1件分を表示するリストアイテム
 *
 * タップすると詳細（距離・強度・痛み・メモ）が展開される。
 * 監督からの追記コメントがある場合はそのエリアも表示する。
 */
import React from "react";
import {
  MapPin,
  ChevronRight,
  Droplets,
  Thermometer,
  Cloud,
} from "lucide-react";

const DiaryListItem = ({
  log,
  onClick,
  isExpanded,
  showChevron = true,
  children,
}) => {
  if (!log) return null;
  const dateObj = new Date(log.date);
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][
    dateObj.getDay()
  ];
  const formattedDate = log.date.slice(5).replace("-", "/");

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border transition-all cursor-pointer overflow-hidden ${
        isExpanded
          ? "bg-slate-50 border-blue-200 shadow-md"
          : "bg-white border-slate-100 hover:border-blue-100 shadow-sm"
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
              {formattedDate}
              <span className="text-slate-300">({dayOfWeek})</span>
            </p>
          </div>
          {/* 天気・気温・湿度のバッジエリア */}
          <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
            <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Cloud size={8} /> {log.weather || "-"}
            </span>
            {log.temp && (
              <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Thermometer size={8} className="text-rose-400" /> {log.temp}℃
              </span>
            )}
            {log.humidity && (
              <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <Droplets size={8} className="text-blue-400" /> {log.humidity}%
              </span>
            )}
            {log.location && (
              <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <MapPin size={8} />{" "}
                {log.location === "その他" && log.locationDetail
                  ? log.locationDetail
                  : log.location === "競技場" && log.locationDetail
                    ? `${log.location} (${log.locationDetail})`
                    : log.location}
              </span>
            )}
          </div>
        </div>
        <div>
          <p
            className={`font-bold text-slate-700 text-sm leading-relaxed ${
              isExpanded ? "whitespace-pre-wrap" : "truncate"
            }`}
          >
            {isExpanded
              ? log.menu
              : log.menu
                ? log.menu.split("\n")[0]
                : "メニューなし"}
          </p>
        </div>
        {!isExpanded && showChevron && (
          <div className="flex justify-center mt-2">
            <ChevronRight size={16} className="text-slate-300 rotate-90" />
          </div>
        )}
      </div>
      {/* 選手画面などで開いた時の詳細コンテンツ（子要素として受け取る） */}
      {isExpanded && children}
    </div>
  );
};

export default DiaryListItem;
