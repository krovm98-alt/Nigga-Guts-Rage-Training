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
    const x = DDXCatalog.get(exerciseId), actual = state.rows?.[0];
    const reliable = DDXCatalog.reliable(exerciseId, { ...state, alt:-1, custom:"" }, history);
    const recent = reliable.last?.e;
    const completed = (recent?.rows || []).slice(1).filter(r =>
      r.d && Number.isFinite(number(r.w)) && number(r.w) > 0).map(r => number(r.w));
    const pain = /(боль|болит|дискомфорт|чувствуется)/i.test(
      [state.n,...(state.t||[]),...(state.why||[]),recent?.notes,
       ...(recent?.tags||[]),...(recent?.why||[])].join(" "));
    const incompatible = !x || state.side || state.skip || state.custom ||
      (state.alt != null && state.alt >= 0) || exerciseId === "lateral_delt_machine" ||
      !!recent?.side || !!(recent?.unit && recent.unit !== x.unit) ||
      !!(recent?.equipment && recent.equipment !== x.equipment);
    const result = {
      exerciseId, unit:x?.unit || "Единица требует уточнения",
      base:reliable.weight, source:reliable.source === "history" ? "Последняя тренировка" : "Исходный ориентир",
      trial:{weight:null,reps:8,reason:"Вес требует уточнения"},
      work:{weight:null,reps:x?.reps||8,sets:Math.max(0,(state.rows?.length||1)-1),
        confidence:"недостаточно данных",reason:"Выполни пробный подход и оцени усилие."},
      actual:actual ? {...actual} : null,
    };
    const finish = () => {
      result.signature = JSON.stringify([exerciseId,actual,state.side,state.n,state.t,
        state.why,reliable.weight,reliable.reason,reliable.last?.s.id,recent?.rows,
        result.trial,result.work]);
      return result;
    };
    if (incompatible || pain) {
      result.work.reason = "Неоднозначные единицы или дискомфорт: подбери нагрузку вручную.";
      return finish();
    }
    const hint = hints[exerciseId];
    const cap = completed.length ? Math.min(...completed) :
      Number.isFinite(reliable.weight) && reliable.weight > 0 ? reliable.weight :
      Number.isFinite(x.weight) && x.weight > 0 ? x.weight : null;
    const prevTrial = recent?.rows?.[0];
    const validTrial = r => r && r.d && Number.isFinite(number(r.w)) &&
      number(r.w)>0 && (cap===null || number(r.w)<=cap) &&
      Number.isInteger(number(r.r)) && number(r.r)>0 && r.e>=1 && r.e<=3;
    if (hint && hint[0]>0 && (cap===null || hint[0]<=cap))
      result.trial={weight:hint[0],reps:hint[1],reason:"Стартовый пробный вес; можно изменить"};
    if (validTrial(prevTrial) &&
       (result.trial.weight===null || number(prevTrial.w)<result.trial.weight))
      result.trial={weight:number(prevTrial.w),reps:number(prevTrial.r),reason:"Ранее выполненная лёгкая проба"};
    // Do not multiply a trial to guess a max. Use known loads only as ceilings.
    const historical = reliable.weight != null ? reliable.weight : cap;
    const base = Number.isFinite(historical) && historical>0 ?
      Math.min(historical,...(completed.length ? completed : [historical])) : null;
    if (!actual?.d) return finish();
    const w=number(actual.w), reps=number(actual.r), effort=actual.e;
    if (!Number.isFinite(w) || w<=0 || !Number.isInteger(reps) || reps<=0 ||
      !Number.isInteger(effort) || effort<1 || effort>6) {
      result.work.reason="Укажи фактический вес, повторы и усилие пробного подхода.";
      return finish();
    }
    if (effort===6) {
      result.work.reason="Проба в отказ: рабочий вес подбирай вручную без повышения.";
      return finish();
    }
    if (base===null || w>base) {
      result.work.reason="Нет достоверного ориентира рабочего веса. Проверь нагрузку дополнительным подходом или выбери её вручную.";
      return finish();
    }
    if (result.trial.weight!==null &&
      (w<result.trial.weight*0.7 || reps<Math.max(4,Math.floor(result.trial.reps*0.65)))) {
      result.work.reason="Проба слишком лёгкая или короткая для оценки; нужен промежуточный проверочный подход.";
      return finish();
    }
    const factor=effort<=3 ? 1 : effort===4 ? 0.9 : 0.8;
    let target=Math.floor(base*factor*2)/2;
    if (completed.length) target=Math.min(target,Math.min(...completed));
    if (target<w) {
      result.work.reason="Проба тяжелее консервативного рабочего ориентира. Уменьши вес или подбери его вручную.";
      return finish();
    }
    result.work.weight=target;
    result.work.confidence=reliable.weight===null ? "низкая: неоднородная история" : "умеренная";
    result.work.reason="Проба "+w+" кг × "+reps+", усилие "+effort+
      "/6. "+(effort<=3 ? "Предложено удержать прежнюю нагрузку." :
        "Проба была напряжённой, рабочий ориентир снижен.")+
      " Проверь доступные шаги оборудования и технику; повышение не автоматическое.";
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
