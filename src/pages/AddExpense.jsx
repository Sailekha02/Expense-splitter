import { useState, useContext } from "react";
import { ExpenseContext } from "../context/ExpenseContext";
import "./AddExpense.css";

export default function AddExpense() {
  const { expenses, setExpenses, participants, setParticipants } = useContext(ExpenseContext);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !amount || !paidBy) {
      alert("Please fill all fields!");
      return;
    }

    if (parseFloat(amount) <= 0) {
      alert("Amount must be greater than 0!");
      return;
    }

    setExpenses([...expenses, { name, amount: parseFloat(amount), paidBy }]);

    if (!participants.includes(paidBy)) {
      setParticipants([...participants, paidBy]);
    }

    setName("");
    setAmount("");
    setPaidBy("");
  };

  return (
    
    <div className="add-expense-page">
  <div className="add-expense-container">
    <h2>Add Expense</h2>
    <form onSubmit={handleSubmit} className="add-expense-form">
      <input
        type="text"
        placeholder="Expense Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        type="text"
        placeholder="Paid By"
        value={paidBy}
        onChange={(e) => setPaidBy(e.target.value)}
      />
      <button type="submit">Add Expense</button>
    </form>
  </div>
</div>

  );
}
