import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CATEGORIES, computeSplits, toCents } from "../../shared/calc.js";
import { useAuth, useData, useSettings, useUI } from "../context/hooks.js";
import { EmptyState, Field, PageHeader, Spinner } from "../components/ui.jsx";
import { todayISO } from "../utils/format.js";

const SPLITS = [
  { id: "equal", label: "Equally" },
  { id: "percentage", label: "By percentage" },
  { id: "exact", label: "Exact amounts" },
];

export default function AddExpense() {
  const { id: editId } = useParams();
  const [params] = useSearchParams();
  const { groups, expenses, loading } = useData();

  if (loading && !groups.length) return <Spinner />;

  const editing = editId ? expenses.find((e) => e.id === editId) : null;
  if (editId && !editing)
    return (
      <div className="card">
        <EmptyState icon="🔍" title="Expense not found" action={<Link className="btn btn-primary" to="/expenses">Back to expenses</Link>} />
      </div>
    );
  if (!groups.length)
    return (
      <div className="card">
        <EmptyState icon="👥" title="Create a group first" action={<Link className="btn btn-primary" to="/groups?new=1">Create group</Link>}>
          Expenses belong to a group so they can be split between its members.
        </EmptyState>
      </div>
    );

  // key makes the form start fresh when switching between add / edit targets
  return <ExpenseForm key={editId || "new"} editing={editing} presetGroup={params.get("group")} />;
}

