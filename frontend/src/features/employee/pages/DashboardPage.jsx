import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { downloadFile, request } from "../../../shared/services/api";
import DashboardHeader from "../../../shared/components/DashboardHeader";
import SkillAssessment from "../../skill-assessment/components/SkillAssessment";
import { loadResult, scoreByTopic } from "../../skill-assessment/data/skillAssessmentData";
import MessagesPanel from "../../messaging/components/MessagesPanel";
import SidebarIcon from "../../../shared/components/SidebarIcon";
import NotificationInbox from "../../../shared/components/NotificationInbox";
import NotificationCountBadge from "../../../shared/components/NotificationCountBadge";
import useUnreadNotificationCount from "../../../shared/hooks/useUnreadNotificationCount";
import MyLearningPage from "./MyLearningPage";
import MentoringSessionsPage from "../components/MentoringSessionsPage";
import { formatDateTime } from "../../../shared/utils/sessions";

const navigation = [
  ["dashboard", "Dashboard"], ["profile", "My Profile"], ["assessment", "Skill Assessment"],
  ["gaps", "Knowledge Gap"], ["ai", "Learning Recommendations"], ["learning", "My Learning"],
  ["profile", "Mentors"], ["profile", "Mentorship Requests"], ["profile", "Mentoring Sessions"], ["learning", "Messages / Chatbox"],
  ["bell", "Notifications"],
];
function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    skills: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
    assessment: <><path d="m8 12 2.5 2.5L16 9" /><circle cx="12" cy="12" r="9" /></>,
    ai: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    gaps: <><path d="M4 18V6M4 18h16M7 14l3-4 3 2 5-7" /></>,
    learning: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    report: <><path d="M6 3h9l3 3v15H6zM9 11h6M9 15h6M9 7h4" /></>,
    profile: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 15l2 1-2 3-2-1a7 7 0 0 1-2 1v2h-4v-2a7 7 0 0 1-2-1l-2 1-2-3 2-1a7 7 0 0 1 0-3l-2-1 2-3 2 1a7 7 0 0 1 2-1V6h4v2a7 7 0 0 1 2 1l2-1 2 3-2 1a7 7 0 0 1 0 3Z" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function SkillTrackLogo() {
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#72cba6] text-[#0b2b22] shadow-sm"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 17V13M12 17V8M18 17V5" /></svg></span>;
}

function StatCard({ icon, label, value, note, tone }) {
  const tones = {
    blue: "bg-blue-50 text-blue-500", orange: "bg-orange-50 text-orange-500",
    purple: "bg-violet-50 text-violet-500", green: "bg-emerald-50 text-emerald-500",
  };
  return (
    <article className="flex min-h-[102px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <span className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] text-[21px] ${tones[tone]}`}>{icon}</span>
      <div><p className="mb-1 text-[10px] text-slate-500">{label}</p><strong className="block text-[23px] leading-none text-blue-950">{value}</strong><small className="mt-1 block text-[8px] text-slate-400">{note}</small></div>
    </article>
  );
}

