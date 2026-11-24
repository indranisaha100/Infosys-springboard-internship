import { useEffect, useState } from "react";
import { request } from "../../../shared/services/api";

const emptyForm = { employeeEmail: "", mentorEmail: "", subject: "", notes: "", learningTitle: "", dueDate: "" };

function clean(error) {
  return error instanceof Error ? error.message.replace(/^HTTP \d+: /, "") : "The request failed.";
}

export default function HrMentorAssignments({ employees, mentors }) {
  const [rows, setRows] = useState(null);
  const [competencies, setCompetencies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState("ACTIVE");

  useEffect(() => {
    let active = true;
    Promise.all([request("/hr/mentor-assignments"), request("/hr/competencies").catch(() => [])])
      .then(([assigned, comps]) => {
        if (!active) return;
        setRows(assigned.assignments || []);
        setCompetencies(Array.isArray(comps) ? comps : []);
      })
      .catch((error) => { if (active) setNotice({ type: "error", text: clean(error) }); });
    return () => { active = false; };
  }, [reloadKey]);

  const selectedMentor = mentors.find((mentor) => mentor.email === form.mentorEmail);
  const expertise = (selectedMentor?.expertise || "").split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
  const subjectOptions = [...new Set([...expertise, ...competencies.map((c) => c.name)])];
  const mentorMatchesSubject = !form.subject || !selectedMentor
    || expertise.some((skill) => skill.toLowerCase().includes(form.subject.toLowerCase()) || form.subject.toLowerCase().includes(skill.toLowerCase()));

  function set(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setNotice({ type: "", text: "" });
    try {
      const result = await request("/hr/mentor-assignments", { method: "POST", body: JSON.stringify(form) });
      setNotice({ type: result.courseWarning ? "warn" : "ok", text: [result.message, result.course, result.courseWarning].filter(Boolean).join(" ") });
      setForm(emptyForm);
      setReloadKey((key) => key + 1);
    } catch (error) {
      setNotice({ type: "error", text: clean(error) });
    } finally {
      setBusy(false);
    }
  }

  async function end(id) {
    if (!window.confirm("End this mentor assignment? The employee will lose chat access with this mentor unless another assignment links them.")) return;
    try {
      await request(`/hr/mentor-assignments/${id}/end`, { method: "POST" });
      setReloadKey((key) => key + 1);
    } catch (error) {
      setNotice({ type: "error", text: clean(error) });
    }
  }

  const shown = (rows || []).filter((row) => filter === "ALL" || row.status === filter);
  const noticeStyle = { ok: "border-emerald-200 bg-[#E8F8F5] text-[#0F5257]", warn: "border-amber-200 bg-amber-50 text-amber-800", error: "border-rose-200 bg-rose-50 text-rose-700" };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="m-0 text-lg font-semibold text-[#0F5257]">Mentor assignments</h2>
        <p className="mt-1 text-xs text-slate-500">Assign an employee to a mentor for one subject. The mentor sees the employee in their dashboard, chat opens between them, and courses for that subject are tracked under that mentor.</p>
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-[#A3E4D7] bg-white p-5 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Employee
          <select required value={form.employeeEmail} onChange={set("employeeEmail")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal">
            <option value="">Select employee…</option>
            {employees.map((employee) => <option key={employee.email} value={employee.email}>{employee.name || employee.email} · {employee.department || "Unassigned"}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Mentor
          <select required value={form.mentorEmail} onChange={set("mentorEmail")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal">
            <option value="">Select mentor…</option>
            {mentors.map((mentor) => <option key={mentor.email} value={mentor.email}>{mentor.name || mentor.email}{mentor.expertise ? ` · ${mentor.expertise}` : ""}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">Subject
          <input required list="assignment-subjects" value={form.subject} onChange={set("subject")} placeholder="e.g. Java" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal" />
          <datalist id="assignment-subjects">{subjectOptions.map((name) => <option key={name} value={name} />)}</datalist>
          {!mentorMatchesSubject && <span className="mt-1 block text-[10px] font-normal text-amber-700">This mentor's expertise ({selectedMentor.expertise || "none set"}) does not list this subject. You can still assign.</span>}
        </label>
        <label className="text-xs font-semibold text-slate-600">Note for the mentor <span className="font-normal text-slate-400">(optional)</span>
          <input value={form.notes} onChange={set("notes")} maxLength={1000} placeholder="Focus areas, deadlines…" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-600">First course to assign <span className="font-normal text-slate-400">(optional)</span>
          <input value={form.learningTitle} onChange={set("learningTitle")} placeholder="Course / plan title" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-600">Due date <span className="font-normal text-slate-400">(optional)</span>
          <input type="date" value={form.dueDate} onChange={set("dueDate")} className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal" />
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button disabled={busy} className="rounded-lg bg-[#0F5257] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">{busy ? "Assigning…" : "Assign mentor"}</button>
          {notice.text && <p className={`m-0 rounded-lg border px-3 py-2 text-xs ${noticeStyle[notice.type] || noticeStyle.ok}`} role={notice.type === "error" ? "alert" : "status"}>{notice.text}</p>}
        </div>
      </form>

      <div className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="m-0 text-base font-semibold text-[#0F5257]">Assignments ({shown.length})</h3>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">
            <option value="ACTIVE">Active</option><option value="ENDED">Ended</option><option value="ALL">All</option>
          </select>
        </div>
        {rows === null ? <p className="text-sm text-slate-500" role="status">Loading assignments…</p>
          : shown.length === 0 ? <p className="rounded-xl bg-[#E8F8F5] p-6 text-center text-sm text-slate-500">No assignments yet.</p>
            : <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead><tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400"><th className="py-2 pr-3">Employee</th><th className="px-3">Mentor</th><th className="px-3">Subject</th><th className="px-3">Learning</th><th className="px-3">Sessions</th><th className="px-3">Status</th><th className="px-3" /></tr></thead>
                <tbody>{shown.map((row) => <tr key={row.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 pr-3"><strong>{row.employeeName}</strong><span className="block text-[10px] text-slate-400">{row.employeeEmail}</span></td>
                  <td className="px-3"><strong>{row.mentorName}</strong><span className="block text-[10px] text-slate-400">{row.mentorEmail}</span></td>
                  <td className="px-3">{row.subject}</td>
                  <td className="px-3">{row.courses.total ? <><div className="h-1.5 w-20 rounded bg-slate-100"><div className="h-full rounded bg-[#208967]" style={{ width: `${row.courses.averageProgress}%` }} /></div><span className="text-[10px] text-slate-500">{row.courses.averageProgress}% · {row.courses.completed}/{row.courses.total} done</span></> : <span className="text-slate-400">No courses</span>}</td>
                  <td className="px-3 text-slate-600">{row.sessions.upcoming} upcoming · {row.sessions.completed} held</td>
                  <td className="px-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${row.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{row.status}</span></td>
                  <td className="px-3">{row.status === "ACTIVE" && <button onClick={() => end(row.id)} className="font-semibold text-rose-600 hover:text-rose-800">End</button>}</td>
                </tr>)}</tbody>
              </table>
            </div>}
      </div>
    </section>
  );
}
