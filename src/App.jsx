import { ExpenseProvider } from "./context/ExpenseContext.jsx";
import AppRoutes from "./routes";

function App() {
  return (
    <ExpenseProvider>
      <AppRoutes />
    </ExpenseProvider>
  );
}

export default App;
