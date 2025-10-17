import { useEffect, useState } from "react";
const THEME_KEY = "theme"; // "light" | "dark"

export default function Settings() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(THEME_KEY) || "dark"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const resetAll = () => {
    localStorage.clear();
    // behold dark efter reset
    localStorage.setItem(THEME_KEY, "dark");
    document.documentElement.classList.add("dark");
    location.reload();
  };

  return (
    <div className="max-w-xl space-y-8">
      <section className="glass border border-black/10 dark:border-white/10 rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-3">Appearance</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme("light")}
            className={`px-4 py-2 rounded-xl border ${
              theme === "light" ? "bg-black/5 dark:bg-white/10" : ""
            }`}
          >
            Light
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`px-4 py-2 rounded-xl border ${
              theme === "dark" ? "bg-black/5 dark:bg-white/10" : ""
            }`}
          >
            Dark
          </button>
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Starter altid i dark, medmindre du vælger light her.
        </div>
      </section>

      <section className="glass border border-black/10 dark:border-white/10 rounded-2xl p-4">
        <h2 className="text-lg font-semibold mb-3">Danger zone</h2>
        <button
          onClick={resetAll}
          className="px-4 py-2 rounded-xl border border-red-500/40 text-red-500 hover:bg-red-500/10"
        >
          Nulstil alt (ryd localStorage)
        </button>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Rydder alle favoritter, filtre og indstillinger. Tema sættes til dark.
        </div>
      </section>
    </div>
  );
}
