import { collection, doc } from "firebase/firestore";
import { db, appId } from "../firebaseConfig";

const basePath = ["artifacts", appId, "public", "data"];

export const colRef = (colName) => collection(db, ...basePath, colName);

export const docRef = (colName, docId) => doc(db, ...basePath, colName, docId);

export const settingsDocRef = () => doc(db, ...basePath, "settings", "global");
