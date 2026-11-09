if ("serviceWorker" in navigator && location.protocol.startsWith("http"))
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        const offer = () => {
          if (!reg.waiting || !navigator.serviceWorker.controller) return;
          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = "Доступна новая версия — обновить";
          b.onclick = () => {
            reg.waiting.postMessage({ type: "ACTIVATE" });
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => location.reload(),
              { once: true },
            );
          };
          document.querySelector(".wrap").prepend(b);
        };
        offer();
        reg.addEventListener("updatefound", () => {
          reg.installing?.addEventListener("statechange", offer);
        });
      })
      .catch(() => {
        console.warn("Офлайн-кеш недоступен");
      });
  });
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  const b = document.getElementById("install");
  if (b) b.style.display = "block";
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  const b = document.getElementById("install");
  if (b) b.style.display = "none";
});
window.addEventListener("DOMContentLoaded", () => {
  const b = document.getElementById("install");
  if (b)
    b.onclick = async () => {
      if (installPrompt) {
        await installPrompt.prompt();
        installPrompt = null;
      } else alert("В меню Chrome выбери «Установить приложение».");
    };
  const nav = document.createElement("nav");
  nav.className = "bottom-nav";
  nav.setAttribute("aria-label", "Главная навигация");
  for (const [href, label] of [
    ["index.html", "Журнал"],
    ["push.html", "Push"],
    ["pull.html", "Pull"],
    ["legs.html", "Legs"],
    ["analytics.html", "Прогресс"],
  ]) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    if (location.pathname.endsWith(href))
      a.setAttribute("aria-current", "page");
    nav.append(a);
  }
  document.body.append(nav);
});
