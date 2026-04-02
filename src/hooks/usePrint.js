import { useCallback } from "react";

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

    // 印刷を実行
    window.print();
  }, []);

  return { handlePrint };
};
