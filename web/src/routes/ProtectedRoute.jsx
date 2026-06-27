import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

const ADMIN_ROLES    = ["admin", "hr"];
const EMPLOYEE_ROLES = ["employee", "supervisor"];

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const token    = useSelector((s) => s.auth.accessToken);
  const user     = useSelector((s) => s.auth.user);
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  const isAdmin    = user && ADMIN_ROLES.includes(user.role);
  const isEmployee = user && EMPLOYEE_ROLES.includes(user.role);

  // Admin-only route: block employees
  if (requireAdmin && !isAdmin) {
    if (isEmployee) return <Navigate to="/employee/payslip" replace />;
    return <Navigate to="/login" replace />;
  }

  // Employee visiting admin section → redirect to employee portal
  if (isEmployee && !location.pathname.startsWith("/employee")) {
    return <Navigate to="/employee/payslip" replace />;
  }

  return children;
}
