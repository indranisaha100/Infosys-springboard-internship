import { useCallback, useEffect, useState } from "react";
import { request } from "../../../shared/services/api";

const inputClass = "mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal outline-none focus:border-[#50C878]";

function message(error) {
  return error instanceof Error ? error.message.replace(/^HTTP \d+: /, "") : "The request failed.";
}

export default function HrDepartments({ onChanged }) {
  const [data, setData] = useState({ departments: [], departmentHeads: [], employees: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ name: "", description: "", headEmail: "" });
  const [selected, setSelected] = useState({});

  const load = useCallback(async () => {
    try {
      setData(await request("/hr/departments"));
      setError("");
    } catch (loadError) {
      setError(message(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function run(action, successText) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await action();
      if (result) setData(result);
      setSuccess(successText);
      onChanged?.();
    } catch (actionError) {
      setError(message(actionError));
    } finally {
      setBusy(false);
    }
  }

  function createDepartment(event) {
    event.preventDefault();
    run(async () => {
      const result = await request("/hr/departments", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", description: "", headEmail: "" });
      return result;
    }, "Department created.");
  }

  const changeHead = (department, headEmail) => run(
    () => request(`/hr/departments/${department.id}`, { method: "PUT", body: JSON.stringify({ headEmail }) }),
    headEmail ? "Department Head assigned." : "Department Head removed.");

  const assign = (department) => run(async () => {
    const emails = selected[department.id] || [];
    const result = await request(`/hr/departments/${department.id}/employees`, {
      method: "POST", body: JSON.stringify({ emails }),
    });
    setSelected((current) => ({ ...current, [department.id]: [] }));
    return result;
  }, "Employees assigned.");

  const unassign = (department, email) => run(
    () => request(`/hr/departments/${department.id}/employees/${encodeURIComponent(email)}`, { method: "DELETE" }),
    "Employee removed from the department.");

  const remove = (department) => {
    if (!window.confirm(`Delete the ${department.name} department? Its employees become unassigned.`)) return;
    run(() => request(`/hr/departments/${department.id}`, { method: "DELETE" }), "Department deleted.");
  };

  function toggle(departmentId, email) {
    setSelected((current) => {
      const list = current[departmentId] || [];
      return { ...current, [departmentId]: list.includes(email) ? list.filter((item) => item !== email) : [...list, email] };
    });
  }

  if (loading) return <p className="rounded-xl border border-[#A3E4D7] bg-white p-6 text-sm text-slate-500">Loading departments…</p>;

  const headsInUse = new Set(data.departments.map((department) => department.headEmail?.toLowerCase()).filter(Boolean));

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
        <h2 className="m-0 text-lg font-semibold text-[#0F5257]">Departments</h2>
        <p className="mt-1 text-xs text-slate-500">Create a department, choose its Department Head and assign employees. The head then sees assessments, heatmaps and reports for exactly those employees.</p>
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        {success && <p role="status" className="mt-3 rounded-lg bg-[#E8F8F5] px-3 py-2 text-xs text-[#0F5257]">{success}</p>}
        <form onSubmit={createDepartment} className="mt-4 grid gap-3 rounded-xl bg-[#f4fbf8] p-4 md:grid-cols-[1fr_1.4fr_1fr_auto]">
          <label className="text-xs font-semibold text-slate-600">Department name
            <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Engineering" className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Description <span className="font-normal text-slate-400">(optional)</span>
            <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={inputClass} />
          </label>
          <label className="text-xs font-semibold text-slate-600">Department Head <span className="font-normal text-slate-400">(optional)</span>
            <select value={form.headEmail} onChange={(event) => setForm((current) => ({ ...current, headEmail: event.target.value }))} className={inputClass}>
              <option value="">Assign later</option>
              {data.departmentHeads.filter((head) => !headsInUse.has(head.email.toLowerCase())).map((head) => <option key={head.email} value={head.email}>{head.name}</option>)}
            </select>
          </label>
          <button disabled={busy} className="self-end rounded-lg bg-[#0F5257] px-4 py-3 text-xs font-semibold text-white disabled:opacity-60">Create department</button>
        </form>
        {!data.departmentHeads.length && <p className="mb-0 mt-3 text-xs text-slate-500">No approved Department Head accounts yet. Approve a Department Head registration first to assign one.</p>}
      </div>

      {data.departments.length === 0 && <p className="rounded-xl bg-[#E8F8F5] p-6 text-center text-sm text-slate-500">No departments created yet.</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        {data.departments.map((department) => {
          const members = new Set(department.employees.map((employee) => employee.email.toLowerCase()));
          const candidates = data.employees.filter((employee) => !members.has(employee.email.toLowerCase()));
          const picked = selected[department.id] || [];
          return (
            <article key={department.id} className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="m-0 text-base font-semibold text-[#0F5257]">{department.name}</h3>
                  {department.description && <p className="mb-0 mt-1 text-xs text-slate-500">{department.description}</p>}
                </div>
                <button onClick={() => remove(department)} disabled={busy} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-60">Delete</button>
              </div>

              <label className="mt-4 block text-xs font-semibold text-slate-600">Department Head
                <select value={department.headEmail || ""} disabled={busy} onChange={(event) => changeHead(department, event.target.value)} className={inputClass}>
                  <option value="">No head assigned</option>
                  {data.departmentHeads
                    .filter((head) => head.email.toLowerCase() === (department.headEmail || "").toLowerCase() || !headsInUse.has(head.email.toLowerCase()))
                    .map((head) => <option key={head.email} value={head.email}>{head.name}</option>)}
                </select>
              </label>

              <p className="mb-2 mt-4 text-xs font-semibold text-slate-600">{department.employeeCount} assigned employee{department.employeeCount === 1 ? "" : "s"}</p>
              {department.employees.length ? (
                <ul className="m-0 max-h-48 list-none space-y-1 overflow-y-auto p-0">
                  {department.employees.map((employee) => (
                    <li key={employee.email} className="flex items-center justify-between gap-2 rounded-lg bg-[#f4fbf8] px-3 py-2 text-xs">
                      <span><strong>{employee.name}</strong> <span className="text-slate-500">· {employee.email}</span></span>
                      <button onClick={() => unassign(department, employee.email)} disabled={busy} className="text-[11px] font-semibold text-rose-700 disabled:opacity-60">Remove</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="m-0 rounded-lg bg-[#f4fbf8] px-3 py-3 text-xs text-slate-500">No employees assigned yet.</p>}

              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-semibold text-[#0F5257]">Assign employees</summary>
                <div className="mt-3 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {candidates.length ? candidates.map((employee) => (
                    <label key={employee.email} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50">
                      <input type="checkbox" checked={picked.includes(employee.email)} onChange={() => toggle(department.id, employee.email)} />
                      <span>{employee.name} <span className="text-slate-400">· {employee.email}{employee.department ? ` · currently ${employee.department}` : ""}</span></span>
                    </label>
                  )) : <p className="m-0 p-2 text-xs text-slate-500">Every approved employee is already in this department.</p>}
                </div>
                <button onClick={() => assign(department)} disabled={busy || !picked.length} className="mt-3 rounded-lg bg-[#208967] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  Assign {picked.length || ""} selected
                </button>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
