const HKEY = "ddx_history_v1";
const safeParse = (s, fallback) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};
const hist = () => {
  try {
    return DDXStore.history();
  } catch (err) {
    el("importStatus").textContent = err.message;
    return [];
  }
};
const names = {
  push: "ГРУДЬ + ТРИЦЕПС",
  pull: "СПИНА + БИЦЕПС",
  legs: "НОГИ + ДЕЛЬТЫ",
};
const el = (id) => document.getElementById(id);
function show() {
  const h = hist().sort((a, b) => b.start - a.start);
  el("count").textContent = h.length;
  el("sets").textContent = h.reduce((n, x) => n + DDXStore.metrics(x).work, 0);
  el("last").textContent = h.length
    ? new Date(h[0].start).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      })
    : "—";
  const root = el("history");
  root.className = h.length ? "" : "empty";
  root.replaceChildren();
  if (!h.length) {
    root.textContent = "Пока нет завершённых тренировок.";
    return;
  }
  for (const x of h) {
    const d = document.createElement("details");
    d.className = "session";
    const sum = document.createElement("summary");
    sum.textContent =
      (names[x.kind] || x.kind || "ТРЕНИРОВКА") +
      " · " +
      new Date(x.start).toLocaleDateString("ru-RU");
    const info = document.createElement("small");
    info.textContent =
      DDXStore.metrics(x).work +
      " рабочих подходов · " +
      Math.round(((x.end || x.start) - x.start) / 60000) +
      " мин · отказов: " +
      (x.stats?.kk || 0);
    const pre = document.createElement("pre");
    pre.textContent = DDXStore.displayText(x.report || "");
    const b = document.createElement("button");
    b.className = "secondary";
    b.textContent = "КОПИРОВАТЬ ОТЧЁТ";
    b.onclick = async () => {
      try {
        await navigator.clipboard.writeText(
          DDXStore.displayText(x.report || ""),
        );
        b.textContent = "СКОПИРОВАНО";
      } catch {
        alert("Выдели и скопируй текст отчёта вручную");
      }
    };
    const edit = document.createElement("button");
    edit.textContent = "ИЗМЕНИТЬ ПОДХОДЫ";
    edit.onclick = () => editSession(x);
    d.append(
      sum,
      info,
      renderWorkoutAnalysis(WorkoutAnalysis.analyzeWorkout(x, h)),
      pre,
      b,
      edit,
    );
    root.append(d);
  }
}
const prefix = "ddx_";
function allData() {
  const data = {
    format: "ddx-training-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    storage: {},
  };
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(prefix)) data.storage[k] = localStorage.getItem(k);
  }
  return data;
}
el("export").onclick = () => {
  const blob = new Blob([JSON.stringify(allData(), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "training-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};
el("import").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    if (f.size > 10 * 1024 * 1024) throw Error("Файл больше 10 МБ");
    const data = JSON.parse(await f.text());
    if (
      data.format !== "ddx-training-backup" ||
      data.version !== 1 ||
      !data.storage ||
      typeof data.storage !== "object" ||
      Array.isArray(data.storage)
    )
      throw Error("Неподдерживаемый формат");
    const entries = DDXStore.validateBackup(data);
    if (
      !confirm(
        "Восстановить " +
          entries.length +
          " записей? Совпадающие записи будут заменены, история объединена по ID. Сначала экспортируй текущую копию.",
      )
    )
      return;
    DDXStore.restore(data);
    el("importStatus").textContent = "Данные восстановлены. История обновлена.";
    show();
  } catch (err) {
    el("importStatus").textContent = "Ошибка: " + err.message;
  } finally {
    e.target.value = "";
  }
};
show();
window.addEventListener("pageshow", show);
window.addEventListener("storage", show);
function editSession(original) {
  const draft = JSON.parse(JSON.stringify(original));
  const form = document.createElement("form");
  form.className = "panel";
  const title = document.createElement("h2");
  title.textContent =
    "Редактирование · " + new Date(draft.start).toLocaleString("ru-RU");
  form.append(title);
  for (const e of draft.exercises) {
    const field = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = e.replacement || e.name;
    field.append(legend);
    const skip = document.createElement("label"),
      check = document.createElement("input");
    check.type = "checkbox";
    check.checked = !!e.skipped;
    check.onchange = () => (e.skipped = check.checked);
    skip.append(check, " Пропущено");
    field.append(skip);
    e.rows.forEach((r, i) => {
      const line = document.createElement("div");
      line.className = "edit-row";
      const label = document.createElement("span");
      label.textContent = i === 0 ? "Разминка / задача" : "Подход " + i;
      line.append(label);
      for (const [key, text] of [
        ["w", "Вес"],
        ["r", "Повторы"],
        ["e", "Сложность 0–6"],
      ]) {
        const l = document.createElement("label");
        l.textContent = text;
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "decimal";
        input.value = r[key];
        input.oninput = () =>
          (r[key] = key === "e" ? Number(input.value) : input.value);
        l.append(input);
        line.append(l);
      }
      const done = document.createElement("input");
      done.type = "checkbox";
      done.checked = r.d;
      done.setAttribute("aria-label", "Подход выполнен");
      done.onchange = () => (r.d = done.checked);
      line.append(done);
      field.append(line);
    });
    const notes = document.createElement("textarea");
    notes.setAttribute("aria-label", "Заметки " + e.name);
    notes.value = e.notes || "";
    notes.oninput = () => (e.notes = notes.value);
    field.append(notes);
    form.append(field);
  }
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const save = document.createElement("button");
  save.textContent = "СОХРАНИТЬ ИЗМЕНЕНИЯ";
  save.type = "submit";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "ОТМЕНА";
  cancel.onclick = () => form.remove();
  form.append(save, cancel, status);
  form.onsubmit = (ev) => {
    ev.preventDefault();
    try {
      if (
        !DDXStore.validSession(draft) ||
        draft.exercises.some(
          (e) =>
            DDXStore.workRows(e).length !==
              e.rows.slice(1).filter((r) => r.d).length && !e.skipped,
        )
      )
        throw Error("Проверь вес, повторы и сложность");
      if (
        !confirm(
          "Обновить запись? Исходная версия сохранится в резервной записи.",
        )
      )
        return;
      const h = DDXStore.history(),
        at = h.findIndex((s) => s.id === draft.id);
      if (at < 0) throw Error("Запись больше не существует");
      if (JSON.stringify(h[at]) !== JSON.stringify(original))
        throw Error(
          "Запись изменилась в другой вкладке. Открой редактор заново.",
        );
      draft.stats = {
        ...DDXStore.metrics(draft),
        rep: draft.exercises.filter((e) => e.replacement).length,
      };
      draft.report = [
        new Date(draft.start).toLocaleString("ru-RU"),
        ...draft.exercises.map(
          (e) =>
            (e.replacement || e.name) +
            ": " +
            (e.skipped
              ? "пропущено"
              : e.rows
                  .filter((r) => r.d)
                  .map((r) => r.w + "×" + r.r + " · сложность " + r.e)
                  .join(", ")) +
            " " +
            (e.notes || ""),
        ),
      ].join("\n");
      draft.updatedAt = Date.now();
      localStorage.setItem(
        "ddx_history_revision_" + Date.now(),
        JSON.stringify(h[at]),
      );
      h[at] = draft;
      localStorage.setItem(HKEY, JSON.stringify(h));
      form.remove();
      show();
    } catch (err) {
      status.textContent = err.message;
    }
  };
  el("history").prepend(form);
  form.scrollIntoView();
}

function renderWorkoutAnalysis(result) {
  const box = document.createElement("details");
  box.className = "workout-analysis";
  const heading = document.createElement("summary");
  heading.textContent = "Краткий анализ · " + result.summary;
  const source = document.createElement("small");
  source.textContent = "Локальный разбор по правилам · без внешней нейросети";
  box.append(heading, source);
  for (const [title, lines] of [
    ["Что хорошо", result.good],
    ["На что обратить внимание", result.attention],
    ["Что делать дальше", result.next],
  ]) {
    const h = document.createElement("h3");
    h.textContent = title;
    const ul = document.createElement("ul");
    for (const line of lines) {
      const li = document.createElement("li");
      li.textContent = DDXStore.displayText(line);
      ul.append(li);
    }
    box.append(h, ul);
  }
  return box;
}
