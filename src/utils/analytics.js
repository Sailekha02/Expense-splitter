import { toCents, fromCents } from "../../shared/calc.js";

/** The amount of an expense that belongs to one member (their share). */
export function shareOf(expense, memberId) {
  const s = expense.splits.find((x) => x.memberId === memberId);
  return s ? s.amount : 0;
}

/** Spending per calendar month for the last `months` months, oldest first. */
export function monthlyTotals(expenses, amountFor, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      cents: 0,
    });
  }
  expenses.forEach((e) => {
    const b = buckets.find((x) => x.key === e.date.slice(0, 7));
    if (b) b.cents += toCents(amountFor(e));
  });
  return buckets.map((b) => ({ label: b.label, key: b.key, value: fromCents(b.cents) }));
}

export const sortRecent = (list) =>
  [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
