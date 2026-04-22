import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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
export const db = getFirestore(app);

// 🌟🌟🌟 キャッシュ機能（オフライン永続化）をONにする 🌟🌟🌟
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("複数タブで開かれているためキャッシュが有効になりません");
  } else if (err.code === "unimplemented") {
    console.warn("現在のブラウザはキャッシュ機能をサポートしていません");
  }
});

export const messaging = getMessaging(app);
