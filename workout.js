const KIND = document.body.dataset.kind;
const KEY = DDXStore.sessionKey(KIND);
let resetting = false;
let persisted = localStorage.getItem(KEY);
window.addEventListener("storage", (ev) => {
  if (ev.key === KEY && ev.newValue !== persisted) {
    alert(
      "Сессия изменена в другой вкладке. Обнови страницу перед продолжением.",
    );
    document
      .querySelectorAll("button,input,textarea")
      .forEach((x) => (x.disabled = true));
  }
});
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch (e) {
    alert(
      "Повреждённая сессия сохранена. Экспортируй резервную копию на главной.",
    );
    throw e;
  }
}
let loaded = load();
if (loaded) {
  try {
    loaded = DDXStore.migrateState(loaded);
    for (const e of EX) {
      const st = loaded.ex[e.id];
      if (
        st &&
        !loaded.cards &&
        (st.rows.length !== e.rows.length || st.alt >= (e.alts || []).length)
      )
        throw Error("Несовместимая карточка");
    }
  } catch (error) {
    alert(
      "Сессия сохранена без изменений: " +
        error.message +
        ". Экспортируй копию на главной.",
    );
    throw error;
  }
}
let S = loaded || { start: null, end: null, rest: null, ex: {} };
if (!S.ex) S.ex = {};
initCatalogSession(S);
EX.forEach((e) => {
  if (!S.ex[e.id])
    S.ex[e.id] = {
      rows: e.rows.map((r) => ({
        w: e.type === "sets" ? "" : r.w === undefined ? "" : String(r.w),
        r: r.r === undefined ? "" : String(r.r),
        e: 0,
        d: false,
      })),
      n: "",
      t: [],
      skip: false,
      alt: -1,
      custom: "",
      why: [],
      side: !!e.sideDefault,
    };
});
// Fill a suggested probe once when its field is empty. Never overwrite drafts,
// completed trials, or a field intentionally cleared by the user.
function suggestTrialDefault(e) {
  if (e.type !== "sets" || S.end) return false;
  const st = S.ex[e.id], row = st?.rows?.[0];
  if (!row || row.d || row.w !== "" || st.trialManuallyCleared) return false;
  const replacement = repName(e);
  const id = DDXCatalog.identity({
    id: e.id, exerciseId: replacement ? null : e.exerciseId, replacement,
  });
  let history;
  try { history = DDXStore.history(); } catch { return false; }
  const proposal = WeightCalibration.evaluate(id, st, history).trial;
  if (proposal.weight === null) return false;
  row.w = String(proposal.weight);
  row.r = String(proposal.reps);
  return true;
}
let autoTrialChanged = false;
for (const e of EX) if (suggestTrialDefault(e)) autoTrialChanged = true;
function save() {
  if (resetting) return false;
  try {
    if (localStorage.getItem(KEY) !== persisted)
      throw Error("Сессия изменена в другой вкладке");
    S.updatedAt = Date.now();
    const value = JSON.stringify(S);
    localStorage.setItem(KEY, value);
    persisted = value;
    queueMicrotask(refreshWeightRecommendations);
    const status = document.getElementById("saveStatus");
    if (status)
      status.textContent =
        "Сохранено на устройстве · " + new Date().toLocaleTimeString("ru-RU");
    return true;
  } catch (e) {
    console.warn("Save failed", e);
    const status = document.getElementById("saveStatus");
    if (status) status.textContent = "Ошибка сохранения — скопируй отчёт";
    if (!window.__ddxSaveWarned) {
      window.__ddxSaveWarned = true;
      alert(
        "Не удалось сохранить данные на устройстве. Проверь доступное место и настройки браузера. Скопируй отчёт перед закрытием.",
      );
    }
  }
}

const EFF = [
  "—",
  "легко",
  "легко-норм",
  "норм",
  "норм-тяжело",
  "тяжело",
  "кое как",
];
const isWu = (e, i) => !!(e.rows[i] && e.rows[i].wu);

