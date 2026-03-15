// アプリ内で使う「役割」を定義
export const ROLES = {
  COACH: "coach",
  RUNNER: "runner",
  MANAGER: "manager",
  ADMIN: "admin-runner",
  COACH_AUTH: "coach-auth",
  REGISTERING: "registering",
  LOGIN: "login",
};

// 練習の「カテゴリー」を定義
export const CATEGORY = {
  MORNING: "朝練",
  AM: "午前練",
  PM: "午後練",
  SELF: "自主練",
  MATCH: "試合",
  CAMP: "合宿",
  REST: "完全休養",
};

// 大会振り返りシート用の種目リスト
export const RACE_TYPES = {
  TRACK: "トラック",
  ROAD: "ロード",
  EKIDEN: "駅伝",
};
export const RACE_DISTANCES = {
  [RACE_TYPES.TRACK]: ["800m", "1500m", "3000m", "5000m", "3000mSC", "その他"],
  [RACE_TYPES.ROAD]: ["3km", "5km", "10km", "その他"],
  [RACE_TYPES.EKIDEN]: [
    "1区",
    "2区",
    "3区",
    "4区",
    "5区",
    "6区",
    "7区",
    "8区",
    "9区",
    "10区",
  ],
};
