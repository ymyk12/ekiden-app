/*
 * useGoalReview — 選手の目標値（目標距離・タイム）の操作
 *
 * 目標設定画面の入力フォーム（goalInput）と保存（updateGoals）を管理する。
 */
import { useState, useEffect } from "react";
import { updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { docRef } from "../utils/firestore";
import { extractGoalInputs } from "../utils/dateUtils";

export const useGoalReview = ({
  currentUserId,
  currentProfile,
  targetPeriod,
  view,
  setView,
  setIsSubmitting,
}) => {
  const [goalInput, setGoalInput] = useState({
    monthly: "",
    period: "",
    q1: "",
    q2: "",
    q3: "",
    q4: "",
  });

  // 目標設定画面を開いたとき、現在の目標値をフォームに反映する
  useEffect(() => {
    if (view === "goal" && currentProfile && targetPeriod) {
      setGoalInput(
        extractGoalInputs(currentProfile, targetPeriod.id, targetPeriod.type),
      );
    }
  }, [view, currentProfile, targetPeriod]);

  // 選手の目標距離・目標タイムを保存する
  const updateGoals = async () => {
    setIsSubmitting(true);
    try {
      const updates = {};
      const pType = targetPeriod.type;
      const pId = targetPeriod.id;
      if (pType === "global") {
        if (goalInput.monthly)
          updates.goalMonthly = parseFloat(goalInput.monthly);
        if (goalInput.period) updates.goalPeriod = parseFloat(goalInput.period);
        if (goalInput.q1) updates.goalQ1 = parseFloat(goalInput.q1);
        if (goalInput.q2) updates.goalQ2 = parseFloat(goalInput.q2);
        if (goalInput.q3) updates.goalQ3 = parseFloat(goalInput.q3);
        if (goalInput.q4) updates.goalQ4 = parseFloat(goalInput.q4);
      } else if (pType === "custom") {
        if (goalInput.period)
          updates[`periodGoals.${pId}.total`] = parseFloat(goalInput.period);
        if (goalInput.q1)
          updates[`periodGoals.${pId}.q1`] = parseFloat(goalInput.q1);
        if (goalInput.q2)
          updates[`periodGoals.${pId}.q2`] = parseFloat(goalInput.q2);
        if (goalInput.q3)
          updates[`periodGoals.${pId}.q3`] = parseFloat(goalInput.q3);
        if (goalInput.q4)
          updates[`periodGoals.${pId}.q4`] = parseFloat(goalInput.q4);
        if (goalInput.monthly)
          updates.goalMonthly = parseFloat(goalInput.monthly);
      } else {
        if (goalInput.monthly)
          updates.goalMonthly = parseFloat(goalInput.monthly);
      }
      await updateDoc(docRef("runners", currentUserId), updates);
      toast.success("目標を保存しました！");
      setView("menu");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    goalInput,
    setGoalInput,
    updateGoals,
  };
};
