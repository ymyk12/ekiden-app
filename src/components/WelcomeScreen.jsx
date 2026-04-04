import React from "react";
import { UserPlus, LogIn, Lock, Trophy } from "lucide-react";
import { ROLES } from "../utils/constants";

const WelcomeScreen = ({ setRole, appVersion }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-blue-50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-blue-50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="mb-16 relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <div className="w-48 h-48 mb-6 relative">
          <img
            src="team-logo.png"
            alt="Team Logo"
            fetchpriority="high"
            loading="eager"
            className="w-full h-full object-contain drop-shadow-md"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = "none";
              document.getElementById("logo-placeholder").style.display =
                "flex";
            }}
          />
          <div
            id="logo-placeholder"
            className="hidden absolute inset-0 w-full h-full bg-blue-50 rounded-full flex items-center justify-center text-blue-600"
          >
            <Trophy size={80} />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-blue-900 text-center">
          KCTF Ekiden Team
        </h1>
        <p className="text-sm font-bold text-slate-400 tracking-widest uppercase mt-2">
          Distance Records
        </p>
      </div>
      <div className="w-full max-w-xs space-y-4 relative z-10">
        <button
          onClick={() => setRole(ROLES.REGISTERING)}
          className="w-full bg-white hover:bg-blue-50 text-blue-600 py-5 rounded-2xl font-bold text-lg shadow-lg shadow-slate-100 active:scale-95 transition-all flex items-center justify-center gap-3 border-2 border-blue-100"
        >
          <UserPlus size={22} /> 新規登録{" "}
          <span className="text-xs font-normal opacity-60">(初めての方)</span>
        </button>
        <button
          onClick={() => setRole(ROLES.LOGIN)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <LogIn size={22} /> ログイン{" "}
          <span className="text-xs font-normal opacity-80">(2回目以降)</span>
        </button>
        <div className="pt-10 pb-12">
          <button
            onClick={() => setRole(ROLES.COACH_AUTH)}
            className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center gap-1 mx-auto"
          >
            <Lock size={12} /> Coach Login
          </button>
        </div>
      </div>
      <div className="absolute bottom-6 flex flex-col items-center">
        <p className="text-[10px] text-slate-300 font-mono">
          © 2026 KCTF EKIDEN TEAM
        </p>
        <p className="text-[8px] text-slate-200 font-mono mt-1">
          ver.{appVersion}
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
