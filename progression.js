(function () {
  "use strict";
  const { num, history, workRows } = DDXStore;
  function recommend(e, st = {}) {
    let saved;
    try {
      saved = history();
    } catch {
      return {
        text: "История повреждена: рекомендации недоступны. Экспортируй копию для восстановления.",
      };
    }
    const sessions = saved
      .filter((s) => s.kind === document.body.dataset.kind)
      .sort((a, b) => b.start - a.start);
    const last = sessions.flatMap((s) =>
      s.exercises.filter((x) => x.id === e.id).map((x) => ({ s, x })),
    )[0];
    if (!last) return null;
    const x = last.x;
    const pain = /(боль|болит|дискомфорт|чувствуется)/i.test(
      [
        x.notes,
        ...(x.tags || []),
        ...(x.why || []),
        st.n,
        ...(st.t || []),
        ...(st.why || []),
      ].join(" "),
    );
    if (pain)
      return {
        text: "Отмечена боль или дискомфорт. Повышение отключено. Прекрати болезненное движение; расчёт не является медицинской рекомендацией.",
      };
    if (
      x.skipped ||
      x.replacement ||
      st.alt >= 0 ||
      st.custom ||
      !!x.side !== !!st.side
    )
      return {
        text: "Пропуск, замена или другая единица веса: выбери нагрузку вручную.",
      };
    const rows = workRows(x);
    if (rows.length !== 3 || x.rows.slice(1).some((r) => !r.d))
      return { text: "Неполные подходы: повышение нагрузки не предлагается." };
    const w = num(rows[0].w),
      rmin = Math.min(...rows.map((r) => num(r.r))),
      ceiling = e.workR >= 12 ? 12 : 10;
    if (!rows.every((r) => num(r.w) === w))
      return {
        text: "Рабочий вес менялся: повтори посильную нагрузку без повышения.",
      };
    if (
      rows.some((r) => !Number.isInteger(r.e) || r.e < 1 || r.e >= 4) ||
      rmin < 8
    )
      return {
        weight: w,
        reps: Math.min(ceiling, rmin),
        text: "Высокая или неизвестная сложность: сохрани вес и посильные повторы, без повышения.",
      };
    if (rmin >= ceiling) {
      return {
        text: `Достигнут верх диапазона: ${w} кг × ${rmin}. Можно рассмотреть минимальный доступный шаг именно этого снаряда. Введи новый вес вручную; для гантелей учитывай вес одной, для штанги — общий, для блока — его шкалу.`,
      };
    }
    return {
      weight: w,
      reps: Math.min(ceiling, rmin + 1),
      text: `Сохрани ${w} кг и попробуй ${Math.min(ceiling, rmin + 1)} повторений, только если техника и самочувствие позволяют.`,
    };
  }
  window.DDXProgress = { recommend, history };
})();
