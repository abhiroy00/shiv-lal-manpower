import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = useSelector((s) => s.auth.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}
