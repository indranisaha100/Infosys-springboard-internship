import { useEffect, useState } from "react";
import { request } from "../../../shared/services/api";
import { formatDateTime } from "../../../shared/utils/sessions";
import { clampPercent, progressColor } from "../utils/progressColors";

export default function MenteeDetailPanel({ email, onClose, onSchedule, onAssign }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    request(`/mentor/mentees/${encodeURIComponent(email)}`)
      .then((result) => { if (active) setDetail(result); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [email]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="Mentee details">
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="m-0 text-xl font-bold text-[#0b1d35]">{detail?.name || email}</h3><p className="mb-0 mt-1 text-xs text-slate-500">{email}{detail?.department ? ` · ${detail.department}` : ""}</p></div>
          <button onClick={onClose} className="text-sm font-semibold text-slate-500" aria-label="Close">✕</button>
        </div>
        {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700" role="alert">{error}</p>}
        {!detail && !error && <p className="mt-6 text-sm text-slate-500">Loading…</p>}
        {detail && <div className="mt-5 space-y-6 text-xs">
          <div className="flex flex-wrap gap-2">
            {detail.subjects?.map((s) => <span key={s} className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">{s}</span>)}
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{detail.status}</span>
          </div>
          <div className="flex gap-2"><button onClick={() => onSchedule(email)} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">Schedule session</button><button onClick={() => onAssign(email)} className="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-600">Assign course</button></div>

          <section><h4 className="mb-2 text-sm font-semibold">Skills vs target</h4>
            {detail.skillsAssessed.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-slate-500">No assessment submitted yet.</p> : <div className="space-y-3">{detail.skillsAssessed.map((s) => <div key={s.topic}><div className="mb-1 flex justify-between"><span>{s.topic}</span><b>{clampPercent(s.current)}% / {clampPercent(s.required)}%</b></div><div className="relative h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${progressColor(s.current)}`} style={{ width: `${clampPercent(s.current)}%` }} /><span className="absolute -top-1 h-4 w-0.5 bg-slate-500" style={{ left: `${clampPercent(s.required)}%` }} /></div></div>)}</div>}</section>

          <section><h4 className="mb-2 text-sm font-semibold">Courses</h4>
            {detail.courseList.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-slate-500">No courses assigned.</p> : <div className="space-y-3">{detail.courseList.map((c) => <div key={c.id} className="rounded-lg border border-slate-100 p-3"><div className="flex justify-between gap-2"><strong>{c.title}</strong><b>{clampPercent(c.progressPercent)}%</b></div><div className="mt-2 h-1.5 rounded bg-slate-100"><div className={`h-full rounded ${progressColor(c.progressPercent)}`} style={{ width: `${clampPercent(c.progressPercent)}%` }} /></div><p className={`mb-0 mt-2 text-[10px] ${c.overdue ? "text-rose-600" : "text-slate-500"}`}>{c.status.replace("_", " ")}{c.dueDate ? ` · due ${c.dueDate}` : ""}{c.lastNote ? ` · “${c.lastNote}”` : ""}</p></div>)}</div>}</section>

          <section><h4 className="mb-2 text-sm font-semibold">Sessions</h4>
            {detail.sessionList.length === 0 ? <p className="rounded-lg bg-slate-50 p-3 text-slate-500">No sessions yet.</p> : <div className="space-y-2">{detail.sessionList.map((s) => <div key={s.id} className="flex justify-between gap-2 rounded-lg border border-slate-100 p-3"><span><strong>{s.title}</strong><span className="block text-[10px] text-slate-500">{formatDateTime(s.scheduledAt)}</span></span><span className="text-[10px] font-semibold text-slate-500">{s.status}</span></div>)}</div>}</section>
        </div>}
      </div>
    </div>
  );
}
