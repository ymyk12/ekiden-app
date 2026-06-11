import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

// Firestoreのパス指定で使っているappIdもここでエクスポート
export const appId = "kswc-ekidenteam-distancerecords";

// .envファイルから設定値を読み込む
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// オフライン永続化（キャッシュ）を有効化
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

// FCM非対応環境（古いiOS Safari・テスト環境など）では getMessaging が
// throw してアプリ全体が起動しなくなるため、失敗時は null にフォールバックする。
// 利用側（getToken）は try/catch 内で呼ばれるので null でも安全に失敗する。
let messagingInstance = null;
try {
  messagingInstance = getMessaging(app);
} catch (e) {
  console.warn("このブラウザはプッシュ通知に対応していません:", e.message);
}
export const messaging = messagingInstance;
