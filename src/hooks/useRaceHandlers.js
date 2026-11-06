/*
 * useRaceHandlers — 大会・大会振り返りノート（raceCards）の操作
 *
 * 大会（tournaments）の作成/削除、選手の種目シート（raceCards）の
 * 保存/削除、監督フィードバックの送信をまとめて管理する。
 * 入力フォームの状態（newTournamentInput / raceCardInput /
 * editingRaceCardId）もこのフックが保持する。
 */
import { useState } from "react";
import { setDoc, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { colRef, docRef } from "../utils/firestore";

export const useRaceHandlers = ({
  currentUserId,
  currentProfile,
  tournaments,
  setView,
  setIsSubmitting,
  setConfirmDialog,
}) => {
  const [newTournamentInput, setNewTournamentInput] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });

  const [editingRaceCardId, setEditingRaceCardId] = useState(null);
  const [raceCardInput, setRaceCardInput] = useState({
    tournamentId: "",
    raceType: "",
    distance: "",
    startTime: "",
    ekidenDistance: "",
    targetTime: "",
    wupPlan: "",
    racePlan: "",
    condition: "",
    weather: "",
    wind: "",
    temp: "",
    humidity: "",
    resultTime: "",
    lapTimes: "",
    goodPoints: "",
    issues: "",
    teammateGoodPoints: "",
    nextGoal: "",
  });

  // 大会情報を新規作成または更新する
  const handleSaveTournament = async () => {
    if (
      !newTournamentInput.name ||
      !newTournamentInput.startDate ||
      !newTournamentInput.endDate
    ) {
      toast.error("大会名と期間（開始・終了）をすべて入力してください");
      return;
    }
    if (newTournamentInput.startDate > newTournamentInput.endDate) {
      toast.error("終了日は開始日以降の日付を指定してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const tournamentId = `tour_${Date.now()}`;
      const newTournament = {
        id: tournamentId,
        name: newTournamentInput.name,
        startDate: newTournamentInput.startDate,
        endDate: newTournamentInput.endDate,
        createdAt: new Date().toISOString(),
      };

      await setDoc(docRef("tournaments", tournamentId), newTournament);

      setNewTournamentInput({ name: "", startDate: "", endDate: "" });
      toast.success("新しい大会を登録しました！");
    } catch (error) {
      console.error("Error saving tournament:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 大会情報を削除する
  const handleDeleteTournament = (tournamentId) => {
    setConfirmDialog({
      isOpen: true,
      message: "この大会を削除しますか？\n※選手の振り返りシートも影響を受けます",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        setIsSubmitting(true);
        try {
          await deleteDoc(docRef("tournaments", tournamentId));
          toast.success("大会を削除しました");
        } catch (error) {
          console.error("Error deleting tournament:", error);
          toast.error("削除に失敗しました");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  // 大会振り返りノートを保存する
  const handleSaveRaceCard = async () => {
    if (!raceCardInput.tournamentId) {
      toast.error("エラー：大会が選択されていません");
      return;
    }
    setIsSubmitting(true);
    try {
      // 出場日が未入力なら大会開始日で補完する（フォームは表示のみ
      // フォールバックしており、未操作だと date が保存されないため）
      const tour = tournaments.find((t) => t.id === raceCardInput.tournamentId);
      const dataToSave = {
        ...raceCardInput,
        date: raceCardInput.date || tour?.startDate || "",
        runnerId: currentUserId,
        runnerName: `${currentProfile.lastName} ${currentProfile.firstName}`,
        updatedAt: new Date().toISOString(),
      };

      if (editingRaceCardId) {
        await updateDoc(docRef("raceCards", editingRaceCardId), dataToSave);
        toast.success("大会ノートを更新しました！");
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await addDoc(colRef("raceCards"), dataToSave);
        toast.success("新しい種目シートを作成しました！");
      }
      setEditingRaceCardId(null);
      setView("race");
    } catch (e) {
      console.error(e);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRaceCard = (cardId) => {
    setConfirmDialog({
      isOpen: true,
      message: "このシートを削除しますか？",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        try {
          await deleteDoc(docRef("raceCards", cardId));
          toast.success("シートを削除しました");
        } catch (e) {
          console.error(e);
          toast.error("削除に失敗しました");
        }
      },
    });
  };

  const handleSaveRaceCardFeedback = async (cardId, feedbackText) => {
    setIsSubmitting(true);
    try {
      await updateDoc(docRef("raceCards", cardId), {
        coachFeedback: feedbackText,
        coachFeedbackAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: "coach",
      });
      toast.success("フィードバックを送信しました！");
    } catch (e) {
      console.error(e);
      toast.error("送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    newTournamentInput,
    setNewTournamentInput,
    editingRaceCardId,
    setEditingRaceCardId,
    raceCardInput,
    setRaceCardInput,
    handleSaveTournament,
    handleDeleteTournament,
    handleSaveRaceCard,
    handleDeleteRaceCard,
    handleSaveRaceCardFeedback,
  };
};
