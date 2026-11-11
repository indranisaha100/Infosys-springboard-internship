import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "../components/AuthLayout";
import { request, saveSession } from "../services/api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [identifierType, setIdentifierType] = useState("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  async function submit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const user = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!user?.token || !user?.role) {
        throw new Error(
          "Login response is missing the authentication token or user role."
        );
      }

      saveSession(user);

      const paths = {
        ROLE_MENTOR: "/mentor-dashboard",
        ROLE_EMPLOYEE: "/employee-dashboard",
        ROLE_HR: "/hr-dashboard",
        ROLE_ADMIN: "/hr-dashboard",
        ROLE_MANAGER: "/manager-dashboard",
        ROLE_DEPARTMENT_HEAD: "/department-head-dashboard",
      };

      navigate(paths[user.role] || "/login", {
        replace: true,
      });

    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      mode="login"
      title="Sign in to your workspace"
      description="Continue where your team's knowledge becomes visible."
    >
      <form className="auth-form" onSubmit={submit}>
        <label>
          Sign in with

          <select
            value={identifierType}
            onChange={(event) =>
              setIdentifierType(event.target.value)
            }
          >
            <option value="email">Email address</option>
            <option value="userId">User ID</option>
          </select>

          <input
            type={identifierType === "email" ? "email" : "text"}
            name="identifier"
            placeholder={
              identifierType === "email"
                ? "name@company.com"
                : "EMP000123"
            }
            value={form.identifier}
            onChange={update}
            required
          />
        </label>

        <label>
          Password

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={update}
            required
          />
        </label>

        {error && (
          <p className="feedback error">
            {error}
          </p>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
          <span>→</span>
        </button>
      </form>
    </AuthLayout>
  );
}