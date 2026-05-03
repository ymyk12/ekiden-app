/*
 * CoachAuthScreen — 監督パスワード入力画面
 *
 * 監督専用のパスコードを入力して監督モードに切り替える。
 * パスコードは Firestore の settings/global に保存されている。
 */
import React from "react";
import { ROLES } from "../utils/constants";

const CoachAuthScreen = ({ appSettings, setRole, setView }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-xs text-center">
        <h2 className="text-white font-bold mb-8 uppercase tracking-widest text-xs opacity-50">
          Coach Passcode
        </h2>
        <input
          type="password"
          maxLength={4}
          className="w-full bg-slate-800 text-white text-center text-5xl p-4 rounded-3xl outline-none border-2 border-transparent focus:border-blue-500 tracking-widest"
          onChange={(e) => {
            if (e.target.value === appSettings.coachPass) {
              setRole(ROLES.COACH);
              setView("coach-stats");
            }
          }}
        />
        <button
          onClick={() => setRole(null)}
          className="text-slate-500 mt-8 text-sm font-bold uppercase hover:text-white transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default CoachAuthScreen;
