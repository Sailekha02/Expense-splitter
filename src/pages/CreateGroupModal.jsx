import { useState } from "react";
import Modal from "../components/Modal.jsx";
import { Field } from "../components/ui.jsx";
import { useAuth, useData, useUI } from "../context/hooks.js";

export default function CreateGroupModal({ onClose, onCreated }) {
  const { user } = useAuth();
  const { createGroup } = useData();
  const { toast } = useUI();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const addMember = () => {
    const n = memberInput.trim();
    if (!n) return;
    const all = [user.name, ...members].map((x) => x.toLowerCase());
    if (all.includes(n.toLowerCase())) return setErrors((e) => ({ ...e, members: `"${n}" is already added` }));
    if (n.length > 40) return setErrors((e) => ({ ...e, members: "Names can be up to 40 characters" }));
    setMembers((m) => [...m, n]);
    setMemberInput("");
    setErrors((e) => ({ ...e, members: undefined }));
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 50) return setErrors({ name: "Group name must be 2–50 characters" });
    // include a name that was typed but not yet added
    const pending = memberInput.trim();
    const finalMembers = pending && !members.some((m) => m.toLowerCase() === pending.toLowerCase()) ? [...members, pending] : members;
    setBusy(true);
    try {
      const g = await createGroup({ name: trimmed, description: description.trim(), members: finalMembers });
      toast.success(`Group "${g.name}" created`);
      onCreated?.(g);
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : {});
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Create a group" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <Field label="Group name" error={errors.name} htmlFor="g-name">
          <input id="g-name" value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: undefined })); }} placeholder="e.g. Goa Trip, Flat 4B" maxLength={50} />
        </Field>
        <Field label="Description (optional)" error={errors.description} htmlFor="g-desc">
          <input id="g-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group for?" maxLength={200} />
        </Field>
        <Field label="Add members" error={errors.members} hint={`You (${user.name}) are added automatically. Press Enter to add each person.`} htmlFor="g-member">
          <div className="input-group">
            <input
              id="g-member"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addMember();
                }
              }}
              placeholder="Member name"
            />
            <button type="button" className="input-addon" onClick={addMember}>Add</button>
          </div>
        </Field>
        {members.length > 0 && (
          <div className="chips">
            {members.map((m) => (
              <span className="chip" key={m}>
                {m}
                <button type="button" onClick={() => setMembers((x) => x.filter((y) => y !== m))} aria-label={`Remove ${m}`}>×</button>
              </span>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? "Creating…" : "Create group"}</button>
        </div>
      </form>
    </Modal>
  );
}
