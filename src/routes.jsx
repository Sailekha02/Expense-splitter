import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import AddExpense from "./pages/AddExpense";
import Summary from "./pages/Summary";

function Layout({ children }) {
  const location = useLocation();
  const hideHeaderOnHome = location.pathname === "/";

  return (
    <>
      {!hideHeaderOnHome && <Header />} {}
      {children}
    </>
  );
}

export default function AppRoutes() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/add-expense" element={<AddExpense />} />
          <Route path="/summary" element={<Summary />} />
        </Routes>
      </Layout>
    </Router>
  );
}
