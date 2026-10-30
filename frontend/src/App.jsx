
import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import MentorDashboardPage from "./pages/MentorDashboardPage";
import ManagerDashboard from "./pages/ManagerDashboard";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("kgipUser") || "null");
  } catch {
    return null;
  }
}

function normalizeRole(role) {
  return String(role || "")
    .toUpperCase()
    .replace(/^ROLE_/, "");
}

function getDashboardPath(role) {
  const normalizedRole = normalizeRole(role);

  if (["HR", "ADMIN", "MANAGER"].includes(normalizedRole)) {
    return "/manager-dashboard";
  }

  if (normalizedRole === "MENTOR") {
    return "/mentor-dashboard";
  }

  if (normalizedRole === "EMPLOYEE") {
    return "/employee-dashboard";
  }

  return "/login";
}

function DashboardRedirect() {
  const token = localStorage.getItem("kgipToken");
  const user = getCurrentUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={getDashboardPath(user.role)}
      replace
    />
  );
}

function RoleRoute({ allowedRoles, children }) {
  const token = localStorage.getItem("kgipToken");
  const user = getCurrentUser();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(user.role);

  if (!allowedRoles.includes(role)) {
    return (
      <Navigate
        to={getDashboardPath(user.role)}
        replace
      />
    );
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/register" element={<RegisterPage />} />

      {/* Role-aware dashboard entry */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* Employee */}
      <Route
        path="/employee-dashboard"
        element={
          <RoleRoute allowedRoles={["EMPLOYEE"]}>
            <DashboardPage />
          </RoleRoute>
        }
      />

      {/* Mentor */}
      <Route
        path="/mentor-dashboard"
        element={
          <RoleRoute allowedRoles={["MENTOR"]}>
            <MentorDashboardPage />
          </RoleRoute>
        }
      />

      {/* Manager / HR / Admin */}
      <Route
        path="/manager-dashboard"
        element={
          <RoleRoute allowedRoles={["HR", "ADMIN", "MANAGER"]}>
            <ManagerDashboard />
          </RoleRoute>
        }
      />

      {/* Unknown routes */}
      <Route
        path="*"
        element={<DashboardRedirect />}
      />
    </Routes>
  );
}
