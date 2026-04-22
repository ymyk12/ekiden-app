// public/firebase-messaging-sw.js

// Firebase SDKの読み込み（CDN経由）
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js",
);

// 🌟 あなたの Firebase Config の内容をここに直接貼り付けてください！
// (firebaseConfig.js にある apiKey や projectId などの値です)
const firebaseConfig = {
  apiKey: "AIzaSyAVvrlLTsioEuloE11hzykIz8rSk6qMJrk",
  authDomain: "kswc-tf-distancerecords.firebaseapp.com",
  projectId: "kswc-tf-distancerecords",
  storageBucket: "kswc-tf-distancerecords.firebasestorage.app",
  messagingSenderId: "633417183098",
  appId: "1:633417183098:web:18c8c96359ebec0651f0c3",
  measurementId: "G-7TB3N5GBMZ",
};

// Firebaseの初期化
firebase.initializeApp(firebaseConfig);

// メッセージング機能の取得
const messaging = firebase.messaging();

// アプリが閉じている時に通知を受け取った時の処理
messaging.onBackgroundMessage((payload) => {
  console.log("[sw.js] バックグラウンドで通知を受信:", payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/logo192.png", // もしアイコンがあれば指定（publicフォルダ内のパス）
    badge: "/logo192.png", // Androidの通知バーに表示されるアイコン
    tag: "ekiden-notif", // 同じタグの通知は重ねて表示される
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
