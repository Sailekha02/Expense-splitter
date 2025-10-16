import { ExpenseProvider } from "./context/ExpenseContext";
import AppRoutes from "./routes";

function App() {
  return (
    <ExpenseProvider>
      <AppRoutes />
    </ExpenseProvider>
  );
}

export default App;
