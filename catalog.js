(function () {
  const items = [
    {
      id: "db_bench",
      name: "Жим гантелей лёжа",
      group: "Грудь",
      equipment: "гантели",
      unit: "вес одной гантели",
      reference: "21×8",
      weight: 21.0,
      reps: 8,
      goal: "22×8 → 22×10 → 24",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "incline_db_bench",
      name: "Жим гантелей на наклонной",
      group: "Грудь",
      equipment: "гантели",
      unit: "вес одной гантели",
      reference: "20×8",
      weight: 20.0,
      reps: 8,
      goal: "20×10 → 22×8",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "smith_bench",
      name: "Жим лёжа в Смите",
      group: "Грудь",
      equipment: "тренажёр / блок",
      unit: "общий вес",
      reference: "50×8",
      weight: 50.0,
      reps: 8,
      goal: "50×8 чисто → 52,5",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "smith_incline",
      name: "Жим на наклонной в Смите",
      group: "Грудь",
      equipment: "тренажёр / блок",
      unit: "общий вес",
      reference: "30×8",
      weight: 30.0,
      reps: 8,
      goal: "30×8 → 32,5",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "chest_press",
      name: "Грудной тренажёр",
      group: "Грудь",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "41×8",
      weight: 41.0,
      reps: 8,
      goal: "41×10 → 45",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "pec_deck",
      name: "Сведение рук в тренажёре («бабочка»)",
      group: "Грудь",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "54×10",
      weight: 54.0,
      reps: 10,
      goal: "54×10 → 59",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "overhead_db_tri",
      name: "Разгибание гантели из-за головы",
      group: "Трицепс",
      equipment: "гантели",
      unit: "вес одной гантели",
      reference: "18×8",
      weight: 18.0,
      reps: 8,
      goal: "18×10 → 20×8",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "triceps_machine",
      name: "Трицепс в тренажёре",
      group: "Трицепс",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "68×8",
      weight: 68.0,
      reps: 8,
      goal: "68×10 → 73",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "dip_machine",
      name: "Дип-тренажёр",
      group: "Трицепс",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "100×8",
      weight: 100.0,
      reps: 8,
      goal: "100×8 → 106,5×8",
      status: "активное",
      requiresConfirmation: false,
      warning:
        "106,5 кг ранее слишком тяжело; это не подтверждённый рабочий вес.",
    },
    {
      id: "rope_pushdown",
      name: "Разгибание на блоке с канатом",
      group: "Трицепс",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "18–20×8–10",
      weight: null,
      reps: 8,
      goal: "18×10 → 20×10",
      status: "требует уточнения",
      requiresConfirmation: true,
      warning: "18–20 кг — наблюдавшийся диапазон.",
    },
    {
      id: "straight_pushdown",
      name: "Разгибание на блоке с прямой рукоятью",
      group: "Трицепс",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "15×8",
      weight: 15.0,
      reps: 8,
      goal: "16×10 → 18",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "lat_pulldown",
      name: "Тяга верхнего блока",
      group: "Спина",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "59×8",
      weight: 59.0,
      reps: 8,
      goal: "59×10 → 63",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "seated_cable_row",
      name: "Тяга сидя на блоке",
      group: "Спина",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "45×10",
      weight: 45.0,
      reps: 10,
      goal: "45×10 → 48",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "seated_lever_row",
      name: "Рычажная тяга сидя",
      group: "Спина",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "41×10",
      weight: 41.0,
      reps: 10,
      goal: "41×10 → 45",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "back_extension_machine",
      name: "Гиперэкстензия в тренажёре",
      group: "Спина",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "63×10",
      weight: 63.0,
      reps: 10,
      goal: "68×10 → 73",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "shrug_machine",
      name: "Шраги в тренажёре",
      group: "Спина",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "28,5×10",
      weight: 28.5,
      reps: 10,
      goal: "30×10 → 32",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "one_arm_machine_row",
      name: "Тяга одной рукой в тренажёре",
      group: "Спина",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "45×8",
      weight: 45.0,
      reps: 8,
      goal: "Устаревшее упражнение, заменено рычажной тягой",
      status: "устаревшее",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "biceps_machine",
      name: "Сгибание рук в тренажёре",
      group: "Бицепс",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "26×8",
      weight: 26.0,
      reps: 8,
      goal: "26×10 → 28",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "db_curl",
      name: "Подъём гантелей на бицепс",
      group: "Бицепс",
      equipment: "гантели",
      unit: "вес одной гантели",
      reference: "10×10",
      weight: 10.0,
      reps: 10,
      goal: "12×8 → 12×10",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "ez_preacher",
      name: "EZ-гриф на скамье Скотта",
      group: "Бицепс",
      equipment: "штанга",
      unit: "общий вес",
      reference: "18–27×8",
      weight: null,
      reps: 8,
      goal: "Резервное, давно не выполнялось",
      status: "резервное",
      requiresConfirmation: true,
      warning: "18–27 кг — диапазон; ограничивали предплечья.",
    },
    {
      id: "shoulder_press_machine",
      name: "Жим от плеч в тренажёре",
      group: "Плечи",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "32×8",
      weight: 32.0,
      reps: 8,
      goal: "36×8 → 36×10",
      status: "активное",
      requiresConfirmation: false,
      warning: "41 кг слишком тяжело; 36×8 пока только цель.",
    },
    {
      id: "seated_db_shoulder_press",
      name: "Жим гантелей сидя",
      group: "Плечи",
      equipment: "гантели",
      unit: "вес одной гантели",
      reference: "14×8",
      weight: 14.0,
      reps: 8,
      goal: "16×8",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "lateral_delt_machine",
      name: "Дельта-машина",
      group: "Плечи",
      equipment: "тренажёр / блок",
      unit: "вес на сторону ×2 — учёт требует подтверждения",
      reference: "36×8",
      weight: null,
      reps: 8,
      goal: "36×10 → 38",
      status: "требует уточнения",
      requiresConfirmation: true,
      warning: "Не пересчитывать 36 кг в 72 кг: уточнить учёт на сторону ×2.",
    },
    {
      id: "rear_delt_machine",
      name: "Задние дельты в тренажёре",
      group: "Плечи",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "32×10",
      weight: 32.0,
      reps: 10,
      goal: "32×12 → 36",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "db_lateral_raise",
      name: "Махи гантелями в стороны",
      group: "Плечи",
      equipment: "гантели",
      unit: "вес одной гантели",
      reference: "6×8",
      weight: 6.0,
      reps: 8,
      goal: "7×10 → 8",
      status: "активное",
      requiresConfirmation: false,
      warning: "10 кг ранее слишком тяжело.",
    },
    {
      id: "barbell_squat",
      name: "Приседания со штангой",
      group: "Ноги",
      equipment: "штанга",
      unit: "общий вес",
      reference: "45×8",
      weight: 45.0,
      reps: 8,
      goal: "45×10 → 50×8",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "pendulum_squat",
      name: "Маятниковый присед",
      group: "Ноги",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "60×6",
      weight: 60.0,
      reps: 8,
      goal: "55–60×8 → 65",
      status: "активное",
      requiresConfirmation: false,
      warning: "Подтверждено 6, а не 8 повторений.",
    },
    {
      id: "smith_squat",
      name: "Присед в Смите",
      group: "Ноги",
      equipment: "тренажёр / блок",
      unit: "общий вес",
      reference: "60×8",
      weight: 60.0,
      reps: 8,
      goal: "Устаревшее, не использовать по умолчанию",
      status: "устаревшее",
      requiresConfirmation: false,
      warning: "09.10 выполнялось в отказ; исключено из основного плана.",
    },
    {
      id: "db_rdl",
      name: "Румынская тяга с гантелями",
      group: "Ноги",
      equipment: "гантели",
      unit: "вес одной гантели",
      reference: "20×10",
      weight: 20.0,
      reps: 10,
      goal: "22×10 → 24",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "leg_press",
      name: "Жим ногами",
      group: "Ноги",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "80×10",
      weight: 80.0,
      reps: 10,
      goal: "90×10 → 100",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "seated_leg_curl",
      name: "Сгибание ног сидя",
      group: "Ноги",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "35×10",
      weight: null,
      reps: 10,
      goal: "35×12 → 37,5",
      status: "требует уточнения",
      requiresConfirmation: true,
      warning: "Предположительные данные: требуется подтверждение.",
    },
    {
      id: "seated_leg_extension",
      name: "Разгибание ног сидя",
      group: "Ноги",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "40×12",
      weight: null,
      reps: 12,
      goal: "40×12 → 42,5",
      status: "требует уточнения",
      requiresConfirmation: true,
      warning: "Предположительные данные; отмечен дискомфорт колена.",
    },
    {
      id: "calf_raise",
      name: "Подъём на икры",
      group: "Ноги",
      equipment: "тренажёр / блок",
      unit: "показание конкретного тренажёра",
      reference: "30×12",
      weight: 30.0,
      reps: 12,
      goal: "30×15 → 35",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
    {
      id: "ab_machine",
      name: "Пресс в тренажёре с блином",
      group: "Пресс",
      equipment: "тренажёр / блок",
      unit: "общий вес",
      reference: "15×10",
      weight: 15.0,
      reps: 10,
      goal: "17,5×10 → 20",
      status: "активное",
      requiresConfirmation: false,
      warning: "",
    },
  ];
  const legacy = {
    dbbench: "db_bench",
    dbincline: "incline_db_bench",
    dbtri: "overhead_db_tri",
    dip: "dip_machine",
    rope: "rope_pushdown",
    lat: "lat_pulldown",
    seated: "seated_cable_row",
    lever: "seated_lever_row",
    hyper: "back_extension_machine",
    shrug: "shrug_machine",
    bicmachine: "biceps_machine",
    bicdb: "db_curl",
    abs: "ab_machine",
    squat: "barbell_squat",
    rdl: "db_rdl",
    legpress: "leg_press",
    curl: "seated_leg_curl",
    extension: "seated_leg_extension",
    calves: "calf_raise",
    delt: "lateral_delt_machine",
    rear: "rear_delt_machine",
  };
  const aliases = {
    "Сведение рук (бабочка)": "pec_deck",
    "Скамья Скотта EZ": "ez_preacher",
    "Разгибание с прямой рукоятью": "straight_pushdown",
  };
  const get = (id) => items.find((x) => x.id === id);
  function identity(e) {
    if (e.exerciseId) return e.exerciseId;
    if (e.replacement)
      return (
        items.find((x) => x.name === e.replacement)?.id ||
        aliases[e.replacement] ||
        "legacy-replacement:" + e.replacement
      );
    return legacy[e.id] || (get(e.id) ? e.id : "legacy:" + e.id);
  }
  function latest(id) {
    return DDXStore.history()
      .slice()
      .sort((a, b) => b.start - a.start)
      .flatMap((s) =>
        s.exercises.filter((e) => identity(e) === id).map((e) => ({ s, e })),
      )[0];
  }
  function reliable(id, st = {}) {
    const x = get(id);
    if (!x)
      return {
        weight: null,
        reason: "Неизвестное упражнение: укажи вес вручную",
      };
    let last;
    try {
      last = latest(id);
    } catch {
      return {
        weight: null,
        reason: "История повреждена: рекомендации недоступны",
      };
    }
    const pain = (value) => /(боль|болит|дискомфорт|чувствуется)/i.test(value);
    const currentPain = pain(
      [st.n, ...(st.t || []), ...(st.why || [])].join(" "),
    );
    const result = {
      weight: null,
      last,
      source: last ? "history" : "DDX",
      unit: x.unit,
    };
    if (
      currentPain ||
      st.custom ||
      st.alt >= 0 ||
      st.skip ||
      st.side ||
      id === "lateral_delt_machine"
    )
      return {
        ...result,
        reason:
          "Дискомфорт, замена, пропуск или неоднозначная единица веса: укажи вес вручную",
      };
    if (!last)
      return {
        ...result,
        weight: x.requiresConfirmation ? null : x.weight,
        reason: x.requiresConfirmation
          ? "Неподтверждённый ориентир: укажи рабочий вес вручную"
          : "Источник: исходный журнал DDX; реальных тренировок в приложении нет",
      };
    const e = last.e,
      planned = e.rows.slice(1),
      rows = DDXStore.workRows(e);
    const facts = planned
      .filter((r) => r.d)
      .map((r) => r.w + "×" + r.r)
      .join(", ");
    result.facts = facts || "Нет выполненных рабочих подходов";
    if (pain([e.notes, ...(e.tags || []), ...(e.why || [])].join(" ")))
      return {
        ...result,
        reason: "Боль или дискомфорт: повышение отключено; укажи вес вручную",
      };
    if (
      e.side ||
      (e.unit && e.unit !== x.unit) ||
      (e.equipment && e.equipment !== x.equipment)
    )
      return {
        ...result,
        reason: "Единицы или оборудование отличаются: укажи вес вручную",
      };
    const weights = planned.filter((r) => r.d).map((r) => DDXStore.num(r.w));
    if (new Set(weights).size > 1)
      return { ...result, reason: "Вес менялся между подходами" };
    if (e.skipped || !planned.length || rows.length !== planned.length)
      return {
        ...result,
        reason:
          "Неполные или некорректные рабочие подходы: повышение отключено",
      };
    if (rows.some((r) => r.e < 1 || r.e >= 4))
      return {
        ...result,
        reason: "Высокая или неизвестная сложность: повышение отключено",
      };
    return {
      ...result,
      weight: DDXStore.num(rows[0].w),
      reps: Math.min(...rows.map((r) => DDXStore.num(r.r))),
      reason:
        "Все запланированные рабочие подходы выполнены с одинаковым весом",
    };
  }
  function summary(x, st = {}) {
    const rec = reliable(x.id, st);
    return [
      rec.last
        ? "Последняя тренировка: " +
          new Date(rec.last.s.start).toLocaleDateString("ru-RU") +
          ". Последние выполненные веса: " +
          (rec.facts ||
            rec.last.e.rows
              .slice(1)
              .filter((r) => r.d)
              .map((r) => r.w + "×" + r.r)
              .join(", ") ||
            "нет")
        : "Последняя тренировка: нет данных",
      "Подтверждённый рабочий вес: " +
        (rec.weight === null
          ? "не определён"
          : rec.weight +
            " кг (" +
            (rec.source === "DDX" ? "журнал DDX" : "последняя тренировка") +
            ")"),
      rec.reason,
      "Исходный ориентир DDX: " +
        x.reference +
        (x.requiresConfirmation ? " — Неподтверждённый" : ""),
      "Следующая цель из журнала DDX: " + x.goal,
      "Целевые повторы: " + x.reps,
      x.unit,
      x.status,
      x.warning,
    ]
      .filter(Boolean)
      .join(". ");
  }
  window.DDXCatalog = {
    items,
    legacy,
    get,
    identity,
    latest,
    reliable,
    summary,
  };
})();
