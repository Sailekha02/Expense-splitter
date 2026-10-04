// Shared by the React app and the Express server so both always agree on the maths.
// All money is handled in integer cents internally to avoid floating-point drift.

export const CATEGORIES = [
  { id: "food", label: "Food & Dining", color: "#f97316", icon: "🍔" },
  { id: "groceries", label: "Groceries", color: "#22c55e", icon: "🛒" },
  { id: "travel", label: "Travel", color: "#3b82f6", icon: "✈️" },
  { id: "rent", label: "Rent & Bills", color: "#8b5cf6", icon: "🏠" },
  { id: "utilities", label: "Utilities", color: "#06b6d4", icon: "💡" },
  { id: "shopping", label: "Shopping", color: "#ec4899", icon: "🛍️" },
  { id: "entertainment", label: "Entertainment", color: "#eab308", icon: "🎬" },
  { id: "health", label: "Health", color: "#ef4444", icon: "💊" },
  { id: "other", label: "Other", color: "#64748b", icon: "📦" },
];

export const SPLIT_TYPES = ["equal", "percentage", "exact"];

export const categoryById = (id) =>
  CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1];

export const toCents = (n) => Math.round(Number(n) * 100);
export const fromCents = (c) => c / 100;

/**
 * Work out how much each member owes for one expense.
 * Returns { splits: [{ memberId, amount, percent? }] } or { error: string }.
 */
export function computeSplits({ type, amount, memberIds, values = {} }) {
  const total = toCents(amount);
  if (!Number.isFinite(total) || total <= 0) return { error: "Amount must be greater than 0" };
  if (!SPLIT_TYPES.includes(type)) return { error: "Invalid split type" };
  const ids = [...new Set(memberIds || [])];
  if (ids.length === 0) return { error: "Select at least one member to split with" };

  let cents;
  if (type === "equal") {
    const base = Math.floor(total / ids.length);
    let remainder = total - base * ids.length;
    cents = ids.map(() => base + (remainder-- > 0 ? 1 : 0));
  } else if (type === "percentage") {
    const pcts = ids.map((id) => Number(values[id] || 0));
    if (pcts.some((p) => !Number.isFinite(p) || p < 0)) return { error: "Percentages must be 0 or more" };
    const sum = pcts.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.01) return { error: `Percentages must add up to 100% (currently ${round2(sum)}%)` };
    cents = pcts.map((p) => Math.round((total * p) / 100));
    const diff = total - cents.reduce((a, b) => a + b, 0);
    if (diff !== 0) cents[cents.indexOf(Math.max(...cents))] += diff; // push rounding pennies onto the biggest share
  } else {
    const amts = ids.map((id) => toCents(values[id] || 0));
    if (amts.some((a) => !Number.isFinite(a) || a < 0)) return { error: "Amounts must be 0 or more" };
    const sum = amts.reduce((a, b) => a + b, 0);
    if (sum !== total) {
      const d = fromCents(Math.abs(total - sum)).toFixed(2);
      return { error: sum < total ? `Exact amounts are ${d} short of the total` : `Exact amounts exceed the total by ${d}` };
    }
    cents = amts;
  }

  const splits = ids
    .map((memberId, i) => ({
      memberId,
      amount: fromCents(cents[i]),
      ...(type === "percentage" ? { percent: Number(values[memberId] || 0) } : {}),
    }))
    .filter((s) => s.amount > 0);
  if (splits.length === 0) return { error: "At least one member must owe something" };
  return { splits };
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Net balance per member in cents. Positive = is owed money, negative = owes money. */
export function computeBalances(group, expenses = [], settlements = []) {
  const net = {};
  group.members.forEach((m) => (net[m.id] = 0));
  const add = (id, c) => {
    if (id in net) net[id] += c;
  };
  expenses.forEach((e) => {
    add(e.paidBy, toCents(e.amount));
    e.splits.forEach((s) => add(s.memberId, -toCents(s.amount)));
  });
  settlements.forEach((s) => {
    add(s.from, toCents(s.amount)); // payer's debt shrinks
    add(s.to, -toCents(s.amount)); // receiver is owed less
  });
  return net;
}

/** Minimal-ish list of payments that settles everyone up (greedy debtor -> creditor). */
export function suggestSettlements(net) {
  const creditors = [];
  const debtors = [];
  Object.entries(net).forEach(([id, c]) => {
    if (c > 0) creditors.push({ id, c });
    else if (c < 0) debtors.push({ id, c: -c });
  });
  creditors.sort((a, b) => b.c - a.c);
  debtors.sort((a, b) => b.c - a.c);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].c, creditors[j].c);
    out.push({ from: debtors[i].id, to: creditors[j].id, amount: fromCents(pay) });
    debtors[i].c -= pay;
    creditors[j].c -= pay;
    if (debtors[i].c === 0) i++;
    if (creditors[j].c === 0) j++;
  }
  return out;
}

/** The member in a group that represents the logged-in user. */
export const myMember = (group, userId) => group.members.find((m) => m.userId === userId);

/** Dashboard numbers for one user across all of their groups. */
export function userSummary(groups, expenses, settlements, userId) {
  let spending = 0; // the user's own share of every expense
  let paid = 0; // cash the user actually put down
  let owed = 0; // what the user still owes others
  let receivable = 0; // what others still owe the user
  const perGroup = {};
  groups.forEach((g) => {
    const me = myMember(g, userId);
    const ge = expenses.filter((e) => e.groupId === g.id);
    const gs = settlements.filter((s) => s.groupId === g.id);
    const net = computeBalances(g, ge, gs);
    const myNet = me ? net[me.id] || 0 : 0;
    if (me) {
      ge.forEach((e) => {
        if (e.paidBy === me.id) paid += toCents(e.amount);
        const mine = e.splits.find((s) => s.memberId === me.id);
        if (mine) spending += toCents(mine.amount);
      });
      if (myNet < 0) owed += -myNet;
      else receivable += myNet;
    }
    perGroup[g.id] = {
      net,
      myNet: fromCents(myNet),
      total: fromCents(ge.reduce((s, e) => s + toCents(e.amount), 0)),
      count: ge.length,
      suggestions: suggestSettlements(net),
    };
  });
  return {
    spending: fromCents(spending),
    paid: fromCents(paid),
    owed: fromCents(owed),
    receivable: fromCents(receivable),
    perGroup,
  };
}

/** Spending per category. If memberId is given only that member's share counts. */
export function categoryTotals(expenses, memberIdFor) {
  const totals = {};
  expenses.forEach((e) => {
    let amt = toCents(e.amount);
    if (memberIdFor) {
      const mid = memberIdFor(e);
      const s = e.splits.find((x) => x.memberId === mid);
      amt = s ? toCents(s.amount) : 0;
    }
    if (amt > 0) totals[e.category] = (totals[e.category] || 0) + amt;
  });
  return CATEGORIES.filter((c) => totals[c.id]).map((c) => ({
    id: c.id,
    label: c.label,
    color: c.color,
    icon: c.icon,
    value: fromCents(totals[c.id]),
  })).sort((a, b) => b.value - a.value);
}
