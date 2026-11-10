/* No animation loop: CSS owns motion; hidden tabs pause every decorative layer. */
(function () {
  const header = document.querySelector(".bloodstorm-v2");
  if (!header) return;
  const sync = () => header.classList.toggle("storm-paused", document.hidden);
  document.addEventListener("visibilitychange", sync);
  sync();
})();
