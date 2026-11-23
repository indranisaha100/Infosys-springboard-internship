import { useState } from "react";
import { request } from "../../../shared/services/api";

/** Mentor assigns a course (HR resource or custom title) to one of their mentees. */
export default function AssignCourseDialog({ mentees, resource, defaultEmail = "", onClose, onDone }) {
  const [form, setForm] = useState({ employeeEmail: defaultEmail, learningTitle: resource ? "" : "", competency: "", dueDate: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request("/mentor/assign-course", { method: "POST", body: JSON.stringify({
        employeeEmail: form.employeeEmail, resourceId: resource?.id, learningTitle: resource ? undefined : form.learningTitle,
        competency: form.competency || resource?.competency || "", dueDate: form.dueDate || undefined,
      }) });
      onDone(`Course assigned to ${mentees.find((m) => m.email === form.employeeEmail)?.name || "mentee"}.`);
    } catch (e) {
      setError(e.message.replace(/^HTTP \d+: /, ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Assign course">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 text-xs shadow-xl">
        <h3 className="m-0 text-lg font-bold text-[#0b1d35]">Assign course</h3>
        {resource ? <p className="m-0 rounded-lg bg-violet-50 p-3 text-violet-800"><strong>{resource.title}</strong><span className="block text-[10px]">{resource.category}</span></p>
          : <label className="block font-semibold text-slate-600">Course title<input required value={form.learningTitle} onChange={(e) => setForm({ ...form, learningTitle: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>}
        <label className="block font-semibold text-slate-600">Mentee
          <select required value={form.employeeEmail} onChange={(e) => setForm({ ...form, employeeEmail: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"><option value="">Select mentee…</option>{mentees.map((m) => <option key={m.email} value={m.email}>{m.name}</option>)}</select></label>
        {!resource && <label className="block font-semibold text-slate-600">Subject <span className="font-normal text-slate-400">(optional)</span><input value={form.competency} onChange={(e) => setForm({ ...form, competency: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>}
        <label className="block font-semibold text-slate-600">Due date <span className="font-normal text-slate-400">(optional)</span><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
        {error && <p className="m-0 text-rose-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-semibold text-slate-600">Cancel</button><button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Assigning…" : "Assign"}</button></div>
      </form>
    </div>
  );
}
