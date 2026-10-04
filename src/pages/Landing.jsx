import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/hooks.js";
import ThemeToggle from "../components/ThemeToggle.jsx";
import logo from "../assets/logo.png";

const FEATURES = [
  { icon: "👥", title: "Groups & members", text: "Create a group for a trip, flat or friends and add everyone in seconds." },
  { icon: "⚖️", title: "Flexible splitting", text: "Split equally, by percentage, or by exact amounts, with live validation." },
  { icon: "✅", title: "Settle up", text: "See who owes whom and mark payments as paid to keep balances accurate." },
  { icon: "📊", title: "Charts & insights", text: "Category and monthly breakdowns show where your money really goes." },
  { icon: "🔎", title: "Search & export", text: "Filter, sort and export your expenses as CSV or PDF any time." },
  { icon: "🌙", title: "Dark mode", text: "Easy on the eyes, and fully responsive from phone to desktop." },
];

export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to="/home" replace />;

  return (
    <div className="landing">
      <header className="landing-bar">
        <span className="brand"><img src={logo} alt="NotreShare" className="brand-logo" /><span className="brand-name">NotreShare</span></span>
        <div className="landing-bar-actions">
          <ThemeToggle />
          <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Sign up</Link>
        </div>
      </header>

      <section className="landing-hero">
        <h1>Split expenses, <span className="grad">not friendships.</span></h1>
        <p>Track shared costs, see exactly who owes whom, and settle up without the awkward maths.</p>
        <div className="landing-cta">
          <Link to="/register" className="btn btn-primary btn-lg">Get started free</Link>
          <Link to="/login" className="btn btn-outline btn-lg">I have an account</Link>
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div className="card feature" key={f.title}>
            <div className="feature-icon" aria-hidden="true">{f.icon}</div>
            <h3>{f.title}</h3>
            <p className="muted">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
