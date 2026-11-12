/* Session progression: no server, no alteration of historical results.
   A normal target repeats the same load and may increase reps; load increases
   require an explicit opt-in after completing the previous session. */
(function () {
  "use strict";
  const KEY = "ddx_next_targets_v1";
  const num = DDXStore.num;
  const pain = (text) => /(боль|болит|дискомфорт|чувствуется)/i.test(text || "");
  function identity(e) { return DDXCatalog.identity(e); }
  function evaluate(session, history = []) {
    const result = [];
    if (!DDXStore.validSession(session)) return result;
    for (const e of session.exercises) {
      if (e.skipped) continue;
      const canonical = identity(e), catalog = DDXCatalog.get(canonical);
      if (!catalog || e.side ||
          (e.unit && e.unit !== catalog.unit) ||
          (e.equipment && e.equipment !== catalog.equipment)) continue;
      const planned = (e.rows || []).slice(1);
      const rows = DDXStore.workRows(e);
      if (!rows.length) continue;
      const weights = rows.map(r => num(r.w));
      const minReps = Math.min(...rows.map(r => num(r.r)));
      const hard = rows.some(r => !Number.isInteger(r.e) || r.e < 1 || r.e >= 5);
      const hurt = pain([e.notes,...(e.tags||[]),...(e.why||[])].join(" "));
      const complete = planned.length > 0 && rows.length === planned.length;
      const sameWeight = weights.every(w => Number.isFinite(w) && w > 0 && w === weights[0]);
      const base = sameWeight ? weights[0] : null;
      const safe = complete && sameWeight && !hard && !hurt && minReps >= 1;
      const ceiling = Math.max(catalog.reps >= 12 ? 12 : 10, catalog.reps || 8);
      const item = {
        exerciseId:canonical, name:catalog.name, unit:catalog.unit,
        weight:base, reps:minReps, sourceSessionId:session.id,
        kind:"manual", reason:"Нагрузка требует проверки; не повышать автоматически.",
        proposedWeight:null, proposedReps:null, approved:false,
      };
      if (!safe) {
        item.reason = hurt ? "Отмечен дискомфорт — нагрузку подбери вручную." :
          hard ? "Слишком тяжёлые подходы — не повышать нагрузку." :
          !sameWeight ? "Разные веса в рабочих подходах — закрепи стабильную нагрузку." :
          "Не все рабочие подходы выполнены — повтори посильную нагрузку.";
      } else if (minReps < ceiling) {
        item.kind = "reps";
        item.proposedWeight = base;
        item.proposedReps = minReps + 1;
        item.approved = true;
        item.reason = "Рабочий вес прежний, цель — на одно повторение больше в каждом подходе.";
      } else {
        // Numeric progression is only a candidate: different machines have
        // different plates and increments, so the user must approve explicitly.
        const goal = String(catalog.goal || "");
        const matches = [...goal.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:×|(?=\s*(?:→|$)))/g)]
          .map(m => num(m[1])).filter(w => Number.isFinite(w) && w > base);
        const next = matches.length ? matches[0] : null;
        item.kind = "ceiling";
        item.proposedWeight = next;
        item.proposedReps = catalog.reps;
        item.reason = next == null
          ? "Верх диапазона достигнут. Шаг веса неизвестен — выбери вручную."
          : "Верх диапазона достигнут. Возможное повышение требует отдельного подтверждения.";
      }
      // Match any earlier workout only for comparison, never as a substitute
      // for a poor latest result.
      const previous = history.filter(s => s.id !== session.id && s.start < session.start)
        .sort((a,b) => b.start-a.start)
        .flatMap(s => s.exercises.filter(x => identity(x) === canonical))
        .find(Boolean);
      if (previous) {
        const prev = DDXStore.workRows(previous);
        if (prev.length && prev.every(r => num(r.w) === num(prev[0].w)) &&
            prev[0].w !== undefined) {
          item.previousWeight = num(prev[0].w);
          item.previousReps = Math.min(...prev.map(r => num(r.r)));
        }
      }
      result.push(item);
    }
    return result;
  }
  function read() {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    try {
      const data = JSON.parse(raw);
      return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch { return {}; }
  }
  function store(session, recommendations, previous = read()) {
    const next = {...previous};
    for (const item of recommendations) {
      // Replacing the most recent exercise target invalidates an older target.
      delete next[item.exerciseId];
      if (item.approved && Number.isFinite(item.proposedWeight) && item.proposedWeight > 0 &&
          Number.isInteger(item.proposedReps) && item.proposedReps > 0)
        next[item.exerciseId] = {
          exerciseId:item.exerciseId, sourceSessionId:session.id,
          weight:item.proposedWeight, reps:item.proposedReps, unit:item.unit,
          equipment:DDXCatalog.get(item.exerciseId)?.equipment,
          approvedAt:Date.now(),
        };
    }
    localStorage.setItem(KEY,JSON.stringify(next));
    return next;
  }
  function prefill(e, state) {
    const id = identity(e);
    const target = read()[id];
    const catalog = DDXCatalog.get(id);
    if (!target || !catalog || target.unit !== catalog.unit ||
        target.equipment !== catalog.equipment || state.side || state.skip ||
        state.rows.some(r => r.d)) return false;
    let changed = false;
    for (const r of state.rows.slice(1)) {
      if (r.w === "" && !r.manualWeight) {
        r.w = String(target.weight);
        r.r = String(target.reps);
        changed = true;
      }
    }
    return changed;
  }
  window.SessionProgression = {KEY,evaluate,read,store,prefill};
})();
