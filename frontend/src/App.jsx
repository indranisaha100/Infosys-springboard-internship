import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./features/auth/pages/LoginPage";
import RegisterPage from "./features/auth/pages/RegisterPage";
import DashboardPage from "./features/employee/pages/DashboardPage";
import MentorDashboardPage from "./features/mentor/pages/MentorDashboardPage";
import HRDashboardPage from "./features/hr/pages/HRDashboardPage";
import ManagerDashboardPage from "./features/manager/pages/ManagerDashboard";
import DepartmentHeadDashboard from "./features/department-head/pages/DepartmentHeadDashboard";
import InitialHrSetupPage from "./features/auth/pages/InitialHrSetupPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup-hr" element={<InitialHrSetupPage />} />

      <Route
        path="/employee-dashboard"
        element={<DashboardPage />}
      />

      <Route
        path="/mentor-dashboard"
        element={<MentorDashboardPage />}
      />

      <Route
        path="/hr-dashboard"
        element={<HRDashboardPage />}
      />

      <Route
        path="/manager-dashboard"
        element={<ManagerDashboardPage />}
      />

      <Route
        path="/department-head-dashboard"
        element={<DepartmentHeadDashboard />}
      />

      <Route path="/dashboard" element={<DashboardPage />} />

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}