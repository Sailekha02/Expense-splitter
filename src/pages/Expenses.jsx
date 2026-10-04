import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../../shared/calc.js";
import { useAuth, useData, useSettings, useUI } from "../context/hooks.js";
import { EmptyState, PageHeader, Spinner } from "../components/ui.jsx";
import ExpenseList from "../components/ExpenseList.jsx";
import { exportCSV, exportPDF } from "../utils/exporters.js";
import { memberName } from "../utils/format.js";

const SORTS = {
  newest: { label: "Newest first", fn: (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) },
  oldest: { label: "Oldest first", fn: (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) },
  high: { label: "Amount: high to low", fn: (a, b) => b.amount - a.amount },
  low: { label: "Amount: low to high", fn: (a, b) => a.amount - b.amount },
  name: { label: "Description A–Z", fn: (a, b) => a.description.localeCompare(b.description) },
};
const PAGE = 20;
const DEFAULTS = { q: "", category: "all", groupId: "all", from: "", to: "", sort: "newest" };

export default function Expenses() {
  const { user } = useAuth();
  const { money, currency } = useSettings();
  const { toast, confirm } = useUI();
  const { expenses, groups, groupsById, deleteExpense, loading } = useData();
  const [f, setF] = useState(DEFAULTS);
  const [visible, setVisible] = useState(PAGE);

  const set = (k) => (e) => {
    setF((x) => ({ ...x, [k]: e.target.value }));
    setVisible(PAGE);
  };

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return expenses
      .filter((e) => {
        if (f.category !== "all" && e.category !== f.category) return false;
        if (f.groupId !== "all" && e.groupId !== f.groupId) return false;
        if (f.from && e.date < f.from) return false;
        if (f.to && e.date > f.to) return false;
        if (q) {
          const g = groupsById[e.groupId];
          const hay = `${e.description} ${e.notes || ""} ${g?.name || ""} ${memberName(g, e.paidBy)}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(SORTS[f.sort].fn);
  }, [expenses, f, groupsById]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const isFiltered = JSON.stringify(f) !== JSON.stringify(DEFAULTS);

  const onDelete = async (e) => {
    if (!(await confirm({ title: "Delete expense?", message: `"${e.description}" (${money(e.amount)}) will be removed and balances recalculated.` }))) return;
    try {
      await deleteExpense(e.id);
      toast.success("Expense deleted");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const doExport = async (kind) => {
    if (!filtered.length) return toast.info("Nothing to export. Adjust your filters first.");
    try {
      if (kind === "csv") exportCSV(filtered, groupsById, user.id);
      else await exportPDF(filtered, groupsById, user.id, currency, user.name);
      toast.success(`Exported ${filtered.length} expenses as ${kind.toUpperCase()}`);
    } catch (err) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  if (loading && !expenses.length) return <Spinner />;

  return (
    <div className="stack-lg">
      <PageHeader title="Expenses" subtitle="Search, filter and export everything you've logged.">
        <button className="btn btn-outline" onClick={() => doExport("csv")}>⬇ CSV</button>
        <button className="btn btn-outline" onClick={() => doExport("pdf")}>⬇ PDF</button>
        <Link to="/add-expense" className="btn btn-primary">＋ Add Expense</Link>
      </PageHeader>

      <div className="card filters">
        <input type="search" className="filter-search" placeholder="Search description, notes, group or payer…" value={f.q} onChange={set("q")} aria-label="Search expenses" />
        <select value={f.category} onChange={set("category")} aria-label="Category">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <select value={f.groupId} onChange={set("groupId")} aria-label="Group">
          <option value="all">All groups</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <label className="date-filter">From <input type="date" value={f.from} max={f.to || undefined} onChange={set("from")} /></label>
        <label className="date-filter">To <input type="date" value={f.to} min={f.from || undefined} onChange={set("to")} /></label>
        <select value={f.sort} onChange={set("sort")} aria-label="Sort by">
          {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
        </select>
        {isFiltered && <button className="btn btn-ghost btn-sm" onClick={() => { setF(DEFAULTS); setVisible(PAGE); }}>Reset</button>}
      </div>

      <div className="result-bar muted">
        <span>{filtered.length} of {expenses.length} expenses</span>
        <span>Total: <strong>{money(total)}</strong></span>
      </div>

      <div className="card">
        {filtered.length ? (
          <>
            <ExpenseList expenses={filtered.slice(0, visible)} groupsById={groupsById} onDelete={onDelete} />
            {filtered.length > visible && (
              <div className="center"><button className="btn btn-outline" onClick={() => setVisible((v) => v + PAGE)}>Show more ({filtered.length - visible} left)</button></div>
            )}
          </>
        ) : expenses.length ? (
          <EmptyState icon="🔍" title="No matching expenses">Try a different search or reset the filters.</EmptyState>
        ) : (
          <EmptyState icon="🧾" title="No expenses yet" action={<Link to="/add-expense" className="btn btn-primary">Add expense</Link>}>Once you add expenses they'll show up here.</EmptyState>
        )}
      </div>
    </div>
  );
}
