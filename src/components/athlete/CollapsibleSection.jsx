/*
 * CollapsibleSection — 見出しをタップして開閉できるセクション（表示専用）
 *
 * マイログ「記録」タブの Race History / Training Bests / Race Bests で共有。
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const CollapsibleSection = ({ icon, title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 min-w-0">
          {icon} {title}
        </h4>
        <ChevronDown
          size={16}
          className={`text-slate-400 flex-shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && children}
    </div>
  );
};

export default CollapsibleSection;
