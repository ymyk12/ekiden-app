/*
 * CoachNotificationsModal — 通知一覧ドロップダウン（表示専用）
 *
 * CoachView から isNotifOpen のモーダル JSX を分離。新規のレースカード提出・
 * お知らせを一覧表示する。各通知の遷移は notif.onClick（CoachView 側の
 * notifications メモで組み立て済み）に委ねる。状態は props で受け取る。
 */
import { Bell, ChevronRight } from "lucide-react";

const CoachNotificationsModal = ({
  notifications,
  lastReadTime,
  setIsNotifOpen,
}) => {
  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in"
      onClick={() => setIsNotifOpen(false)}
    >
      <div
        className="bg-white w-full max-w-md max-h-[80vh] rounded-[2.5rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-[2.5rem] sticky top-0 z-10">
          <h3 className="font-black text-lg flex items-center gap-2 text-slate-800">
            <Bell className="text-rose-500" /> Notifications
          </h3>
          <button
            onClick={() => setIsNotifOpen(false)}
            className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full active:scale-95"
          >
            閉じる
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3 pb-8">
          {notifications.length === 0 ? (
            <div className="text-center py-10 opacity-50">
              <Bell size={40} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-500">
                新しい提出・お知らせはありません
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={notif.onClick}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition-all cursor-pointer hover:border-blue-200 shadow-sm relative overflow-hidden group"
              >
                {notif.time > lastReadTime && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-[9px] font-black text-white px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm ${
                      notif.type === "Race Card"
                        ? "bg-indigo-500"
                        : "bg-emerald-500"
                    }`}
                  >
                    {notif.type}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">
                    {new Date(notif.time).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="font-black text-slate-800 text-sm mb-1">
                  {notif.title}
                </p>
                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  {notif.message}
                </p>
                <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-bold text-blue-500 flex items-center gap-1">
                    確認・コメントする <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachNotificationsModal;
