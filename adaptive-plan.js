/* Plan operations never write history or change the immutable day templates. */
(function () {
  const templates = {
    push: [
      "db_bench",
      "incline_db_bench",
      "db_fly",
      "overhead_db_tri",
      "dip_machine",
      "rope_pushdown",
    ],
    pull: [
      "lat_pulldown",
      "seated_cable_row",
      "seated_lever_row",
      "back_extension_machine",
      "shrug_machine",
      "biceps_machine",
      "db_curl",
      "ab_machine",
    ],
    legs: [
      "barbell_squat",
      "db_rdl",
      "leg_press",
      "seated_leg_curl",
      "seated_leg_extension",
      "calf_raise",
      "lateral_delt_machine",
      "rear_delt_machine",
    ],
  };
  function range(value) {
    const m = String(value)
      .trim()
      .match(/^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/);
    if (!m || +m[1] < 1 || +(m[2] || m[1]) < +m[1])
      throw Error("Укажи повторы от 1 до 99, например 8–10");
    return [+m[1], +(m[2] || m[1])];
  }
  function resize(st, count, reps) {
    const [lo, hi] = range(reps);
    if (!Number.isInteger(count) || count < 1 || count > 10)
      throw Error("От 1 до 10 рабочих подходов");
    const typed = DDXStore.typedRows(st.rows),
      working = typed.filter((r) => r.type === "working");
    if (working.slice(count).some((r) => r.d))
      throw Error("Выполненные подходы защищены");
    const retained = new Set(working.slice(0, count));
    st.rows = typed.filter((r) => r.type !== "working" || retained.has(r));
    while (DDXStore.plannedRows(st).length < count)
      st.rows.push({ type: "working", w: "", r: String(lo), e: 0, d: false });
    DDXStore.plannedRows(st)
      .filter((r) => !r.d)
      .forEach((r) => (r.r = String(lo)));
    st.repMin = lo;
    st.repMax = hi;
  }
  const example = [
    ["barbell_squat", 3, "8"],
    ["db_bench", 3, "8–10"],
    ["incline_db_bench", 3, "8–10"],
    ["db_rdl", 3, "8–10"],
    ["pec_deck", 2, "10"],
    ["overhead_db_tri", 2, "8–10"],
    ["rope_pushdown", 2, "10–12"],
  ];
  function combined(main, selected, priority) {
    const a = templates[main] || [];
    const b = [...new Set(selected)].filter(
      (id) => DDXCatalog.get(id) && !a.includes(id),
    );
    const base = a.slice(0, Math.max(1, 9 - b.length));
    const ordered = priority === "missed" ? [...b, ...base] : [...base, ...b];
    const plan = ordered.map((id) => [id, 2, String(DDXCatalog.get(id).reps)]);
    let remaining = 18 - plan.length * 2;
    const preferred =
      priority === "balanced"
        ? plan
        : plan.filter((x) =>
            priority === "missed" ? b.includes(x[0]) : base.includes(x[0]),
          );
    for (const item of [
      ...preferred,
      ...plan.filter((x) => !preferred.includes(x)),
    ]) {
      if (remaining <= 0) break;
      item[1]++;
      remaining--;
    }
    return plan;
  }
  function weekly(history, now = new Date()) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const totals = Object.fromEntries(
      DDXCatalog.items.map((x) => [x.group, 0]),
    );
    for (const s of history)
      if (s.start >= +start && s.start < +end)
        for (const e of s.exercises) {
          const group = DDXCatalog.get(DDXCatalog.identity(e))?.group;
          if (group) totals[group] += DDXStore.workRows(e).length;
        }
    return totals;
  }
  window.AdaptivePlan = { templates, range, resize, example, combined, weekly };
})();
