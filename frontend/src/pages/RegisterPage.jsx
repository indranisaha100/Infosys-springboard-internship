import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import { request } from "../services/api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "", additionalDetails: "",
    requestedRole: "ROLE_EMPLOYEE", department: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const [firstName, ...lastParts] = form.name.trim().split(/\s+/);
      let result;
      try {
        result = await request("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            firstName, lastName: lastParts.join(" "), email: form.email,
            password: form.password, requestedRole: form.requestedRole,
            department: form.department,
          }),
        });
      } catch (registrationError) {
        if (!registrationError.message.includes("already exists") || !form.additionalDetails.trim()) throw registrationError;
        result = await request("/auth/registration-request/details", {
          method: "POST",
          body: JSON.stringify({ email: form.email, password: form.password, details: form.additionalDetails }),
        });
      }
      setSuccess(result.message || "Registration received. Your request is pending HR approval.");
      setForm({ name: "", email: "", password: "", confirmPassword: "", additionalDetails: "", requestedRole: "ROLE_EMPLOYEE", department: "" });
    } catch (requestError) {
      setError(requestError.message);
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout mode="register" title="Request an account" description="HR will review your details before your account is activated.">
      <form className="auth-form" onSubmit={submit}>
        <label>Full name<input name="name" value={form.name} onChange={update} autoComplete="name" required /></label>
        <label>Official email<input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required /></label>
        <label>Department<input name="department" value={form.department} onChange={update} required /></label>
        <label>Requested role
          <select name="requestedRole" value={form.requestedRole} onChange={update} required>
            <option value="ROLE_EMPLOYEE">Employee</option>
            <option value="ROLE_MANAGER">Manager</option>
            <option value="ROLE_MENTOR">Mentor</option>
            <option value="ROLE_HR">HR Specialist</option>
            <option value="ROLE_DEPARTMENT_HEAD">Department Head</option>
          </select>
        </label>
        <label>Password<input type="password" name="password" value={form.password} onChange={update} minLength="8" autoComplete="new-password" required /></label>
        <label>Confirm password<input type="password" name="confirmPassword" value={form.confirmPassword} onChange={update} minLength="8" autoComplete="new-password" required /></label>
        <label>Details HR requested (if applicable)<textarea name="additionalDetails" value={form.additionalDetails} onChange={update} rows="3" /></label>
        {error && <p className="feedback error" role="alert">{error}</p>}
        {success && <p className="feedback" role="status">{success}</p>}
        <button className="primary-button" type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit for HR review"}<span>→</span></button>
      </form>
    </AuthLayout>
  );
}
