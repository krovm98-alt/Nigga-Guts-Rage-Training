/* A deliberately limited estimator: no strength-transfer coefficients between machines. */
(function () {
  const PREFS = "ddx_exercise_preferences_v1";
  function preferences() {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS) || "{}");
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  function updatePreference(id, patch) {
    const all = preferences();
    all[id] = { ...all[id], ...patch };
    localStorage.setItem(PREFS, JSON.stringify(all));
  }
  function estimateWorkingWeight({
    exerciseId,
    history = [],
    recentPerformance,
    equipment,
    targetReps,
    now = Date.now(),
  }) {
    const x = DDXCatalog.get(exerciseId),
      result = {
        estimatedWeight: null,
        range: null,
        confidence: "low",
        sourceExerciseIds: [],
        reason: "Вес требует калибровки",
        requiresCalibration: true,
      };
    if (!x) return result;
    if(recentPerformance && (recentPerformance.pain || recentPerformance.skipped || recentPerformance.incomplete || recentPerformance.effort>=4))
      return {...result,reason:'Текущее самочувствие или выполнение требует ручной проверки нагрузки'};
    if (equipment && equipment !== x.equipment)
      return {
        ...result,
        reason: "Оборудование отличается. Вес требует калибровки",
      };
    if (exerciseId === "lateral_delt_machine" || x.unit.includes("противовес"))
      return {
        ...result,
        reason: "Неоднозначная шкала нагрузки: выбери вес вручную",
      };
    const recent = DDXCatalog.reliable(exerciseId, {}, history);
    if (recent.last) {
      if (recent.weight === null)
        return {
          ...result,
          sourceExerciseIds: [exerciseId],
          reason: recent.reason,
        };
      const age = (now - recent.last.s.start) / 86400000;
      const compatibleReps = !targetReps || targetReps <= recent.reps + 1;
      if (age < 0 || age > 60 || !compatibleReps)
        return {
          ...result,
          sourceExerciseIds: [exerciseId],
          reason:
            "Результат устарел или целевые повторы изменились. Проверь нагрузку пробой.",
        };
      return {
        ...result,
        estimatedWeight: recent.weight,
        confidence: "high",
        sourceExerciseIds: [exerciseId],
        requiresCalibration: false,
        reason:
          "Подтверждённая история этого упражнения · " +
          new Date(recent.last.s.start).toLocaleDateString("ru-RU"),
      };
    }
    const ref = preferences()[exerciseId]?.reference;
    if (
      ref &&
      Number.isFinite(ref.weight) &&
      ref.weight >= 0 &&
      ref.unit === x.unit &&
      ref.equipment === x.equipment
    )
      return {
        ...result,
        estimatedWeight: ref.weight,
        confidence: "medium",
        sourceExerciseIds: [exerciseId],
        requiresCalibration: false,
        reason: "Сохранённый вручную рабочий ориентир этого упражнения",
      };
    const sources = x.compatibleExerciseIds
      .map((id) => ({
        x: DDXCatalog.get(id),
        r: DDXCatalog.reliable(id, {}, history),
      }))
      .filter(
        (v) =>
          v.r.last &&
          now >= v.r.last.s.start &&
          v.r.weight !== null &&
          now - v.r.last.s.start < 60 * 86400000,
      );
    if (sources.length) {
      result.sourceExerciseIds = sources.map((v) => v.x.id);
      result.reason =
        "Есть результаты близких упражнений: " +
        sources.map((v) => v.x.name).join(", ") +
        ". Они не подтверждают нагрузку на другом движении или тренажёре.";
      const compatible = sources.filter(
        (v) =>
          v.x.equipmentType === "гантели" &&
          x.equipmentType === "гантели" &&
          v.x.unit === x.unit,
      );
      const observed = compatible
        .flatMap((v) =>
          [DDXStore.trialRow(v.r.last.e), ...DDXStore.workRows(v.r.last.e)]
            .filter((r) => r?.d && r.e >= 1 && r.e <= 3)
            .map((r) => DDXStore.num(r.w)),
        )
        .filter((w) => w > 0 && Number.isFinite(w));
      if (observed.length > 1) {
        result.range = [Math.min(...observed), Math.max(...observed)];
        result.reason +=
          " Показан диапазон наблюдавшихся весов гантели, а не прогноз рабочего веса. Нужна проверка.";
      }
    }
    return result;
  }
  window.ExerciseEstimator = {
    estimateWorkingWeight,
    preferences,
    updatePreference,
    PREFS,
  };
})();
