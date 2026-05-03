/*
 * usePeriod — 表示期間の選択と fetchCutoff の管理
 *
 * 「今月」「今年度」などの期間設定を保持し、
 * データ取得の下限日（fetchCutoff）を App.js に返す。
 * 期間が変わると useTeamData が自動的に再購読範囲を調整する。
 */
import { useState, useEffect, useMemo } from "react";
import { updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { settingsDocRef } from "../utils/firestore";
import {
  getTodayStr,
  calculateAutoQuarters,
  getMonthRange,
  getYearRange,
} from "../utils/dateUtils";

export const usePeriod = ({ appSettings, setFetchCutoff, setConfirmDialog }) => {
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [isPeriodInitialized, setIsPeriodInitialized] = useState(false);
  const [isPeriodSaving, setIsPeriodSaving] = useState(false);

  const initialPeriodInput = {
    name: "",
    start: "",
    end: "",
    quarters: [
      { id: 1, start: "", end: "" },
      { id: 2, start: "", end: "" },
      { id: 3, start: "", end: "" },
      { id: 4, start: "", end: "" },
    ],
  };
  const [newPeriodInput, setNewPeriodInput] = useState(initialPeriodInput);
  const [editingPeriodId, setEditingPeriodId] = useState(null);

  useEffect(() => {
    if (!selectedPeriod) {
      const current = getMonthRange(getTodayStr());
      setSelectedPeriod({
        id: "current_month",
        name: current.name,
        start: current.start,
        end: current.end,
        type: "month",
      });
    }
  }, [selectedPeriod]);

  const availablePeriods = useMemo(() => {
    const periods = [];

    const globalStart = appSettings.startDate;
    const globalEnd = appSettings.endDate;

    if (globalStart && globalEnd) {
      periods.push({
        id: "global_period",
        name: "チーム指定期間 (シーズン)",
        start: globalStart,
        end: globalEnd,
        quarters: appSettings.quarters || [],
        type: "global",
      });
    }

    if (appSettings.customPeriods && appSettings.customPeriods.length > 0) {
      appSettings.customPeriods.forEach((p) => {
        periods.push({ ...p, type: "custom" });
      });
    }

    const currentYear = new Date().getFullYear();
    for (let i = -1; i < 3; i++) {
      const y = currentYear - i;
      const yRange = getYearRange(y);
      periods.push({
        id: `year_${y}`,
        name: yRange.name,
        start: yRange.start,
        end: yRange.end,
        type: "year",
      });
    }

    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mRange = getMonthRange(d);
      periods.push({
        id: `month_${d.getFullYear()}_${d.getMonth() + 1}`,
        name: mRange.name,
        start: mRange.start,
        end: mRange.end,
        type: "month",
      });
    }

    return periods;
  }, [appSettings]);

  useEffect(() => {
    if (
      !isPeriodInitialized &&
      appSettings.loaded &&
      availablePeriods.length > 0
    ) {
      const defaultId = appSettings.defaultPeriodId || "global_period";
      let target = null;
      if (defaultId === "dynamic_current") {
        const today = new Date();
        const currentMonthId = `month_${today.getFullYear()}_${today.getMonth() + 1}`;
        target = availablePeriods.find((p) => p.id === currentMonthId);
      } else {
        target = availablePeriods.find((p) => p.id === defaultId);
      }
      if (!target) {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        let fiscalYear = today.getFullYear();
        if (currentMonth <= 3) {
          fiscalYear = fiscalYear - 1;
        }
        target = availablePeriods.find((p) => p.id === `year_${fiscalYear}`);
      }
      if (!target) target = availablePeriods[0];
      if (target) {
        setSelectedPeriod(target);
        setIsPeriodInitialized(true);
      }
    }
  }, [
    availablePeriods,
    appSettings.defaultPeriodId,
    appSettings.loaded,
    isPeriodInitialized,
  ]);

  const targetPeriod = useMemo(() => {
    if (selectedPeriod) {
      const found = availablePeriods.find((p) => p.id === selectedPeriod.id);
      return found || selectedPeriod;
    }
    return (
      availablePeriods.find((p) => p.id === "global_period") || {
        id: "fallback",
        name: "Loading...",
        start: "2000-01-01",
        end: "2100-12-31",
        type: "global",
      }
    );
  }, [selectedPeriod, availablePeriods]);

  useEffect(() => {
    if (targetPeriod && targetPeriod.start) {
      setFetchCutoff((prev) => {
        if (targetPeriod.start < prev) {
          return targetPeriod.start;
        }
        return prev;
      });
    }
  }, [targetPeriod, setFetchCutoff]);

  const activeQuarters = useMemo(() => {
    if (targetPeriod.type === "global" || targetPeriod.type === "custom") {
      const hasValidQuarters =
        targetPeriod.quarters &&
        targetPeriod.quarters.length > 0 &&
        targetPeriod.quarters.some((q) => q.start && q.end);

      if (hasValidQuarters) {
        return targetPeriod.quarters;
      }

      if (targetPeriod.start && targetPeriod.end) {
        return calculateAutoQuarters(targetPeriod.start, targetPeriod.end);
      }
    }
    return [];
  }, [targetPeriod]);

  const updateNewPeriodInputWithAutoQuarters = (field, value) => {
    const updatedInput = { ...newPeriodInput, [field]: value };
    if (updatedInput.start && updatedInput.end) {
      updatedInput.quarters = calculateAutoQuarters(
        updatedInput.start,
        updatedInput.end,
      );
    }
    setNewPeriodInput(updatedInput);
  };

  const handleNewPeriodQuarterChange = (idx, field, value) => {
    const updatedQuarters = [...newPeriodInput.quarters];
    updatedQuarters[idx] = { ...updatedQuarters[idx], [field]: value };
    setNewPeriodInput({ ...newPeriodInput, quarters: updatedQuarters });
  };

  const handleSaveCustomPeriod = async () => {
    if (!newPeriodInput.name || !newPeriodInput.start || !newPeriodInput.end) {
      toast.error("期間名、開始日、終了日は必須です");
      return;
    }
    setIsPeriodSaving(true);
    try {
      let updatedPeriods;
      if (editingPeriodId) {
        updatedPeriods = appSettings.customPeriods.map((p) =>
          p.id === editingPeriodId
            ? { ...newPeriodInput, id: editingPeriodId, type: "custom" }
            : p,
        );
        toast.success("期間を更新しました");
      } else {
        const qs = calculateAutoQuarters(
          newPeriodInput.start,
          newPeriodInput.end,
        );
        const newPeriod = {
          id: `custom_${Date.now()}`,
          ...newPeriodInput,
          quarters: qs,
          type: "custom",
        };
        updatedPeriods = [...(appSettings.customPeriods || []), newPeriod];
        toast.success("新しい期間を追加しました");
      }
      await updateDoc(settingsDocRef(), { customPeriods: updatedPeriods });
      setNewPeriodInput(initialPeriodInput);
      setEditingPeriodId(null);
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setIsPeriodSaving(false);
    }
  };

  const handleDeleteCustomPeriod = async (periodId) => {
    setConfirmDialog({
      isOpen: true,
      message:
        "この期間設定を削除しますか？（選手が入力した目標値は残りますが、期間選択肢からは消えます）",
      onConfirm: async () => {
        setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        const updatedPeriods = appSettings.customPeriods.filter(
          (p) => p.id !== periodId,
        );
        await updateDoc(settingsDocRef(), { customPeriods: updatedPeriods });
        toast.success("期間を削除しました");
      },
    });
  };

  const handleEditCustomPeriod = (period) => {
    setNewPeriodInput({
      name: period.name,
      start: period.start,
      end: period.end,
      quarters:
        period.quarters || calculateAutoQuarters(period.start, period.end),
    });
    setEditingPeriodId(period.id);
  };

  const handleCancelEdit = () => {
    setNewPeriodInput(initialPeriodInput);
    setEditingPeriodId(null);
  };

  const handleSaveDefaultPeriod = async (e) => {
    const newDefaultId = e.target.value;
    await updateDoc(settingsDocRef(), { defaultPeriodId: newDefaultId });
    toast.success("初期表示期間を変更しました");
  };

  return {
    availablePeriods,
    selectedPeriod,
    setSelectedPeriod,
    targetPeriod,
    activeQuarters,
    newPeriodInput,
    editingPeriodId,
    isPeriodSaving,
    updateNewPeriodInputWithAutoQuarters,
    handleNewPeriodQuarterChange,
    handleSaveCustomPeriod,
    handleDeleteCustomPeriod,
    handleEditCustomPeriod,
    handleCancelEdit,
    handleSaveDefaultPeriod,
  };
};
