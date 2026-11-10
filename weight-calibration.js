/* Pure, conservative calibration. Hints are explicit trial loads from the existing
   plans, not a multiplier or an estimate of a one-repetition maximum. */
(function () {
  const hints = {
    db_bench: [12, 8],
    incline_db_bench: [10, 8],
    smith_bench: [30, 8],
    smith_incline: [20, 8],
    pec_deck: [30, 8],
    overhead_db_tri: [10, 8],
    triceps_machine: [40, 8],
    dip_machine: [60, 8],
    rope_pushdown: [12, 10],
    straight_pushdown: [10, 8],
    lat_pulldown: [40, 8],
    seated_cable_row: [30, 10],
    seated_lever_row: [25, 10],
    back_extension_machine: [40, 10],
    shrug_machine: [18, 10],
    biceps_machine: [16, 8],
    db_curl: [8, 8],
    ez_preacher: [12, 8],
    ab_machine: [10, 12],
    barbell_squat: [40, 6],
    pendulum_squat: [40, 6],
    db_rdl: [14, 8],
    leg_press: [60, 10],
    calf_raise: [20, 10],
    rear_delt_machine: [20, 10],
    db_lateral_raise: [5, 10],
  };
  const number = DDXStore.num;
  function evaluate(exerciseId, state, history) {
    const x = DDXCatalog.get(exerciseId),
      actual = state.rows?.[0];
    // The actual replacement has already been resolved by the caller.
    const reliable = DDXCatalog.reliable(
      exerciseId,
      { ...state, alt: -1, custom: "" },
      history,
    );
    const result = {
      exerciseId,
      unit: x?.unit || "Единица требует уточнения",
      base: reliable.weight,
      source:
        reliable.weight === null
          ? "Надёжная база не подтверждена"
          : reliable.source === "history"
            ? "Последняя достоверная тренировка"
            : "Подтверждённый исходный ориентир",
      trial: { weight: null, reps: 8, reason: "Вес требует уточнения" },
      work: {
        weight: null,
        reps: x?.reps || 8,
        sets: Math.max(0, (state.rows?.length || 1) - 1),
        confidence: "недостаточно данных",
        reason: reliable.reason,
      },
      actual: actual ? { ...actual } : null,
    };
    const finish = () => {
      result.signature = JSON.stringify([
        exerciseId,
        actual,
        state.side,
        state.n,
        state.t,
        state.why,
        {
          weight: reliable.weight,
          reason: reliable.reason,
          source: reliable.source,
          unit: reliable.unit,
          last: reliable.last
            ? {
                id: reliable.last.s.id,
                start: reliable.last.s.start,
                exercise: reliable.last.e,
              }
            : null,
        },
        result.trial,
        result.work,
      ]);
      return result;
    };
    // A cautious trial hint is independent of whether a *working* load is reliable.
    // Never turn a trial hint into an automatic working-load recommendation.
    const hint = hints[exerciseId];
    const unsafeCurrent =
      state.side ||
      state.skip ||
      state.custom ||
      (state.alt != null && state.alt >= 0) ||
      /(боль|болит|дискомфорт|чувствуется)/i.test(
        [state.n, ...(state.t || []), ...(state.why || [])].join(" "),
      ) ||
      exerciseId === "lateral_delt_machine";
    if (!x || unsafeCurrent) return finish();

    // Do not suggest a trial load above weights actually completed in the
    // latest session, even if that session was unsuitable for progression.
    const recent = reliable.last?.e;
    const completedWeights = (recent?.rows || [])
      .slice(1)
      .filter((r) => r.d && Number.isFinite(number(r.w)) && number(r.w) > 0)
      .map((r) => number(r.w));
    const cap = completedWeights.length
      ? Math.min(...completedWeights)
      : Number.isFinite(reliable.weight) && reliable.weight > 0
        ? reliable.weight
        : null;
    const validTrial = (r) =>
      r &&
      r.d &&
      Number.isFinite(number(r.w)) &&
      number(r.w) > 0 &&
      (cap === null || number(r.w) <= cap) &&
      Number.isInteger(number(r.r)) &&
      number(r.r) > 0 &&
      r.e >= 1 &&
      r.e <= 3;
    let trial = validTrial(recent?.rows?.[0]) ? recent.rows[0] : null;
    if (!trial && Array.isArray(history)) {
      // A historical probe is useful only for the same canonical exercise
      // and unit, and must not exceed the current conservative cap.
      for (const session of history
        .filter((session) => session.start < (reliable.last?.s.start || Infinity))
        .slice()
        .sort((a, b) => b.start - a.start)) {
        const candidate = session.exercises?.find(
          (e) => DDXCatalog.identity(e) === exerciseId &&
            !e.skipped &&
            !e.side &&
            (!e.unit || e.unit === x.unit) &&
            (!e.equipment || e.equipment === x.equipment),
        );
        if (candidate && validTrial(candidate.rows?.[0])) {
          trial = candidate.rows[0];
          result.source +=
            "; проба от " + new Date(session.start).toLocaleDateString("ru-RU");
          break;
        }
      }
    }
    if (trial)
      result.trial = {
        weight: number(trial.w),
        reps: number(trial.r),
        reason: "Ранее выполненная совместимая лёгкая проба; рабочий вес оценивается отдельно",
      };
    else if (
      hint &&
      (cap === null || hint[0] <= cap) &&
      Number.isFinite(hint[0]) &&
      hint[0] > 0
    )
      result.trial = {
        weight: hint[0],
        reps: hint[1],
        reason: "Предварительный ориентир пробного подхода; рабочий вес не подтверждён",
      };

    if (reliable.weight === null || !Number.isFinite(reliable.weight))
      return finish();
    result.work.reason =
      "Выполни пробный подход и укажи фактические вес, повторы и сложность.";
    if (!actual?.d) return finish();
    const w = number(actual.w),
      r = number(actual.r);
    if (
      !Number.isFinite(w) ||
      w <= 0 ||
      !Number.isInteger(r) ||
      r <= 0 ||
      !Number.isInteger(actual.e) ||
      actual.e < 1 ||
      actual.e > 3
    ) {
      result.work.reason =
        "Проба тяжёлая, неизвестной сложности или некорректна. Повышение запрещено; подбери посильную нагрузку вручную.";
      return finish();
    }
    if (
      result.trial.weight === null ||
      w < result.trial.weight ||
      r < result.trial.reps
    ) {
      result.work.reason = `Фактическая проба ${w}×${r} недостаточна для оценки ${reliable.weight} кг. Выполни промежуточный проверочный подход и обнови пробу, либо выбери вес вручную.`;
      return finish();
    }
    if (w > reliable.weight) {
      result.work.reason = `Проба ${w}×${r} выше достоверной базы ${reliable.weight} кг. Рост не подтверждён; выбери нагрузку вручную.`;
      return finish();
    }
    if (
      state.rows
        .slice(1)
        .some(
          (row) =>
            row.d &&
            (row.e < 1 ||
              row.e >= 4 ||
              number(row.w) !== reliable.weight ||
              number(row.r) <= 0),
        )
    ) {
      result.work.reason =
        "Текущие рабочие подходы отличаются от базы или слишком трудны. Повторное применение отключено.";
      return finish();
    }
    result.work.weight = reliable.weight;
    result.work.confidence =
      reliable.source === "history" ? "умеренная" : "низкая: исходный ориентир";
    result.work.reason = `Учтена фактическая проба ${w} кг × ${r}, сложность ${actual.e}/6. Повтори ${reliable.weight} кг без повышения; лёгкая проба не подтверждает рост нагрузки.`;
    return finish();
  }
  function apply(state, result, kind) {
    if (kind === "trial") {
      if (state.rows[0].d || result.trial.weight === null) return false;
      Object.assign(state.rows[0], {
        w: String(result.trial.weight),
        r: String(result.trial.reps),
        e: 0,
      });
    } else {
      if (result.work.weight === null) return false;
      state.rows.forEach((row, i) => {
        if (
          i > 0 &&
          !row.d &&
          !row.manualWeight &&
          !(
            state.weightApplication &&
            row.w !== "" &&
            number(row.w) !== state.weightApplication.weight
          )
        )
          row.w = String(result.work.weight);
      });
    }
    state.calibration ??= {};
    state.calibration[kind] = {
      exerciseId: result.exerciseId,
      signature: result.signature,
      source: result.source,
      weight: kind === "trial" ? result.trial.weight : result.work.weight,
      confirmedAt: Date.now(),
    };
    return true;
  }
  window.WeightCalibration = { evaluate, apply };
})();
