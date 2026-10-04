import { useSettings } from "../context/hooks.js";

/** Donut chart drawn with SVG circles. data: [{ label, value, color }] */
export function DonutChart({ data, size = 190, thickness = 26, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  const { money } = useSettings();

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="donut" role="img" aria-label="Spending by category">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={thickness} />
      {total > 0 &&
        data.map((d) => {
          const len = (d.value / total) * C;
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(len - (data.length > 1 ? 1.5 : 0), 0)} ${C}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            >
              <title>{`${d.label}: ${money(d.value)} (${Math.round((d.value / total) * 100)}%)`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      <text x="50%" y="46%" textAnchor="middle" className="donut-value">{centerValue}</text>
      <text x="50%" y="60%" textAnchor="middle" className="donut-label">{centerLabel}</text>
    </svg>
  );
}

export function Legend({ data }) {
  const { money } = useSettings();
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ul className="legend">
      {data.map((d) => (
        <li key={d.label}>
          <span className="dot" style={{ background: d.color }} />
          <span className="legend-name">{d.icon} {d.label}</span>
          <span className="legend-val">{money(d.value)}</span>
          <span className="legend-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
        </li>
      ))}
    </ul>
  );
}

/** Vertical bar chart. data: [{ label, value }] */
export function BarChart({ data, height = 210 }) {
  const { money, moneyCompact } = useSettings();
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 44;
  const gap = 22;
  const width = data.length * (barW + gap) + gap;
  const top = 22;
  const bottom = 26;
  const plot = height - top - bottom;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="barchart" role="img" aria-label="Spending over time" preserveAspectRatio="xMidYMid meet">
      <line x1="0" x2={width} y1={top + plot} y2={top + plot} stroke="var(--border)" />
      {data.map((d, i) => {
        const h = (d.value / max) * plot;
        const x = gap + i * (barW + gap);
        return (
          <g key={d.key || d.label}>
            <rect x={x} y={top + plot - h} width={barW} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="6" fill="var(--primary)" opacity={d.value > 0 ? 1 : 0.25}>
              <title>{`${d.label}: ${money(d.value)}`}</title>
            </rect>
            {d.value > 0 && (
              <text x={x + barW / 2} y={top + plot - h - 6} textAnchor="middle" className="bar-val">{moneyCompact(d.value)}</text>
            )}
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="bar-label">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal bars as plain HTML (wraps nicely on mobile). data: [{ label, value, color? }] */
export function HBars({ data }) {
  const { money } = useSettings();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="hbars">
      {data.map((d) => (
        <li key={d.label}>
          <div className="hbar-row">
            <span className="hbar-label">{d.label}</span>
            <span className="hbar-val">{money(d.value)}</span>
          </div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color || "var(--primary)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
