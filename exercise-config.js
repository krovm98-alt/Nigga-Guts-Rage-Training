const WHY = ["занято", "нет в зале", "дискомфорт"];
function mkRows(trial, workR, cal, n) {
  const rows = [{ w: trial.w, r: trial.r, wu: true }];
  for (let i = 0; i < n; i++) rows.push({ w: cal[2], r: workR });
  return rows;
}
