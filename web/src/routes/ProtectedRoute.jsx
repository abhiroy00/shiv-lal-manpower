import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ALLOWED_ROLES = ["admin", "hr"];

export default function ProtectedRoute({ children }) {
  const token = useSelector((s) => s.auth.accessToken);
  const user  = useSelector((s) => s.auth.user);

  if (!token) return <Navigate to="/login" replace />;
  if (user && !ALLOWED_ROLES.includes(user.role)) return <Navigate to="/login" replace />;

  return children;
}
