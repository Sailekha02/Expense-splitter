import { Link, useNavigate } from "react-router-dom";
import "./Header.css";

export default function Header() {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    navigate("/login");
  };

  return (
    <nav className="header">
      {isLoggedIn ? (
        <>
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/add-expense" className="nav-link">Add Expense</Link>
          <Link to="/summary" className="nav-link">Summary</Link>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login" className="nav-link">Login</Link>
          <Link to="/register" className="nav-link">Register</Link>
        </>
      )}
    </nav>
  );
}
