import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useData, useSettings, useUI } from "../context/hooks.js";
import { Avatar, Field, PageHeader } from "../components/ui.jsx";
import { CURRENCIES } from "../utils/format.js";
import { exportJSON } from "../utils/exporters.js";

const THEMES = [
  { id: "light", label: "☀️ Light" },
  { id: "dark", label: "🌙 Dark" },
  { id: "system", label: "💻 System" },
];

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, setTheme } = useSettings();
  const { toast, confirm } = useUI();
  const { groups, expenses, settlements, clearCache, refresh } = useData();
  const navigate = useNavigate();

  const [name, setName] = useState(user.name);
  const [currency, setCurrency] = useState(user.currency);
  const [profileErr, setProfileErr] = useState({});
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwErr, setPwErr] = useState({});

  const saveProfile = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return setProfileErr({ name: "Name must be at least 2 characters" });
    try {
      await updateProfile({ name, currency });
      setProfileErr({});
      toast.success("Profile saved");
    } catch (err) {
      setProfileErr(err.fields || {});
      toast.error(err.message);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.currentPassword) errs.currentPassword = "Enter your current password";
    if (pw.newPassword.length < 6) errs.newPassword = "Use at least 6 characters";
    if (pw.newPassword !== pw.confirm) errs.confirm = "Passwords don't match";
    setPwErr(errs);
    if (Object.keys(errs).length) return;
    try {
      await updateProfile({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password updated");
    } catch (err) {
      setPwErr(err.fields || {});
      toast.error(err.message);
    }
  };

  const resetCache = async () => {
    if (!(await confirm({ title: "Clear saved copy?", message: "This only clears the offline copy in this browser. Your data on the server is untouched and will be reloaded.", confirmLabel: "Clear & reload", danger: false }))) return;
    clearCache();
    await refresh();
    toast.success("Local copy refreshed from the server");
  };

  return (
    <div className="narrow stack-lg">
      <PageHeader title="Profile & settings" />

      <section className="card">
        <div className="profile-head">
          <Avatar name={user.name} size={56} />
          <div><h3>{user.name}</h3><span className="muted">{user.email}</span></div>
        </div>
        <form onSubmit={saveProfile} noValidate>
          <Field label="Name" error={profileErr.name} htmlFor="p-name"><input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} /></Field>
          <Field label="Email" hint="Email can't be changed." htmlFor="p-email"><input id="p-email" value={user.email} disabled /></Field>
          <Field label="Currency" error={profileErr.currency} htmlFor="p-cur">
            <select id="p-cur" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <button className="btn btn-primary" disabled={name === user.name && currency === user.currency}>Save changes</button>
        </form>
      </section>

      <section className="card">
        <h3>Appearance</h3>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button key={t.id} role="radio" aria-checked={theme === t.id} className={theme === t.id ? "active" : ""} onClick={() => setTheme(t.id)}>{t.label}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Change password</h3>
        <form onSubmit={savePassword} noValidate>
          <Field label="Current password" error={pwErr.currentPassword} htmlFor="pw0"><input id="pw0" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
          <div className="form-grid">
            <Field label="New password" error={pwErr.newPassword} htmlFor="pw1"><input id="pw1" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
            <Field label="Confirm new password" error={pwErr.confirm} htmlFor="pw2"><input id="pw2" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
          </div>
          <button className="btn btn-outline">Update password</button>
        </form>
      </section>

      <section className="card">
        <h3>Your data</h3>
        <p className="muted">Your data is stored on the server and a copy is cached in this browser (localStorage) so the app opens instantly.</p>
        <div className="row-gap wrap">
          <button className="btn btn-outline" onClick={() => { exportJSON({ user: { name: user.name, email: user.email }, groups, expenses, settlements }); toast.success("Backup downloaded"); }}>⬇ Download backup (JSON)</button>
          <button className="btn btn-outline" onClick={resetCache}>Refresh local copy</button>
        </div>
      </section>

      <section className="card">
        <button className="btn btn-outline-danger" onClick={() => { logout(); navigate("/login"); toast.info("You've been logged out"); }}>Log out</button>
      </section>
    </div>
  );
}
