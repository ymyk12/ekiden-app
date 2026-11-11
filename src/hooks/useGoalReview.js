/*
 * useGoalReview — 目標値・振り返り・監督フィードバックの操作
 *
 * 選手の目標距離/タイムの保存（updateGoals）、選手の振り返りコメント
 * （handleSaveReview）、監督のフィードバックコメント（handleSaveCoachFeedback）
 * をまとめて管理する。入力フォーム（goalInput / reviewComment /
 * coachFeedbackComment）もこのフックが保持する。
 *
 * coachFeedbackComment は監督が選手詳細を開くとき（useRunnerManagement の
 * handleCoachEditRunner）にもクリアされるため、setter を外部へ公開する。
 */
import { useState, useEffect } from "react";
import { setDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { docRef } from "../utils/firestore";
import { extractGoalInputs } from "../utils/dateUtils";
import { notifyFlag } from "../utils/notify";

export const useGoalReview = ({
  currentUserId,
  currentProfile,
  targetPeriod,
  allFeedbacks,
  view,
  setView,
  setIsSubmitting,
}) => {
  const [reviewComment, setReviewComment] = useState("");
  const [coachFeedbackComment, setCoachFeedbackComment] = useState("");
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

  // 選手が自分の振り返りコメントを保存する
  const handleSaveReview = async () => {
    if (!reviewComment.trim()) return;
    setIsSubmitting(true);
    try {
      const feedbackId = `${targetPeriod.id}_${currentUserId}`;
      await setDoc(
        docRef("feedbacks", feedbackId),
        {
          periodId: targetPeriod.id,
          periodName: targetPeriod.name,
          runnerId: currentUserId,
          runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
          runnerComment: reviewComment,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      toast.success("振り返りを保存しました！📝");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 監督のフィードバックコメントを保存する
  const handleSaveCoachFeedback = async (runnerId) => {
    if (!coachFeedbackComment.trim()) return;
    setIsSubmitting(true);
    try {
      const feedbackId = `${targetPeriod.id}_${runnerId}`;
      await setDoc(
        docRef("feedbacks", feedbackId),
        {
          runnerId,
          coachComment: coachFeedbackComment,
          updatedAt: new Date().toISOString(),
          ...notifyFlag(),
        },
        { merge: true },
      );
      toast.success("フィードバックを送りました！");
      setCoachFeedbackComment("");
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRunnerFeedback = (rId) => {
    if (!rId || !targetPeriod) return null;
    const feedbackId = `${targetPeriod.id}_${rId}`;
    return allFeedbacks.find((f) => f.id === feedbackId);
  };

  return {
    goalInput,
    setGoalInput,
    reviewComment,
    setReviewComment,
    coachFeedbackComment,
    setCoachFeedbackComment,
    updateGoals,
    handleSaveReview,
    handleSaveCoachFeedback,
    getRunnerFeedback,
  };
};
