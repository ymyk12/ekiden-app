const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.analyzeDiaryImage = onCall({ cors: true }, async (request) => {
  const { prompt, base64Image, mimeType } = request.data;

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    throw new HttpsError("internal", "サーバーにAPIキーが設定されていません");
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { data: base64Image, mimeType: mimeType } },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return data;
  } catch (error) {
    throw new HttpsError(
      "internal",
      "Gemini APIの呼び出しに失敗しました: " + error.message,
    );
  }
});

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// 🌟 1. データが追加された時に動く「仕分け係」
exports.queueOrSendNotification = functions.firestore
  .document("raceCards/{cardId}") // 大会ノートが追加された時
  .onCreate(async (snap, context) => {
    const newCard = snap.data();

    // 🕒 現在の日本時間（JST）の「時間(時)」だけを取得
    const now = new Date();
    const jstHour = (now.getUTCHours() + 9) % 24;

    // 19時から翌朝7時59分までは「おやすみモード」
    const isSilentTime = jstHour >= 19 || jstHour < 8;

    if (isSilentTime) {
      // 🌙 夜間：通知を鳴らさず「保留箱（キュー）」に入れる
      await db.collection("notification_queue").add({
        type: "new_race_card",
        runnerName: newCard.runnerName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("夜間なので通知を保留しました");
    } else {
      // ☀️ 昼間：即座にプッシュ通知を送信！
      // ※ここにFCM（Firebase Cloud Messaging）の送信処理を書きます
      const payload = {
        notification: {
          title: "大会ノート追加",
          body: `${newCard.runnerName}さんが新しい大会ノートを追加しました！`,
        },
      };
      // 例: 監督のスマホ（トピック）へ送信
      await admin.messaging().sendToTopic("coaches", payload);
      console.log("昼間なので即時通知を送信しました");
    }
  });

// 🌟 2. 毎朝8時に動く「まとめ送信係」（Cronジョブ）
exports.morningBatchNotification = functions.pubsub
  .schedule("0 8 * * *") // 毎日朝8:00に実行
  .timeZone("Asia/Tokyo") // 日本時間で設定
  .onRun(async (context) => {
    const queueRef = db.collection("notification_queue");
    const snapshot = await queueRef.get();

    // 保留箱が空っぽなら何もしない
    if (snapshot.empty) {
      console.log("夜間の通知はありませんでした");
      return null;
    }

    // 何件たまっていたか数える
    const count = snapshot.size;

    // 📢 朝のまとめ通知を送信！
    const payload = {
      notification: {
        title: "☀️ 朝のまとめ通知",
        body: `おはようございます！夜間に ${count} 件の大会ノート追加がありました。確認しましょう！`,
      },
    };
    await admin.messaging().sendToTopic("coaches", payload);

    // 🧹 送信が終わったら保留箱を空にする（一括削除）
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`朝のまとめ通知（${count}件）を送信し、保留箱を空にしました`);
    return null;
  });
