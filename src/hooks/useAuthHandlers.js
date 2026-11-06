/*
 * useAuthHandlers — 認証・セッション操作
 *
 * 選手の新規登録（handleRegister）、ログイン＋旧データ移行（handleLogin）、
 * ログアウト／監督プレビュー解除（handleLogout）、監督プレビューの開始
 * （handleStartPreview）をまとめて管理する。
 * 登録/ログインの入力フォーム（authInput）もこのフックが保持する。
 */
import { useState } from "react";
import { signOut } from "firebase/auth";
import {
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { colRef, docRef } from "../utils/firestore";
import { auth, db } from "../firebaseConfig";
import { ROLES } from "../utils/constants";

export const useAuthHandlers = ({
  user,
  appSettings,
  previewRunner,
  setPreviewRunner,
  setProfile,
  setRole,
  setView,
  setErrorMsg,
  setIsSubmitting,
  setIsMenuOpen,
}) => {
  const [authInput, setAuthInput] = useState({
    lastName: "",
    firstName: "",
    memberCode: "",
    teamPass: "",
    personalPin: "",
    gender: "",
    isManager: false,
  });

  // 新規ユーザーを登録し、Firestore に選手情報を保存する
  const handleRegister = async () => {
    setErrorMsg("");
    if (
      !authInput.lastName.trim() ||
      !authInput.firstName.trim() ||
      authInput.memberCode.length !== 5
    ) {
      setErrorMsg("名前と5桁の選手番号を入力してください。");
      return;
    }

    if (authInput.teamPass !== appSettings.teamPass) {
      setErrorMsg("チームパスコードが間違っています。");
      return;
    }
    if (!authInput.personalPin || !/^\d{4}$/.test(authInput.personalPin)) {
      setErrorMsg("個人パスコードは4桁の数字で設定してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = authInput.memberCode.trim();
      const runnersRef = colRef("runners");

      const runnerDoc = docRef("runners", targetId);
      const docSnap = await getDoc(runnerDoc);

      if (docSnap.exists()) {
        setErrorMsg(
          `選手番号 ${targetId} は既に登録されています。「ログイン」してください。`,
        );
        setIsSubmitting(false);
        return;
      }

      const q = query(runnersRef, where("memberCode", "==", targetId));
      const qSnap = await getDocs(q);

      if (!qSnap.empty) {
        setErrorMsg(
          `選手番号 ${targetId} は既に使用されています（旧データ等）。管理者に連絡してください。`,
        );
        setIsSubmitting(false);
        return;
      }

      const newProfile = {
        id: targetId,
        memberCode: targetId,
        lastName: authInput.lastName.trim(),
        firstName: authInput.firstName.trim(),
        role: authInput.isManager ? ROLES.MANAGER : "athlete",
        gender: authInput.gender || "",
        goalMonthly: 0,
        goalPeriod: 0,
        status: "active",
        pin: authInput.personalPin,
        registeredAt: new Date().toISOString(),
        lastLoginUid: user.uid,
      };

      await setDoc(runnerDoc, newProfile);

      setProfile(newProfile);
      setRole(ROLES.RUNNER);
      setView("menu");
      toast.success("登録が完了しました！");
    } catch (e) {
      console.error(e);
      setErrorMsg("登録エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 選手番号でログインし、ロールを確定する
  const handleLogin = async () => {
    setErrorMsg("");
    if (authInput.memberCode.length !== 5) {
      setErrorMsg("5桁の選手番号を入力してください。");
      return;
    }
    if (!authInput.personalPin) {
      setErrorMsg("パスコードを入力してください。");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetId = authInput.memberCode.trim();
      const runnersRef = colRef("runners");
      const runnerDoc = docRef("runners", targetId);
      const docSnap = await getDoc(runnerDoc);

      if (!docSnap.exists()) {
        const q = query(runnersRef, where("memberCode", "==", targetId));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const oldDoc = qSnap.docs[0];
          const oldData = oldDoc.data();

          if (oldData.pin !== authInput.personalPin) {
            setErrorMsg("パスコードが違います。");
            setIsSubmitting(false);
            return;
          }

          await setDoc(runnerDoc, {
            ...oldData,
            id: targetId,
            lastLoginUid: user.uid,
            migratedAt: new Date().toISOString(),
          });

          const logsRef = colRef("logs");
          const logsQ = query(logsRef, where("runnerId", "==", oldDoc.id));
          const logsSnap = await getDocs(logsQ);
          const batch = writeBatch(db);

          logsSnap.forEach((l) => {
            batch.update(docRef("logs", l.id), { runnerId: targetId });
          });

          const fbsRef = colRef("feedbacks");
          const fbsQ = query(fbsRef, where("runnerId", "==", oldDoc.id));
          const fbsSnap = await getDocs(fbsQ);

          fbsSnap.forEach((f) => {
            const oldFbId = f.id;
            const newFbId = oldFbId.replace(oldDoc.id, targetId);
            if (oldFbId !== newFbId) {
              batch.set(docRef("feedbacks", newFbId), {
                ...f.data(),
                runnerId: targetId,
              });
              batch.delete(docRef("feedbacks", oldFbId));
            }
          });

          batch.delete(docRef("runners", oldDoc.id));
          await batch.commit();

          setProfile({ ...oldData, id: targetId, lastLoginUid: user.uid });
          setRole(ROLES.RUNNER);
          setView("menu");
          toast.success("システム更新: データを移行しました");
          return;
        }

        setErrorMsg("データが見つかりません。");
        setIsSubmitting(false);
        return;
      }

      const profileData = docSnap.data();
      if (profileData.pin !== authInput.personalPin) {
        setErrorMsg("パスコードが違います。");
        setIsSubmitting(false);
        return;
      }

      await updateDoc(runnerDoc, {
        lastLoginUid: user.uid,
      });

      setProfile(profileData);
      setRole(ROLES.RUNNER);
      setView("menu");
      toast.success(`ログインしました！`);
    } catch (e) {
      console.error(e);
      setErrorMsg("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPreview = (runner) => {
    setPreviewRunner(runner);
    setView("menu");
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    if (previewRunner) {
      setPreviewRunner(null);
      return;
    }
    await signOut(auth);
    setRole(null);
    setProfile(null);
    setView("menu");
    setIsMenuOpen(false);
    toast.success("ログアウトしました");
  };

  return {
    authInput,
    setAuthInput,
    handleRegister,
    handleLogin,
    handleStartPreview,
    handleLogout,
  };
};
