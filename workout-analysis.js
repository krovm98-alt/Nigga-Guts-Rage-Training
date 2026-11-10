/* Local AI-style rule engine. Pure structured output is a boundary for a future
   server-backed LLM provider; rendering and storage do not depend on that provider.
   No network, storage writes, or cached analysis. Only earlier sessions are compared. */
(function () {
  function analyzeWorkout(session, history = [], context = {}) {
    const result = {
      version: 1,
      provider: "local-rules",
      summary: "Мало данных",
      good: [],
      attention: [],
      next: [],
    };
    if (!session || !DDXStore.validSession(session)) {
      result.attention.push("Недостаточно корректных данных для разбора.");
      result.next.push("Запиши выполненные подходы, вес, повторы и сложность.");
      result.good.push("Оценка появится после завершённой тренировки.");
      return result;
    }
    const { work, kk } = DDXStore.metrics(session);
    result.summary = `${work} рабочих подходов · ${kk} «кое как»`;
    if (work)
      result.good.push(
        `Записано ${work} рабочих подходов: есть фактическая база для сравнения.`,
      );
    if (session.milestone) result.good.push(String(session.milestone));
    if (kk)
      result.attention.push(
        `${kk} подхода «кое как»: не форсируй рост нагрузки.`,
      );
    const replacements = session.exercises.filter(
      (e) => e.replacement && !e.skipped,
    ).length;
    const skips = session.exercises.filter((e) => e.skipped).length;
    if (replacements)
      result.attention.push(
        `Замен упражнений: ${replacements}. Сравнивай результаты фактических упражнений; замена сама по себе не означает плохую тренировку.`,
      );
    if (skips)
      result.attention.push(
        `Пропущено упражнений: ${skips}; причины пропусков учитывай при планировании.`,
      );
    const earlier = Array.isArray(history)
      ? history
          .filter(
            (s) =>
              DDXStore.validSession(s) &&
              s.id !== session.id &&
              s.start < session.start,
          )
          .sort((a, b) => b.start - a.start)
      : [];
    for (const e of session.exercises) {
      if (
        e.skipped ||
        (!e.rows.slice(1).length && !DDXCatalog.get(DDXCatalog.identity(e)))
      )
        continue;
      const id = DDXCatalog.identity(e),
        catalog = DDXCatalog.get(id),
        name = catalog?.name || e.replacement || e.name;
      const rows = DDXStore.workRows(e),
        planned = e.rows.slice(1);
      const rec = DDXCatalog.reliable(id, {}, [{ ...session, exercises: [e] }]);
      const weights = rows.map((r) => DDXStore.num(r.w));
      const stable =
        rows.length > 0 &&
        rows.length === planned.length &&
        new Set(weights).size === 1;
      const volume = rows.reduce(
        (sum, r) => sum + DDXStore.num(r.w) * DDXStore.num(r.r),
        0,
      );
      if (stable)
        result.good.push(
          `${name}: ${rows.length} рабочих подхода на ${weights[0]} кг; вес удержан стабильно.`,
        );
      if (rows.length && !e.rows[0]?.d)
        result.attention.push(
          `${name}: пробный подход не отмечен; его выполнение неизвестно.`,
        );
      if (rec.weight === null) {
        result.attention.push(`${name}: ${rec.reason}.`);
        result.next.push(
          `${name}: не повышай нагрузку; ${/Боль|Дискомфорт/i.test(rec.reason) ? "прекрати болезненное движение." : "закрепи посильные ровные подходы."}`,
        );
      } else if (rec.source === "history") {
        const ceiling = catalog.reps >= 12 ? 12 : 10;
        result.next.push(
          rec.reps >= ceiling
            ? `${name}: достигнут верх диапазона повторений. Следующий шаг оборудования рассмотри отдельно; без автоматического повышения.`
            : rec.reps >= 8
              ? `${name}: сохрани ${rec.weight} кг; попробуй добавить повторение только при сохранении техники и умеренной сложности.`
              : `${name}: закрепи ${rec.weight} кг и посильные повторы без повышения.`,
        );
      }
      const previous = earlier.flatMap((s) =>
        s.exercises
          .filter((x) => DDXCatalog.identity(x) === id)
          .map((x) => ({ s, e: x })),
      )[0];
      if (previous && rows.length) {
        const old = previous.e;
        const unit = (x) =>
          x.unit || (x.side ? "вес на сторону" : catalog?.unit || "неизвестно");
        if (
          unit(e) === unit(old) &&
          !!e.side === !!old.side &&
          (e.equipment || catalog?.equipment) ===
            (old.equipment || catalog?.equipment)
        ) {
          const oldRows = DDXStore.workRows(old),
            oldVolume = oldRows.reduce(
              (n, r) => n + DDXStore.num(r.w) * DDXStore.num(r.r),
              0,
            );
          if (oldRows.length) {
            const delta = Math.round((volume - oldVolume) * 10) / 10;
            const line = `${name}: условный объём ${Math.round(volume * 10) / 10} кг·повт., ${delta > 0 ? "+" : ""}${delta} к ${new Date(previous.s.start).toLocaleDateString(context.locale || "ru-RU")}. Число подходов: ${oldRows.length} → ${rows.length}; это не оценка техники.`;
            (delta > 0 ? result.good : result.attention).push(line);
          }
        } else
          result.attention.push(
            `${name}: единицы или оборудование изменились; объём напрямую не сравнивается.`,
          );
      }
    }
    if (!result.good.length)
      result.good.push(
        "Запись сохранена; данных для оценки ровности пока мало.",
      );
    if (!result.attention.length)
      result.attention.push(
        "По записанным данным явных ограничений не найдено; это не оценка техники или восстановления.",
      );
    if (!result.next.length)
      result.next.push(
        "Отмечай рабочие подходы и сложность: без них повышение не предлагается.",
      );
    return result;
  }
  window.WorkoutAnalysis = { analyzeWorkout };
})();
