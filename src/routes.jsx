import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Header from "./components/Header";
import Home from "./pages/Home";
import AddExpense from "./pages/AddExpense";
import Summary from "./pages/Summary";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ MISSING IMPORT

function Layout({ children }) {
  const location = useLocation();
  const hideHeaderOnAuth =
    location.pathname === "/login" || location.pathname === "/register";

  return (
    <>
      {!hideHeaderOnAuth && <Header />}
      {children}
    </>
  );
}

export default function AppRoutes() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-expense"
            element={
              <ProtectedRoute>
                <AddExpense />
              </ProtectedRoute>
            }
          />
          <Route
            path="/summary"
            element={
              <ProtectedRoute>
                <Summary />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </Router>
  );
}