function ExpenseForm({ editing, presetGroup }) {
  const { user } = useAuth();
  const { money } = useSettings();
  const { toast } = useUI();
  const { groups, createExpense, updateExpense } = useData();
  const navigate = useNavigate();

  const initialGroup = editing ? editing.groupId : groups.find((g) => g.id === presetGroup)?.id || groups[0].id;
  const [groupId, setGroupId] = useState(initialGroup);
  const group = groups.find((g) => g.id === groupId);
  const meId = group.members.find((m) => m.userId === user.id)?.id;

  const initialValues = () => {
    if (!editing) return {};
    const v = {};
    editing.splits.forEach((s) => (v[s.memberId] = String(editing.splitType === "percentage" ? s.percent : s.amount)));
    return v;
  };

  const [description, setDescription] = useState(editing?.description || "");
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [category, setCategory] = useState(editing?.category || "food");
  const [date, setDate] = useState(editing?.date || todayISO());
  const [paidBy, setPaidBy] = useState(editing?.paidBy || meId);
  const [splitType, setSplitType] = useState(editing?.splitType || "equal");
  const [selected, setSelected] = useState(() => new Set(editing ? editing.splits.map((s) => s.memberId) : group.members.map((m) => m.id)));
  const [values, setValues] = useState(initialValues);
  const [notes, setNotes] = useState(editing?.notes || "");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const clear = (k) => setErrors((e) => (e[k] || e.split ? { ...e, [k]: undefined, ...(k === "amount" ? { split: undefined } : {}) } : e));

  const changeGroup = (id) => {
    const g = groups.find((x) => x.id === id);
    setGroupId(id);
    setPaidBy(g.members.find((m) => m.userId === user.id)?.id);
    setSelected(new Set(g.members.map((m) => m.id)));
    setValues({});
    setErrors({});
  };

  const toggle = (id) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setErrors((e) => ({ ...e, split: undefined }));
  };

  const memberIds = group.members.filter((m) => selected.has(m.id)).map((m) => m.id);
  const amt = Number(amount);

  // live preview of the split
  const preview = useMemo(() => {
    if (!(amt > 0)) return null;
    return computeSplits({ type: splitType, amount: amt, memberIds, values });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amt, splitType, memberIds.join(","), values]);

  const sumValues = memberIds.reduce((s, id) => s + (Number(values[id]) || 0), 0);
  const target = splitType === "percentage" ? 100 : amt || 0;
  const remaining = Math.round((target - sumValues) * 100) / 100;

  const fillEvenly = () => {
    if (!(amt > 0) || !memberIds.length) return;
    const n = memberIds.length;
    const v = {};
    if (splitType === "percentage") {
      const base = Math.floor((100 / n) * 100) / 100;
      memberIds.forEach((id, i) => (v[id] = String(i === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base)));
    } else {
      const r = computeSplits({ type: "equal", amount: amt, memberIds });
      r.splits?.forEach((s) => (v[s.memberId] = String(s.amount)));
    }
    setValues(v);
    setErrors((e) => ({ ...e, split: undefined }));
  };

  const validate = () => {
    const e = {};
    if (description.trim().length < 2) e.description = "Enter a description (at least 2 characters)";
    if (!amount) e.amount = "Enter the amount";
    else if (!(amt > 0)) e.amount = "Amount must be greater than 0";
    else if (toCents(amt) !== Math.round(amt * 100) || Math.abs(amt * 100 - Math.round(amt * 100)) > 1e-6) e.amount = "Use at most 2 decimal places";
    if (!date) e.date = "Pick a date";
    if (!paidBy) e.paidBy = "Choose who paid";
    if (!memberIds.length) e.split = "Select at least one person to split with";
    else if (amt > 0 && preview?.error) e.split = preview.error;
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return toast.error(Object.values(e)[0]);

    const payload = { groupId, description: description.trim(), amount: amt, category, date, paidBy, splitType, memberIds, values, notes: notes.trim() };
    setBusy(true);
    try {
      if (editing) await updateExpense(editing.id, payload);
      else await createExpense(payload);
      toast.success(editing ? "Expense updated" : "Expense added");
      navigate(`/groups/${groupId}`);
    } catch (err) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const shareFor = (id) => preview?.splits?.find((s) => s.memberId === id)?.amount;

  return (
    <div className="narrow stack-lg">
      <PageHeader title={editing ? "Edit expense" : "Add expense"} subtitle={editing ? "Changes recalculate every balance in the group." : "Record who paid and how it should be split."} />

      <form className="card form-card" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Group" htmlFor="x-group" error={errors.groupId}>
            <select id="x-group" value={groupId} onChange={(e) => changeGroup(e.target.value)} disabled={Boolean(editing)}>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Date" htmlFor="x-date" error={errors.date}>
            <input id="x-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); clear("date"); }} />
          </Field>
        </div>

        <Field label="Description" htmlFor="x-desc" error={errors.description}>
          <input id="x-desc" value={description} maxLength={80} onChange={(e) => { setDescription(e.target.value); clear("description"); }} placeholder="e.g. Dinner at Beach Shack" />
        </Field>

        <div className="form-grid">
          <Field label="Amount" htmlFor="x-amt" error={errors.amount}>
            <input id="x-amt" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => { setAmount(e.target.value); clear("amount"); }} placeholder="0.00" />
          </Field>
          <Field label="Category" htmlFor="x-cat" error={errors.category}>
            <select id="x-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Paid by" htmlFor="x-paid" error={errors.paidBy}>
          <select id="x-paid" value={paidBy} onChange={(e) => { setPaidBy(e.target.value); clear("paidBy"); }}>
            {group.members.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === meId ? " (you)" : ""}</option>)}
          </select>
        </Field>

        <fieldset className="split-box">
          <legend>Split</legend>
          <div className="segmented" role="radiogroup" aria-label="Split type">
            {SPLITS.map((s) => (
              <button type="button" key={s.id} role="radio" aria-checked={splitType === s.id} className={splitType === s.id ? "active" : ""} onClick={() => { setSplitType(s.id); setValues({}); setErrors((e) => ({ ...e, split: undefined })); }}>
                {s.label}
              </button>
            ))}
          </div>

          <ul className="split-members">
            {group.members.map((m) => {
              const on = selected.has(m.id);
              const share = on ? shareFor(m.id) : undefined;
              return (
                <li key={m.id} className={on ? "" : "off"}>
                  <label className="check">
                    <input type="checkbox" checked={on} onChange={() => toggle(m.id)} />
                    <span>{m.name}{m.id === meId ? " (you)" : ""}</span>
                  </label>
                  {splitType !== "equal" && on && (
                    <div className="split-input">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        aria-label={`${m.name} ${splitType === "percentage" ? "percent" : "amount"}`}
                        value={values[m.id] ?? ""}
                        onChange={(e) => { setValues((v) => ({ ...v, [m.id]: e.target.value })); setErrors((x) => ({ ...x, split: undefined })); }}
                        placeholder="0"
                      />
                      <span className="muted">{splitType === "percentage" ? "%" : ""}</span>
                    </div>
                  )}
                  <span className="split-share">{share !== undefined ? money(share) : on ? "—" : ""}</span>
                </li>
              );
            })}
          </ul>

          {splitType !== "equal" && (
            <div className="split-summary">
              <span className={remaining === 0 && amt > 0 ? "ok" : remaining < 0 ? "bad" : ""}>
                {amt > 0
                  ? remaining === 0
                    ? "✓ Fully allocated"
                    : remaining > 0
                      ? `${splitType === "percentage" ? `${remaining}%` : money(remaining)} left to allocate`
                      : `${splitType === "percentage" ? `${-remaining}%` : money(-remaining)} over`
                  : "Enter the amount first"}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={fillEvenly}>Fill evenly</button>
            </div>
          )}
          {errors.split && <div className="field-error" role="alert">{errors.split}</div>}
        </fieldset>

        <Field label="Notes (optional)" htmlFor="x-notes" error={errors.notes}>
          <textarea id="x-notes" rows={2} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" />
        </Field>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add expense"}</button>
        </div>
      </form>
    </div>
  );
}
