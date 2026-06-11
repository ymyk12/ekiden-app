/*
 * ErrorBoundary — 画面描画エラーの受け皿
 *
 * 遅延読み込みしている各画面のどこかで描画エラーが起きたとき、
 * 白画面のまま固まるのを防ぎ、再読み込みボタン付きの案内を表示する。
 */
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("画面の描画でエラーが発生しました:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="font-black text-slate-700 mb-2">
            エラーが発生しました
          </p>
          <p className="text-xs text-slate-400 font-bold mb-6 leading-relaxed">
            お手数ですが、画面を再読み込みしてください。
            <br />
            解決しない場合は管理者に連絡してください。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
            再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
