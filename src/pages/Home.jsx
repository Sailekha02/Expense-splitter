import { useMemo } from "react";
import { Link } from "react-router-dom";
import { categoryTotals, myMember } from "../../shared/calc.js";
import { useAuth, useData, useSettings } from "../context/hooks.js";
import { StatCard, EmptyState, Spinner } from "../components/ui.jsx";
import { DonutChart, Legend, BarChart } from "../components/Charts.jsx";
import ExpenseList from "../components/ExpenseList.jsx";
import { memberName } from "../utils/format.js";
import { monthlyTotals, shareOf, sortRecent } from "../utils/analytics.js";

export default function Home() {
  const { user } = useAuth();
  const { money } = useSettings();
  const { groups, expenses, groupsById, summary, loading } = useData();

  const myId = (e) => myMember(groupsById[e.groupId], user.id)?.id;
  const categories = useMemo(() => categoryTotals(expenses, myId), [expenses, groupsById, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthly = useMemo(() => monthlyTotals(expenses, (e) => shareOf(e, myId(e)), 6), [expenses, groupsById, user.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const recent = useMemo(() => sortRecent(expenses).slice(0, 5), [expenses]);

  // Payments that involve me, across every group
  const myBalances = useMemo(() => {
    const out = [];
    groups.forEach((g) => {
      const me = myMember(g, user.id);
      (summary.perGroup[g.id]?.suggestions || []).forEach((s) => {
        if (s.from === me?.id) out.push({ group: g, dir: "owe", other: memberName(g, s.to), amount: s.amount });
        else if (s.to === me?.id) out.push({ group: g, dir: "get", other: memberName(g, s.from), amount: s.amount });
      });
    });
    return out;
  }, [groups, summary, user.id]);

  const activeGroups = useMemo(() => {
    const last = {};
    expenses.forEach((e) => (last[e.groupId] = Math.max(last[e.groupId] || 0, Date.parse(e.createdAt))));
    return [...groups].sort((a, b) => (last[b.id] || Date.parse(b.createdAt)) - (last[a.id] || Date.parse(a.createdAt)));
  }, [groups, expenses]);

  if (loading) return <Spinner label="Loading your dashboard…" />;
  const firstName = user.name.split(" ")[0];
  const net = summary.receivable - summary.owed;

  return (
    <div className="stack-lg">
      <section className="hero">
        <div className="hero-text">
          <span className="pill">Hi {firstName} 👋</span>
          <h1>Split expenses, not friendships.</h1>
          <p>
            NotreShare keeps track of who paid, who owes and who’s settled up, so trips, flats and dinners
            stay fair without the awkward maths.
          </p>
          <div className="hero-actions">
            <Link to="/groups?new=1" className="btn btn-light">＋ Create Group</Link>
            <Link to="/add-expense" className="btn btn-hero-outline">＋ Add Expense</Link>
          </div>
        </div>
        <div className="hero-balance">
          <span>Your net balance</span>
          <strong>{net === 0 ? money(0) : `${net > 0 ? "+" : "−"}${money(Math.abs(net))}`}</strong>
          <small>{net > 0 ? "You are owed overall" : net < 0 ? "You owe overall" : "You're all settled up"}</small>
        </div>
      </section>

      <section className="grid-4">
        <StatCard icon="💳" label="Total spending" value={money(summary.spending)} hint="Your share of all expenses" />
        <StatCard icon="💸" label="Amount paid" value={money(summary.paid)} hint="Cash you've put down" tone="info" />
        <StatCard icon="📤" label="Amount owed" value={money(summary.owed)} hint="You still need to pay" tone="negative" />
        <StatCard icon="📥" label="To receive" value={money(summary.receivable)} hint="Others still owe you" tone="positive" />
      </section>

      {groups.length === 0 ? (
        <section className="card">
          <EmptyState icon="🚀" title="Let’s get you started" action={<Link to="/groups?new=1" className="btn btn-primary">Create your first group</Link>}>
            Create a group, add the people you share costs with, then log your first expense. Your dashboard will fill up with balances and charts.
          </EmptyState>
        </section>
      ) : (
        <>
          <section className="grid-2">
            <div className="card">
              <div className="card-head"><h3>Spending by category</h3></div>
              {categories.length ? (
                <div className="donut-row">
                  <DonutChart data={categories} centerValue={money(summary.spending)} centerLabel="your share" />
                  <Legend data={categories} />
                </div>
              ) : (
                <EmptyState icon="🥧" title="No spending yet">Add an expense to see your category breakdown.</EmptyState>
              )}
            </div>
            <div className="card">
              <div className="card-head"><h3>Last 6 months</h3><Link to="/analytics" className="link-sm">Full analytics →</Link></div>
              <BarChart data={monthly} />
            </div>
          </section>

          <section className="grid-2">
            <div className="card">
              <div className="card-head"><h3>Current balances</h3></div>
              {myBalances.length ? (
                <ul className="balance-list">
                  {myBalances.map((b, i) => (
                    <li key={i}>
                      <div>
                        <strong>{b.dir === "owe" ? `You owe ${b.other}` : `${b.other} owes you`}</strong>
                        <div className="muted small"><Link to={`/groups/${b.group.id}`}>{b.group.name}</Link></div>
                      </div>
                      <span className={`amt ${b.dir === "owe" ? "neg" : "pos"}`}>{money(b.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="🎉" title="All settled up">Nobody owes anything right now.</EmptyState>
              )}
            </div>

            <div className="card">
              <div className="card-head"><h3>Recent expenses</h3><Link to="/expenses" className="link-sm">View all →</Link></div>
              {recent.length ? (
                <ExpenseList expenses={recent} groupsById={groupsById} compact />
              ) : (
                <EmptyState icon="🧾" title="No expenses yet" action={<Link to="/add-expense" className="btn btn-primary btn-sm">Add expense</Link>} />
              )}
            </div>
          </section>

          <section>
            <div className="section-head"><h2>Active groups</h2><Link to="/groups" className="link-sm">Manage groups →</Link></div>
            <div className="grid-3">
              {activeGroups.slice(0, 6).map((g) => {
                const s = summary.perGroup[g.id];
                return (
                  <Link key={g.id} to={`/groups/${g.id}`} className="card group-card">
                    <div className="group-card-top">
                      <h3>{g.name}</h3>
                      <span className="pill">{g.members.length} members</span>
                    </div>
                    <div className="muted small">{s.count} expenses · {money(s.total)} total</div>
                    <div className={`group-balance ${s.myNet > 0 ? "pos" : s.myNet < 0 ? "neg" : ""}`}>
                      {s.myNet > 0 ? `You get ${money(s.myNet)}` : s.myNet < 0 ? `You owe ${money(-s.myNet)}` : "Settled up"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
