import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { request, saveSession } from "../services/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "ROLE_EMPLOYEE",
  });
  const [adminKey, setAdminKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    if (form.role === "ROLE_ADMIN" && !adminKey.trim()) {
      setError(
        "Admin registration requires a provisioning key. Choose Employee or HR for a normal account.",
      );
      setLoading(false);
      return;
    }
    try {
      await request("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
        headers:
          form.role === "ROLE_ADMIN" && adminKey
            ? { "X-Admin-Registration-Key": adminKey }
            : {},
      });
      const user = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });
      saveSession(user);
      navigate(user.role === "ROLE_EMPLOYEE" ? "/employee-dashboard" : "/dashboard", {
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
      mode="register"
      title="Create your account"
      description="Set up your profile and start mapping organizational knowledge."
    >
      <form className="auth-form" onSubmit={submit}>
        <div className="field-grid">
          <label>
            First name
            <input
              name="firstName"
              value={form.firstName}
              onChange={update}
              required
            />
          </label>
          <label>
            Last name
            <input
              name="lastName"
              value={form.lastName}
              onChange={update}
              required
            />
          </label>
        </div>
        <label>
          Email address
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={update}
            required
          />
        </label>
        <label>
          Register as
          <select
            className="mt-1 w-full cursor-pointer rounded-xl border border-[#294a6b] bg-[#102945] px-4 py-3 text-[#f3f7fb] outline-none transition focus:border-[#72c8e8]"
            name="role"
            value={form.role}
            onChange={update}
            required
          >
            <option value="ROLE_EMPLOYEE">Employee</option>
            <option value="ROLE_HR">HR</option>
            <option value="ROLE_ADMIN">Admin</option>
          </select>
          <small>
            Employee and HR accounts are available normally. Admin accounts
            require a backend provisioning key.
          </small>
        </label>
        {form.role === "ROLE_ADMIN" && (
          <label>
            Admin provisioning key
            <input
              type="password"
              name="adminKey"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
              required
            />
            <small>
              This key is checked only by the backend and is never stored.
            </small>
          </label>
        )}
        <label>
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={update}
            minLength="8"
            required
          />
          <small>Use at least 8 characters.</small>
        </label>
        {error && <p className="feedback error">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
          <span>→</span>
        </button>
      </form>
    </AuthLayout>
  );
}
