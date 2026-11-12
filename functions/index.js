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

// 失効したトークンかどうか（アンインストール等）
const isInvalidTokenError = (r) => {
  if (r.success) return false;
  const code = (r.error && r.error.code) || "";
  return (
    code.includes("registration-token-not-registered") ||
    code.includes("invalid-argument")
  );
};

// 指定トークンへ送信し、結果（responses）を返す。
// 表示はブラウザ（FCM SDK）の自動表示に任せる。アイコン等はここで指定する。
// tag を付けると同じ種類の通知は上書きされ、重複表示になりにくい。
const multicast = (tokens, notification) =>
  admin.messaging().sendEachForMulticast({
    tokens,
    notification,
    webpush: {
      notification: {
        icon: "/logo192.png",
        badge: "/logo192.png",
        tag: "ekiden-notif",
      },
    },
  });

// coach_devices に登録された監督端末すべてへ通知を送る。
// （端末ごとのオン/オフは、クライアントが coach_devices の登録/削除で表現する）
const sendToCoachDevices = async (notification) => {
  const devicesSnap = await db.collection(`${DATA_PATH}/coach_devices`).get();
  const tokens = devicesSnap.docs
    .map((d) => d.data().token || d.id)
    .filter(Boolean);

  if (tokens.length === 0) {
    console.log("監督端末が未登録のため通知をスキップしました");
    return;
  }

  const res = await multicast(tokens, notification);

  // 無効になったトークンを掃除する
  const batch = db.batch();
  let invalidCount = 0;
  res.responses.forEach((r, i) => {
    if (isInvalidTokenError(r)) {
      batch.delete(devicesSnap.docs[i].ref);
      invalidCount++;
    }
  });
  if (invalidCount > 0) await batch.commit();

  console.log(
    `監督へ通知: 成功 ${res.successCount} / 失敗 ${res.failureCount}` +
      `（無効トークン削除 ${invalidCount}件）`,
  );
};

// 選手へ通知を送る。runnerIds を省略すると、引退者を除く全選手が対象。
// 宛先は runners.fcmToken（ログインした端末のトークン）。
const sendToRunners = async (notification, runnerIds) => {
  let docs;
  if (Array.isArray(runnerIds)) {
    const snaps = await Promise.all(
      runnerIds.map((id) => db.doc(`${DATA_PATH}/runners/${id}`).get()),
    );
    docs = snaps.filter((s) => s.exists);
  } else {
    docs = (await db.collection(`${DATA_PATH}/runners`).get()).docs;
  }
  docs = docs.filter(
    (d) => d.data().status !== "retired" && d.data().fcmToken,
  );

  const tokens = docs.map((d) => d.data().fcmToken);
  if (tokens.length === 0) {
    console.log("通知先の選手トークンがないためスキップしました");
    return;
  }

  const res = await multicast(tokens, notification);

  // 無効なトークンは選手側から取り除く
  const batch = db.batch();
  let invalidCount = 0;
  res.responses.forEach((r, i) => {
    if (isInvalidTokenError(r)) {
      batch.update(docs[i].ref, {
        fcmToken: admin.firestore.FieldValue.delete(),
      });
      invalidCount++;
    }
  });
  if (invalidCount > 0) await batch.commit();

  console.log(
    `選手へ通知: 成功 ${res.successCount} / 失敗 ${res.failureCount}` +
      `（無効トークン削除 ${invalidCount}件）`,
  );
};

const isSilentTime = () => {
  const jstHour = (new Date().getUTCHours() + 9) % 24;
  return jstHour >= 19 || jstHour < 8;
};

// 選手向け通知の文面
const MSG_COMMENT = {
  title: "監督からコメント",
  body: "監督からコメントが届きました",
};
const MSG_APP_UPDATE = {
  title: "My Log がリニューアル",
  body: "My Log が使いやすくなりました。月間・年間レポートや自己ベストが見られます。",
};
const MSG_TOURNAMENT = {
  title: "新しい大会",
  body: "新しい大会が設定されました",
};

