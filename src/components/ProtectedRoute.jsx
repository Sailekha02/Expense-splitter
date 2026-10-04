import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/hooks.js";
import { Spinner } from "./ui.jsx";

export default function ProtectedRoute({ children }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (!user && checking) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
