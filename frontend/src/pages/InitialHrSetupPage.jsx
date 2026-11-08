import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { request } from "../services/api";

export default function InitialHrSetupPage() {
  const [form, setForm] = useState({ name: "", email: "", department: "", password: "", confirmPassword: "", setupKey: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault(); setError(""); setResult(null);
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const [firstName, ...rest] = form.name.trim().split(/\s+/);
      const created = await request("/auth/setup-hr", {
        method: "POST",
        headers: { "X-HR-Setup-Key": form.setupKey },
        body: JSON.stringify({ firstName, lastName: rest.join(" "), email: form.email, department: form.department, password: form.password }),
      });
      setResult(created);
      setForm({ ...form, password: "", confirmPassword: "", setupKey: "" });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  return (
    <AuthLayout mode="setup" title="Set up the first HR account" description="This setup works once, while no HR or admin account exists. Use the one-time key configured by the backend operator.">
      {result ? <div className="space-y-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
        <p className="m-0">{result.message}</p><p className="m-0">HR user ID: <strong>{result.userId}</strong></p><p className="m-0">Email: <strong>{result.email}</strong></p><p className="m-0">The password is the one you entered. It is stored as a hash and cannot be shown again.</p><Link className="font-semibold underline" to="/login">Continue to sign in</Link>
      </div> : <form className="auth-form" onSubmit={submit}>
        <label>Full name<input name="name" value={form.name} onChange={update} required /></label>
        <label>Official email<input type="email" name="email" value={form.email} onChange={update} required /></label>
        <label>Department<input name="department" value={form.department} onChange={update} required /></label>
        <label>Password (at least 12 characters)<input type="password" name="password" value={form.password} onChange={update} minLength="12" required /></label>
        <label>Confirm password<input type="password" name="confirmPassword" value={form.confirmPassword} onChange={update} minLength="12" required /></label>
        <label>One-time setup key<input type="password" name="setupKey" value={form.setupKey} onChange={update} required /></label>
        {error && <p className="feedback error" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>{loading ? "Creating HR account..." : "Create initial HR account"}</button>
      </form>}
    </AuthLayout>
  );
}
