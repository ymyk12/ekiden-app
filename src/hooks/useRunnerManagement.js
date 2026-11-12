/*
 * useRunnerManagement — 監督による選手データの管理操作
 *
 * 選手詳細を開く（handleCoachEditRunner）、プロフィール更新、
 * ロール切替、目標値の保存、重複選手の統合をまとめて管理する。
 * 入力フォーム（coachEditFormData / coachGoalInput / mergeInput）も
 * このフックが保持する。
 */
import { useState, useEffect } from "react";
import {
  updateDoc,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { colRef, docRef } from "../utils/firestore";
import { db } from "../firebaseConfig";
import { ROLES } from "../utils/constants";
import { extractGoalInputs } from "../utils/dateUtils";

export const useRunnerManagement = ({
  role,
  selectedRunner,
  setSelectedRunner,
  targetPeriod,
  allRunners,
  setView,
  setIsSubmitting,
  setConfirmDialog,
}) => {
  const [coachEditFormData, setCoachEditFormData] = useState({});
  const [mergeInput, setMergeInput] = useState({ sourceId: "", targetId: "" });
  const [coachGoalInput, setCoachGoalInput] = useState({
    monthly: "",
    period: "",
    q1: "",
    q2: "",
    q3: "",
    q4: "",
  });

  // 監督モードで選手を選択したとき、目標入力フォームを現在値で初期化する
  useEffect(() => {
    if (role === ROLES.COACH && selectedRunner && targetPeriod) {
      const inputs = extractGoalInputs(
        selectedRunner,
        targetPeriod.id,
        targetPeriod.type,
      );
      setCoachGoalInput({
        ...inputs,
        // custom期間でHelperが0を返す場合のフォールバック
        monthly: inputs.monthly || selectedRunner.goalMonthly || "",
      });
    }
  }, [role, selectedRunner, targetPeriod]);

  const handleCoachEditRunner = (runner) => {
    setSelectedRunner(runner);
    setCoachEditFormData({
      lastName: runner.lastName,
      firstName: runner.firstName,
      pin: runner.pin || "",
      gender: runner.gender || "",
    });
    setView("coach-runner-detail");
  };

  // ─── プロフィール・目標値 ───
  // 選手のプロフィール（名前・暗証番号）を更新する
  const handleCoachSaveProfile = async () => {
    if (!selectedRunner) return;
    setIsSubmitting(true);
    try {
      await updateDoc(docRef("runners", selectedRunner.id), {
        lastName: coachEditFormData.lastName,
        firstName: coachEditFormData.firstName,
        pin: coachEditFormData.pin,
        gender: coachEditFormData.gender || "",
      });
      toast.success("プロフィールを更新しました");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 監督が選手/マネージャーのロールを切り替える
  const handleCoachChangeRole = (runner, newRole) => {
    const roleLabel = newRole === ROLES.MANAGER ? "マネージャー" : "選手";
    setConfirmDialog({
      isOpen: true,
      message: `${runner.lastName} ${runner.firstName} のロールを「${roleLabel}」に変更しますか？\n次回ログイン時から適用されます。`,
      onConfirm: async () => {
        try {
          await updateDoc(docRef("runners", runner.id), { role: newRole });
          toast.success(`ロールを「${roleLabel}」に変更しました`);
          setView("coach-roster");
        } catch (e) {
          toast.error("エラー: " + e.message);
        } finally {
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        }
      },
    });
  };

  // 監督が選手の目標距離・目標タイムを設定する
  const handleCoachSaveGoals = async () => {
    if (!selectedRunner) return;
    setIsSubmitting(true);
    const updates = {};
    const pType = targetPeriod.type;
    const pId = targetPeriod.id;

    if (pType === "global") {
      if (coachGoalInput.monthly !== "")
        updates.goalMonthly = parseFloat(coachGoalInput.monthly);
      if (coachGoalInput.period !== "")
        updates.goalPeriod = parseFloat(coachGoalInput.period);
      if (coachGoalInput.q1 !== "")
        updates.goalQ1 = parseFloat(coachGoalInput.q1);
      if (coachGoalInput.q2 !== "")
        updates.goalQ2 = parseFloat(coachGoalInput.q2);
      if (coachGoalInput.q3 !== "")
        updates.goalQ3 = parseFloat(coachGoalInput.q3);
      if (coachGoalInput.q4 !== "")
        updates.goalQ4 = parseFloat(coachGoalInput.q4);
    } else if (pType === "custom") {
      if (coachGoalInput.period !== "")
        updates[`periodGoals.${pId}.total`] = parseFloat(coachGoalInput.period);
      if (coachGoalInput.q1 !== "")
        updates[`periodGoals.${pId}.q1`] = parseFloat(coachGoalInput.q1);
      if (coachGoalInput.q2 !== "")
        updates[`periodGoals.${pId}.q2`] = parseFloat(coachGoalInput.q2);
      if (coachGoalInput.q3 !== "")
        updates[`periodGoals.${pId}.q3`] = parseFloat(coachGoalInput.q3);
      if (coachGoalInput.q4 !== "")
        updates[`periodGoals.${pId}.q4`] = parseFloat(coachGoalInput.q4);
      if (coachGoalInput.monthly !== "")
        updates.goalMonthly = parseFloat(coachGoalInput.monthly);
    } else {
      if (coachGoalInput.monthly !== "")
        updates.goalMonthly = parseFloat(coachGoalInput.monthly);
    }

    try {
      await updateDoc(docRef("runners", selectedRunner.id), updates);
      toast.success("目標値を保存しました");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 重複した選手データを 1 件に統合する
  const handleMergeRunners = async () => {
    const { sourceId, targetId } = mergeInput;
    if (!targetId || !sourceId) {
      toast.error("両方の選手を選択してください。");
      return;
    }
    if (targetId === sourceId) {
      toast.error("同じ選手は選択できません。");
      return;
    }

    const targetRunner = allRunners.find((r) => r.id === targetId);
    const sourceRunner = allRunners.find((r) => r.id === sourceId);

    if (!targetRunner || !sourceRunner) return;

    setConfirmDialog({
      isOpen: true,
      message: `【重要警告】\n「${sourceRunner.lastName} ${sourceRunner.firstName}」の記録をすべて\n「${targetRunner.lastName} ${targetRunner.firstName}」に移動し、元のデータを削除します。\nこの操作は元に戻せません。実行しますか？`,
      onConfirm: async () => {
        setIsSubmitting(true);
        try {
          const batch = writeBatch(db);

          const logsQ = query(
            colRef("logs"),
            where("runnerId", "==", sourceId),
          );
          const logsSnap = await getDocs(logsQ);
          logsSnap.forEach((l) => {
            batch.update(docRef("logs", l.id), {
              runnerId: targetId,
              runnerName: `${targetRunner.lastName} ${targetRunner.firstName}`,
            });
          });

          const fbsQ = query(
            colRef("feedbacks"),
            where("runnerId", "==", sourceId),
          );
          const fbsSnap = await getDocs(fbsQ);
          fbsSnap.forEach((f) => {
            const data = f.data();
            const newFbId = f.id.replace(sourceId, targetId);
            if (f.id !== newFbId) {
              batch.set(docRef("feedbacks", newFbId), {
                ...data,
                runnerId: targetId,
                runnerName: `${targetRunner.lastName} ${targetRunner.firstName}`,
              });
              batch.delete(docRef("feedbacks", f.id));
            }
          });

          batch.delete(docRef("runners", sourceId));
          await batch.commit();

          toast.success("選手の統合が完了しました");
          setMergeInput({ sourceId: "", targetId: "" });
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        } catch (e) {
          console.error(e);
          toast.error("統合エラー: " + e.message);
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  return {
    coachEditFormData,
    setCoachEditFormData,
    coachGoalInput,
    setCoachGoalInput,
    mergeInput,
    setMergeInput,
    handleCoachEditRunner,
    handleCoachSaveProfile,
    handleCoachChangeRole,
    handleCoachSaveGoals,
    handleMergeRunners,
  };
};
