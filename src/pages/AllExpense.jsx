import { useContext } from "react";
import { ExpenseContext } from "../context/ExpenseContext";
import "./AllExpense.css";

export default function AllExpense() {
  const { expenses, participants } = useContext(ExpenseContext);

  const splitAmount = (amount) => {
  if (!participants.length) return "0.00";
  return (amount / participants.length).toFixed(2);
};



  return (
  <div className="all-expense-page">
    <div className="all-expenses-container">
      <h2>All Expenses</h2>

      {expenses.length === 0 ? (
        <p>No expenses added yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Total Amount</th>
              <th>Paid By</th>
              <th>Date</th>
              <th>Split / Person</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp, index) => (
              <tr key={index}>
                <td>{exp.name}</td>
                <td>₹ {parseFloat(exp.amount).toFixed(2)}</td>
                <td>{exp.paidBy}</td>
                <td>{exp.date}</td>
                <td>₹ {splitAmount(exp.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

}
