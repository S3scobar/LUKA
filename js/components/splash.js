// js/components/splash.js — cierra la pantalla de apertura (la animación es CSS: css/splash.css)
export function initSplash() {
  const splash = document.getElementById("splash");
  if (!splash) return;

  const root = document.documentElement;
  if (!root.classList.contains("splash-on")) {
    splash.remove();
    return;
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    root.classList.remove("splash-on");
    splash.remove();
  };

  splash.addEventListener("animationend", (e) => {
    if (e.target === splash && e.animationName === "splash-out") finish();
  });

  // Un toque o una tecla la saltan
  const skip = () => splash.classList.add("splash-skip");
  splash.addEventListener("pointerdown", skip);
  document.addEventListener("keydown", skip, { once: true });

  // Seguro: si por algún motivo no llega animationend, se retira igual
  setTimeout(finish, 5000);
}
