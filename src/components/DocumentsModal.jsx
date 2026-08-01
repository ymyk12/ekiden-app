/*
 * DocumentsModal — チーム共有資料（しおり等）の一覧モーダル（全ロール共通）
 *
 * DOCUMENTS を新しい順に並べ、タップで別タブに資料を開く。
 * 祖先の transform/overflow に影響されないよう createPortal で body 直下に出す。
 */
import { createPortal } from "react-dom";
import { X, FileText, ExternalLink } from "lucide-react";
import { DOCUMENTS } from "../utils/documents";

function DocumentsModal({ open, onClose }) {
  if (!open) return null;

  const docs = [...DOCUMENTS].sort((a, b) =>
    (b.date || "").localeCompare(a.date || ""),
  );

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md mx-auto max-h-[85dvh] flex flex-col bg-white rounded-t-[2rem] shadow-2xl animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "85dvh" }}
      >
        {/* ヘッダー（固定） */}
        <div className="flex-shrink-0 px-5 pt-3">
          <div className="flex justify-center pb-2">
            <div className="w-10 h-1.5 bg-slate-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-blue-500" /> 資料
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400"
              aria-label="閉じる"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 一覧（スクロール） */}
        <div
          className="overflow-y-auto overscroll-contain min-h-0 px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-2.5"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {docs.length === 0 ? (
            <p className="text-center text-xs text-slate-400 font-bold py-10">
              まだ資料はありません
            </p>
          ) : (
            docs.map((d) => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 active:scale-[0.99] transition-all"
              >
                <span className="w-11 h-11 flex-shrink-0 rounded-xl bg-white border border-slate-100 grid place-items-center text-xl shadow-sm">
                  {d.emoji || "📄"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-slate-800 truncate">
                    {d.title}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 truncate">
                    {[d.subtitle, d.dateLabel].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ExternalLink
                  size={16}
                  className="text-slate-300 flex-shrink-0"
                />
              </a>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default DocumentsModal;
