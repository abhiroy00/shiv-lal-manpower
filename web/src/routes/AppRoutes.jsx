import { Navigate } from "react-router-dom";
import LoginPage from "../features/auth/LoginPage";
import DashboardLayout from "../layouts/DashboardLayout";
import EmployeeLayout from "../layouts/EmployeeLayout";
import ProtectedRoute from "./ProtectedRoute";
import DashboardPage from "../features/dashboard/DashboardPage";
import EmployeeListPage from "../features/employees/EmployeeListPage";
import AttendancePage from "../features/attendance/AttendancePage";
import AttendanceRegisterPage from "../features/attendance/AttendanceRegisterPage";
import PayrollPage from "../features/payroll/PayrollPage";
import CompliancePage from "../features/compliance/CompliancePage";
import PayslipPage from "../features/payslip/PayslipPage";
import RecruitmentPage from "../features/recruitment/RecruitmentPage";
import DeploymentPage from "../features/deployment/DeploymentPage";
import ReportsPage from "../features/reports/ReportsPage";
import LeavePage from "../features/leave/LeavePage";
import EmployeePayslipPage    from "../features/employee/EmployeePayslipPage";
import EmployeeProfilePage    from "../features/employee/EmployeeProfilePage";
import EmployeeAttendancePage from "../features/employee/EmployeeAttendancePage";

const AppRoutes = [
  { path: "/login", element: <LoginPage /> },

  // Admin / HR portal
  {
    path: "/",
    element: <ProtectedRoute requireAdmin><DashboardLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "employees", element: <EmployeeListPage /> },
      { path: "attendance", element: <AttendancePage /> },
      { path: "attendance/register", element: <AttendanceRegisterPage /> },
      { path: "payroll", element: <PayrollPage /> },
      { path: "compliance", element: <CompliancePage /> },
      { path: "payslip", element: <PayslipPage /> },
      { path: "recruitment", element: <RecruitmentPage /> },
      { path: "deployment", element: <DeploymentPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "leave", element: <LeavePage /> },
    ],
  },

  // Employee self-service portal
  {
    path: "/employee",
    element: <ProtectedRoute><EmployeeLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/employee/payslip" replace /> },
      { path: "payslip",    element: <EmployeePayslipPage /> },
      { path: "attendance", element: <EmployeeAttendancePage /> },
      { path: "leave",      element: <LeavePage /> },
      { path: "profile",    element: <EmployeeProfilePage /> },
    ],
  },

  { path: "*", element: <Navigate to="/login" replace /> },
];

export default AppRoutes;
