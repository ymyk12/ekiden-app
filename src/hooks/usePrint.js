import { useCallback } from "react";
import toast from "react-hot-toast";

export const usePrint = () => {
  const handlePrint = useCallback((fileName) => {
    if (!fileName) {
      window.print();
      return;
    }

    const originalTitle = document.title;
    const targetTitle = fileName.trim();

    // 印刷ダイアログが開く直前にタイトルをセット
    const onBeforePrint = () => {
      document.title = targetTitle;
    };

    // 印刷ダイアログが閉じた後にタイトルを元に戻す
    const onAfterPrint = () => {
      document.title = originalTitle;
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    // スマホは印刷準備に数秒かかるので、先に「準備中」を表示して画面を描画してから印刷する
    const toastId = toast.loading("印刷（PDF）を準備しています…");
    // 印刷物に写り込まないよう、印刷開始時点で即消す
    const done = () => toast.remove(toastId);
    window.addEventListener("beforeprint", done, { once: true });
    window.addEventListener("afterprint", done, { once: true });
    setTimeout(done, 8000);
    setTimeout(() => window.print(), 60);
  }, []);

  return { handlePrint };
};
