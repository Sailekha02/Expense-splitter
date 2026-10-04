import { Link } from "react-router-dom";
import { categoryById } from "../../shared/calc.js";
import { useAuth, useSettings } from "../context/hooks.js";
import { formatDate, memberName } from "../utils/format.js";
import { shareOf } from "../utils/analytics.js";

/** Shared list used by dashboard, group page and the expenses page. */
export default function ExpenseList({ expenses, groupsById, onDelete, showGroup = true, compact = false }) {
  const { user } = useAuth();
  const { money } = useSettings();

  return (
    <ul className={`expense-list ${compact ? "compact" : ""}`}>
      {expenses.map((e) => {
        const g = groupsById[e.groupId];
        const cat = categoryById(e.category);
        const me = g?.members.find((m) => m.userId === user.id);
        const mine = me ? shareOf(e, me.id) : 0;
        const iPaid = me && e.paidBy === me.id;
        return (
          <li key={e.id} className="expense-item">
            <span className="exp-icon" style={{ background: `${cat.color}22`, color: cat.color }} aria-hidden="true">{cat.icon}</span>
            <div className="exp-main">
              <div className="exp-title">{e.description}</div>
              <div className="exp-meta">
                {formatDate(e.date)}
                {showGroup && g && <> · <Link to={`/groups/${g.id}`}>{g.name}</Link></>}
                {" · "}{iPaid ? "You paid" : `${memberName(g, e.paidBy)} paid`}
                {!compact && <> · {cat.label} · {e.splitType}</>}
              </div>
              {e.notes && !compact && <div className="exp-notes">{e.notes}</div>}
            </div>
            <div className="exp-amount">
              <strong>{money(e.amount)}</strong>
              <span className="muted small">{mine > 0 ? `Your share ${money(mine)}` : "Not in split"}</span>
            </div>
            {onDelete && (
              <div className="exp-actions">
                <Link className="icon-btn" to={`/expenses/${e.id}/edit`} aria-label={`Edit ${e.description}`} title="Edit">✎</Link>
                <button className="icon-btn danger" onClick={() => onDelete(e)} aria-label={`Delete ${e.description}`} title="Delete">🗑</button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
