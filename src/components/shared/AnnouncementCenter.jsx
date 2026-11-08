/*
 * AnnouncementCenter — 新機能のお知らせモーダル（What's New）
 *
 * useAnnouncements の pendingModal（未表示のお知らせ）を1件ずつ表示する。
 * 「あとで」で markShown、「さっそく開く」で markShown + 画面遷移。
 * markShown で次回以降モーダルは出ないが、実際に機能を開くまで（used）は
 * ☰ などの NEW バッジが残る仕組み（used 管理は useAnnouncements 側）。
 *
 * 新機能を増やしても、このコンポーネントは変更不要。
 * （data/announcements.js に1件足すだけ。新アイコンを使う場合のみ ICONS に追加）
 */
import { createPortal } from "react-dom";
import {
  Sparkles,
  ChevronRight,
  ArrowUpLeft,
  FileText,
  Flag,
  Target,
  Users,
  BarChart2,
} from "lucide-react";

// data/announcements.js の icon 名 → lucide コンポーネントの対応表
const ICONS = { FileText, Flag, Target, Users, BarChart2, Sparkles };

const AnnouncementCenter = ({ pendingModal, markShown, onNavigate }) => {
  if (!pendingModal || pendingModal.length === 0) return null;

  const a = pendingModal[0];
  const total = pendingModal.length;
  const Icon = ICONS[a.icon] || Sparkles;

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4">
        {/* ヘッダー帯 */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 pt-6 pb-9 text-white">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
            <Sparkles size={14} /> New Feature
            {a.since && (
              <span className="ml-auto text-[9px] font-bold text-blue-200/80">
                 v{a.since}
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-2xl flex-shrink-0">
              <Icon size={26} />
            </div>
            <h3 className="text-lg font-black leading-tight">{a.title}</h3>
          </div>
        </div>

        {/* 本文（ヘッダー帯に少し重ねる） */}
        <div className="px-6 pt-5 pb-6 space-y-4 -mt-4 bg-white rounded-t-[2rem] relative">
          {a.body && (
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              {a.body}
            </p>
          )}

          {/* ここから使えます（場所案内） */}
          {a.locationHint && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-start gap-2">
              <ArrowUpLeft
                size={16}
                className="text-blue-500 mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                  ここから使えます
                </p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">
                  {a.locationHint}
                </p>
              </div>
            </div>
          )}

          {/* 使い方の手順（チュートリアル） */}
          {a.steps && a.steps.length > 0 && (
            <ol className="space-y-1.5">
              {a.steps.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs font-bold text-slate-600"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          )}

          {/* アクション */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => markShown(a.id)}
              className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm active:scale-95 transition-all"
            >
              あとで
            </button>
            {a.cta && (
              <button
                onClick={() => {
                  markShown(a.id);
                  onNavigate?.(a.cta.view);
                }}
                className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-1"
              >
                {a.cta.label} <ChevronRight size={16} />
              </button>
            )}
          </div>

          {total > 1 && (
            <p className="text-center text-[10px] font-bold text-slate-400">
              ほかに {total - 1} 件のお知らせ
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AnnouncementCenter;
