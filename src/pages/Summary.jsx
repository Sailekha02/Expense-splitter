import { useContext } from "react";
import { ExpenseContext } from "../context/ExpenseContext";
import { splitExpenses } from "../utils/splitExpenses";
import "./Summary.css";

export default function Summary() {
  const { expenses, participants, deleteExpense, editExpense } = useContext(ExpenseContext);
  const { balances, settlements } = splitExpenses(expenses, participants);
  
  console.log("Expenses:", expenses); 

  const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
  const handleDelete = (index) => { 
    deleteExpense(index); };

  const handleEdit = (index) => {
    const expenseToEdit = expenses[index];
    const updatedExpense = { 
      ...expenseToEdit, 
      name: prompt("Edit name:", expenseToEdit.name) || expenseToEdit.name, amount: prompt("Edit amount:", expenseToEdit.amount) || expenseToEdit.amount, paidBy: prompt("Edit paidBy:", expenseToEdit.paidBy) || expenseToEdit.paidBy, 
    };

    editExpense(index, updatedExpense);
  };
  return (
    <div className="summary-page">
      <div className="summary-container">
        <h2>Expense Summary</h2>

        <div className="summary-card">
          <h3>Total Expenses</h3>
          <p>₹ {total.toFixed(2)}</p>
        </div>

        <div className="expense-list">
          <h3>All Expenses</h3>
          {expenses.length === 0 ? (
            <p>No expenses added yet.</p>
          ) : (
            <ul>
              {expenses.map((exp, index) => (
                <li key={index}>
                  <span className="expense-name">{exp.name}</span>
                  <span className="expense-amount">₹ {parseFloat(exp.amount).toFixed(2)}</span>
                  <span className="expense-payer">{exp.paidBy}</span>
                  <button className="edit-btn" onClick={() => handleEdit(index)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(index)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="balances-section">
          <h3>Balances:</h3>
          <div className="balances-list">
            {Object.entries(balances).map(([person, balance]) => (
              <div className="balance-item" key={person}>
                <span>{person}</span>
                <span>₹ {balance.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="settlements-section">
          <h3>Settlements:</h3>
          {settlements.length === 0 ? (
            <p>All settled!</p>
          ) : (
            <ul>
              {settlements.map((s, idx) => (
                <li key={idx}>
                  {s.from} pays {s.to} ₹ {s.amount.toFixed(2)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
