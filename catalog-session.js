/* Session layout is separate from the immutable base plan. */
function catalogDescriptor(card, st) {
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const x = DDXCatalog.get(card.exerciseId);
  return {
    id: card.sessionExerciseId,
    exerciseId: x.id,
    slotId: card.slotId,
    added: card.added,
    name: x.name,
    title: x.name,
    block: x.group,
    type: "sets",
    meta: x.unit,
    last: "",
    tech: x.technique + " " + x.warning,
    tags: [],
    alts: [],
    workR: st.repMin || x.reps,
    rest: 90,
    restWu: 60,
    restEx: 90,
    catalog: true,
    rows: st.rows.map((r, i) => ({
      ...r,
      wu: DDXStore.rowType(r, i) === "trial",
    })),
  };
}
function initCatalogSession(state) {
  if (state.cards) {
    const base = EX.slice();
    EX.splice(
      0,
      EX.length,
      ...state.cards
        .map((c) =>
          c.exerciseId && DDXCatalog.get(c.exerciseId)
            ? catalogDescriptor(c, state.ex[c.sessionExerciseId])
            : base.find((e) => e.id === c.sessionExerciseId),
        )
        .filter(Boolean),
    );
  }
  for (const e of EX)
    if (state.ex[e.id] && e.type === "sets") {
      e.rows = state.ex[e.id].rows.map((r, i) => ({
        ...r,
        wu: DDXStore.rowType(r, i) === "trial",
      }));
      e.workR = state.ex[e.id].repMin || e.workR;
    }
}
function openCatalog(target) {
  if (target && S.ex[target.id].rows.some((r) => r.d)) {
    toast("Выполненные подходы защищены. Добавь другое упражнение отдельно.");
    return;
  }
  const dialog = document.createElement("dialog");
  dialog.className = "catalog-dialog";
  const heading = document.createElement("h2");
  heading.textContent = target ? "Заменить упражнение" : "Добавить упражнение";
  const close = document.createElement("button");
  close.textContent = "Закрыть";
  close.onclick = () => dialog.close();
  const search = document.createElement("input");
  search.placeholder = "Поиск по названию";
  search.setAttribute("aria-label", "Поиск по названию");
  const filter = document.createElement("select");
  filter.setAttribute("aria-label", "Мышечная группа");
  for (const g of ["", ...new Set(DDXCatalog.items.map((x) => x.group))]) {
    const o = document.createElement("option");
    o.value = g;
    o.textContent = g || "Все группы";
    filter.append(o);
  }
  const count = document.createElement("input");
  count.type = "number";
  count.min = 1;
  count.max = 10;
  count.value = 3;
  count.setAttribute("aria-label", "Число рабочих подходов");
  const label = document.createElement("label");
  label.textContent = "Рабочих подходов ";
  label.append(count);
  const results = document.createElement("div");
  results.setAttribute("aria-live", "polite");
  const equipment = document.createElement("select");
  equipment.setAttribute("aria-label", "Оборудование");
  for (const v of [
    "",
    ...new Set(DDXCatalog.items.map((x) => x.equipmentType)),
  ]) {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v || "Всё оборудование";
    equipment.append(o);
  }
  const favorites = document.createElement("input");
  favorites.type = "checkbox";
  const fl = document.createElement("label");
  fl.append(favorites, " Избранное");
  dialog.append(heading, close, search, filter, equipment, fl, label, results);
  function draw() {
    results.replaceChildren();
    const same = DDXCatalog.get(
      target?.exerciseId || DDXCatalog.legacy[target?.id],
    )?.group;
    const found = DDXCatalog.items.filter(
      (x) =>
        (!filter.value || x.group === filter.value) &&
        (!equipment.value || x.equipmentType === equipment.value) &&
        (!favorites.checked ||
          ExerciseEstimator.preferences()[x.id]?.favorite) &&
        x.name
          .toLocaleLowerCase("ru")
          .includes(search.value.toLocaleLowerCase("ru")),
    );
    for (const [title, items] of [
      ["Та же группа", found.filter((x) => x.group === same)],
      ["Все упражнения", found.filter((x) => x.group !== same)],
    ]) {
      if (!items.length) continue;
      const h = document.createElement("h3");
      h.textContent = title;
      results.append(h);
      for (const x of items) {
        const card = document.createElement("article");
        const name = document.createElement("h4");
        name.textContent = x.name;
        const info = document.createElement("p");
        try {
          info.textContent =
            DDXCatalog.summary(x) + " · Целевые повторы: " + x.reps;
        } catch (e) {
          info.textContent = e.message;
        }
        const choose = document.createElement("button");
        choose.textContent = "Выбрать: " + x.name;
        choose.onclick = () => {
          const n = Number(count.value);
          if (!Number.isInteger(n) || n < 1 || n > 10) {
            count.reportValidity();
            return;
          }
          selectCatalog(target, x, n);
        };
        const star = document.createElement("button");
        star.textContent = ExerciseEstimator.preferences()[x.id]?.favorite
          ? "★ Убрать из избранного"
          : "☆ В избранное";
        star.onclick = () => {
          ExerciseEstimator.updatePreference(x.id, {
            favorite: !ExerciseEstimator.preferences()[x.id]?.favorite,
          });
          draw();
        };
        card.append(name, info, star, choose);
        results.append(card);
      }
    }
  }
  search.oninput =
    filter.onchange =
    equipment.onchange =
    favorites.onchange =
      draw;
  const previous = document.activeElement;
  dialog.onclose = () => {
    dialog.remove();
    previous?.focus();
  };
  document.body.append(dialog);
  draw();
  dialog.showModal();
  search.focus();
}
function layoutCards() {
  return EX.map((e) => ({
    sessionExerciseId: e.id,
    slotId: e.slotId ?? e.id,
    exerciseId: e.catalog ? e.exerciseId : null,
    added: !!e.added,
  }));
}
function selectCatalog(target, x, n) {
  const duplicate = EX.some(
    (e) =>
      e !== target &&
      DDXCatalog.identity({
        id: e.id,
        exerciseId: e.exerciseId,
        replacement: repName(e),
      }) === x.id,
  );
  if (duplicate) {
    toast("Это упражнение уже есть в тренировке");
    return;
  }
  if (target && S.ex[target.id].rows.some((r) => r.d)) return;
  const id = target?.id || "extra_" + crypto.randomUUID();
  S.ex[id] = {
    trialEnabled: !!ExerciseEstimator.preferences()[x.id]?.trialEnabled,
    rows: Array.from({ length: n }, (_, i) => ({
      type: "working",
      w: "",
      r: String(x.reps),
      e: 0,
      d: false,
    })),
    n: "",
    t: [],
    skip: false,
    alt: -1,
    custom: "",
    why: [],
    side: false,
  };
  if (S.ex[id].trialEnabled)
    S.ex[id].rows.unshift({
      type: "trial",
      w: "",
      r: String(x.reps),
      e: 0,
      d: false,
    });
  const cards = layoutCards(),
    card = {
      sessionExerciseId: id,
      slotId: target?.slotId ?? target?.id ?? null,
      exerciseId: x.id,
      added: target ? !!target.added : true,
    };
  if (target) cards[EX.indexOf(target)] = card;
  else cards.push(card);
  S.cards = cards;
  SessionProgression.prefill({ exerciseId: x.id }, S.ex[id]);
  if (save()) location.reload();
}
function catalogControls(e, d) {
  const body = d.querySelector(".ex-body");
  const editor = document.createElement("details");
  editor.className = "plan-editor";
  const summary = document.createElement("summary");
  summary.textContent = "Редактировать план";
  editor.append(summary);
  body.append(editor);
  const st = S.ex[e.id];
  if (e.type === "sets") {
    const count = document.createElement("input");
    count.type = "number";
    count.min = 1;
    count.max = 10;
    count.value = DDXStore.plannedRows(st).length;
    count.setAttribute("aria-label", "Рабочих подходов");
    const reps = document.createElement("input");
    reps.value = st.repMin ? st.repMin + "–" + st.repMax : String(e.workR || 8);
    reps.setAttribute("aria-label", "Целевые повторы");
    const apply = document.createElement("button");
    apply.textContent = "Сохранить план";
    apply.onclick = () => {
      try {
        AdaptivePlan.resize(st, Number(count.value), reps.value);
      } catch (err) {
        toast(err.message);
        return;
      }
      S.cards = layoutCards();
      if (save()) location.reload();
    };
    editor.append(
      "Рабочих подходов",
      count,
      "Целевые повторы (8–10)",
      reps,
      apply,
    );
    addTrialControls(e, d, editor);
  }
  const b = document.createElement("button");
  b.textContent = "Заменить упражнение";
  b.onclick = () => openCatalog(e);
  editor.append(b);
  if (e.catalog) renderWeightRecommendation(e, d);
  if (true) {
    for (const [text, delta] of [
      ["Переместить выше", -1],
      ["Переместить ниже", 1],
    ]) {
      const b = document.createElement("button");
      b.textContent = text;
      b.onclick = () => {
        window.moveWorkoutExercise?.(e.id, EX.indexOf(e) + delta);
      };
      editor.append(b);
    }
    const remove = document.createElement("button");
    remove.textContent = "Удалить упражнение";
    remove.onclick = () => {
      if (S.ex[e.id].rows.some((r) => r.d)) {
        toast("Выполненные подходы защищены");
        return;
      }
      S.cards = layoutCards().filter((c) => c.sessionExerciseId !== e.id);
      delete S.ex[e.id];
      if (save()) location.reload();
    };
    editor.append(remove);
  }
}

