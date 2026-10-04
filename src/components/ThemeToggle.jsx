import { useSettings } from "../context/hooks.js";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useSettings();
  const dark = resolvedTheme === "dark";
  return (
    <button className="icon-btn" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
