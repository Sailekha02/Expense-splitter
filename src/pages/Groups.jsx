import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useData, useSettings } from "../context/hooks.js";
import { EmptyState, PageHeader, Spinner, Avatar } from "../components/ui.jsx";
import CreateGroupModal from "./CreateGroupModal.jsx";

export default function Groups() {
  const { groups, summary, loading } = useData();
  const { money } = useSettings();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(params.get("new") === "1");

  const close = () => {
    setShowCreate(false);
    if (params.has("new")) setParams({}, { replace: true });
  };

  if (loading) return <Spinner />;

  return (
    <div className="stack-lg">
      <PageHeader title="Groups" subtitle="Trips, flats, friends: every shared budget lives in a group.">
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>＋ Create Group</button>
      </PageHeader>

      {groups.length === 0 ? (
        <div className="card">
          <EmptyState icon="👥" title="No groups yet" action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create your first group</button>}>
            Groups hold the members and expenses you share.
          </EmptyState>
        </div>
      ) : (
        <div className="grid-3">
          {groups.map((g) => {
            const s = summary.perGroup[g.id];
            return (
              <Link key={g.id} to={`/groups/${g.id}`} className="card group-card">
                <div className="group-card-top">
                  <h3>{g.name}</h3>
                </div>
                {g.description && <p className="muted small clamp">{g.description}</p>}
                <div className="avatar-row">
                  {g.members.slice(0, 5).map((m) => <Avatar key={m.id} name={m.name} size={28} />)}
                  {g.members.length > 5 && <span className="muted small">+{g.members.length - 5}</span>}
                </div>
                <div className="muted small">{s.count} expenses · {money(s.total)} total</div>
                <div className={`group-balance ${s.myNet > 0 ? "pos" : s.myNet < 0 ? "neg" : ""}`}>
                  {s.myNet > 0 ? `You get ${money(s.myNet)}` : s.myNet < 0 ? `You owe ${money(-s.myNet)}` : "Settled up"}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={close} onCreated={(g) => { close(); navigate(`/groups/${g.id}`); }} />}
    </div>
  );
}
