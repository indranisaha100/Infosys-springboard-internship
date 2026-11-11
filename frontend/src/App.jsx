import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import MentorDashboardPage from "./pages/MentorDashboardPage";
import HRDashboardPage from "./pages/HRDashboardPage";
import ManagerDashboardPage from "./pages/ManagerDashboard";
import DepartmentHeadDashboard from "./pages/DepartmentHeadDashboard";
import InitialHrSetupPage from "./pages/InitialHrSetupPage";

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