import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useUI } from "../context/hooks.js";
import { Field } from "../components/ui.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import logo from "../assets/logo.png";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** One form component powers both Login and Register. */
export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const { user, login, register } = useAuth();
  const { toast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (isRegister && form.name.trim().length < 2) e.name = "Enter your name (at least 2 characters)";
    if (!EMAIL_RE.test(form.email.trim())) e.email = "Enter a valid email address";
    if (isRegister ? form.password.length < 6 : !form.password) e.password = isRegister ? "Use at least 6 characters" : "Enter your password";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const u = await (isRegister ? register(form) : login(form));
      toast.success(isRegister ? `Welcome, ${u.name}! Your account is ready.` : `Welcome back, ${u.name}!`);
      navigate(location.state?.from || "/home", { replace: true });
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-top">
        <Link to="/" className="brand"><img src={logo} alt="NotreShare" className="brand-logo" /><span className="brand-name">NotreShare</span></Link>
        <ThemeToggle />
      </div>
      <form className="card auth-card" onSubmit={submit} noValidate>
        <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
        <p className="muted">{isRegister ? "Start splitting expenses in under a minute." : "Log in to see your groups and balances."}</p>

        {isRegister && (
          <Field label="Name" error={errors.name} htmlFor="name">
            <input id="name" value={form.name} onChange={set("name")} autoComplete="name" placeholder="Your name" />
          </Field>
        )}
        <Field label="Email" error={errors.email} htmlFor="email">
          <input id="email" type="email" value={form.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" />
        </Field>
        <Field label="Password" error={errors.password} htmlFor="password">
          <div className="input-group">
            <input id="password" type={show ? "text" : "password"} value={form.password} onChange={set("password")} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={isRegister ? "At least 6 characters" : "Your password"} />
            <button type="button" className="input-addon" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
          </div>
        </Field>

        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Please wait…" : isRegister ? "Create account" : "Log in"}</button>

        <p className="auth-switch muted">
          {isRegister ? <>Already have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}
        </p>
      </form>
    </div>
  );
}
