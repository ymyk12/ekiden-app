import React from "react";
import { KeyRound, AlertCircle, Loader2, ArrowLeft } from "lucide-react";

// App.jsから「小包(Props)」として、必要なデータや関数を受け取ります
const LoginScreen = ({
  formData,
  setFormData,
  handleLogin,
  errorMsg,
  isSubmitting,
  setRole,
}) => {
  // ボタンを押せるかどうかの判定
  const isReady =
    (formData.memberCode && formData.personalPin.length === 4) ||
    formData.memberCode === "99999"; // 管理者用

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
          Login
        </h2>

        <div className="space-y-5">
          {/* 選手番号入力 */}
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-slate-500 ml-1">
              個人ID;kswc〇〇.△△△の数字5ｹﾀ
            </p>
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric" // Reactではラクダこぶ型(inputMode)にします
                pattern="[0-9]*"
                maxLength={5}
                placeholder="選手番号 (例: 26001)"
                className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-emerald-500 text-lg tracking-wider"
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

          {/* 暗証番号入力 */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-500 ml-1">
              個人PASS;登録時に設定した4桁の数字
            </p>
            <div className="relative">
              <input
                type="password"
                maxLength={4}
                placeholder="0000"
                className="w-full p-4 pl-12 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-emerald-500 text-lg tracking-widest"
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

            {/* エラーメッセージ */}
            {errorMsg && (
              <div className="flex items-center gap-2 text-rose-500 px-2 animate-in slide-in-from-left-2 mt-2">
                <AlertCircle size={14} />
                <span className="text-xs font-bold">{errorMsg}</span>
              </div>
            )}
          </div>

          {/* ボタン */}
          <button
            onClick={handleLogin}
            disabled={!isReady || isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all ${
              isReady && !isSubmitting
                ? "bg-emerald-600 text-white active:scale-95"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                {/* ぐるぐる回るアイコン（animate-spinがミソです！） */}
                <Loader2 size={20} className="animate-spin" />
                検索中...
              </>
            ) : (
              "開始"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
