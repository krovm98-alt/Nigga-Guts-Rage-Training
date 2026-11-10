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
    tech: x.warning,
    tags: [],
    alts: [],
    workR: x.reps,
    rest: 90,
    restWu: 60,
    restEx: 90,
    catalog: true,
    rows: st.rows.map((r, i) => ({ ...r, wu: i === 0 })),
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
  dialog.append(heading, close, search, filter, label, results);
  function draw() {
    results.replaceChildren();
    const same = DDXCatalog.get(
      target?.exerciseId || DDXCatalog.legacy[target?.id],
    )?.group;
    const found = DDXCatalog.items.filter(
      (x) =>
        (!filter.value || x.group === filter.value) &&
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
        card.append(name, info, choose);
        results.append(card);
      }
    }
  }
  search.oninput = filter.onchange = draw;
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
    rows: Array.from({ length: n + 1 }, (_, i) => ({
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
  if (save()) location.reload();
}
function catalogControls(e, d) {
  const b = document.createElement("button");
  b.textContent = "Заменить упражнение";
  b.onclick = () => openCatalog(e);
  d.querySelector(".ex-body").prepend(b);
  if (e.catalog) renderWeightRecommendation(e, d);
  if (e.added) {
    for (const [text, delta] of [
      ["Переместить выше", -1],
      ["Переместить ниже", 1],
    ]) {
      const b = document.createElement("button");
      b.textContent = text;
      b.onclick = () => {
        const cards = layoutCards(),
          i = EX.indexOf(e),
          j = i + delta;
        if (j < 0 || j >= cards.length) return;
        [cards[i], cards[j]] = [cards[j], cards[i]];
        S.cards = cards;
        if (save()) location.reload();
      };
      d.querySelector(".ex-body").append(b);
    }
    const remove = document.createElement("button");
    remove.textContent = "Удалить дополнительное упражнение";
    remove.onclick = () => {
      if (S.ex[e.id].rows.some((r) => r.d)) {
        toast("Выполненные подходы защищены");
        return;
      }
      S.cards = layoutCards().filter((c) => c.sessionExerciseId !== e.id);
      delete S.ex[e.id];
      if (save()) location.reload();
    };
    d.querySelector(".ex-body").append(remove);
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
  if (result.trial.weight !== null && !st.rows[0].d)
    button("Применить пробный вес", "trial");
  text("b", "Рекомендованный рабочий вес");
  text(
    "p",
    result.work.weight === null
      ? "Укажи рабочий вес вручную или уточни пробу."
      : `${result.work.weight} кг · ${result.work.sets} рабочих подхода × ${result.work.reps} повторений`,
  );
  text("p", result.work.reason);
  if (result.work.weight !== null && result.source.startsWith("Последняя")) {
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
    st.rows.slice(1).some((r) => !r.d && !r.manualWeight)
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
