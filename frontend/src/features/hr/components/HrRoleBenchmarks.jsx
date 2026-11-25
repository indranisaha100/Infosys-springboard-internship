import { useCallback, useEffect, useState } from "react";
import { request } from "../../../shared/services/api";

const inputClass = "mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal outline-none focus:border-[#50C878]";
const emptyForm = { roleName: "", competency: "", requiredProficiency: "Intermediate" };

function message(error) {
  return error instanceof Error ? error.message.replace(/^HTTP \d+: /, "") : "The request failed.";
}

export default function HrRoleBenchmarks({ onChanged }) {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ roles: [], competencies: [], proficiencies: [] });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      const [impact, choices] = await Promise.all([
        request("/hr/role-requirements/impact"),
        request("/hr/role-requirements/options"),
      ]);
      setRows(impact || []);
      setOptions(choices || { roles: [], competencies: [], proficiencies: [] });
      setError("");
    } catch (loadError) {
      setError(message(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await request(editingId ? `/hr/role-requirements/${editingId}` : "/hr/role-requirements", {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({
          roleName: form.roleName.trim(),
          competency: form.competency.trim(),
          requiredProficiency: form.requiredProficiency.trim(),
        }),
      });
      setForm(emptyForm);
      setEditingId(null);
      setSuccess("Benchmark saved and applied to the HR dashboard gap analysis.");
      await load();
      onChanged?.();
    } catch (saveError) {
      setError(message(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    if (!window.confirm(`Delete the ${row.competency} benchmark for ${row.roleName}?`)) return;
    setError("");
    setSuccess("");
    try {
      await request(`/hr/role-requirements/${row.id}`, { method: "DELETE" });
      if (editingId === row.id) { setEditingId(null); setForm(emptyForm); }
      setSuccess("Benchmark deleted.");
      await load();
      onChanged?.();
    } catch (deleteError) {
      setError(message(deleteError));
    }
  }

  function edit(row) {
    setEditingId(row.id);
    setForm({ roleName: row.roleName, competency: row.competency, requiredProficiency: row.requiredProficiency });
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <p className="rounded-xl border border-[#A3E4D7] bg-white p-6 text-sm text-slate-500">Loading role benchmarks…</p>;

  return (
    <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
      <div className="mb-5">
        <h2 className="m-0 text-lg font-semibold text-[#0F5257]">Role benchmarks</h2>
        <p className="mt-1 text-xs text-slate-500">
          A benchmark sets the score employees of a department or role must reach in a competency. It replaces the default target in the HR gap analysis straight away,
          and employees who have not been assessed in that competency count as a full gap. Pick the competency from your assessment topics so it matches real results.
        </p>
      </div>
      {error && <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      {success && <p role="status" className="mb-3 rounded-lg bg-[#E8F8F5] px-3 py-2 text-xs text-[#0F5257]">{success}</p>}

      <form onSubmit={submit} className="grid gap-3 rounded-xl bg-[#f4fbf8] p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="text-xs font-semibold text-slate-600">Department / role
          <input required list="benchmark-roles" value={form.roleName} onChange={(event) => setForm((current) => ({ ...current, roleName: event.target.value }))} placeholder="Engineering" className={inputClass} />
          <datalist id="benchmark-roles">{options.roles.map((role) => <option key={role} value={role} />)}</datalist>
        </label>
        <label className="text-xs font-semibold text-slate-600">Competency
          <input required list="benchmark-competencies" value={form.competency} onChange={(event) => setForm((current) => ({ ...current, competency: event.target.value }))} placeholder="Java" className={inputClass} />
          <datalist id="benchmark-competencies">{options.competencies.map((competency) => <option key={competency} value={competency} />)}</datalist>
        </label>
        <label className="text-xs font-semibold text-slate-600">Target proficiency
          <input required list="benchmark-levels" value={form.requiredProficiency} onChange={(event) => setForm((current) => ({ ...current, requiredProficiency: event.target.value }))} placeholder="Advanced or 85%" className={inputClass} />
          <datalist id="benchmark-levels">{options.proficiencies.map((level) => <option key={level} value={level} />)}</datalist>
        </label>
        <div className="flex items-end gap-2">
          <button disabled={saving} className="rounded-lg bg-[#0F5257] px-4 py-3 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : editingId ? "Update" : "Add benchmark"}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className="rounded-lg bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-600">Cancel</button>}
        </div>
      </form>
      <p className="mb-0 mt-2 text-[11px] text-slate-500">Levels: Beginner = 50%, Intermediate = 70%, Advanced = 90%, Expert = 95%, or any percentage from 1 to 100.</p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400">
              <th className="py-3">Department / role</th><th className="py-3">Competency</th><th className="py-3">Target</th>
              <th className="py-3">Employees covered</th><th className="py-3">Assessed</th><th className="py-3">Average score</th><th className="py-3">Below target</th><th className="py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50">
                <td className="py-3 font-semibold">{row.roleName}</td>
                <td className="py-3">{row.competency}</td>
                <td className="py-3">{row.requiredProficiency} <span className="text-slate-400">({row.targetPercent}%)</span></td>
                <td className="py-3">
                  {row.employeesCovered === 0
                    ? <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700" title="No employee's department or role matches this name">Applies to nobody</span>
                    : row.employeesCovered}
                </td>
                <td className="py-3">{row.assessed}/{row.employeesCovered}</td>
                <td className="py-3">{row.averageScore == null ? "—" : `${row.averageScore}%`}</td>
                <td className="py-3">{row.employeesCovered ? <strong className={row.belowTarget ? "text-rose-700" : "text-emerald-700"}>{row.belowTarget}</strong> : "—"}</td>
                <td className="py-3 text-right">
                  <button onClick={() => edit(row)} className="mr-3 font-semibold text-[#208967]">Edit</button>
                  <button onClick={() => remove(row)} className="font-semibold text-rose-700">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && <p className="mt-4 rounded-xl bg-[#E8F8F5] p-5 text-sm text-slate-500">No role benchmarks have been configured yet.</p>}
    </section>
  );
}