let AC = null,
  lastTick = -1,
  wl = null;
function ensureAC() {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === "suspended") AC.resume();
  } catch (e) {}
}
function beep(f, d, w = 0, v = 0.4) {
  if (!AC) return;
  const o = AC.createOscillator(),
    g = AC.createGain();
  o.type = "square";
  o.frequency.value = f;
  g.gain.setValueAtTime(v, AC.currentTime + w);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + w + d);
  o.connect(g);
  g.connect(AC.destination);
  o.start(AC.currentTime + w);
  o.stop(AC.currentTime + w + d);
}
function sndEnd() {
  beep(880, 0.15);
  beep(1320, 0.3, 0.2);
}
function sndShort() {
  beep(660, 0.1);
}
async function keepAwake() {
  try {
    if ("wakeLock" in navigator && !wl) {
      wl = await navigator.wakeLock.request("screen");
      wl.addEventListener("release", () => {
        wl = null;
      });
    }
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && S.start && !S.end) keepAwake();
});

const $ = (id) => document.getElementById(id);
function fmtT(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function fmtR(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ===== ЗАМЕНА / КАЛИБРОВКА =====
function curAlt(e) {
  const st = S.ex[e.id];
  return st.alt >= 0 && e.alts ? e.alts[st.alt] : null;
}
function repName(e) {
  const st = S.ex[e.id],
    a = curAlt(e);
  return a ? a.name : (st.custom || "").trim();
}
function isGeneric(e) {
  if (e.catalog) return true;
  const st = S.ex[e.id],
    a = curAlt(e);
  return a ? !a.cal : !!(st.custom && st.custom.trim());
}
function renderCal(e) {
  if (e.type === "sets") renderWeightRecommendation(e, $("ex-" + e.id));
}
function showLive(e) {
  renderCal(e);
}
function applyCal(e) {
  renderCal(e);
}
function updRep(e) {
  const n = repName(e),
    rp = $("rp-" + e.id),
    a = curAlt(e),
    st = S.ex[e.id];
  rp.textContent = n ? "⇄ ЗАМЕНА: " + n : "";
  let info = "";
  if (a) info = `<b>${a.name}.</b> ${a.tech || ""}`;
  else if (n) info = n + ". Своё упражнение: выбери нагрузку вручную.";
  $("ai-" + e.id).textContent = info.replace(/<[^>]*>/g, "");
}
function applyAlt(e) {
  const st = S.ex[e.id];
  if (st.rows.some((r) => r.d)) {
    toast("Замена доступна до выполнения подходов. Сначала сними отметки.");
    return;
  }
  if (e.type === "sets") {
    st.rows.forEach((r) => {
      r.w = "";
      r.e = 0;
      delete r.manualWeight;
    });
    delete st.calibration;
    delete st.weightApplication;
    suggestTrialDefault(e);
    renderRows(e);
    renderCal(e);
  }
  updRep(e);
  save();
}

// ===== BUILD =====
const list = $("list");
let lastBlock = "";
EX.forEach((e) => {
  if (e.block !== lastBlock) {
    const t = document.createElement("div");
    t.className = "block-title";
    t.textContent = e.block;
    list.appendChild(t);
    lastBlock = e.block;
  }
  const d = document.createElement("div");
  d.className = "ex";
  d.id = "ex-" + e.id;
  d.innerHTML = `<div class="ex-head"><div><h3>${e.title}</h3><div class="meta">${e.type === "sets" ? "Пробный и рабочий вес — в блоке калибровки · отдых " + e.rest + "с" : e.meta}</div><div class="rp" id="rp-${e.id}"></div></div><div class="status" id="st-${e.id}"></div></div>
  <div class="ex-body">${e.type === "sets" ? "" : `<div class="last">${e.last}</div>`}<div class="tech">${e.tech}</div>
  ${e.type === "sets" ? `<div class="cal" id="cal-${e.id}"></div>` : ""}
  <div id="rows-${e.id}"></div>
  <div class="alt"><b>ЗАМЕНА УПРАЖНЕНИЯ</b>
    <div class="quick" id="al-${e.id}"></div>
    <input type="text" class="ctext" id="ac-${e.id}" placeholder="или впиши своё упражнение">
    <div class="sub">Причина замены:</div>
    <div class="quick" id="aw-${e.id}"></div>
    <div class="altinfo" id="ai-${e.id}"></div>
  </div>
  <div class="quick" id="q-${e.id}"></div>
  <textarea id="n-${e.id}" placeholder="заметки"></textarea>
  <div class="ctl"><button id="sk-${e.id}">ПРОПУСТИТЬ УПРАЖНЕНИЕ</button></div></div>`;
  list.appendChild(d);
  catalogControls(e, d);
  const head = d.querySelector(".ex-head");
  head.tabIndex = 0;
  head.setAttribute("role", "button");
  head.setAttribute("aria-expanded", "false");
  head.onclick = () => {
    d.classList.toggle("open");
    head.setAttribute("aria-expanded", d.classList.contains("open"));
  };
  head.onkeydown = (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      head.click();
    }
  };
  const st = S.ex[e.id];
  // теги
  const qc = $("q-" + e.id);
  e.tags.forEach((t) => {
    const b = document.createElement("button");
    b.className = "qb" + (st.t.includes(t) ? " sel" : "");
    b.textContent = t;
    b.onclick = () => {
      b.classList.toggle("sel");
      st.t = [...qc.querySelectorAll(".qb.sel")].map((x) => x.textContent);
      save();
    };
    qc.appendChild(b);
  });
  const ni = $("n-" + e.id);
  ni.value = st.n || "";
  ni.oninput = () => {
    st.n = ni.value;
    save();
  };
  $("sk-" + e.id).onclick = () => skipEx(e);
  // замены
  const al = $("al-" + e.id),
    ac = $("ac-" + e.id),
    aw = $("aw-" + e.id);
  (e.alts || []).forEach((a, i) => {
    const b = document.createElement("button");
    b.className = "qb" + (st.alt === i ? " sel" : "");
    b.textContent = a.name;
    b.onclick = () => {
      if (st.rows.some((r) => r.d)) {
        toast("Сначала сними отметки выполненных подходов");
        return;
      }
      st.alt = st.alt === i ? -1 : i;
      if (st.alt >= 0) {
        st.custom = "";
        ac.value = "";
      }
      [...al.children].forEach((c, j) =>
        c.classList.toggle("sel", j === st.alt),
      );
      applyAlt(e);
    };
    al.appendChild(b);
  });
  ac.value = st.custom || "";
  ac.disabled = st.rows.some((r) => r.d);
  ac.oninput = () => {
    st.custom = ac.value;
    save();
    updRep(e);
  };
  ac.onchange = () => {
    if (ac.value.trim() && st.alt >= 0) {
      st.alt = -1;
      [...al.children].forEach((c) => c.classList.remove("sel"));
    }
    st.custom = ac.value;
    applyAlt(e);
  };
  WHY.forEach((t) => {
    const b = document.createElement("button");
    b.className = "qb" + (st.why.includes(t) ? " sel" : "");
    b.textContent = t;
    b.onclick = () => {
      b.classList.toggle("sel");
      st.why = [...aw.querySelectorAll(".qb.sel")]
        .filter((x) => !x.dataset.side)
        .map((x) => x.textContent);
      save();
    };
    aw.appendChild(b);
  });
  if (e.type === "sets") {
    const sb = document.createElement("button");
    sb.className = "qb" + (st.side ? " sel" : "");
    sb.dataset.side = "1";
    sb.textContent = "вес на сторону (×2)";
    sb.onclick = () => {
      if (st.rows.some((r) => r.d)) {
        toast("Единицы веса можно менять до выполнения подходов");
        return;
      }
      st.side = !st.side;
      sb.classList.toggle("sel", st.side);
      save();
    };
    aw.appendChild(sb);
  }
  renderRows(e);
  refresh(e);
  renderCal(e);
  updRep(e);
});
const addExercise = document.createElement("button");
addExercise.textContent = "Добавить упражнение";
addExercise.onclick = () => openCatalog(null);
list.append(addExercise);
const firstOpen =
  EX.find((e) => !S.ex[e.id].skip && !S.ex[e.id].rows.every((r) => r.d)) ||
  EX[0];
$("ex-" + firstOpen.id).classList.add("open");

function renderRows(e) {
  const st = S.ex[e.id],
    box = $("rows-" + e.id);
  box.innerHTML = "";
  if (e.type === "sets") {
    const h = document.createElement("div");
    h.className = "row hd";
    h.innerHTML =
      '<span class="n"></span><span class="iw">кг</span><span class="ir">повт</span><span class="eff">как далось</span><span class="ok"></span>';
    box.appendChild(h);
  }
  st.rows.forEach((r, i) => {
    const d = document.createElement("div");
    d.className = "row" + (r.d ? " done" : "") + (isWu(e, i) ? " trial" : "");
    if (e.type === "task") {
      const lbl = document.createElement("span");
      lbl.className = "lbl";
      lbl.textContent = e.rows[i].label;
      d.appendChild(lbl);
      const go = document.createElement("button");
      go.className = "go";
      go.textContent = "▶";
      go.onclick = () => {
        ensureAC();
        ensureStart();
        startRest(e.rows[i].secs, e.rows[i].label.toUpperCase());
      };
      d.appendChild(go);
    } else {
      const n = document.createElement("span");
      n.className = "n" + (isWu(e, i) ? " wu" : "");
      n.textContent = isWu(e, i) ? "проба" : i;
      d.appendChild(n);
      const w = document.createElement("input");
      w.className = "iw";
      w.type = "text";
      w.inputMode = "decimal";
      w.value = r.w;
      w.placeholder = "—";
      w.setAttribute("aria-label", e.name + " вес подхода " + i);
      w.oninput = () => {
        r.w = w.value;
        if (i === 0) st.trialManuallyCleared = w.value.trim() === "";
        if (i > 0) r.manualWeight = true;
        save();
        if (isWu(e, i)) renderCal(e);
      };
      d.appendChild(w);
      const rp = document.createElement("input");
      rp.className = "ir";
      rp.type = "text";
      rp.inputMode = "numeric";
      rp.value = r.r;
      rp.placeholder = "—";
      rp.setAttribute("aria-label", e.name + " повторы подхода " + i);
      rp.oninput = () => {
        r.r = rp.value;
        save();
        if (isWu(e, i)) renderCal(e);
      };
      d.appendChild(rp);
      const ef = document.createElement("button");
      ef.className = "eff e" + r.e;
      ef.textContent = EFF[r.e];
      ef.onclick = () => {
        r.e = (r.e + 1) % EFF.length;
        ef.className = "eff e" + r.e;
        ef.textContent = EFF[r.e];
        save();
        if (isWu(e, i)) showLive(e);
      };
      d.appendChild(ef);
    }
    const ok = document.createElement("button");
    ok.className = "ok";
    ok.textContent = "✓";
    ok.setAttribute("aria-label", "Выполнен подход " + i + " " + e.name);
    ok.setAttribute("aria-pressed", String(r.d));
    ok.onclick = () => toggleDone(e, i);
    d.appendChild(ok);
    box.appendChild(d);
  });
}
function refresh(e) {
  const st = S.ex[e.id],
    n = st.rows.filter((r) => r.d).length;
  $("st-" + e.id).textContent = st.skip ? "ПРОП." : n + "/" + st.rows.length;
  const c = $("ex-" + e.id);
  c.classList.toggle("done", !st.skip && n === st.rows.length);
  c.classList.toggle("skipped", st.skip);
}
function updBar() {
  let d = 0,
    t = 0;
  EX.forEach((e) => {
    const st = S.ex[e.id];
    if (st.skip) return;
    t += st.rows.length;
    d += st.rows.filter((r) => r.d).length;
  });
  $("pfill").style.width = (t ? (d / t) * 100 : 0) + "%";
}
function ensureStart() {
  if (!S.start) {
    S.start = Date.now();
    save();
  }
  keepAwake();
}
function nextEx(e) {
  $("ex-" + e.id).classList.remove("open");
  for (let i = EX.indexOf(e) + 1; i < EX.length; i++) {
    const st = S.ex[EX[i].id];
    if (!st.skip && !st.rows.every((r) => r.d)) {
      $("ex-" + EX[i].id).classList.add("open");
      return;
    }
  }
}

// ===== ACTIONS =====
function toggleDone(e, i) {
  ensureAC();
  ensureStart();
  const st = S.ex[e.id],
    row = st.rows[i];
  if (
    !row.d &&
    e.type === "sets" &&
    (!Number.isFinite(DDXStore.num(row.w)) ||
      !(DDXStore.num(row.w) >= 0) ||
      !(DDXStore.num(row.r) > 0) ||
      !Number.isInteger(DDXStore.num(row.r)))
  ) {
    toast("Введи вес от 0 и целое число повторений больше 0");
    return;
  }
  row.d = !row.d;
  $("ac-" + e.id).disabled = st.rows.some((r) => r.d);
  const all = st.rows.every((r) => r.d);
  if (row.d && e.type === "sets") {
    if (isWu(e, i)) {
      renderCal(e);
      if (!row.e) toast("Укажи сложность пробы, чтобы получить рекомендацию.");
    } else if (!row.e) {
      toast("ПОСТАВЬ «КАК ДАЛОСЬ»: БЕЗ ЭТОГО ПОДХОД НЕ ПОПАДЁТ В РАЗБОР");
    }
  }
  save();
  renderRows(e);
  refresh(e);
  updBar();
  if (row.d) {
    if (all) {
      nextEx(e);
      if (e.restEx > 0) startRest(e.restEx, "ПЕРЕД СЛЕДУЮЩИМ УПРАЖНЕНИЕМ");
      else stopRest();
      sndShort();
    } else if (e.type === "sets")
      startRest(
        isWu(e, i) ? e.restWu || 60 : e.rest,
        isWu(e, i) ? "ПОСЛЕ ПРОБНОГО: ОЦЕНИ ВЕС" : "ОТДЫХ МЕЖДУ ПОДХОДАМИ",
      );
  } else stopRest();
}
function skipEx(e) {
  const st = S.ex[e.id];
  st.skip = !st.skip;
  save();
  refresh(e);
  updBar();
  stopRest();
  if (st.skip) nextEx(e);
}
function startRest(sec, label) {
  S.rest = { end: Date.now() + sec * 1000, label };
  lastTick = -1;
  save();
  showRest();
}
function showRest() {
  if (!S.rest) {
    $("restBar").classList.remove("on");
    return;
  }
  $("restL").textContent = S.rest.label;
  $("restBar").classList.add("on");
  tick();
}
function stopRest() {
  S.rest = null;
  save();
  $("restBar").classList.remove("on");
}
function addRest(s) {
  if (S.rest) {
    S.rest.end += s * 1000;
    save();
    tick();
  }
}

function tick() {
  const now = Date.now();
  if (S.start) {
    const el = Math.floor(((S.end || now) - S.start) / 1000);
    $("totalTimer").textContent = fmtT(el);
  }
  if (S.rest) {
    const left = Math.ceil((S.rest.end - now) / 1000);
    if (left <= 0) {
      stopRest();
      sndEnd();
      return;
    }
    $("restT").textContent = fmtR(left);
    if (left <= 3 && left !== lastTick) {
      lastTick = left;
      sndShort();
    }
  }
}
setInterval(tick, 250);

// ===== REPORT =====
function fmtRow(e, r, i) {
  if (e.type === "task") return e.rows[i].label;
  let s = (r.w !== "" && r.w !== undefined ? r.w + "×" : "") + (r.r || "?");
  if (isWu(e, i)) s += " (пробный)";
  if (r.e) s += " " + EFF[r.e];
  return s;
}
function stats() {
  let work = 0,
    kk = 0,
    rep = 0;
  EX.forEach((e) => {
    const st = S.ex[e.id];
    if (st.skip) return;
    if (repName(e)) rep++;
    if (e.type !== "sets") return;
    st.rows.forEach((r, i) => {
      if (
        r.d &&
        !isWu(e, i) &&
        DDXStore.num(r.w) >= 0 &&
        DDXStore.num(r.r) > 0 &&
        Number.isInteger(DDXStore.num(r.r))
      ) {
        work++;
        if (r.e === 6) kk++;
      }
    });
  });
  return { work, kk, rep };
}
function buildReport() {
  const d = new Date(S.start || Date.now());
  const el = Math.floor(
    ((S.end || Date.now()) - (S.start || Date.now())) / 1000,
  );
  const x = stats();
  const L = [
    `${KIND.toUpperCase()} — ОТЧЁТ`,
    `Дата: ${d.toLocaleDateString("ru-RU")} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`,
    `Время: ${fmtT(el)} · Рабочих подходов: ${x.work} · «кое как»: ${x.kk} · Замен: ${x.rep}`,
    `Контекст: пробные подходы исключены из рабочего объёма; фактическое число рабочих подходов указано ниже; цель: запас 2 повтора`,
    ``,
  ];
  EX.forEach((e) => {
    const st = S.ex[e.id],
      rn = repName(e);
    let title = e.name + (rn ? ` → ЗАМЕНА: ${rn}` : "");
    if (st.skip) {
      L.push(`${title}: пропущено`);
      return;
    }
    const done = st.rows.map((r, i) => ({ r, i })).filter((o) => o.r.d);
    let l =
      `${title}: ` +
      (done.length
        ? done.map((o) => fmtRow(e, o.r, o.i)).join(", ")
        : "не делал");
    const meta = [];
    if (rn && st.why.length) meta.push("причина замены: " + st.why.join(", "));
    if (st.side)
      meta.push("вес указан на сторону, без автоматического пересчёта");
    if (st.t.length) meta.push(st.t.join(", "));
    if (meta.length) l += ` [${meta.join("; ")}]`;
    if (st.n && st.n.trim()) l += ` — ${st.n.trim()}`;
    L.push(l);
  });
  return L.join("\n");
}
function archiveSession() {
  try {
    if (!S.end || !S.start) return;
    const id = KEY + "_" + S.start;
    const record = {
      id,
      kind: KIND,
      date: new Date(S.start).toISOString(),
      start: S.start,
      end: S.end,
      stats: stats(),
      report: buildReport(),
      exercises: EX.map((e) => ({
        id: e.id,
        exerciseId: DDXCatalog.identity({
          id: e.id,
          exerciseId: repName(e) ? null : e.exerciseId,
          replacement: repName(e),
        }),
        slotId: e.slotId ?? e.id,
        sessionExerciseId: KEY + ":" + S.start + ":" + e.id,
        unit: S.ex[e.id].side
          ? "вес на сторону"
          : DDXCatalog.get(
              DDXCatalog.identity({
                id: e.id,
                exerciseId: repName(e) ? null : e.exerciseId,
                replacement: repName(e),
              }),
            )?.unit || "legacy: единица не уточнена",
        equipment:
          DDXCatalog.get(
            DDXCatalog.identity({
              id: e.id,
              exerciseId: repName(e) ? null : e.exerciseId,
              replacement: repName(e),
            }),
          )?.equipment || "legacy",
        name: e.name,
        replacement: repName(e),
        skipped: S.ex[e.id].skip,
        notes: S.ex[e.id].n || "",
        side: !!S.ex[e.id].side,
        tags: S.ex[e.id].t,
        why: S.ex[e.id].why,
        rows: S.ex[e.id].rows.map((r) => ({ ...r })),
      })),
    };
    const history = DDXStore.history();
    const at = history.findIndex((x) => x.id === id);
    if (at >= 0) history[at] = record;
    else history.push(record);
    localStorage.setItem("ddx_history_v1", JSON.stringify(history));
    return true;
  } catch (err) {
    console.warn("Archive failed", err);
    alert(
      "Не удалось сохранить тренировку в историю. Скопируй отчёт и проверь свободное место.",
    );
  }
}
function finish(restoring = false) {
  if (
    !S.end &&
    !EX.some((e) => !S.ex[e.id].skip && S.ex[e.id].rows.some((r) => r.d))
  ) {
    toast("Нет выполненных подходов");
    return;
  }
  if (!S.end) {
    S.end = Date.now();
    if (!S.start) S.start = S.end;
  }
  if (localStorage.getItem(KEY) !== persisted) {
    alert("Сессия изменилась в другой вкладке. Обнови страницу.");
    return;
  }
  S.rest = null;
  if (!restoring && !archiveSession()) {
    S.end = null;
    save();
    return;
  }
  $("restBar").classList.remove("on");
  save();
  const x = stats();
  $("stTime").textContent = fmtT(Math.floor((S.end - S.start) / 1000));
  $("stSets").textContent = x.work;
  $("stKK").textContent = x.kk + " из " + x.work;
  $("stRep").textContent = x.rep;
  $("scrMain").classList.add("hidden");
  $("scrFinal").classList.remove("hidden");
  window.scrollTo(0, 0);
  try {
    if (wl) {
      wl.release();
      wl = null;
    }
  } catch (e) {}
}
function backToMain() {
  S.end = null;
  save();
  $("scrFinal").classList.add("hidden");
  $("scrMain").classList.remove("hidden");
}
function copyReport() {
  const text = buildReport(),
    box = $("reportBox");
  box.classList.remove("hidden");
  box.value = text;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => toast("СКОПИРОВАНО"))
      .catch(() => fallbackCopy(box));
  } else fallbackCopy(box);
}
function fallbackCopy(box) {
  try {
    box.focus();
    box.select();
    box.setSelectionRange(0, 999999);
    const ok = document.execCommand("copy");
    toast(ok ? "СКОПИРОВАНО" : "ВЫДЕЛИ ТЕКСТ НИЖЕ ВРУЧНУЮ");
  } catch (e) {
    toast("ВЫДЕЛИ ТЕКСТ НИЖЕ ВРУЧНУЮ");
  }
}
function toast(m) {
  const t = $("toast");
  t.textContent = m;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2400);
}

