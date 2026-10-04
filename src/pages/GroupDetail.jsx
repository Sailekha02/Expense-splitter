import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { categoryTotals, fromCents } from "../../shared/calc.js";
import { useAuth, useData, useSettings, useUI } from "../context/hooks.js";
import { Avatar, EmptyState, Field, PageHeader, Spinner, StatCard } from "../components/ui.jsx";
import { DonutChart, HBars, Legend } from "../components/Charts.jsx";
import ExpenseList from "../components/ExpenseList.jsx";
import Modal from "../components/Modal.jsx";
import { formatDate, memberName, todayISO } from "../utils/format.js";
import { sortRecent } from "../utils/analytics.js";

const TABS = ["Expenses", "Balances", "Members", "Insights"];

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { money } = useSettings();
  const { toast, confirm } = useUI();
  const data = useData();
  const { groupsById, expenses, settlements, summary, loading } = data;
  const group = groupsById[id];

  const [tab, setTab] = useState("Expenses");
  const [settleFor, setSettleFor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newMember, setNewMember] = useState("");
  const [memberError, setMemberError] = useState("");

  const gExpenses = useMemo(() => sortRecent(expenses.filter((e) => e.groupId === id)), [expenses, id]);
  const gSettlements = useMemo(() => settlements.filter((s) => s.groupId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [settlements, id]);

  if (loading && !group) return <Spinner />;
  if (!group)
    return (
      <div className="card">
        <EmptyState icon="🔍" title="Group not found" action={<Link className="btn btn-primary" to="/groups">Back to groups</Link>}>
          It may have been deleted.
        </EmptyState>
      </div>
    );

  const me = group.members.find((m) => m.userId === user.id);
  const stats = summary.perGroup[id];
  const net = stats.net; // cents per member
  const myPaid = gExpenses.filter((e) => e.paidBy === me.id).reduce((s, e) => s + e.amount, 0);
  const myShare = gExpenses.reduce((s, e) => s + (e.splits.find((x) => x.memberId === me.id)?.amount || 0), 0);

  const act = async (fn, okMsg) => {
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    const n = newMember.trim();
    if (!n) return setMemberError("Enter a name");
    if (group.members.some((m) => m.name.toLowerCase() === n.toLowerCase())) return setMemberError(`"${n}" is already in this group`);
    setMemberError("");
    if (await act(() => data.addMember(id, n), `${n} added`)) setNewMember("");
  };

  const removeMember = async (m) => {
    if (await confirm({ title: `Remove ${m.name}?`, message: "They'll be removed from this group.", confirmLabel: "Remove" }))
      act(() => data.removeMember(id, m.id), `${m.name} removed`);
  };

  const deleteGroup = async () => {
    if (await confirm({ title: "Delete this group?", message: `"${group.name}" and all of its expenses and payments will be permanently deleted.`, confirmLabel: "Delete group" })) {
      if (await act(() => data.deleteGroup(id), "Group deleted")) navigate("/groups");
    }
  };

  const deleteExpense = async (e) => {
    if (await confirm({ title: "Delete expense?", message: `"${e.description}" (${money(e.amount)}) will be removed and balances recalculated.` }))
      act(() => data.deleteExpense(e.id), "Expense deleted");
  };

  const undoPayment = async (s) => {
    if (await confirm({ title: "Undo this payment?", message: "It will be removed and the balance will be owed again.", confirmLabel: "Undo payment" }))
      act(() => data.deleteSettlement(s.id), "Payment removed");
  };

  const catData = categoryTotals(gExpenses);
  const total = stats.total;
  const paidBy = group.members
    .map((m) => ({ label: m.name, value: gExpenses.filter((e) => e.paidBy === m.id).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div className="stack-lg">
      <PageHeader title={group.name} subtitle={group.description || `${group.members.length} members`}>
        <Link to={`/add-expense?group=${id}`} className="btn btn-primary">＋ Add Expense</Link>
        <button className="btn btn-outline" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn btn-outline-danger" onClick={deleteGroup}>Delete</button>
      </PageHeader>

      <section className="grid-4">
        <StatCard icon="🧾" label="Group total" value={money(total)} hint={`${stats.count} expenses`} />
        <StatCard icon="💳" label="Your share" value={money(myShare)} />
        <StatCard icon="💸" label="You paid" value={money(myPaid)} tone="info" />
        <StatCard icon="⚖️" label="Your balance" value={stats.myNet === 0 ? "Settled up" : money(Math.abs(stats.myNet))} hint={stats.myNet > 0 ? "You are owed" : stats.myNet < 0 ? "You owe" : "Nothing pending"} tone={stats.myNet > 0 ? "positive" : stats.myNet < 0 ? "negative" : "neutral"} />
      </section>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "Expenses" && (
        <div className="card">
          {gExpenses.length ? (
            <ExpenseList expenses={gExpenses} groupsById={groupsById} showGroup={false} onDelete={deleteExpense} />
          ) : (
            <EmptyState icon="🧾" title="No expenses yet" action={<Link to={`/add-expense?group=${id}`} className="btn btn-primary">Add the first expense</Link>}>
              Log what was paid and who it should be split with.
            </EmptyState>
          )}
        </div>
      )}

      {tab === "Balances" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head"><h3>Who owes whom</h3></div>
            {stats.suggestions.length ? (
              <ul className="balance-list">
                {stats.suggestions.map((s) => (
                  <li key={`${s.from}-${s.to}`}>
                    <div className="settle-row">
                      <Avatar name={memberName(group, s.from)} size={32} />
                      <div>
                        <strong>{s.from === me.id ? "You" : memberName(group, s.from)}</strong> {s.from === me.id ? "owe" : "owes"}{" "}
                        <strong>{s.to === me.id ? "you" : memberName(group, s.to)}</strong>
                        <div className="amt neg">{money(s.amount)}</div>
                      </div>
                    </div>
                    <button className="btn btn-success btn-sm" onClick={() => setSettleFor(s)}>Mark as paid</button>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon="🎉" title="Everyone is settled up">No payments needed right now.</EmptyState>
            )}
          </div>

          <div className="card">
            <div className="card-head"><h3>Member balances</h3></div>
            <ul className="balance-list">
              {group.members.map((m) => {
                const v = fromCents(net[m.id] || 0);
                return (
                  <li key={m.id}>
                    <div className="settle-row"><Avatar name={m.name} size={32} /><strong>{m.name}{m.id === me.id ? " (you)" : ""}</strong></div>
                    <span className={`amt ${v > 0 ? "pos" : v < 0 ? "neg" : ""}`}>{v > 0 ? `gets ${money(v)}` : v < 0 ? `owes ${money(-v)}` : "settled"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card span-2">
            <div className="card-head"><h3>Payment history</h3></div>
            {gSettlements.length ? (
              <ul className="balance-list">
                {gSettlements.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{memberName(group, s.from)}</strong> paid <strong>{memberName(group, s.to)}</strong>
                      <div className="muted small">{formatDate(s.date)}{s.note ? ` · ${s.note}` : ""}</div>
                    </div>
                    <div className="row-gap">
                      <span className="amt pos">{money(s.amount)}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => undoPayment(s)}>Undo</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No payments recorded yet. Use “Mark as paid” when someone settles up.</p>
            )}
          </div>
        </div>
      )}

      {tab === "Members" && (
        <div className="card">
          <div className="card-head"><h3>Members ({group.members.length})</h3></div>
          <ul className="member-list">
            {group.members.map((m) => (
              <li key={m.id}>
                <Avatar name={m.name} />
                <span>{m.name}{m.userId ? <span className="pill">You</span> : null}</span>
                {!m.userId && <button className="btn btn-ghost btn-sm" onClick={() => removeMember(m)}>Remove</button>}
              </li>
            ))}
          </ul>
          <form onSubmit={addMember} className="add-member" noValidate>
            <Field error={memberError} label="Add a member">
              <div className="input-group">
                <input value={newMember} onChange={(e) => { setNewMember(e.target.value); setMemberError(""); }} placeholder="Name" maxLength={40} />
                <button className="input-addon">Add</button>
              </div>
            </Field>
          </form>
        </div>
      )}

      {tab === "Insights" && (
        <div className="grid-2">
          <div className="card">
            <div className="card-head"><h3>By category</h3></div>
            {catData.length ? (
              <div className="donut-row"><DonutChart data={catData} centerValue={money(total)} centerLabel="group total" /><Legend data={catData} /></div>
            ) : <p className="muted">No data yet.</p>}
          </div>
          <div className="card">
            <div className="card-head"><h3>Who paid the most</h3></div>
            {paidBy.length ? <HBars data={paidBy} /> : <p className="muted">No data yet.</p>}
          </div>
        </div>
      )}

      {settleFor && <SettleModal group={group} suggestion={settleFor} onClose={() => setSettleFor(null)} />}
      {editing && <EditGroupModal group={group} onClose={() => setEditing(false)} />}
    </div>
  );
}

function SettleModal({ group, suggestion, onClose }) {
  const { createSettlement } = useData();
  const { toast } = useUI();
  const { money } = useSettings();
  const [amount, setAmount] = useState(String(suggestion.amount));
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setError("Enter an amount greater than 0");
    if (n > suggestion.amount + 0.001) return setError(`That's more than the ${money(suggestion.amount)} owed`);
    setBusy(true);
    try {
      await createSettlement({ groupId: group.id, from: suggestion.from, to: suggestion.to, amount: n, date, note });
      toast.success("Payment recorded. Balances updated.");
      onClose();
    } catch (err) {
      setError(err.fields?.amount || err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Mark as paid" onClose={onClose} small>
      <form onSubmit={submit} noValidate>
        <p><strong>{memberName(group, suggestion.from)}</strong> paid <strong>{memberName(group, suggestion.to)}</strong></p>
        <Field label="Amount" error={error} hint="Enter a smaller amount for a part-payment." htmlFor="s-amt">
          <input id="s-amt" type="number" step="0.01" min="0" value={amount} onChange={(e) => { setAmount(e.target.value); setError(""); }} />
        </Field>
        <Field label="Date" htmlFor="s-date"><input id="s-date" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Note (optional)" htmlFor="s-note"><input id="s-note" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="e.g. UPI, cash" /></Field>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" disabled={busy}>{busy ? "Saving…" : "Confirm payment"}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditGroupModal({ group, onClose }) {
  const { updateGroup } = useData();
  const { toast } = useUI();
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Group name must be 2–50 characters");
    try {
      await updateGroup(group.id, { name, description });
      toast.success("Group updated");
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Edit group" onClose={onClose} small>
      <form onSubmit={submit} noValidate>
        <Field label="Name" error={error}><input value={name} maxLength={50} onChange={(e) => { setName(e.target.value); setError(""); }} /></Field>
        <Field label="Description"><input value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
