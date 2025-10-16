import { Link } from "react-router-dom";
import "./Header.css"; 

export default function Header() {
  return (
    <nav className="header">
      <Link to="/" style={{ marginRight: "10px", color: "white", textDecoration: "none" }}>Home</Link>
      <Link to="/add-expense" style={{ marginRight: "10px", color: "white", textDecoration: "none" }}>Add Expense</Link>
      <Link to="/summary" style={{ color: "white", textDecoration: "none" }}>Summary</Link>
    </nav>
  );
}
