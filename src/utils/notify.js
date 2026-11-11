// 通知まわりの共通ヘルパー

// 本番ホスト名。これ以外（localhost・プレビューチャンネル等）では通知を抑止する
const PROD_HOSTS = [
  "kswc-tf-distancerecords.web.app",
  "kswc-tf-distancerecords.firebaseapp.com",
];

// ローカル／プレビューは本番 Firestore に繋がっているため、
// 通知の元になる書き込みに skipNotify を付け、Cloud Functions 側で送信を止める。
// 更新（merge）でも古い値が残らないよう、本番では false を明示して書く。
export const notifyFlag = () => ({
  skipNotify: !PROD_HOSTS.includes(window.location.hostname),
});
