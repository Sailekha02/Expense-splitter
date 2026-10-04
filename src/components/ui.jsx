import { categoryById } from "../../shared/calc.js";
import { initials } from "../utils/format.js";

export function StatCard({ label, value, hint, tone = "neutral", icon }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon = "🪙", title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">{icon}</div>
      <h4>{title}</h4>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

const PALETTE = ["#0d9488", "#6366f1", "#f97316", "#ec4899", "#3b82f6", "#eab308", "#8b5cf6", "#22c55e"];
export function Avatar({ name, size = 36 }) {
  let h = 0;
  for (const ch of name || "") h = (h * 31 + ch.charCodeAt(0)) % PALETTE.length;
  return (
    <span className="avatar" style={{ width: size, height: size, background: PALETTE[h], fontSize: size * 0.4 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function CategoryBadge({ id }) {
  const c = categoryById(id);
  return (
    <span className="cat-badge" style={{ "--cat": c.color }}>
      <span aria-hidden="true">{c.icon}</span> {c.label}
    </span>
  );
}

export function Field({ label, error, hint, children, htmlFor }) {
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <div className="field-error" role="alert">{error}</div> : hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {children && <div className="page-head-actions">{children}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div className="spinner-wrap" role="status">
      <div className="spinner" />
      <span className="muted">{label}</span>
    </div>
  );
}
