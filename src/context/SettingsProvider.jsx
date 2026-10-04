import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsContext } from "./contexts.js";
import { useAuth } from "./hooks.js";
import { makeMoneyFormatter, compactMoney } from "../utils/format.js";

const THEME_KEY = "es_theme";
const mq = () => window.matchMedia("(prefers-color-scheme: dark)");

export default function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || "system");
  const [systemDark, setSystemDark] = useState(() => mq().matches);

  useEffect(() => {
    const m = mq();
    const on = (e) => setSystemDark(e.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);

  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setTheme = useCallback((t) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => setTheme(resolved === "dark" ? "light" : "dark"), [resolved, setTheme]);

  const currency = user?.currency || "INR";
  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: resolved,
      setTheme,
      toggleTheme,
      currency,
      money: makeMoneyFormatter(currency),
      moneyCompact: (n) => compactMoney(n, currency),
    }),
    [theme, resolved, setTheme, toggleTheme, currency]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