function calibrationFor(e) {
  const replacement = repName(e),
    st = S.ex[e.id];
  const id = DDXCatalog.identity({
    id: e.id,
    exerciseId: replacement ? null : e.exerciseId,
    replacement,
  });
  let history;
  try {
    history = DDXStore.history();
  } catch {
    history = undefined;
  }
  return WeightCalibration.evaluate(id, st, history);
}
function renderWeightRecommendation(e, d) {
  if (!d || e.type !== "sets") return;
  const box = d.querySelector(".cal");
  if (!box) return;
  box.classList.add("weight-recommendation");
  box.replaceChildren();
  const st = S.ex[e.id],
    result = calibrationFor(e);
  function text(tag, value) {
    const el = document.createElement(tag);
    el.textContent = value;
    box.append(el);
  }
  if (!st.trialEnabled) {
    let h;
    try {
      h = DDXStore.history();
    } catch {
      h = [];
    }
    const estimate = ExerciseEstimator.estimateWorkingWeight({
      exerciseId: result.exerciseId,
      history: h,
      targetReps: st.repMin,
    });
    text(
      "p",
      st.workingSource
        ? `Ориентир: ${st.workingSource.weight} кг · ${st.workingSource.source} · достоверность ${{ high: "высокая", medium: "средняя", low: "низкая" }[st.workingSource.confidence] || st.workingSource.confidence}`
        : estimate.reason,
    );
    if (DDXStore.plannedRows(st).some((r) => r.manualWeight))
      text("p", "Рабочие значения изменены вручную.");
    if (estimate.range)
      text(
        "p",
        `Наблюдавшиеся веса близких упражнений: ${estimate.range.join("–")} кг · низкая достоверность, требуется проба.`,
      );
    if (estimate.requiresCalibration || estimate.confidence === "low" ||
        st.workingSource?.confidence === "low") {
      const b = document.createElement("button");
      b.textContent = "Проверить вес пробным подходом";
      b.onclick = () => toggleTrial(e, true);
      box.append(b);
    }
    return;
  }
  text("b", "Пробный подход");
  text(
    "p",
    result.trial.weight === null
      ? "Вес требует уточнения"
      : `${result.trial.weight} кг × ${result.trial.reps}. ${result.trial.reason}`,
  );
  text(
    "p",
    `${result.unit}. Источник: ${result.source}. Последний достоверный рабочий вес: ${result.base === null ? "не определён" : result.base + " кг"}.`,
  );
  if (
    DDXStore.trialRow(st)?.d &&
    (DDXStore.trialRow(st).e >= 4 || result.work.weight === null)
  )
    text(
      "p",
      "ВНИМАНИЕ: фактическая проба отменяет прежний ориентир повышения. Проверь незавершённые рабочие веса; при тяжёлой пробе снизь нагрузку.",
    );
  const old = st.calibration?.work;
  if (old && old.signature !== result.signature)
    text(
      "p",
      "Предыдущая рекомендация устарела. Предложение пересчитано; введённые веса сохранены.",
    );
  function button(label, kind) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = () => {
      if (localStorage.getItem(KEY) !== persisted) {
        toast("Сессия изменена в другой вкладке. Обнови страницу.");
        return;
      }
      const fresh = calibrationFor(e);
      if (fresh.signature !== result.signature) {
        renderCal(e);
        toast("Рекомендация обновилась. Проверь данные.");
        return;
      }
      if (
        !confirm(
          kind === "trial"
            ? "Подставить только пробный вес? Рабочие подходы останутся без изменений."
            : "Применить рабочий вес только к незавершённым подходам без ручных правок? Нагрузка не обязательна.",
        )
      )
        return;
      if (
        localStorage.getItem(KEY) !== persisted ||
        calibrationFor(e).signature !== fresh.signature
      ) {
        toast(
          "Данные изменились во время подтверждения. Проверь рекомендацию.",
        );
        renderCal(e);
        return;
      }
      if (WeightCalibration.apply(st, fresh, kind)) {
        save();
        renderRows(e);
        renderCal(e);
      }
    };
    box.append(b);
  }
  // Trial weight is prefilled in the trial row, never applied via a button.
  text("b", "Рекомендованный рабочий вес");
  text(
    "p",
    result.work.weight === null
      ? "Укажи рабочий вес вручную или уточни пробу."
      : `${result.work.weight} кг · ${result.work.sets} рабочих подхода × ${result.work.reps} повторений`,
  );
  text("p", result.work.reason);
  if (
    result.work.weight !== null &&
    DDXStore.trialRow(st)?.e <= 3 &&
    result.source.startsWith("Последняя")
  ) {
    const advice = DDXProgress.recommend(
      { exerciseId: result.exerciseId, workR: result.work.reps },
      { ...st, alt: -1, custom: "" },
    );
    if (advice)
      text("p", "Отдельная рекомендация по прогрессии: " + advice.text);
  }
  text(
    "p",
    `Уверенность: ${result.work.confidence}. Вес не является обязательным.`,
  );
  if (
    result.work.weight !== null &&
    DDXStore.plannedRows(st).some((r) => !r.d && !r.manualWeight)
  )
    button("Применить рабочий вес", "work");
}
function refreshWeightRecommendations() {
  for (const e of EX.filter((e) => e.type === "sets"))
    renderWeightRecommendation(e, document.getElementById("ex-" + e.id));
}
window.addEventListener("storage", (ev) => {
  if (ev.key === DDXStore.HKEY) refreshWeightRecommendations();
});
window.addEventListener("focus", refreshWeightRecommendations);

