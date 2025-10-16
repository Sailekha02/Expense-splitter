import { createContext, useState } from "react";

export const ExpenseContext = createContext();

export function ExpenseProvider({ children }) {
  const [participants, setParticipants] = useState([]); 
  const [expenses, setExpenses] = useState([]);   
  
  const addExpense = (expense) => {
    setExpenses((prev) => [...prev, expense]);

    if (!participants.includes(expense.paidBy)) {
      setParticipants((prev) => [...prev, expense.paidBy]);
    }
  };
  const deleteExpense = (index) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index));
  };
  const editExpense = (index, updatedExpense) => {
    setExpenses((prev) => {
      const newExpenses = [...prev];
      newExpenses[index] = updatedExpense;
      return newExpenses;
    });
  };

  return (
    <ExpenseContext.Provider value={{ expenses, setExpenses, participants, setParticipants,addExpense,deleteExpense,editExpense }}>
      {children}
    </ExpenseContext.Provider>
  );
}