function newSession() {
  if (!confirm("Начать новую тренировку? Текущая сохранена в истории.")) return;
  location.href = KIND + ".html?new=1";
}
if (new URLSearchParams(location.search).has("new")) {
  const key = "ddx_" + KIND + "_v4_" + Date.now();
  localStorage.setItem(
    key,
    JSON.stringify({ start: Date.now(), end: null, rest: null, ex: {} }),
  );
  location.replace(KIND + ".html");
}
let resetArm = false;
function resetAll() {
  const b = $("resetBtn");
  if (!resetArm) {
    resetArm = true;
    b.textContent = "ТОЧНО? НАЖМИ ЕЩЁ РАЗ";
    setTimeout(() => {
      resetArm = false;
      b.textContent = "СБРОСИТЬ ТРЕНИРОВКУ";
    }, 3000);
    return;
  }
  try {
    localStorage.setItem(KEY + "_recovery_" + Date.now(), JSON.stringify(S));
    localStorage.removeItem(KEY);
    resetting = true;
  } catch (e) {
    alert("Сброс отменён: не удалось сохранить копию");
    return;
  }
  location.reload();
}

window.addEventListener("pagehide", save);
updBar();
showRest();
tick();
if (autoTrialChanged) save();
if (S.end) {
  finish(true);
}
