import { useEffect, useState } from "react";
import { request } from "../../../shared/services/api";
import { formatDateTime, googleCalendarUrl, sessionTiming } from "../../../shared/utils/sessions";

const TIMING_BADGE = {
  live: ["Happening now", "bg-emerald-50 text-emerald-700"],
  soon: ["Starts soon", "bg-amber-50 text-amber-700"],
  upcoming: ["Upcoming", "bg-blue-50 text-blue-700"],
};

function FeedbackForm({ session, onSaved }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(`/employee/sessions/${session.id}/feedback`, { method: "POST", body: JSON.stringify({ rating, comment }) });
      onSaved();
    } catch (e) {
      setError(e.message.replace(/^HTTP \d+: /, ""));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
      <label className="text-[10px] text-slate-500">Rate this session
        <select className="ml-2 rounded border border-slate-200 px-2 py-1 text-xs" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}
        </select>
      </label>
      <input className="rounded-lg border border-slate-200 px-3 py-2 text-xs" maxLength={1000} placeholder="What helped? What could be better?" value={comment} onChange={(e) => setComment(e.target.value)} />
      <div className="flex items-center gap-3"><button disabled={busy} className="rounded-lg bg-blue-500 px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50">Send feedback</button>{error && <span className="text-[10px] text-rose-600" role="alert">{error}</span>}</div>
    </form>
  );
}

function SessionCard({ session, onChanged }) {
  const timing = sessionTiming(session);
  const badge = session.status === "CANCELLED" ? ["Cancelled", "bg-rose-50 text-rose-700"]
    : session.status === "COMPLETED" ? ["Completed", "bg-emerald-50 text-emerald-700"]
      : TIMING_BADGE[timing] || ["Needs update", "bg-slate-100 text-slate-600"];
  const active = session.status === "SCHEDULED" && timing !== "past";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold text-blue-950">{session.title}</h3>
          <p className="mb-0 mt-1 text-[10px] text-slate-500">with {session.mentorName}{session.subject ? ` · ${session.subject}` : ""}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${badge[1]}`}>{badge[0]}</span>
      </div>
      <p className="mb-0 mt-3 text-xs text-blue-950">{formatDateTime(session.scheduledAt)} · {session.durationMinutes} min</p>
      {session.agenda && <p className="mb-0 mt-2 text-[11px] leading-5 text-slate-600">{session.agenda}</p>}

      {active && <div className="mt-4 flex flex-wrap gap-2">
        {session.meetLink
          ? <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white">Join Google Meet</a>
          : <span className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] text-slate-500">Meet link not added yet</span>}
        <a href={googleCalendarUrl(session)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600">Add to Google Calendar</a>
      </div>}

      {session.status === "COMPLETED" && session.mentorNotes && <p className="mb-0 mt-3 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600"><strong>Mentor notes:</strong> {session.mentorNotes}</p>}
      {session.status === "COMPLETED" && (session.employeeRating
        ? <p className="mb-0 mt-3 text-[10px] text-slate-500">Your rating: {session.employeeRating}/5{session.employeeFeedback ? ` · ${session.employeeFeedback}` : ""}</p>
        : <FeedbackForm session={session} onSaved={onChanged} />)}
    </article>
  );
}

export default function MentoringSessionsPage({ onChanged = () => {} }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    request("/employee/mentoring")
      .then((result) => { if (active) { setData(result); setError(""); } })
      .catch((e) => { if (active) setError(e.message); });
    const timer = window.setInterval(() => setReloadKey((key) => key + 1), 60000); // pick up new sessions/links
    return () => { active = false; window.clearInterval(timer); };
  }, [reloadKey]);

  function changed() {
    setReloadKey((key) => key + 1);
    onChanged();
  }

  const upcoming = (data?.sessions || []).filter((s) => s.status === "SCHEDULED" && sessionTiming(s) !== "past");
  const history = (data?.sessions || []).filter((s) => !upcoming.includes(s)).reverse();

  return (
    <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / Mentoring Sessions</p>
        <h1 className="m-0 text-2xl font-medium text-blue-950">Mentoring Sessions</h1>
        <p className="mt-2 text-xs text-slate-500">Your mentors, the subject each one covers, and your Google Meet sessions.</p>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700" role="alert">{error}</p>}
      {!data && !error && <p className="text-sm text-slate-500" role="status">Loading…</p>}

      {data && <>
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-blue-950">My mentors</h2>
          {data.mentors.length === 0
            ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">HR has not assigned a mentor to you yet. You can also send a request from Mentorship Requests.</p>
            : <div className="grid gap-3 sm:grid-cols-2">{data.mentors.map((m) => <article key={`${m.mentorEmail}-${m.subject}`} className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
              <strong className="text-sm text-blue-950">{m.mentorName}</strong>
              <p className="mb-0 mt-1 text-slate-500">{m.mentorEmail}</p>
              <span className="mt-2 inline-block rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">Subject: {m.subject}</span>
              {m.notes && <p className="mb-0 mt-2 text-[10px] text-slate-500">HR note: {m.notes}</p>}
            </article>)}</div>}
        </section>

        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-blue-950">Upcoming ({upcoming.length})</h2>
          {upcoming.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No sessions scheduled. Your mentor will book one with a Google Meet link.</p>
            : <div className="grid gap-3 lg:grid-cols-2">{upcoming.map((s) => <SessionCard key={s.id} session={s} onChanged={changed} />)}</div>}
        </section>

        {history.length > 0 && <section>
          <h2 className="mb-3 text-sm font-semibold text-blue-950">Past sessions</h2>
          <div className="grid gap-3 lg:grid-cols-2">{history.map((s) => <SessionCard key={s.id} session={s} onChanged={changed} />)}</div>
        </section>}
      </>}
    </div>
  );
}