function SectionPage({ activeItem, data, loading }) {
  const titles = {
    "My Skills": "Track your capabilities and role readiness.",
    "Knowledge Gap": "Prioritize the skills that will have the biggest impact.",
    Learning: "Continue building the skills that matter to your role.",
    "My Learning": "Track courses and learning plans assigned to you.",
    "Training Programmes": "See scheduled organisation learning programmes and dates.",
    Feedback: "Review your submitted learning feedback.",
    Notifications: "Stay up to date with your SkillTrack workspace.",
    Reports: "Review your latest skill and readiness reports.",
    "My Profile": "Manage your employee profile information.",
    Settings: "Manage your workspace preferences.",
  };
  const isMyLearningResponse = activeItem === "My Learning"
    && data?.section === "My Learning"
    && Array.isArray(data?.items);
  return (
    <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / {activeItem}</p>
        <h1 className="m-0 text-2xl font-medium text-blue-950">{activeItem}</h1>
        <p className="mt-2 text-xs text-slate-500">{titles[activeItem]}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {loading ? <p className="text-sm text-slate-500">Loading from the employee workspace...</p> : (
          <>
            {!isMyLearningResponse && <p className="text-sm text-blue-950">{data?.message || "Connected to the employee workspace."}</p>}
            {data?.nextAction && <div className="mt-5 rounded-lg bg-blue-50 p-4 text-xs text-blue-800"><strong>Next action</strong><p className="mt-1">{data.nextAction}</p></div>}
            {data?.user && <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-4 text-xs"><strong>Name</strong><p className="mt-1 text-slate-600">{data.user.firstName} {data.user.lastName || ""}</p></div><div className="rounded-lg bg-slate-50 p-4 text-xs"><strong>Email</strong><p className="mt-1 text-slate-600">{data.user.email}</p></div></div>}
            {data?.items && !isMyLearningResponse && <div className="mt-5 grid gap-3 sm:grid-cols-2">{data.items.map((item, index) => {
              const resource = typeof item === "string" ? null : item;
              return <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-blue-900" key={resource?.id || item || index}>
                <span>{resource ? `${resource.title} · ${resource.category}` : item}</span>
                {resource?.pdfUrl && <button className="float-right font-semibold text-red-600" onClick={() => downloadFile(resource.pdfUrl, resource.pdfFileName)}>Download PDF</button>}
                {!resource?.pdfUrl && <span className="float-right text-blue-500">→</span>}
              </div>;
            })}</div>}
            {data?.enrollments?.length > 0 && <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-blue-950">Plans assigned by HR</h2>
              <div className="grid gap-3 sm:grid-cols-2">{data.enrollments.map((enrollment) => <article key={`${enrollment.title}-${enrollment.mentorEmail || ""}`} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 text-xs">
                <strong className="text-blue-950">{enrollment.title}</strong>
                <p className="mb-0 mt-2 text-slate-600">{enrollment.status?.replaceAll("_", " ") || "PENDING"} · {enrollment.progressPercent || 0}% complete</p>
                {enrollment.mentorEmail && <p className="mb-0 mt-1 text-slate-500">Matched mentor: {enrollment.mentorEmail}</p>}
              </article>)}</div>
            </section>}
            {isMyLearningResponse && !data?.enrollments?.length && <p className="mt-5 text-sm text-slate-500">No learning plans have been assigned yet.</p>}
            {!isMyLearningResponse && !data?.items && !data?.user && !data?.nextAction && <div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">This workspace page is connected and ready for your employee data.</div>}
          </>
        )}
      </div>
    </div>
  );
}

function MentorshipRequestsPage({ data, onRefresh }) {
  const [mentorEmail, setMentorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  async function submit(event) {
    event.preventDefault();
    setFeedback("");
    try {
      await request("/mentorship/requests", {
        method: "POST",
        body: JSON.stringify({ mentorEmail, message }),
      });
      setMentorEmail("");
      setMessage("");
      setFeedback("Mentorship request sent.");
      onRefresh();
    } catch (error) {
      setFeedback(error.message);
    }
  }
  return <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
    <div className="mb-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / Mentorship Requests</p><h1 className="m-0 text-2xl font-medium text-blue-950">Mentorship Requests</h1><p className="mt-2 text-xs text-slate-500">Request support from an available mentor using their approved account email.</p></div>
    <form onSubmit={submit} className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <label className="text-xs">Mentor email<input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" type="email" value={mentorEmail} onChange={(event) => setMentorEmail(event.target.value)} required /></label>
      <label className="text-xs">Message<input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What would you like help with?" /></label>
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white sm:col-span-2">Send request</button>
      {feedback && <p className="text-xs text-slate-600 sm:col-span-2" role="status">{feedback}</p>}
    </form>
    <SectionPage activeItem="Your requests" data={data} loading={false} />
  </div>;
}

function MentorsPage({ mentors, loading, error }) {
  return <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
    <div className="mb-5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / Mentors</p>
      <h1 className="m-0 text-2xl font-medium text-blue-950">Mentors</h1>
      <p className="mt-2 text-xs text-slate-500">Current mentors available in the employee workspace.</p>
    </div>
    {loading ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500" role="status">Loading mentors…</p>
      : error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700" role="alert">{error}</p>
        : mentors.length ? <div className="grid gap-3 sm:grid-cols-2">
          {mentors.map((mentor) => <article key={mentor.email} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{mentor.name?.charAt(0)?.toUpperCase() || "M"}</span>
            <div className="min-w-0">
              <strong className="block truncate text-sm text-blue-950">{mentor.name || mentor.email}</strong>
              <p className="mb-0 mt-1 truncate text-xs text-slate-500">{mentor.email}</p>
              <span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${mentor.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700" : mentor.status === "PENDING" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {mentor.status === "NONE" ? "Available" : mentor.status}
              </span>
            </div>
          </article>)}
        </div> : <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">No mentors are currently available.</p>}
  </div>;
}

function FeedbackPage({ data, onRefresh }) {
  const [subject, setSubject] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  async function submit(event) {
    event.preventDefault();
    setStatus("");
    try {
      await request("/employee/feedback", {
        method: "POST",
        body: JSON.stringify({ subject, rating: Number(rating), comment }),
      });
      setSubject("");
      setComment("");
      setStatus("Feedback submitted.");
      onRefresh();
    } catch (error) {
      setStatus(error.message);
    }
  }
  return <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
    <div className="mb-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / Feedback</p><h1 className="m-0 text-2xl font-medium text-blue-950">Learning feedback</h1><p className="mt-2 text-xs text-slate-500">Share feedback about a course or training programme.</p></div>
    <form onSubmit={submit} className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
      <label className="text-xs">Course or programme<input className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" value={subject} onChange={(event) => setSubject(event.target.value)} required /></label>
      <label className="text-xs">Rating<select className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" value={rating} onChange={(event) => setRating(event.target.value)}><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Needs improvement</option><option value="1">1 - Poor</option></select></label>
      <label className="text-xs sm:col-span-2">Comment<textarea className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" rows="3" value={comment} onChange={(event) => setComment(event.target.value)} /></label>
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white sm:col-span-2">Submit feedback</button>
      {status && <p className="text-xs text-slate-600 sm:col-span-2" role="status">{status}</p>}
    </form>
    <SectionPage activeItem="Feedback history" data={data} loading={false} />
  </div>;
}

function KnowledgeGapsPage({ scores, onTakeAssessment }) {
  const gaps = (Array.isArray(scores) ? scores : [])
    .filter((score) => Number.isFinite(score.total) && score.total > 0)
    .map((score) => {
      const current = Math.min(100, Math.max(0, Math.round((score.right / score.total) * 100)));
      const required = Math.min(100, Math.max(0, Math.round((score.target / score.total) * 100)));
      return { name: score.topic, current, required, gap: Math.max(required - current, 0) };
    });

  return (
    <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / Knowledge Gap</p>
        <h1 className="m-0 text-2xl font-medium text-blue-950">Knowledge Gap</h1>
        <p className="mt-2 text-xs text-slate-500">Compare your assessment scores with the target for each skill.</p>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-sm font-medium text-blue-950">Skill gaps by assessment score</h2>
            <p className="mb-0 mt-1.5 text-[10px] text-slate-500">Current score compared with the required target</p>
          </div>
          {gaps.length > 0 && <div className="flex gap-3 text-[9px] text-slate-500" aria-label="Chart legend">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#176b50]" />Current score</span>
            <span><i className="mr-1 inline-block h-3 w-0.5 bg-[#145a42] align-middle" />Target</span>
          </div>}
        </div>
        {gaps.length ? (
          <div className="space-y-5">
            {gaps.map(({ name, current, required, gap }) => (
              <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)_minmax(145px,auto)] sm:items-center sm:gap-4" key={name}>
                <span className="text-xs font-medium text-blue-950">{name}</span>
                <div
                  className="relative h-3 rounded-full bg-slate-100"
                  role="img"
                  aria-label={`${name}: current score ${current}%, target ${required}%, gap ${gap} percentage points`}
                >
                  <span
                    className="block h-full rounded-full bg-[#176b50]"
                    style={{ width: `${current}%` }}
                  />
                  <span className="absolute -top-1 h-5 w-0.5 -translate-x-1/2 bg-[#145a42]" style={{ left: `${required}%` }} />
                </div>
                <span className="whitespace-nowrap text-[10px] text-slate-600">{current}% current · {required}% target{gap ? ` · ${gap} pp gap` : " · On target"}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 p-5 text-center">
            <p className="m-0 text-sm text-slate-600">Complete a skill assessment to see your knowledge gaps.</p>
            <button className="mt-3 rounded-lg bg-[#176b50] px-3 py-2 text-xs font-semibold text-white hover:bg-[#145a42]" onClick={onTakeAssessment}>
              Take skill assessment
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
function ChatBot() {
  const [messages, setMessages] = useState([{ role: "ai", text: "Hi! Ask me about any skill or course,or  learning plan." }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const res = await request("/employee/chat", { method: "POST", body: JSON.stringify({ message: text }) });
      setMessages((m) => [...m, { role: "ai", text: res.reply }]);
    } catch (error) {
      setMessages((m) => [...m, { role: "ai", text: error.message }]);
    } finally {
      setSending(false);
    }
  }

  return (
   <section className="flex h-[70vh] flex-col rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="m-0 text-sm font-semibold text-blue-950">AI Chatbot</h2>
      <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <p key={i} className={`m-0 max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-5 text-black ${m.role === "user" ? "ml-auto bg-blue-100" : "bg-slate-100"}`}>{m.text}</p>
        ))}
        {sending && <p className="m-0 text-[10px] text-slate-400">Thinking…</p>}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1000}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-black outline-none" placeholder="Ask about your skills..." />
        <button className="rounded-lg bg-[#176b50] px-3 py-2 text-xs font-semibold text-white hover:bg-[#145a42] disabled:cursor-not-allowed disabled:opacity-100" disabled={sending}>{sending ? "Sending…" : "Send"}</button>
      </form>
    </section>
  );
}

function AIRecommendationsPage({ data, loading, error, onRetry }) {
  const quotaLimited = error?.toLowerCase().includes("limit");
  const priorityStyle = {
    High: "bg-red-50 text-red-600",
    Medium: "bg-orange-50 text-orange-600",
    Stretch: "bg-emerald-50 text-emerald-700",
  };

  return (
    <div className="mx-auto max-w-[1400px] px-8 pb-14 pt-8 max-[650px]:px-4">
      <div className="mb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / AI Recommendations</p>
        <h1 className="m-0 text-2xl font-medium text-blue-950">AI skill recommendations</h1>
        <p className="mt-2 text-xs text-slate-500">A score-based improvement path with suggested learning resources for each skill.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {loading ? <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Building your learning plan from your assessment scores…</div> : null}

          {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="alert">
            <h2 className="m-0 text-sm font-semibold text-amber-900">{quotaLimited ? "Gemini limit reached" : "Recommendations aren’t available yet"}</h2>
            <p className="mb-0 mt-2 text-xs text-amber-800">{error}</p>
            <button className="mt-4 rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white" onClick={onRetry}>{quotaLimited ? "Try again later" : "Try again"}</button>
          </div> : null}

          {!loading && !error && data ? <div className="space-y-4">
            <article className="rounded-xl border border-blue-100 bg-blue-50/70 p-5">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500 text-white"><Icon name="ai" className="h-5 w-5" /></span><div><h2 className="m-0 text-sm font-semibold text-blue-950">Your learning strategy</h2><p className="mb-0 mt-1.5 text-xs leading-5 text-blue-900">{data.overview}</p></div></div>
              <p className="mb-0 mt-4 border-t border-blue-100 pt-3 text-[10px] text-slate-500">Assessment scores are a useful practice signal, not a complete measure of your ability. Check course details and availability with the provider.</p>
            </article>

            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4"><h2 className="m-0 text-sm font-semibold text-blue-950">Four-week improvement path</h2><p className="mb-0 mt-1 text-[10px] text-slate-500">A practical sequence with weekly focus and a way to check progress.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.weeklyPlan.map((week) => <article className="rounded-lg border border-slate-100 bg-slate-50 p-4" key={week.week}>
                  <p className="m-0 text-[9px] font-bold uppercase tracking-wide text-blue-500">Week {week.week} · {week.topic}</p>
                  <h3 className="mb-2 mt-2 text-xs font-semibold text-blue-950">{week.focus}</h3>
                  <ul className="m-0 list-disc space-y-1 pl-4 text-[10px] leading-4 text-slate-600">{week.tasks.map((task, index) => <li key={`${week.week}-${index}`}>{task}</li>)}</ul>
                  <a className="mt-3 inline-block text-[10px] font-semibold text-blue-600 hover:text-blue-800" href={week.resource.url} target="_blank" rel="noopener noreferrer">{week.resource.title} ↗</a>
                  <p className="mb-0 mt-3 border-t border-slate-200 pt-2 text-[9px] leading-4 text-slate-500"><strong className="text-slate-600">Check:</strong> {week.successCheck}</p>
                </article>)}
              </div>
            </section>

            <section>
              <div className="mb-3"><h2 className="m-0 text-sm font-semibold text-blue-950">Plan by skill</h2><p className="mb-0 mt-1 text-[10px] text-slate-500">Lower assessment scores and larger gaps are prioritized first.</p></div>
              <div className="grid gap-3 2xl:grid-cols-2">
                {data.recommendations.map((skill) => <article className="rounded-xl border border-slate-200 bg-white p-5" key={skill.topic}>
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="m-0 text-sm font-semibold text-blue-950">{skill.topic}</h3><p className="mb-0 mt-1 text-[10px] text-slate-500">Score {skill.right}/{skill.total} · target {skill.target}/{skill.total}</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${priorityStyle[skill.priority] || priorityStyle.Stretch}`}>{skill.priority === "Stretch" ? "At target · stretch" : `${skill.priority} priority`}</span></div>
                  <p className="mb-0 mt-3 text-xs leading-5 text-slate-600">{skill.gapSummary}</p>
                  <ol className="mt-3 space-y-2 pl-5 text-[11px] leading-5 text-blue-950">{skill.steps.map((step, index) => <li key={`${skill.topic}-step-${index}`}>{step}</li>)}</ol>
                  <div className="mt-4 border-t border-slate-100 pt-3"><h4 className="m-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Course website</h4>
                    <div className="mt-2 space-y-2">{skill.resources.map((resource) => <div className="rounded-lg bg-slate-50 p-3" key={`${skill.topic}-${resource.title}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2"><a className="text-[11px] font-semibold text-blue-600 hover:text-blue-800" href={resource.url} target="_blank" rel="noopener noreferrer">{resource.title} ↗</a><span className="text-[9px] text-slate-400">{resource.level} · {resource.hours}h · {resource.source}</span></div>
                      <p className="mb-0 mt-1 text-[10px] leading-4 text-slate-600">{resource.reason}</p>
                    </div>)}</div>
                  </div>
                </article>)}
              </div>
            </section>
          </div> : null}
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <ChatBot/>
        </aside>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem("kgipUser") || "null"));
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sectionData, setSectionData] = useState(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(loadResult);
  const [assessmentLoadError, setAssessmentLoadError] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiRecommendationFor, setAiRecommendationFor] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [notificationCount, setNotificationCount] = useUnreadNotificationCount(Boolean(user));
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState("");

  const loadDashboard = useCallback(() => request("/employee/dashboard")
    .then((data) => { setDashboard(data); setDashboardError(""); })
    .catch((error) => setDashboardError(`Dashboard data could not be refreshed: ${error.message}`)), []);

  useEffect(() => {
    const token = localStorage.getItem("kgipToken");
    if (!user || !token || user.role !== "ROLE_EMPLOYEE") navigate("/login", { replace: true });
    else {
      loadDashboard();
      request("/employee/assessments/latest")
        .then((result) => {
          setAssessmentLoadError("");
          setAssessmentResult(result.scores?.length ? result : loadResult());
        })
        .catch((error) => {
          setAssessmentLoadError(`Saved assessment could not be loaded: ${error.message}`);
        });
    }
  }, [navigate, user, loadDashboard]);

  async function selectSection(label, forceRefresh = false) {
    setActiveItem(label);
    if (label === "Dashboard") {
      setSectionData(null);
      loadDashboard();
      return;
    }
    if (label === "Mentoring Sessions") {
      setSectionData(null);
      setSectionLoading(false);
      loadDashboard();
      return;
    }
    if (label === "My Learning" || label === "Learning") {
      setSectionData(null);
      setSectionLoading(false);
      return;
    }
    if (label === "Skill Assessment") {
      setAssessmentResult((current) => current?.scores?.length ? current : loadResult());
      setSectionData(null);
      setSectionLoading(false);
      return;
    }
    if (label === "Notifications") {
      setSectionData(null);
      setSectionLoading(false);
      return;
    }
    if (label === "Knowledge Gap") {
      setSectionData(null);
      setSectionLoading(false);
      return;
    }
    if (label === "Mentorship Requests") {
      setSectionLoading(true);
      try {
        const requests = await request("/mentorship/requests");
        setSectionData({
          message: requests.length ? "Your mentorship requests" : "You have not sent any mentorship requests yet.",
          items: requests.map((item) => `${item.mentorEmail} · ${item.status}`),
        });
      } catch (error) {
        setSectionData({ message: error.message });
      } finally {
        setSectionLoading(false);
      }
      return;
    }
    if (label === "Mentors") {
      setSectionData(null);
      setSectionLoading(true);
      try {
        const mentors = await request("/chat/mentors");
        if (!Array.isArray(mentors)) {
          throw new Error("The mentor directory returned an invalid response.");
        }
        setSectionData({ mentors });
      } catch (error) {
        setSectionData({ error: error.message });
      } finally {
        setSectionLoading(false);
      }
      return;
    }
    if (label === "AI Recommendations" || label === "Learning Recommendations") {
      setSectionData(null);
      setAiError("");
      setAiRecommendations(null);
      setAiLoading(true);
      try {
        const saved = await request("/employee/assessments/latest");
        if (!saved.scores?.length) {
          setAiRecommendationFor(null);
          setAiError("Complete and submit the Skill Assessment first. Recommendations use your assessment saved in the employee database.");
          return;
        }
        setAssessmentResult(saved);
        if (!forceRefresh && aiRecommendations && aiRecommendationFor === saved.submittedAt) return;
        const refresh = forceRefresh ? "?refresh=true" : "";
        const data = await request(`/employee/recommendations/skills${refresh}`);
        setAiRecommendations(data);
        setAiRecommendationFor(saved.submittedAt);
      } catch (error) {
        setAiRecommendations(null);
        setAiError(error.message);
      } finally {
        setAiLoading(false);
      }
      return;
    }
    setSectionLoading(true);
    const sectionKeys = {
      "My Skills": "skills",
      "Knowledge Gap": "gaps",
      "My Learning": "learning",
      "Training Programmes": "programmes",
      Feedback: "feedback",
      Learning: "learning",
      Reports: "reports",
      "My Profile": "profile",
      Settings: "settings",
    };
    if (!sectionKeys[label]) {
      setSectionData({
        message: label === "Messages / Chatbox"
          ? "Messaging is limited to approved contacts and authorised conversations. Private chats are not shown here."
          : `${label} is available in your employee workspace.`,
      });
      setSectionLoading(false);
      return;
    }
    try {
      const data = await request(`/employee/sections/${sectionKeys[label]}`);
      setSectionData(data);
    } catch (error) {
      setSectionData({ message: error.message });
    } finally {
      setSectionLoading(false);
    }
  }

  function signOut() {
    localStorage.removeItem("kgipToken");
    localStorage.removeItem("kgipUser");
    navigate("/login", { replace: true });
  }
  async function assessmentCompleted({ scores, attempt }) {
    setAiRecommendations(null);
    setAiRecommendationFor(null);
    setAiError("");
    await request("/employee/assessments", {
      method: "POST",
      body: JSON.stringify({ scores }),
    });
    setAssessmentResult({ ...attempt, scores });
    loadDashboard();
  }
  function assessmentRetaken() {
    setAssessmentResult(null);
    setAiRecommendations(null);
    setAiRecommendationFor(null);
    setAiError("");
  }
  if (!user) return null;
  const gaps = dashboard?.gaps || [];
  const readiness = dashboard?.readiness;
  const focus = dashboard?.focus;
  const connections = dashboard?.connections;
  const statIcons = [<Icon key="a" name="skills" className="h-5 w-5" />, <Icon key="b" name="gaps" className="h-5 w-5" />, <Icon key="c" name="learning" className="h-5 w-5" />, <span key="d" className="text-xl">✓</span>];
  const statTones = ["blue", "orange", "purple", "green"];
  const firstName = user.firstName || user.email?.split("@")[0] || "there";
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "AM";
  const assessmentScores = assessmentResult
    ? assessmentResult.scores || scoreByTopic(assessmentResult.questions, assessmentResult.answers)
    : [];
  const assessmentRows = assessmentScores.map((score) => {
    const current = Math.round((score.right / score.total) * 100);
    const required = Math.round((score.target / score.total) * 100);
    const difference = current - required;
    const priority = difference >= 0 ? "Low" : score.right === 0 ? "High" : "Medium";
    const tone = priority === "Low" ? "green" : priority === "High" ? "red" : "orange";
    const code = { Java: "JV", SQL: "SQ", React: "RE", "Problem Solving": "PS", "REST APIs": "API", "Git and Version Control": "GIT" }[score.topic];
    return [code, score.topic, current, required, `${difference > 0 ? "+" : ""}${difference}%`, priority, tone];
  });

  return (
    <main className="flex min-h-screen bg-slate-50 font-sans text-blue-950">
      <aside
        id="workspace-navigation"
        className={`workspace-sidebar employee-sidebar flex w-60 shrink-0 flex-col bg-[#172956] p-5 text-blue-50${sidebarOpen ? " is-open" : ""}`}
      >
        <div className="flex items-center gap-2 px-2 max-[650px]:justify-center max-[650px]:px-0">
          <SkillTrackLogo />
          <div className="max-[650px]:hidden"><strong className="block text-[19px] font-bold tracking-tight text-white">SkillTrack</strong><small className="block text-[10px] font-medium text-[#c9e7d6]">Employee workspace</small></div>
        </div>
        <p className="mb-2 mt-9 px-4 text-[10px] font-bold uppercase tracking-[1.2px] text-blue-300 max-[650px]:hidden">Employee workspace</p>
        <nav className="grid gap-1" aria-label="Employee workspace">
          {navigation.map(([icon, label]) => {
            const locked = label === "Learning Recommendations" && !assessmentResult;
            return (
              <button
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${activeItem === label ? "bg-[#208967] text-white" : "text-blue-200 hover:bg-[#208967]"} disabled:cursor-not-allowed disabled:opacity-50`}
                key={label}
                onClick={() => { selectSection(label); setSidebarOpen(false); }}
                disabled={locked}
                title={locked ? "Complete the skill assessment to unlock recommendations" : undefined}
                aria-disabled={locked}
              >
                <SidebarIcon label={label} />
                <span className="max-[650px]:hidden">{label}</span>
                {label === "Notifications" && <NotificationCountBadge count={notificationCount} className="sidebar-notification-count" />}
                {locked && <span className="ml-auto text-[10px] max-[650px]:hidden" aria-hidden="true">🔒</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="employee-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <section className="relative min-w-0 flex-1">
        <DashboardHeader
          title="Employee Dashboard"
          name={`${firstName} ${user.lastName || ""}`}
          initials={initials}
          notificationCount={notificationCount}
          onProfileClick={() => selectSection("My Profile")}
          onLogout={signOut}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          menuExpanded={sidebarOpen}
        />
        {assessmentLoadError && <p className="mx-auto mt-4 max-w-[1100px] px-8 text-xs text-rose-700 max-[650px]:px-4" role="alert">{assessmentLoadError}</p>}
        {activeItem === "AI Recommendations" || activeItem === "Learning Recommendations" ? <AIRecommendationsPage data={aiRecommendations} loading={aiLoading} error={aiError} onRetry={() => selectSection(activeItem, true)} /> : activeItem === "Knowledge Gap" ? <KnowledgeGapsPage scores={assessmentScores} onTakeAssessment={() => selectSection("Skill Assessment")} /> : activeItem === "Mentors" ? <MentorsPage mentors={sectionData?.mentors || []} loading={sectionLoading} error={sectionData?.error} /> : activeItem === "Mentorship Requests" ? <MentorshipRequestsPage data={sectionData} onRefresh={() => selectSection("Mentorship Requests")} /> : activeItem === "Feedback" ? <FeedbackPage data={sectionData} onRefresh={() => selectSection("Feedback")} /> : activeItem === "Notifications" ? <NotificationInbox roleLabel="Employee workspace" onUnreadCountChange={setNotificationCount} /> : activeItem === "Skill Assessment" ? <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
          <div className="mb-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / Skill Assessment</p><h1 className="m-0 text-2xl font-medium text-blue-950">Skill Assessment</h1><p className="mt-2 text-xs text-slate-500">Answer a short set of questions to see your strengths and get focused learning recommendations.</p></div>
          <SkillAssessment onComplete={assessmentCompleted} onRetake={assessmentRetaken} persistedResult={assessmentResult} />
        </div>  : activeItem === "My Learning" || activeItem === "Learning" ? <MyLearningPage onChanged={loadDashboard} /> : activeItem === "Mentoring Sessions" ? <MentoringSessionsPage onChanged={loadDashboard} /> : activeItem === "Messages / Chatbox" ? <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4"><MessagesPanel /></div> : activeItem !== "Dashboard" ? <SectionPage activeItem={activeItem} data={sectionData} loading={sectionLoading} /> : <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-6 max-[650px]:px-4">
          <div className="flex items-center justify-between gap-5 max-[650px]:flex-col max-[650px]:items-start">
            <div><h1 className="m-0 text-[22px] font-medium tracking-tight text-blue-950">Welcome back, {firstName}</h1><p className="mt-2 text-[11px] text-slate-500">Here&apos;s where your skills stand and what to focus on next.</p></div>
            <div className="flex items-center gap-3 max-[650px]:w-full max-[650px]:flex-wrap">
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2"><span className="grid h-[38px] w-[38px] place-items-center rounded-full border-4 border-emerald-500 border-l-emerald-100 text-[11px] font-bold text-emerald-600">{readiness?.score ?? "–"}</span><div><small className="block text-[8px] uppercase tracking-wide text-slate-400">Overall readiness</small><strong className="my-0.5 block text-[10px] text-blue-600">{readiness?.label || "Loading…"}</strong><em className={`block text-[8px] not-italic ${readiness?.change < 0 ? "text-rose-600" : "text-emerald-600"}`}>{readiness?.changeLabel || ""}</em></div></div>
              <button className="rounded-lg bg-[#176b50] px-3.5 py-3 text-[10px] font-bold text-white hover:bg-[#145a42]" onClick={() => selectSection("Skill Assessment")}>
                {assessmentResult ? "Review assessment" : "Take skill assessment"} <span className="ml-2">→</span>
              </button>
            </div>
          </div>
          {assessmentResult && (() => {
            const totalRight = assessmentScores.reduce((sum, score) => sum + score.right, 0);
            const totalQuestions = assessmentScores.reduce((sum, score) => sum + score.total, 0);
            const metTargets = assessmentScores.filter((score) => score.right >= score.target).length;
            const scorePercent = totalQuestions ? Math.round((totalRight / totalQuestions) * 100) : 0;
            return <article className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <div><p className="m-0 text-[10px] font-bold uppercase tracking-wide text-blue-500">Latest skill assessment</p><p className="mb-0 mt-1 text-xs text-blue-950">{metTargets} of {assessmentScores.length} skill areas at target · Completed {new Date(assessmentResult.submittedAt).toLocaleDateString()}</p></div>
              <div className="flex items-center gap-3"><strong className="text-lg text-blue-950">{scorePercent}%</strong><button className="text-[10px] font-semibold text-blue-600 hover:text-blue-800" onClick={() => selectSection("Skill Assessment")}>View recommendations →</button></div>
            </article>;
          })()}
          <div className="mt-5 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[650px]:gap-2">
            {(dashboard?.stats || []).map((stat, index) => <StatCard key={stat.label} icon={statIcons[index]} tone={statTones[index]} label={stat.label} value={stat.value} note={stat.note} />)}
          </div>
          <div className="mt-4 grid grid-cols-[1.65fr_1fr] gap-4 max-[900px]:grid-cols-1">
            <article className="min-h-[288px] rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between gap-2"><div><h2 className="m-0 text-sm font-medium">Knowledge gap analysis</h2><p className="mt-1.5 text-[10px] text-slate-500">Your current level compared with role expectations</p></div></div>
              <div className="mt-3 flex justify-end gap-3 text-[8px] text-slate-600"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#176b50]" />Current level</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-200" />Required level</span></div>
              {gaps.length === 0 && <p className="mt-10 text-center text-xs text-slate-500">{dashboardError || "Complete the skill assessment to see how you compare with role expectations."}</p>}
              <div className="mt-0 flex h-40 items-end justify-around gap-3 border-b border-slate-200 bg-[repeating-linear-gradient(to_top,transparent_0,transparent_39px,#eff3f8_40px)] px-2 pt-2">
                {gaps.map((gap) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={gap.name}><div className="flex h-[115px] items-end gap-1"><span className="block w-[18px] rounded-t bg-[#176b50]" style={{ height: `${gap.current}%` }} /><span className="block w-[18px] rounded-t bg-slate-200" style={{ height: `${gap.required}%` }} /></div><small className="whitespace-nowrap text-[8px] text-slate-500">{gap.name}</small></div>)}
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="m-0 text-sm font-medium">Focus this week</h2><p className="mt-1.5 text-[10px] text-slate-500">{focus ? "Your next assigned course" : "Stay on track with your plan"}</p>
              {focus ? <>
                <div className="mt-5 grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-500"><Icon name="learning" className="h-5 w-5" /></div>
                <span className={`mt-3 inline-block rounded-full px-2 py-1 text-[8px] font-bold uppercase ${focus.overdue ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"}`}>{focus.overdue ? "Overdue" : focus.status === "IN_PROGRESS" ? "In progress" : "Not started"}</span>
                <h3 className="mb-1 mt-3 text-sm font-medium">{focus.title}</h3>
                <p className="m-0 text-[10px] text-slate-500">{focus.competency ? `${focus.competency} · ` : ""}{focus.dueDate ? `Due ${focus.dueDate}` : "No due date"}</p>
                <div className="mt-4 flex justify-between text-[9px] text-slate-500"><span>Progress</span><strong className="text-blue-950">{focus.progressPercent}%</strong></div>
                <div className="mt-1.5 h-1 rounded bg-slate-200"><span className="block h-full rounded bg-blue-500" style={{ width: `${focus.progressPercent}%` }} /></div>
                <button className="mt-4 w-full rounded-lg bg-blue-500 p-2.5 text-[10px] font-bold text-white" onClick={() => selectSection("My Learning")}>{focus.progressPercent > 0 ? "Continue learning" : "Start learning"} <span className="float-right text-sm">→</span></button>
              </> : <p className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">{dashboard?.learning?.total ? "All assigned courses are completed. Nice work." : "No course has been assigned to you yet. HR will assign one after reviewing your skill gaps."}</p>}
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2 max-[900px]:col-span-1"><h2 className="m-0 text-sm font-medium">Your support network</h2><p className="mt-1.5 text-[10px] text-slate-500">The people who see your progress</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
                <div className="rounded-lg bg-slate-50 p-3"><small className="block text-[9px] uppercase text-slate-400">Mentor</small>{connections?.mentors?.length ? connections.mentors.map((m) => <p key={m.email} className="mb-0 mt-1 text-blue-950">{m.name} <span className="text-[9px] text-slate-400">({m.status.toLowerCase()}{m.subjects?.length ? ` · ${m.subjects.join(", ")}` : ""})</span></p>) : <button className="mt-1 text-left text-blue-600" onClick={() => selectSection("Mentorship Requests")}>No mentor yet – send a request</button>}</div>
                <div className="rounded-lg bg-slate-50 p-3"><small className="block text-[9px] uppercase text-slate-400">HR contact</small><p className="mb-0 mt-1 text-blue-950">{connections?.hr ? connections.hr.name : "Not assigned yet"}</p></div>
                <div className="rounded-lg bg-slate-50 p-3"><small className="block text-[9px] uppercase text-slate-400">Department head</small><p className="mb-0 mt-1 text-blue-950">{connections?.departmentHead ? connections.departmentHead.name : connections?.department ? `None found for ${connections.department}` : "No department set"}</p></div>
              </div>
              {dashboard?.upcomingSessions?.length > 0 && <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                <small className="block text-[9px] uppercase text-slate-400">Next mentoring sessions</small>
                {dashboard.upcomingSessions.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50/60 p-3 text-xs">
                  <span><strong className="text-blue-950">{session.title}</strong><span className="block text-[10px] text-slate-500">{session.mentorName} · {formatDateTime(session.scheduledAt)}</span></span>
                  {session.meetLink ? <a className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white" href={session.meetLink} target="_blank" rel="noopener noreferrer">Join Google Meet</a> : <button className="text-[10px] text-blue-600" onClick={() => selectSection("Mentoring Sessions")}>Link pending</button>}
                </div>)}
              </div>}
            </article>
          </div>
          <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><h2 className="m-0 text-sm font-medium">Skill assessment overview</h2><p className="mt-1 text-[10px] text-slate-500">{assessmentResult ? "Latest results from your skill assessment" : "Complete an assessment to see your scores and skill gaps"}</p></div>
              <button className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[9px] text-blue-950" onClick={() => selectSection("Skill Assessment")}>View assessment</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-[10px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Skill</th><th className="px-4 py-3">Current level</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Gap</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Action</th></tr></thead>
                <tbody>{assessmentRows.length ? assessmentRows.map(([code, name, current, required, gap, priority, tone]) => <tr className="border-b border-slate-200 last:border-0" key={name}><td className="px-4 py-3 font-semibold text-blue-950"><span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-[8px] font-normal text-blue-600">{code}</span>{name}</td><td className="px-4 py-3"><span className="mr-2 inline-block h-1 w-14 rounded bg-slate-200 align-middle"><span className="block h-full rounded bg-blue-500" style={{ width: `${current}%` }} /></span><b>{current}%</b></td><td className="px-4 py-3 text-slate-500">{required}%</td><td className="px-4 py-3 font-semibold text-blue-950">{gap}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[8px] ${tone === "red" ? "bg-red-50 text-red-500" : tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-500"}`}>{priority}</span></td><td className="px-4 py-3 text-blue-500">{priority === "Low" ? "Keep growing" : "Improve"}&nbsp; →</td></tr>) : <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={6}>Your assessment results will appear here after you complete the skill assessment.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        </div>}
      </section>
    </main>
  );
}