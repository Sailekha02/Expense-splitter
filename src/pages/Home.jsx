import { Link } from "react-router-dom";
import { useContext } from "react";
import { ExpenseContext } from "../context/ExpenseContext";
import "./Home.css";

export default function Home() {
  const { expenses } = useContext(ExpenseContext);
  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div className="home-container">
      <div className="hero">
        <h1>Welcome to Expense Splitter</h1>
        <p>Keep track of shared expenses and balances easily!</p>
      </div>

      <div className="home-buttons">
        <Link to="/add-expense" className="home-btn">Add Expense</Link>
        <Link to="/summary" className="home-btn">View Summary</Link>
      </div>

      {expenses.length > 0 && (
        <div className="home-summary">
          <h3>Total Expenses:</h3>
          <p>₹ {total.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}
