/* Reordering moves existing cards, retaining inputs, disclosure state and timers. */
(() => {
  const trigger = document.createElement("button");
  trigger.className = "workout-jump";
  trigger.textContent = "УПРАЖНЕНИЯ";
  const sheet = document.createElement("dialog");
  sheet.className = "workout-sheet";
  sheet.setAttribute("aria-label", "Упражнения тренировки");
  const close = document.createElement("button");
  close.textContent = "Закрыть";
  close.onclick = () => sheet.close();
  const summary = document.createElement("p"),
    mode = document.createElement("button"),
    next = document.createElement("button"),
    list = document.createElement("div");
  mode.textContent = "ИЗМЕНИТЬ ПОРЯДОК";
  next.textContent = "Следующее незавершённое";
  let reorder = false,
    drag = null,
    frame,
    focusTarget;
  function rows(e) {
    return e.type === "sets"
      ? DDXStore.plannedRows(S.ex[e.id])
      : S.ex[e.id].rows;
  }
  function complete(e) {
    return S.ex[e.id].skip || rows(e).every((r) => r.d || r.skipped);
  }
  function jump(e) {
    sheet.close();
    const card = document.getElementById("ex-" + e.id);
    card.classList.add("open");
    const head = card.querySelector(".ex-head");
    head.setAttribute("aria-expanded", "true");
    focusTarget = head;
    head.focus({ preventScroll: true });
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    window.activeWorkoutExercise = e.id;
  }
  window.moveWorkoutExercise = (id, index) => {
    const from = EX.findIndex((e) => e.id === id);
    if (from < 0 || index < 0 || index >= EX.length || index === from) return;
    const [e] = EX.splice(from, 1);
    EX.splice(index, 0, e);
    const parent = document.getElementById("ex-" + id).parentElement;
    parent.querySelectorAll(".block-title").forEach((el) => el.remove());
    for (const x of EX) parent.append(document.getElementById("ex-" + x.id));
    S.cards = layoutCards();
    save();
    draw();
  };
  function draw() {
    if (drag) return;
    list.replaceChildren();
    let total = 0,
      done = 0;
    for (const e of EX) {
      const r = rows(e);
      if (e.type === "sets") {
        total += r.length;
        done += S.ex[e.id].skip
          ? r.length
          : r.filter((r) => r.d || r.skipped).length;
      }
      const line = document.createElement("div");
      line.className = "jump-row";
      line.dataset.id = e.id;
      const b = document.createElement("button");
      b.textContent =
        e.name +
        " · " +
        r.filter((r) => r.d && !r.skipped).length +
        "/" +
        r.length +
        " · " +
        (S.ex[e.id].skip
          ? "пропущено"
          : complete(e)
            ? "готово"
            : window.activeWorkoutExercise === e.id
              ? "текущее"
              : "ожидает");
      b.onclick = () => jump(e);
      line.append(b);
      if (reorder) {
        const handle = document.createElement("button");
        handle.textContent = "↕";
        handle.className = "drag-handle";
        handle.setAttribute("aria-label", "Перетащить " + e.name);
        handle.onpointerdown = (ev) => {
          ev.preventDefault();
          handle.setPointerCapture(ev.pointerId);
          drag = { id: e.id, target: e.id, y: ev.clientY };
          line.classList.add("dragging");
          const scroll = () => {
            if (!drag) return;
            const rect = sheet.getBoundingClientRect();
            sheet.scrollTop +=
              drag.y < rect.top + 70 ? -10 : drag.y > rect.bottom - 70 ? 10 : 0;
            frame = requestAnimationFrame(scroll);
          };
          scroll();
        };
        handle.onpointermove = (ev) => {
          if (!drag) return;
          drag.y = ev.clientY;
          const target = document
            .elementFromPoint(ev.clientX, ev.clientY)
            ?.closest(".jump-row");
          if (target) {
            drag.target = target.dataset.id;
            list
              .querySelectorAll(".drop-target")
              .forEach((x) => x.classList.remove("drop-target"));
            target.classList.add("drop-target");
          }
        };
        handle.onpointerup = () => {
          if (!drag) return;
          const { id, target } = drag;
          drag = null;
          cancelAnimationFrame(frame);
          window.moveWorkoutExercise(
            id,
            EX.findIndex((e) => e.id === target),
          );
          navigator.vibrate?.(20);
          draw();
        };
        handle.onpointercancel = () => {
          drag = null;
          cancelAnimationFrame(frame);
          draw();
        };
        line.append(handle);
        for (const [label, delta] of [
          ["↑", -1],
          ["↓", 1],
        ]) {
          const arrow = document.createElement("button");
          arrow.textContent = label;
          arrow.setAttribute(
            "aria-label",
            (delta < 0 ? "Выше: " : "Ниже: ") + e.name,
          );
          arrow.disabled =
            EX.indexOf(e) + delta < 0 || EX.indexOf(e) + delta >= EX.length;
          arrow.onclick = () =>
            window.moveWorkoutExercise(e.id, EX.indexOf(e) + delta);
          line.append(arrow);
        }
      }
      list.append(line);
    }
    summary.textContent = `Прогресс: ${done}/${total} рабочих подходов`;
  }
  mode.onclick = () => {
    reorder = !reorder;
    mode.textContent = reorder ? "ГОТОВО" : "ИЗМЕНИТЬ ПОРЯДОК";
    draw();
  };
  next.onclick = () => {
    const at = EX.findIndex((e) => e.id === window.activeWorkoutExercise);
    const e = [...EX.slice(at + 1), ...EX.slice(0, at + 1)].find(
      (e) => !complete(e),
    );
    if (e) jump(e);
  };
  const grip = document.createElement("div");
  grip.className = "sheet-grip";
  grip.textContent = "━━";
  grip.setAttribute("aria-hidden", "true");
  sheet.prepend(grip);
  let swipeY;
  grip.onpointerdown = (e) => {
    swipeY = e.clientY;
    grip.setPointerCapture(e.pointerId);
  };
  grip.onpointerup = (e) => {
    if (e.clientY - swipeY > 60) sheet.close();
  };
  close.onpointerdown = (e) => (swipeY = e.clientY);
  close.onpointerup = (e) => {
    if (e.clientY - swipeY > 60) sheet.close();
  };
  sheet.append(close, summary, mode, next, list);
  document.body.append(trigger, sheet);
  trigger.onclick = () => {
    draw();
    sheet.showModal();
  };
  sheet.onclose = () => {
    (focusTarget || trigger).focus({ preventScroll: true });
    focusTarget = null;
  };
  window.refreshWorkoutNavigation = () => {
    if (sheet.open) draw();
  };
  const viewport = () => {
    const v = window.visualViewport;
    trigger.style.bottom = `calc(${v ? Math.max(0, innerHeight - v.height - v.offsetTop) : 0}px + 76px + env(safe-area-inset-bottom))`;
    sheet.style.maxHeight = (v?.height || innerHeight) * 0.85 + "px";
  };
  window.visualViewport?.addEventListener("resize", viewport);
  viewport();
})();
