/* Version 1 backup envelope is retained; legacy v2/v4 keys remain untouched. */
(function () {
  "use strict";
  const HKEY = "ddx_history_v1";
  const object = (x) => x && typeof x === "object" && !Array.isArray(x);
  const num = (v) =>
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== ""
        ? Number(v.replace(",", "."))
        : NaN;
  const validRow = (r) =>
    object(r) &&
    typeof r.d === "boolean" &&
    ["string", "number"].includes(typeof r.w) &&
    ["string", "number"].includes(typeof r.r) &&
    Number.isInteger(r.e) &&
    r.e >= 0 &&
    r.e <= 6;
  function validSession(s) {
    return (
      object(s) &&
      typeof s.id === "string" &&
      s.id.length > 0 &&
      ["push", "pull", "legs"].includes(s.kind) &&
      Number.isFinite(s.start) &&
      s.start > 0 &&
      s.start <= 8640000000000000 &&
      Number.isFinite(s.end) &&
      s.end >= s.start &&
      s.end <= 8640000000000000 &&
      Array.isArray(s.exercises) &&
      s.exercises.every(
        (e) =>
          object(e) &&
          typeof e.id === "string" &&
          typeof e.name === "string" &&
          ["exerciseId", "sessionExerciseId", "unit", "equipment"].every(
            (k) => e[k] === undefined || typeof e[k] === "string",
          ) &&
          (e.slotId === undefined ||
            e.slotId === null ||
            typeof e.slotId === "string") &&
          Array.isArray(e.rows) &&
          e.rows.every(validRow) &&
          (!e.notes || typeof e.notes === "string") &&
          (!e.replacement || typeof e.replacement === "string") &&
          ["tags", "why"].every(
            (k) =>
              e[k] === undefined ||
              (Array.isArray(e[k]) && e[k].every((v) => typeof v === "string")),
          ),
      )
    );
  }
  function migrateState(input) {
    if (!object(input) || !object(input.ex)) throw Error("Некорректная сессия");
    const result = JSON.parse(JSON.stringify(input));
    for (const key of ["start", "end"])
      if (
        result[key] != null &&
        (!Number.isFinite(result[key]) || result[key] <= 0)
      )
        throw Error("Некорректная дата сессии");
    if (
      result.rest != null &&
      (!object(result.rest) ||
        !Number.isFinite(result.rest.end) ||
        typeof result.rest.label !== "string")
    )
      throw Error("Некорректный таймер");
    for (const e of Object.values(result.ex)) {
      if (!object(e) || !Array.isArray(e.rows) || !e.rows.every(validRow))
        throw Error("Некорректные подходы");
      e.t ??= [];
      e.why ??= [];
      e.n ??= "";
      e.custom ??= "";
      e.alt ??= -1;
      e.skip ??= false;
      e.side ??= false;
      if (
        !Array.isArray(e.t) ||
        !e.t.every((x) => typeof x === "string") ||
        !Array.isArray(e.why) ||
        !e.why.every((x) => typeof x === "string") ||
        typeof e.n !== "string" ||
        typeof e.custom !== "string" ||
        !Number.isInteger(e.alt)
      )
        throw Error("Некорректная карточка");
    }
    if (result.cards !== undefined) {
      if (!Array.isArray(result.cards) || result.cards.length > 100)
        throw Error("Некорректный список карточек");
      const ids = new Set();
      for (const c of result.cards) {
        if (
          !object(c) ||
          typeof c.sessionExerciseId !== "string" ||
          !/^[a-zA-Z0-9_-]+$/.test(c.sessionExerciseId) ||
          ids.has(c.sessionExerciseId) ||
          !Object.hasOwn(result.ex, c.sessionExerciseId) ||
          (c.exerciseId !== null &&
            (typeof c.exerciseId !== "string" ||
              !window.DDXCatalog?.get(c.exerciseId)))
        )
          throw Error("Некорректная карточка каталога");
        ids.add(c.sessionExerciseId);
      }
    }
    result.schemaVersion = 2;
    return result;
  }
  function history() {
    const raw = localStorage.getItem(HKEY);
    const h = JSON.parse(raw || "[]");
    if (!Array.isArray(h) || !h.every(validSession))
      throw Error(
        "История повреждена. Экспортируй копию перед восстановлением; исходные данные сохранены.",
      );
    return h;
  }
  function workRows(e) {
    return e.skipped
      ? []
      : (e.rows || []).filter(
          (r, i) =>
            i > 0 &&
            r.d &&
            Number.isFinite(num(r.w)) &&
            num(r.w) >= 0 &&
            num(r.r) > 0 &&
            Number.isInteger(num(r.r)),
        );
  }
  function metrics(s) {
    const rows = s.exercises.flatMap(workRows);
    return {
      work: rows.length,
      volume: rows.reduce((n, r) => n + num(r.w) * num(r.r), 0),
      kk: rows.filter((r) => r.e === 6).length,
    };
  }
  function sessionKey(kind) {
    const prefix = "ddx_" + kind + "_",
      today = new Date().toLocaleDateString("sv-SE");
    const candidates = [];
    for (const k of Object.keys(localStorage).filter(
      (k) =>
        k.startsWith(prefix) && /_v[24]_/.test(k) && !k.includes("_recovery_"),
    )) {
      try {
        const s = JSON.parse(localStorage.getItem(k));
        if (object(s) && object(s.ex))
          candidates.push({
            key: k,
            state: s,
            time:
              s.updatedAt || s.start || Date.parse(k.split("_").at(-1)) || 0,
          });
      } catch {}
    }
    candidates.sort((a, b) => b.time - a.time);
    const unfinished = candidates.find((x) => !x.state.end);
    if (unfinished) return unfinished.key;
    const last = candidates.find(
      (x) => new Date(x.state.end).toLocaleDateString("sv-SE") === today,
    );
    return last?.key || prefix + "v4_" + today;
  }
  function validateBackup(data) {
    if (
      !object(data) ||
      data.format !== "ddx-training-backup" ||
      data.version !== 1 ||
      !object(data.storage)
    )
      throw Error("Неподдерживаемый формат или версия");
    const entries = Object.entries(data.storage);
    if (entries.length > 3000) throw Error("Слишком много записей");
    for (const [k, v] of entries) {
      if (!k.startsWith("ddx_") || typeof v !== "string" || v.length > 10000000)
        throw Error("Некорректная запись");
      const x = JSON.parse(v);
      if (k === HKEY) {
        if (!Array.isArray(x) || !x.every(validSession))
          throw Error("Некорректная история");
      } else if (k.startsWith("ddx_history_revision_")) {
        if (!validSession(x)) throw Error("Некорректная прежняя запись");
      } else if (/^ddx_(push|pull|legs)_v[24]_/.test(k)) {
        migrateState(x);
      } /* Unknown legacy ddx keys are preserved as opaque JSON; never interpreted by the UI. */
    }
    return entries;
  }
  function restore(data) {
    const entries = validateBackup(data);
    const changes = entries.map(([k, v]) =>
      k === HKEY
        ? [
            k,
            JSON.stringify([
              ...new Map(
                [...history(), ...JSON.parse(v)].map((x) => [x.id, x]),
              ).values(),
            ]),
          ]
        : [k, v],
    );
    const previous = changes.map(([k]) => [k, localStorage.getItem(k)]);
    try {
      for (const [k, v] of changes) localStorage.setItem(k, v);
    } catch (error) {
      let restored = true;
      for (const [k, v] of previous)
        try {
          v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v);
        } catch {
          restored = false;
        }
      throw Error(
        restored
          ? "Недостаточно места. Изменения отменены."
          : "Ошибка восстановления. Сохрани исходный файл и экспорт текущих данных.",
      );
    }
  }
  window.DDXStore = {
    displayText: (value) =>
      String(value)
        .replace(/\bDDX\b/gi, "")
        .replace(/решил Семён/gi, "другая причина"),
    HKEY,
    num,
    history,
    workRows,
    metrics,
    sessionKey,
    validateBackup,
    restore,
    validSession,
    migrateState,
  };
})();
