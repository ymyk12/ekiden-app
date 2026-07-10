/*
 * 一括移行スクリプト: category が空/未設定の練習ログを「朝練」に書き換える。
 *
 * 背景: 以前は区分プルダウンが初期表示で「朝練」を見せていたため、朝練の選手が
 *       プルダウンを触らずに送信すると category が "" のまま保存されていた。
 *       区分選択は必須化済み（今後は空にならない）。既存の空欄は朝練とみなして補正する。
 *
 * 認証: アプリと同じ匿名認証。Firestoreルール上、認証済みなら read/write 可。
 *
 * 使い方:
 *   ドライラン（確認のみ・書き込まない）:  node scripts/migrate-empty-category.mjs
 *   実行（実際に書き換える）:              node scripts/migrate-empty-category.mjs --apply
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";

// .env を素朴にパース（REACT_APP_FIREBASE_* を取り出す）
const env = {};
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const firebaseConfig = {
  apiKey: env.REACT_APP_FIREBASE_API_KEY,
  authDomain: env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.REACT_APP_FIREBASE_APP_ID,
};

const APP_ID = "kswc-ekidenteam-distancerecords";
const APPLY = process.argv.includes("--apply");
const TARGET = "朝練";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const logsCol = collection(db, "artifacts", APP_ID, "public", "data", "logs");

const main = async () => {
  await signInAnonymously(auth);
  const snap = await getDocs(logsCol);
  const total = snap.size;

  // category が空文字 / null / undefined のものだけを対象にする
  const targets = [];
  snap.forEach((d) => {
    const v = d.data();
    const cat = v.category;
    if (cat === "" || cat === null || cat === undefined) {
      targets.push({ id: d.id, ...v });
    }
  });

  console.log(`総ログ件数: ${total}`);
  console.log(`区分が空のログ: ${targets.length} 件`);

  // 距離の分布（0kmが混ざっていないか＝休養が紛れていないかの確認）
  const zero = targets.filter((t) => !(Number(t.distance) > 0)).length;
  console.log(`  うち距離0/未入力: ${zero} 件（本来休養などの可能性・要注意）`);

  // サンプル最大15件を表示
  console.log("\n--- サンプル（最大15件） ---");
  targets.slice(0, 15).forEach((t) => {
    console.log(
      `${t.date}  ${t.runnerName || t.runnerId}  ${t.distance}km  RPE${t.rpe}  「${(t.menuDetail || "").slice(0, 20)}」`,
    );
  });

  if (!APPLY) {
    console.log(`\n[ドライラン] 書き込みは行っていません。実行するには --apply を付けてください。`);
    process.exit(0);
  }

  // --apply: バッチで category を「朝練」に更新（500件ごと）
  console.log(`\n[実行] ${targets.length} 件を「${TARGET}」に更新します...`);
  let done = 0;
  for (let i = 0; i < targets.length; i += 450) {
    const chunk = targets.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((t) => {
      batch.update(
        doc(db, "artifacts", APP_ID, "public", "data", "logs", t.id),
        { category: TARGET, updatedAt: new Date().toISOString() },
      );
    });
    await batch.commit();
    done += chunk.length;
    console.log(`  ${done}/${targets.length} 更新済み`);
  }
  console.log("完了しました。");
  process.exit(0);
};

main().catch((e) => {
  console.error("エラー:", e);
  process.exit(1);
});
