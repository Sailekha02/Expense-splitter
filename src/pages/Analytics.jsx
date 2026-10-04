import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { categoryTotals, myMember } from "../../shared/calc.js";
import { useAuth, useData, useSettings } from "../context/hooks.js";
import { EmptyState, PageHeader, Spinner, StatCard } from "../components/ui.jsx";
import { BarChart, DonutChart, HBars, Legend } from "../components/Charts.jsx";
import { monthlyTotals, shareOf } from "../utils/analytics.js";
import { formatDate } from "../utils/format.js";

const PERIODS = [
  { id: "all", label: "All time" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 3 months" },
  { id: "365", label: "Last 12 months" },
];

export default function Analytics() {
  const { user } = useAuth();
  const { money } = useSettings();
  const { expenses, groups, groupsById, loading } = useData();
  const [groupId, setGroupId] = useState("all");
  const [period, setPeriod] = useState("all");

  const myId = (e) => myMember(groupsById[e.groupId], user.id)?.id;

  const scoped = useMemo(() => {
    const cutoff = period === "all" ? null : new Date(Date.now() - Number(period) * 864e5).toISOString().slice(0, 10);
    return expenses.filter((e) => (groupId === "all" || e.groupId === groupId) && (!cutoff || e.date >= cutoff));
  }, [expenses, groupId, period]);

  const mine = useMemo(() => scoped.map((e) => ({ e, share: shareOf(e, myId(e)) })).filter((x) => x.share > 0), [scoped, groupsById, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalShare = mine.reduce((s, x) => s + x.share, 0);
  const categories = useMemo(() => categoryTotals(scoped, myId), [scoped, groupsById, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthly = useMemo(() => monthlyTotals(scoped, (e) => shareOf(e, myId(e)), 6), [scoped, groupsById, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const byGroup = useMemo(() => {
    const t = {};
    mine.forEach(({ e, share }) => (t[e.groupId] = (t[e.groupId] || 0) + share));
    return Object.entries(t).map(([id, value]) => ({ label: groupsById[id]?.name || "?", value })).sort((a, b) => b.value - a.value);
  }, [mine, groupsById]);
  const biggest = [...mine].sort((a, b) => b.share - a.share).slice(0, 5);

  if (loading && !expenses.length) return <Spinner />;

  return (
    <div className="stack-lg">
      <PageHeader title="Analytics" subtitle="Where your money goes (based on your share of each expense).">
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} aria-label="Group">
          <option value="all">All groups</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Period">
          {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </PageHeader>

      {mine.length === 0 ? (
        <div className="card">
          <EmptyState icon="📊" title="Nothing to chart yet" action={<Link to="/add-expense" className="btn btn-primary">Add an expense</Link>}>
            Charts appear once you have expenses in the selected range.
          </EmptyState>
        </div>
      ) : (
        <>
          <section className="grid-4">
            <StatCard icon="💳" label="Your spending" value={money(totalShare)} />
            <StatCard icon="🧾" label="Expenses" value={mine.length} hint="that include you" />
            <StatCard icon="📏" label="Average share" value={money(totalShare / mine.length)} />
            <StatCard icon="🏆" label="Top category" value={categories[0] ? `${categories[0].icon} ${categories[0].label}` : "—"} hint={categories[0] && money(categories[0].value)} />
          </section>

          <section className="grid-2">
            <div className="card">
              <div className="card-head"><h3>By category</h3></div>
              <div className="donut-row"><DonutChart data={categories} centerValue={money(totalShare)} centerLabel="total" /><Legend data={categories} /></div>
            </div>
            <div className="card">
              <div className="card-head"><h3>Monthly trend</h3></div>
              <BarChart data={monthly} />
            </div>
            <div className="card">
              <div className="card-head"><h3>By group</h3></div>
              <HBars data={byGroup} />
            </div>
            <div className="card">
              <div className="card-head"><h3>Biggest shares</h3></div>
              <ul className="balance-list">
                {biggest.map(({ e, share }) => (
                  <li key={e.id}>
                    <div><strong>{e.description}</strong><div className="muted small">{formatDate(e.date)} · {groupsById[e.groupId]?.name}</div></div>
                    <span className="amt">{money(share)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