// 選手向け通知: 昼は即時送信、夜（19時〜8時）は保留箱へ（朝8時にまとめて送信）
const notifyRunnersOrQueue = async ({ type, runnerId }) => {
  if (isSilentTime()) {
    const item = {
      type,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (runnerId) item.runnerId = String(runnerId);
    await db.collection("notification_queue").add(item);
    console.log(`夜間なので ${type} を保留しました`);
    return;
  }
  if (type === "new_tournament") {
    await sendToRunners(MSG_TOURNAMENT);
  } else if (type === "app_update") {
    await sendToRunners(MSG_APP_UPDATE);
  } else {
    await sendToRunners(MSG_COMMENT, [String(runnerId)]);
  }
};

// 🌟 2. データが追加された時に動く「仕分け係」
exports.queueOrSendNotification = functions.firestore
  .document(`artifacts/${APP_ID}/public/data/raceCards/{cardId}`)
  .onCreate(async (snap, context) => {
    const newCard = snap.data();

    // ローカル／プレビュー環境で作られたカードは通知しない（即時送信もキュー追加もしない）
    if (newCard.skipNotify === true) {
      console.log("skipNotify のカードのため通知をスキップしました");
      return;
    }

    if (isSilentTime()) {
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

// 監督が大会ノートにフィードバックを書いたとき → 該当の選手へ
exports.notifyRaceCardFeedback = functions.firestore
  .document(`artifacts/${APP_ID}/public/data/raceCards/{cardId}`)
  .onUpdate(async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    if (after.skipNotify === true) return;
    const text = (after.coachFeedback || "").trim();
    if (!text || before.coachFeedback === after.coachFeedback) return;
    if (!after.runnerId) return;
    await notifyRunnersOrQueue({
      type: "runner_comment",
      runnerId: after.runnerId,
    });
  });

// 監督が大会を新規登録したとき → 全選手へ
exports.notifyNewTournament = functions.firestore
  .document(`artifacts/${APP_ID}/public/data/tournaments/{tourId}`)
  .onCreate(async (snap) => {
    if (snap.data().skipNotify === true) return;
    await notifyRunnersOrQueue({ type: "new_tournament" });
  });

// アプリ更新の案内（大型アップデートのときに1回だけ送る）。
// app_updates/{id} のドキュメントを作ると全選手へ通知する（夜間は朝8時に保留）。
exports.notifyAppUpdate = functions.firestore
  .document(`artifacts/${APP_ID}/public/data/app_updates/{updateId}`)
  .onCreate(async () => {
    await notifyRunnersOrQueue({ type: "app_update" });
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

    const items = snapshot.docs.map((d) => d.data());

    // 監督向け: 大会ノート追加（type 無しは旧形式として監督向け扱い）
    const coachCount = items.filter(
      (i) => !i.type || i.type === "new_race_card",
    ).length;
    if (coachCount > 0) {
      await sendToCoachDevices({
        title: "☀️ 朝のまとめ通知",
        body: `おはようございます！夜間に ${coachCount} 件の大会ノート追加がありました。確認しましょう！`,
      });
    }

    // 選手向け: コメントは選手ごとに1通、大会設定は全員に1通
    const commentRunnerIds = [
      ...new Set(
        items
          .filter((i) => i.type === "runner_comment" && i.runnerId)
          .map((i) => i.runnerId),
      ),
    ];
    if (commentRunnerIds.length > 0) {
      await sendToRunners(MSG_COMMENT, commentRunnerIds);
    }
    if (items.some((i) => i.type === "new_tournament")) {
      await sendToRunners(MSG_TOURNAMENT);
    }
    if (items.some((i) => i.type === "app_update")) {
      await sendToRunners(MSG_APP_UPDATE);
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    console.log(
      `朝のまとめ通知（${snapshot.size}件）を送信し、保留箱を空にしました`,
    );
    return null;
  });
