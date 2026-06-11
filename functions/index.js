const { onCall, HttpsError } = require("firebase-functions/v2/https");

exports.analyzeDiaryImage = onCall({ cors: true, invoker: "public" }, async (request) => {
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
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { data: base64Image, mimeType } },
            ],
          }],
        }),
      },
    );

    const data = await response.json();
    if (data.error) {
      console.error("Gemini API error:", data.error);
      throw new Error(data.error.message);
    }

    const parts = data.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p) => !p.thought && p.text);
    if (!textPart) throw new Error("テキストの抽出に失敗しました");
    return { text: textPart.text };
  } catch (error) {
    console.error("Gemini API error:", error.message);
    throw new HttpsError(
      "internal",
      "AI APIの呼び出しに失敗しました: " + error.message,
    );
  }
});

const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// アプリのデータ領域。クライアント側 src/utils/firestore.js の basePath と
// 必ず一致させること（ここがズレるとトリガーが一切発火しなくなる）
const APP_ID = "kswc-ekidenteam-distancerecords";
const DATA_PATH = `artifacts/${APP_ID}/public/data`;

// coach_devices に登録された監督端末すべてへ通知を送る。
// 以前は sendToTopic("coaches") だったが、クライアントにトピック購読の
// 仕組みがなく誰にも届かないため、保存済みトークンへの直接送信に変更した。
const sendToCoachDevices = async (notification) => {
  const devicesSnap = await db.collection(`${DATA_PATH}/coach_devices`).get();
  const tokens = devicesSnap.docs
    .map((d) => d.data().token || d.id)
    .filter(Boolean);

  if (tokens.length === 0) {
    console.log("監督端末が未登録のため通知をスキップしました");
    return;
  }

  const res = await admin
    .messaging()
    .sendEachForMulticast({ tokens, notification });

  // 無効になったトークン（アンインストール等）を掃除する
  const batch = db.batch();
  let invalidCount = 0;
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = (r.error && r.error.code) || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument")
      ) {
        batch.delete(devicesSnap.docs[i].ref);
        invalidCount++;
      }
    }
  });
  if (invalidCount > 0) await batch.commit();

  console.log(
    `通知送信: 成功 ${res.successCount} / 失敗 ${res.failureCount}（無効トークン削除 ${invalidCount}件）`,
  );
};

// 🌟 2. データが追加された時に動く「仕分け係」
exports.queueOrSendNotification = functions.firestore
  .document(`artifacts/${APP_ID}/public/data/raceCards/{cardId}`)
  .onCreate(async (snap, context) => {
    const newCard = snap.data();

    const now = new Date();
    const jstHour = (now.getUTCHours() + 9) % 24;

    const isSilentTime = jstHour >= 19 || jstHour < 8;

    if (isSilentTime) {
      await db.collection("notification_queue").add({
        type: "new_race_card",
        runnerName: newCard.runnerName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("夜間なので通知を保留しました");
    } else {
      await sendToCoachDevices({
        title: "大会ノート追加",
        body: `${newCard.runnerName}さんが新しい大会ノートを追加しました！`,
      });
      console.log("昼間なので即時通知を送信しました");
    }
  });

// 🌟 3. 毎朝8時に動く「まとめ送信係」（Cronジョブ）
exports.morningBatchNotification = functions.pubsub
  .schedule("0 8 * * *")
  .timeZone("Asia/Tokyo")
  .onRun(async (context) => {
    const queueRef = db.collection("notification_queue");
    const snapshot = await queueRef.get();

    if (snapshot.empty) {
      console.log("夜間の通知はありませんでした");
      return null;
    }

    const count = snapshot.size;

    await sendToCoachDevices({
      title: "☀️ 朝のまとめ通知",
      body: `おはようございます！夜間に ${count} 件の大会ノート追加がありました。確認しましょう！`,
    });

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(`朝のまとめ通知（${count}件）を送信し、保留箱を空にしました`);
    return null;
  });