function toggleTrial(e, enabled) {
  const st = S.ex[e.id],
    trial = DDXStore.trialRow(st);
  if (
    !enabled &&
    trial?.d &&
    !confirm(
      "Сохранить выполненную пробу в истории и выключить пробный подход? Отмена оставит пробу включённой.",
    )
  )
    return;
  st.trialEnabled = enabled;
  if (enabled && !trial)
    st.rows.unshift({
      type: "trial",
      w: "",
      r: String(e.workR || 8),
      e: 0,
      d: false,
    });
  const id = DDXCatalog.identity({
    id: e.id,
    exerciseId: e.exerciseId,
    replacement: repName(e),
  });
  if (id) ExerciseEstimator.updatePreference(id, { trialEnabled: enabled });
  if (enabled) suggestTrialDefault(e, st);
  save();
  renderRows(e);
  renderCal(e);
  refresh(e);
  updBar();
  const check = document.getElementById("trial-toggle-" + e.id);
  if (check) check.checked = enabled;
}
function addTrialControls(e, d, editor) {
  const st = S.ex[e.id],
    label = document.createElement("label"),
    check = document.createElement("input");
  check.type = "checkbox";
  check.id = "trial-toggle-" + e.id;
  check.checked = !!st.trialEnabled;
  check.onchange = () => {
    toggleTrial(e, check.checked);
    check.checked = !!st.trialEnabled;
  };
  label.append(check, " Пробный подход");
  editor.append(label);
  const ref = document.createElement("button");
  ref.textContent = "Сохранить рабочий ориентир";
  ref.onclick = () => {
    const id = DDXCatalog.identity({
        id: e.id,
        exerciseId: e.exerciseId,
        replacement: repName(e),
      }),
      x = DDXCatalog.get(id),
      r = DDXStore.plannedRows(st).find((r) => r.w !== "" && !r.skipped),
      w = DDXStore.num(r?.w);
    if (!x || !Number.isFinite(w) || w < 0) {
      toast("Сначала укажи рабочий вес");
      return;
    }
    if (
      !confirm(
        "Сохранить " +
          w +
          " " +
          x.unit +
          " как ручной ориентир? Это не выполненный результат.",
      )
    )
      return;
    ExerciseEstimator.updatePreference(id, {
      reference: { weight: w, unit: x.unit, equipment: x.equipment },
    });
    toast("Ориентир сохранён");
  };
  editor.append(ref);
  DDXStore.plannedRows(st).forEach((r, i) => {
    const l = document.createElement("label"),
      c = document.createElement("input");
    c.type = "checkbox";
    c.checked = !!r.skipped;
    c.onchange = () => {
      if (
        c.checked &&
        r.d &&
        !confirm(
          "Исключить выполненный подход из расчётов? Значения сохранятся.",
        )
      ) {
        c.checked = false;
        return;
      }
      r.skipped = c.checked;
      save();
      renderRows(e);
      refresh(e);
      updBar();
    };
    l.append(c, " Пропустить рабочий подход " + (i + 1));
    editor.append(l);
  });
}
