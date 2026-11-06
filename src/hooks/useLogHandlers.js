/*
 * useLogHandlers — 練習記録（logs）の操作
 *
 * 選手・監督双方の練習記録の保存/更新/削除、休養登録、
 * 編集フォームの初期化をまとめて管理する。
 * 入力フォーム（logInput）・編集中ID（editingLogId）・
 * 編集モーダルの開閉状態もこのフックが保持する。
 */
import { useState } from "react";
import { addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { colRef, docRef } from "../utils/firestore";
import { ROLES } from "../utils/constants";
import { getTodayStr } from "../utils/dateUtils";

export const useLogHandlers = ({
  currentUserId,
  currentProfile,
  setView,
  setIsSubmitting,
  setConfirmDialog,
}) => {
  const [editingLogId, setEditingLogId] = useState(null);
  const [isCoachEditModalOpen, setIsCoachEditModalOpen] = useState(false);
  const [isAthleteEditModalOpen, setIsAthleteEditModalOpen] = useState(false);

  const [logInput, setLogInput] = useState({
    date: getTodayStr(),
    distance: "",
    category: "",
    menuDetail: "",
    rpe: 1,
    pain: 1,
    achieved: true,
  });

  const resetForm = () => {
    setLogInput({
      date: getTodayStr(),
      distance: "",
      category: "",
      menuDetail: "",
      rpe: 1,
      pain: 1,
      achieved: true,
    });
    setEditingLogId(null);
  };

  const handleEditLog = (log) => {
    setLogInput({
      date: log.date,
      distance: log.distance,
      category: log.category,
      menuDetail: log.menuDetail || "",
      rpe: log.rpe,
      pain: log.pain,
      achieved: log.achieved,
    });
    setEditingLogId(log.id);
    setIsAthleteEditModalOpen(true);
  };

  // 選手が自分の練習記録を修正・保存する
  const handleAthleteUpdateLog = async () => {
    if (!editingLogId) return;
    if (!logInput.category) {
      toast.error("区分を選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateDoc(docRef("logs", editingLogId), {
        date: logInput.date,
        distance: parseFloat(logInput.distance),
        category: logInput.category,
        menuDetail: logInput.menuDetail,
        rpe: parseInt(logInput.rpe, 10),
        pain: parseInt(logInput.pain, 10),
        achieved: logInput.achieved,
        updatedAt: new Date().toISOString(),
      });
      toast.success("記録を更新しました");
      setIsAthleteEditModalOpen(false);
      setEditingLogId(null);
      resetForm();
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── 監督による記録修正 ───
  const openCoachEditModal = (log) => {
    setLogInput({
      date: log.date,
      distance: log.distance,
      category: log.category,
      menuDetail: log.menuDetail || "",
      rpe: log.rpe,
      pain: log.pain,
      achieved: log.achieved,
    });
    setEditingLogId(log.id);
    setIsCoachEditModalOpen(true);
  };

  // 監督が選手の練習記録を修正・上書きする
  const handleCoachUpdateLog = async () => {
    if (!editingLogId) return;
    if (!logInput.category) {
      toast.error("区分を選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateDoc(docRef("logs", editingLogId), {
        date: logInput.date,
        distance: parseFloat(logInput.distance),
        category: logInput.category,
        menuDetail: logInput.menuDetail,
        rpe: parseInt(logInput.rpe, 10),
        pain: parseInt(logInput.pain, 10),
        updatedBy: ROLES.COACH,
      });
      toast.success("記録を修正しました");
      setIsCoachEditModalOpen(false);
      setEditingLogId(null);
      resetForm();
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCoachDeleteLog = () => {
    if (!editingLogId) return;

    setConfirmDialog({
      isOpen: true,
      message: "この記録を完全に削除しますか？（元に戻せません）",
      onConfirm: async () => {
        try {
          await deleteDoc(docRef("logs", editingLogId));
          toast.success("記録を削除しました");
          setIsCoachEditModalOpen(false);
          setEditingLogId(null);
          resetForm();
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        } catch (e) {
          toast.error("エラー: " + e.message);
        }
      },
    });
  };

  // 練習記録を Firestore に保存する（新規・上書き両対応）
  const handleSaveLog = async () => {
    if (!logInput.distance) return;
    if (!logInput.category) {
      toast.error("区分を選択してください");
      return;
    }
    setIsSubmitting(true);
    try {
      const dataToSave = {
        date: logInput.date,
        distance: parseFloat(logInput.distance),
        category: logInput.category,
        menuDetail: logInput.menuDetail,
        rpe: parseInt(logInput.rpe, 10),
        pain: parseInt(logInput.pain, 10),
        achieved: logInput.achieved,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
      };
      if (editingLogId) {
        await updateDoc(docRef("logs", editingLogId), {
          ...dataToSave,
          updatedAt: new Date().toISOString(),
        });
        toast.success("記録を更新しました！");
      } else {
        await addDoc(colRef("logs"), {
          ...dataToSave,
          createdAt: new Date().toISOString(),
        });
        toast.success("記録を保存しました！");
      }
      resetForm();
      setView("diary");
    } catch (e) {
      console.error(e);
      toast.error("エラー: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 練習記録を削除する
  const handleDeleteLog = (targetId = null) => {
    const idToDelete = targetId || editingLogId;
    if (!idToDelete) return;

    setConfirmDialog({
      isOpen: true,
      message: "この記録を削除しますか？",
      onConfirm: async () => {
        try {
          await deleteDoc(docRef("logs", idToDelete));
          toast.success("記録を削除しました");
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });

          if (idToDelete === editingLogId) {
            setEditingLogId(null);
            resetForm();
          }
        } catch (e) {
          console.error(e);
          toast.error("エラー: " + e.message);
        }
      },
    });
  };

  const handleRestRegister = async () => {
    setIsSubmitting(true);
    try {
      const dataToSave = {
        date: logInput.date,
        distance: 0,
        category: "完全休養",
        menuDetail: "オフ",
        rpe: 1,
        pain: 1,
        achieved: true,
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
      };
      await addDoc(colRef("logs"), {
        ...dataToSave,
        createdAt: new Date().toISOString(),
      });
      toast.success("休養を記録しました");
      resetForm();
      setView("menu");
    } catch (e) {
      console.error(e);
      toast.error("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    logInput,
    setLogInput,
    editingLogId,
    setEditingLogId,
    isCoachEditModalOpen,
    setIsCoachEditModalOpen,
    isAthleteEditModalOpen,
    setIsAthleteEditModalOpen,
    resetForm,
    handleEditLog,
    handleAthleteUpdateLog,
    openCoachEditModal,
    handleCoachUpdateLog,
    handleCoachDeleteLog,
    handleSaveLog,
    handleDeleteLog,
    handleRestRegister,
  };
};
