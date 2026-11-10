/* A real user-supplied session. Reference catalogue data is never seeded. */
(function () {
  const ID = "seeded_push_2026-11-09_18-50_second-month-start";
  const MARKER = "ddx_seed_second_month_v1";
  function record() {
    const row = (w, r, e, d = true) => ({ w: String(w), r: String(r), e, d });
    const entries = [
      [
        "cardio",
        "legacy:cardio",
        "Вело (разминка)",
        [row("", "", 0)],
        false,
        "",
      ],
      [
        "dbbench",
        "db_bench",
        "Жим гантелей лёжа",
        [row(12, 8, 2), row(21, 8, 3), row(21, 8, 3), row(21, 8, 4)],
        false,
        "",
      ],
      [
        "dbincline",
        "incline_db_bench",
        "Жим гантелей на наклонной",
        [row(10, 8, 1), row(20, 8, 3), row(20, 8, 4), row(20, 8, 4)],
        false,
        "",
      ],
      [
        "shoulder",
        "seated_db_shoulder_press",
        "Жим гантелей сидя",
        [],
        true,
        "",
      ],
      [
        "dbfly",
        "pec_deck",
        "Сведение рук в тренажёре («бабочка»)",
        [row(30, 8, 1), row(54, 10, 3), row(54, 10, 4), row(54, 10, 5)],
        false,
        "Сведение рук (бабочка)",
      ],
      [
        "dbtri",
        "overhead_db_tri",
        "Разгибание гантели из-за головы",
        [row(10, 12, 1), row(18, 8, 3), row(18, 8, 4), row(18, 8, 4)],
        false,
        "",
      ],
      [
        "lateral",
        "dip_machine",
        "Дип-тренажёр",
        [row(79, 8, 3), row(106.5, 8, 4), row(106.5, 7, 6), row(79, 8, 6)],
        false,
        "у нас понедельник день груди и трицепса, это упражнение не вписывается, вместо него делаем отжимание на трицепс в тренажере",
      ],
      [
        "abs",
        "rope_pushdown",
        "Трицепс на блоке",
        [row(11, 8, 1), row(16.5, 10, 2), row(18, 10, 4), row(18, 10, 3)],
        false,
        "пресс переносим на среду вместо него делаем трицепс на блоке",
      ],
    ];
    const start = Date.parse("2026-11-09T18:50:00+10:00");
    const s = {
      id: ID,
      kind: "push",
      start,
      end: start + 4195000,
      date: new Date(start).toISOString(),
      milestone: "Начало второго месяца регулярных тренировок",
      source: "user-supplied-report",
      timeZone: "Asia/Vladivostok",
      exercises: entries.map(
        ([slotId, exerciseId, name, rows, skipped, replacement]) => ({
          id: slotId,
          slotId,
          exerciseId,
          sessionExerciseId: ID + ":" + slotId,
          name,
          rows,
          skipped,
          replacement,
          side: false,
          unit: DDXCatalog.get(exerciseId)?.unit || "без веса",
          equipment: DDXCatalog.get(exerciseId)?.equipment || "велотренажёр",
          notes:
            exerciseId === "rope_pushdown"
              ? "Рукоять не уточнена. Для учёта выбран rope_pushdown по текущему Push; соответствие требует подтверждения."
              : "",
          tags: [],
          why: [],
        }),
      ),
    };
    const effort = [
      "—",
      "легко",
      "легко-норм",
      "норм",
      "норм-тяжело",
      "тяжело",
      "кое как",
    ];
    s.stats = { ...DDXStore.metrics(s), rep: 3 };
    s.report = [
      "ГРУДЬ + ТРИЦЕПС · ГАНТЕЛИ — ОТЧЁТ",
      "09.11.2026 18:50 (UTC+10) · 69:55 · 18 рабочих подходов · «кое как»: 2 · замен: 3",
      s.milestone,
      "Контекст: 1 пробный + 3 рабочих; цель: запас 2 повтора",
      ...s.exercises.map(
        (e) =>
          (({
            dbfly: "Разведение гантелей лёжа",
            lateral: "Махи гантелями в стороны",
            abs: "Пресс в тренажёре с блином",
          })[e.id] || e.name) +
          (e.replacement ? " → ЗАМЕНА: " + e.replacement : "") +
          ": " +
          (e.skipped
            ? "пропущено"
            : e.id === "cardio"
              ? "Вело 5 мин, пульс ~120"
              : e.rows
                  .map(
                    (r, i) =>
                      r.w +
                      "×" +
                      r.r +
                      (i === 0 ? " (пробный)" : "") +
                      " " +
                      effort[r.e],
                  )
                  .join(", ")) +
          (e.notes ? " · " + e.notes : ""),
      ),
    ].join("\n");
    return s;
  }
  function sameWorkout(a, b) {
    const signature = (s) =>
      s.exercises
        .filter((e) => DDXStore.workRows(e).length)
        .map((e) =>
          e.rows
            .map((r) =>
              [DDXStore.num(r.w), DDXStore.num(r.r), r.e, r.d].join(","),
            )
            .join(";"),
        )
        .sort()
        .join("|");
    return (
      a.kind === b.kind &&
      (a.start === b.start ||
        (/09\.11\.2026.*18:50/.test(a.report || "") &&
          a.end - a.start === b.end - b.start)) &&
      signature(a) === signature(b)
    );
  }
  function seed() {
    if (localStorage.getItem(MARKER)) return false;
    const history = DDXStore.history(),
      s = record();
    if (!DDXStore.validSession(s))
      throw Error("Некорректная историческая запись");
    if (!history.some((x) => x.id === ID || sameWorkout(x, s)))
      localStorage.setItem(DDXStore.HKEY, JSON.stringify([...history, s]));
    localStorage.setItem(MARKER, JSON.stringify({ id: ID, version: 1 }));
    return true;
  }
  window.WorkoutSeed = { seed, record, ID, MARKER };
  try {
    seed();
  } catch (error) {
    const notice = document.createElement("p");
    notice.setAttribute("role", "alert");
    notice.textContent =
      "Не удалось добавить тренировку 09.11.2026. Существующие данные сохранены. " +
      error.message;
    document.body.prepend(notice);
  }
})();
