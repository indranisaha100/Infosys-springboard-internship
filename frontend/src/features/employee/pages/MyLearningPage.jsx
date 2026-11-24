import { useEffect, useState } from "react";
import { request } from "../../../shared/services/api";

const STATUS_STYLE = {
  PENDING: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
};
const STATUS_LABEL = { PENDING: "Not started", IN_PROGRESS: "In progress", COMPLETED: "Completed" };

function CourseCard({ course, onChanged }) {
  const [value, setValue] = useState(course.progressPercent);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const done = course.status === "COMPLETED";

  async function save(percent) {
    setBusy(true);
    setMessage("");
    try {
      await request(`/employee/learning/enrollments/${course.id}/progress`, {
        method: "PATCH",
        body: JSON.stringify({ progressPercent: percent, note }),
      });
      setNote("");
      setMessage(percent >= 100 ? "Marked as completed. Your mentor and HR were notified." : "Progress saved.");
      onChanged();
    } catch (error) {
      setMessage(error.message.replace(/^HTTP \d+: /, ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`rounded-xl border bg-white p-5 ${course.overdue ? "border-rose-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-blue-950">{course.title}</h3>
          <p className="mb-0 mt-1 text-[10px] text-slate-500">
            {course.competency ? `${course.competency} · ` : ""}
            {course.assignedBy && course.assignedBy !== "SYSTEM" ? `Assigned by ${course.assignedBy}` : "Suggested from your skill gap"}
            {course.mentorEmail ? ` · Mentor ${course.mentorEmail}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${STATUS_STYLE[course.status]}`}>{STATUS_LABEL[course.status]}</span>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500">
        <span>{course.dueDate ? `Due ${course.dueDate}${course.overdue ? " · overdue" : ""}` : "No due date"}</span>
        <strong className="text-blue-950">{course.progressPercent}%</strong>
      </div>
      <div className="mt-1.5 h-1.5 rounded bg-slate-200" role="progressbar" aria-valuenow={course.progressPercent} aria-valuemin={0} aria-valuemax={100}>
        <span className={`block h-full rounded ${done ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${course.progressPercent}%` }} />
      </div>

      {done ? (
        <p className="mb-0 mt-3 text-[10px] text-emerald-700">Completed {course.completedAt ? new Date(course.completedAt).toLocaleDateString() : ""}</p>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-[10px] text-slate-500">
            Update progress: <b className="text-blue-950">{value}%</b>
            <input className="mt-2 w-full" type="range" min={course.progressPercent} max="100" step="5" value={value} onChange={(e) => setValue(Number(e.target.value))} />
          </label>
          <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" maxLength={1000} placeholder="Optional note for your mentor (what you finished, where you are stuck)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-blue-500 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50" disabled={busy || value === course.progressPercent} onClick={() => save(value)}>Save progress</button>
            <button className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 disabled:opacity-50" disabled={busy} onClick={() => { if (window.confirm("Mark this course as completed?")) save(100); }}>Mark as completed</button>
          </div>
        </div>
      )}
      {course.lastNote && <p className="mb-0 mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-500">Last note: {course.lastNote}</p>}
      {message && <p className="mb-0 mt-2 text-[10px] text-slate-600" role="status">{message}</p>}
    </article>
  );
}

export default function MyLearningPage({ onChanged = () => {} }) {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    request("/employee/learning/enrollments")
      .then((assigned) => {
        if (!active) return;
        setCourses(assigned.enrollments || []);
        setError("");
      })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [reloadKey]);

  function changed() {
    setReloadKey((key) => key + 1);
    onChanged(); // refresh dashboard numbers too
  }

  const active = (courses || []).filter((c) => c.status !== "COMPLETED");
  const completed = (courses || []).filter((c) => c.status === "COMPLETED");

  return (
    <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / My Learning</p>
        <h1 className="m-0 text-2xl font-medium text-blue-950">My Learning</h1>
        <p className="mt-2 text-xs text-slate-500">Courses assigned by HR or your skill-gap plan. Update your progress here; HR, your mentor and your department head see the same numbers.</p>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700" role="alert">{error}</p>}
      {courses === null && !error && <p className="text-sm text-slate-500" role="status">Loading your learning plan…</p>}
      {courses?.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Nothing has been assigned yet. Once HR assigns a course or generates a development plan for you, it will appear here.</p>}

      {active.length > 0 && <section className="mb-6"><h2 className="mb-3 text-sm font-semibold text-blue-950">In your plan ({active.length})</h2><div className="grid gap-3 lg:grid-cols-2">{active.map((c) => <CourseCard key={`${c.id}-${c.progressPercent}`} course={c} onChanged={changed} />)}</div></section>}
      {completed.length > 0 && <section className="mb-6"><h2 className="mb-3 text-sm font-semibold text-blue-950">Completed ({completed.length})</h2><div className="grid gap-3 lg:grid-cols-2">{completed.map((c) => <CourseCard key={`${c.id}-${c.progressPercent}`} course={c} onChanged={changed} />)}</div></section>}
    </div>
  );
}
