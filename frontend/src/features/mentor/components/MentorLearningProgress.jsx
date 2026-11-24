import { useEffect, useState } from "react";
import { request } from "../../../shared/services/api";
import { relativeTime } from "../../../shared/utils/sessions";
import { clampPercent, progressColor } from "../utils/progressColors";

const LABEL = { PENDING: "Not started", IN_PROGRESS: "In progress", COMPLETED: "Completed" };
const STYLE = { PENDING: "bg-slate-100 text-slate-600", IN_PROGRESS: "bg-amber-50 text-amber-700", COMPLETED: "bg-emerald-50 text-emerald-700" };

export default function MentorLearningProgress({ onAssign }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => request("/mentor/learning/mentees")
      .then((result) => { if (active) { setRows(result.enrollments || []); setError(""); } })
      .catch((e) => { if (active) setError(e.message); });
    load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const all = rows || [];
  const shown = all.filter((r) => (status === "ALL" || r.status === status)
    && `${r.employeeName} ${r.title} ${r.competency || ""}`.toLowerCase().includes(query.toLowerCase()));
  const count = (s) => all.filter((r) => r.status === s).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-500">Live workspace</p><h2 className="m-0 text-2xl font-bold text-[#0b1d35]">Learning Progress</h2><p className="mt-2 text-sm text-slate-500">Courses of your mentees, updated whenever they report progress. Refreshes every 30 seconds.</p></div>
        <button onClick={() => onAssign(null)} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Assign a course</button>
      </div>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700" role="alert">{error}</p>}
      {rows === null && !error && <p className="text-sm text-slate-500">Loading…</p>}
      {rows && <>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {[["Not started", count("PENDING"), "bg-slate-200"], ["In progress", count("IN_PROGRESS"), "bg-amber-500"], ["Completed", count("COMPLETED"), "bg-emerald-500"]].map(([title, n, color]) =>
            <article key={title} className="rounded-xl border border-slate-200 p-4"><div className={`mb-3 h-2 rounded-full ${color}`} /><p className="m-0 text-xs text-slate-500">{title}</p><strong className="mt-1 block text-2xl text-[#0b1d35]">{n}</strong></article>)}
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><option value="ALL">All statuses</option><option value="PENDING">Not started</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search mentee or course…" className="w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
        </div>
        {shown.length === 0 ? <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">{all.length ? "No courses match your filters." : "No courses have been assigned to your mentees yet."}</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3">Mentee</th><th className="px-3 py-3">Course</th><th className="px-3 py-3">Progress</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Due</th><th className="px-3 py-3">Last update</th></tr></thead>
            <tbody>{shown.map((r) => <tr key={r.id} className="border-b border-slate-50 last:border-0">
              <td className="px-3 py-3 font-semibold text-[#0b1d35]">{r.employeeName}</td>
              <td className="px-3 py-3">{r.title}{r.competency && <span className="block text-[10px] text-slate-400">{r.competency}</span>}{r.lastNote && <span className="block text-[10px] text-slate-500">“{r.lastNote}”</span>}</td>
              <td className="px-3 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 rounded-full bg-slate-100"><div className={`h-full rounded-full ${progressColor(r.progressPercent)}`} style={{ width: `${clampPercent(r.progressPercent)}%` }} /></div><b>{clampPercent(r.progressPercent)}%</b></div></td>
              <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${STYLE[r.status]}`}>{LABEL[r.status]}</span></td>
              <td className={`px-3 py-3 ${r.overdue ? "font-semibold text-rose-600" : "text-slate-500"}`}>{r.dueDate ? `${r.dueDate}${r.overdue ? " · overdue" : ""}` : "—"}</td>
              <td className="px-3 py-3 text-slate-500">{relativeTime(r.updatedAt)}</td>
            </tr>)}</tbody></table></div>}
      </>}
    </div>
  );
}
