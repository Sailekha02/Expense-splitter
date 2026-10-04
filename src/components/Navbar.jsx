import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth, useData } from "../context/hooks.js";
import ThemeToggle from "./ThemeToggle.jsx";
import { Avatar } from "./ui.jsx";
import logo from "../assets/logo.png";

const LINKS = [
  { to: "/home", label: "Dashboard" },
  { to: "/groups", label: "Groups" },
  { to: "/expenses", label: "Expenses" },
  { to: "/analytics", label: "Analytics" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { offline } = useData();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);

  // close menus on navigation
  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDown = (e) => userRef.current && !userRef.current.contains(e.target) && setUserOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/home" className="brand">
          <img src={logo} alt="Expense Splitter" className="brand-logo" />
          <span className="brand-name">NotreShare</span>
        </Link>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`} aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {offline && <span className="pill pill-warn" title="Showing saved data">Offline</span>}
          <Link to="/add-expense" className="btn btn-primary btn-sm nav-add">+ Expense</Link>
          <ThemeToggle />
          <div className="user-menu" ref={userRef}>
            <button className="avatar-btn" onClick={() => setUserOpen((o) => !o)} aria-haspopup="menu" aria-expanded={userOpen} aria-label="Account menu">
              <Avatar name={user?.name} size={34} />
            </button>
            {userOpen && (
              <div className="dropdown" role="menu">
                <div className="dropdown-head">
                  <strong>{user?.name}</strong>
                  <span className="muted small">{user?.email}</span>
                </div>
                <Link to="/profile" role="menuitem">Profile & settings</Link>
                <button
                  role="menuitem"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
          <button className="icon-btn menu-toggle" onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </header>
  );
}
