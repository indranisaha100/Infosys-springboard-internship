import { useEffect, useState } from "react";
import { request } from "../../../shared/services/api";
import { MEET_NEW_URL, formatDateTime, googleCalendarUrl, isValidMeetLink, sessionTiming, toLocalInputValue } from "../../../shared/utils/sessions";

function clean(error) {
  return error instanceof Error ? error.message.replace(/^HTTP \d+: /, "") : "The request failed.";
}

function SessionRow({ session, onChanged, onMessage }) {
  const [link, setLink] = useState(session.meetLink || "");
  const [notes, setNotes] = useState(session.mentorNotes || "");
  const [busy, setBusy] = useState(false);
  const timing = sessionTiming(session);
  const open = session.status === "SCHEDULED";

  async function patch(changes, success) {
    setBusy(true);
    try {
      await request(`/mentor/sessions/${session.id}`, { method: "PATCH", body: JSON.stringify(changes) });
      onMessage(success, "ok");
      onChanged();
    } catch (error) {
      onMessage(clean(error), "error");
    } finally {
      setBusy(false);
    }
  }

  const badge = session.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700" : session.status === "CANCELLED" ? "bg-rose-50 text-rose-700"
    : timing === "live" ? "bg-emerald-50 text-emerald-700" : timing === "past" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  const badgeText = session.status !== "SCHEDULED" ? session.status : timing === "live" ? "LIVE NOW" : timing === "past" ? "TIME PASSED" : "SCHEDULED";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><strong className="text-sm text-[#0b1d35]">{session.title}</strong><p className="mb-0 mt-1 text-slate-500">{session.employeeName}{session.subject ? ` · ${session.subject}` : ""} · {formatDateTime(session.scheduledAt)} · {session.durationMinutes} min</p></div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${badge}`}>{badgeText}</span>
      </div>
      {session.agenda && <p className="mb-0 mt-2 leading-5 text-slate-600">{session.agenda}</p>}

      {open && <>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" className="min-w-[220px] flex-1 rounded-lg border border-slate-200 px-3 py-2" />
          <button disabled={busy || link === (session.meetLink || "")} onClick={() => patch({ meetLink: link }, "Meet link saved and employee notified.")} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-50">Save link</button>
          <a href={MEET_NEW_URL} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600">New Meet</a>
        </div>
        {!isValidMeetLink(link) && <p className="mb-0 mt-1 text-[10px] text-rose-600">Use a link like https://meet.google.com/abc-defg-hij</p>}
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={4000} placeholder="Session notes (visible to the employee after you complete the session)" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2" />
        <div className="mt-3 flex flex-wrap gap-2">
          {session.meetLink && <a href={session.meetLink} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white">Start / join Meet</a>}
          <a href={googleCalendarUrl(session)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600">Add to Google Calendar</a>
          <button disabled={busy} onClick={() => patch({ status: "COMPLETED", mentorNotes: notes }, "Session marked completed.")} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700">Mark completed</button>
          <button disabled={busy} onClick={() => { if (window.confirm("Cancel this session? The employee will be notified.")) patch({ status: "CANCELLED" }, "Session cancelled."); }} className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700">Cancel</button>
        </div>
      </>}
      {!open && session.mentorNotes && <p className="mb-0 mt-3 rounded-lg bg-slate-50 p-3 text-slate-600"><strong>Your notes:</strong> {session.mentorNotes}</p>}
      {session.employeeRating && <p className="mb-0 mt-2 text-[10px] text-slate-500">Employee rating: {session.employeeRating}/5{session.employeeFeedback ? ` · ${session.employeeFeedback}` : ""}</p>}
    </article>
  );
}

export default function MentorSessionsPage({ mentees, preselectEmail = "", onChanged = () => {} }) {
  const [sessions, setSessions] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState({ text: "", type: "ok" });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(() => ({
    employeeEmail: preselectEmail, title: "", subject: "", agenda: "",
    when: toLocalInputValue(new Date(Date.now() + 24 * 3600000)), durationMinutes: 30, meetLink: "",
  }));

  useEffect(() => {
    let active = true;
    request("/mentor/sessions")
      .then((result) => { if (active) setSessions(result.sessions || []); })
      .catch((error) => { if (active) setToast({ text: clean(error), type: "error" }); });
    return () => { active = false; };
  }, [reloadKey]);

  const selected = mentees.find((mentee) => mentee.email === form.employeeEmail);
  function set(field) { return (event) => setForm((current) => ({ ...current, [field]: event.target.value })); }
  function changed() { setReloadKey((key) => key + 1); onChanged(); }

  async function submit(event) {
    event.preventDefault();
    if (!isValidMeetLink(form.meetLink)) { setToast({ text: "Enter a valid Google Meet link or leave it empty.", type: "error" }); return; }
    setBusy(true);
    try {
      await request("/mentor/sessions", { method: "POST", body: JSON.stringify({
        employeeEmail: form.employeeEmail, title: form.title, subject: form.subject || selected?.subjects?.[0] || "",
        agenda: form.agenda, scheduledAt: new Date(form.when).toISOString(),
        durationMinutes: Number(form.durationMinutes), meetLink: form.meetLink,
      }) });
      setToast({ text: "Session scheduled and the employee was notified.", type: "ok" });
      setForm((current) => ({ ...current, title: "", agenda: "", meetLink: "" }));
      changed();
    } catch (error) {
      setToast({ text: clean(error), type: "error" });
    } finally {
      setBusy(false);
    }
  }

  const upcoming = (sessions || []).filter((s) => s.status === "SCHEDULED");
  const history = (sessions || []).filter((s) => s.status !== "SCHEDULED").reverse();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-500">Mentorship management</p>
        <h2 className="m-0 text-2xl font-bold text-[#0b1d35]">Schedule a Google Meet session</h2>
        <p className="mt-2 text-sm text-slate-500">Pick one of your mentees, choose a time, open a new Google Meet and paste its link. The employee is notified and sees a Join button.</p>
        {mentees.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">You have no mentees yet. HR assigns mentees from the HR workspace, or you can accept mentorship requests.</p> :
          <form onSubmit={submit} className="mt-5 grid gap-3 md:grid-cols-2 text-xs">
            <label className="font-semibold text-slate-600">Mentee
              <select required value={form.employeeEmail} onChange={set("employeeEmail")} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal">
                <option value="">Select mentee…</option>{mentees.map((m) => <option key={m.email} value={m.email}>{m.name}{m.subjects?.length ? ` · ${m.subjects.join(", ")}` : ""}</option>)}
              </select></label>
            <label className="font-semibold text-slate-600">Title
              <input required value={form.title} onChange={set("title")} maxLength={200} placeholder="e.g. Spring Boot architecture review" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
            <label className="font-semibold text-slate-600">Date and time (your timezone)
              <input required type="datetime-local" min={toLocalInputValue()} value={form.when} onChange={set("when")} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
            <label className="font-semibold text-slate-600">Duration
              <select value={form.durationMinutes} onChange={set("durationMinutes")} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal">{[15, 30, 45, 60, 90, 120].map((n) => <option key={n} value={n}>{n} minutes</option>)}</select></label>
            <label className="font-semibold text-slate-600">Subject
              <input value={form.subject || selected?.subjects?.[0] || ""} onChange={set("subject")} placeholder="Java, SQL…" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
            <label className="font-semibold text-slate-600">Google Meet link
              <span className="mt-2 flex gap-2"><input value={form.meetLink} onChange={set("meetLink")} placeholder="https://meet.google.com/abc-defg-hij" className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" />
                <a href={MEET_NEW_URL} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-600">New Meet</a></span>
              {!isValidMeetLink(form.meetLink) && <span className="mt-1 block text-[10px] font-normal text-rose-600">Use a link like https://meet.google.com/abc-defg-hij</span>}</label>
            <label className="font-semibold text-slate-600 md:col-span-2">Agenda <span className="font-normal text-slate-400">(optional)</span>
              <textarea rows={2} maxLength={2000} value={form.agenda} onChange={set("agenda")} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal" /></label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Scheduling…" : "Schedule session"}</button>
              {toast.text && <span className={toast.type === "error" ? "text-rose-600" : "text-emerald-700"} role={toast.type === "error" ? "alert" : "status"}>{toast.text}</span>}
            </div>
          </form>}
      </div>

      <section><h3 className="mb-3 text-lg font-semibold text-[#0b1d35]">Upcoming ({upcoming.length})</h3>
        {sessions === null ? <p className="text-sm text-slate-500">Loading…</p> : upcoming.length === 0 ? <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">No upcoming sessions.</p>
          : <div className="grid gap-3 lg:grid-cols-2">{upcoming.map((s) => <SessionRow key={`${s.id}-${s.updatedKey || ""}`} session={s} onChanged={changed} onMessage={(text, type) => setToast({ text, type })} />)}</div>}
      </section>
      {history.length > 0 && <section><h3 className="mb-3 text-lg font-semibold text-[#0b1d35]">History</h3><div className="grid gap-3 lg:grid-cols-2">{history.map((s) => <SessionRow key={s.id} session={s} onChanged={changed} onMessage={(text, type) => setToast({ text, type })} />)}</div></section>}
    </div>
  );
}
