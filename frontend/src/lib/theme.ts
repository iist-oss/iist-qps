export type Theme = "dark" | "light";
const KEY = "qps-theme";

export function getTheme(): Theme {
  try {
    const s = localStorage.getItem(KEY);
    if (s === "dark" || s === "light") return s;
  } catch { /* storage blocked: fall through */ }
  return "dark";
}

export function applyTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#ffffff" : "#0d0d0d");
}

export function saveTheme(t: Theme): void {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyTheme(t);
}
