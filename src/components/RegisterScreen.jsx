import React from "react";
import {
  Lock,
  KeyRound,
  AlertCircle,
  Check,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const RegisterScreen = ({
  formData,
  setFormData,
  handleRegister,
  errorMsg,
  isSubmitting,
  setRole,
}) => {
  const isReady =
    formData.lastName &&
    formData.firstName &&
    formData.memberCode &&
    formData.teamPass &&
    formData.personalPin.length === 4;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-2xl space-y-6">
        <button
          onClick={() => setRole(null)} // roleをnullにするとWelcomeScreenに戻ります
          className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors mb-6 active:scale-95"
        >
          <ArrowLeft size={16} /> トップ画面に戻る
        </button>
        <h2 className="text-2xl font-black text-slate-900 text-center uppercase italic">
          New Member
        </h2>

        <div className="space-y-5">
          {/* 名前入力エリア */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 ml-1">氏名</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="苗字 (例: 佐藤)"
                className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
              <input
                placeholder="名前 (例: 太郎)"
                className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
            </div>
          </div>

          {/* マネージャー選択チェックボックス */}
          <div
            className="flex items-center gap-3 bg-slate-100 p-4 rounded-2xl cursor-pointer"
            onClick={() =>
              setFormData({ ...formData, isManager: !formData.isManager })
            }
          >
            <div
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                formData.isManager
                  ? "bg-blue-600 border-blue-600"
                  : "border-slate-300 bg-white"
              }`}
            >
              {formData.isManager && <Check size={16} className="text-white" />}
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">
                マネージャーとして登録
              </p>
            </div>
          </div>

          {/* 選手番号（ID）入力欄 */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 ml-1">
              個人ID（kswc〇〇.△△△の数字5ｹﾀ）
            </p>
            <div className="relative">
              <input
                type="tel"
                maxLength={5}
                placeholder="例:26001"
                className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500 text-lg tracking-wider"
                value={formData.memberCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 5);
                  setFormData({ ...formData, memberCode: val });
                }}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">
                #
              </div>
            </div>
          </div>

          {/* チームパスコード */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 ml-1">
              チームPASS（顧問に確認してください）
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="チームパスコード"
                className={`w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 text-sm ${
                  errorMsg ? "ring-rose-500" : "ring-blue-500"
                }`}
                value={formData.teamPass}
                onChange={(e) =>
                  setFormData({ ...formData, teamPass: e.target.value })
                }
              />
              <Lock
                className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                  errorMsg ? "text-rose-500" : "text-slate-400"
                }`}
                size={20}
              />
            </div>
          </div>

          {/* 個人パスコード */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 ml-1">
              個人PASS（4桁の数字を設定してください）
            </p>
            <div className="relative">
              <input
                type="tel"
                maxLength={4}
                placeholder="0000"
                className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500 text-lg tracking-widest"
                value={formData.personalPin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    personalPin: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
              />
              <KeyRound
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 text-rose-500 px-2 animate-in slide-in-from-left-2 mt-2">
                <AlertCircle size={14} />
                <span className="text-xs font-bold">{errorMsg}</span>
              </div>
            )}
          </div>

          {/* ボタン */}
          <button
            onClick={handleRegister}
            disabled={!isReady || isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all ${
              isReady && !isSubmitting
                ? "bg-blue-600 text-white active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                登録中...
              </>
            ) : (
              "登録"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
