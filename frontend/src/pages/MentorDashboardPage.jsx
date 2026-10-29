import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { request } from "../services/api";

const navigation = [
  ["grid", "Dashboard"],
  ["users", "My Mentees"],
  ["gap", "Knowledge Gaps"],
  ["check", "Skill Assessments"],
  ["sparkle", "Learning Recommendations"],
  ["calendar", "Mentoring Sessions"],
  ["chart", "Reports"],
  ["settings", "Settings"],
];

const fallbackData = {
  stats: [
    { label: "Total Mentees", value: 24, note: "Across 5 departments", icon: "users", tone: "blue" },
    { label: "Pending Assessments", value: 8, note: "3 due this week", icon: "check", tone: "amber" },
    { label: "Knowledge Gaps Identified", value: 12, note: "4 high priority", icon: "gap", tone: "purple" },
    { label: "Active Learning Plans", value: 15, note: "82% on track", icon: "book", tone: "green" },
  ],
  mentees: [
    { name: "Aarav Sharma", initials: "AS", department: "Engineering", skill: "Java", gap: "Spring Boot", progress: 82, status: "On Track" },
    { name: "Priya Menon", initials: "PM", department: "Data & Analytics", skill: "SQL", gap: "Query Optimization", progress: 58, status: "Needs Attention" },
    { name: "Rohan Das", initials: "RD", department: "Product", skill: "React", gap: "State Management", progress: 74, status: "On Track" },
    { name: "Maya Iyer", initials: "MI", department: "Customer Success", skill: "Communication", gap: "Presentation Skills", progress: 100, status: "Completed" },
  ],
  gaps: [
    { name: "Java Programming", value: 72, color: "bg-blue-500" },
    { name: "SQL and Database Management", value: 58, color: "bg-violet-500" },
    { name: "React Development", value: 46, color: "bg-cyan-500" },
    { name: "Cloud Computing", value: 38, color: "bg-amber-500" },
    { name: "Communication Skills", value: 29, color: "bg-emerald-500" },
  ],
  recommendations: [
    { title: "Building Production APIs with Spring Boot", category: "Java", difficulty: "Intermediate", duration: "6 hours", icon: "code" },
    { title: "SQL Performance Tuning Essentials", category: "SQL", difficulty: "Advanced", duration: "4 hours", icon: "database" },
    { title: "Modern React State Patterns", category: "React", difficulty: "Intermediate", duration: "3.5 hours", icon: "layers" },
  ],
  sessions: [
    { name: "Aarav Sharma", topic: "Spring Boot architecture review", date: "Oct 28, 2026", time: "10:00 AM" },
    { name: "Rohan Das", topic: "React project check-in", date: "Oct 29, 2026", time: "2:30 PM" },
    { name: "Priya Menon", topic: "SQL learning plan", date: "Oct 31, 2026", time: "11:00 AM" },
  ],
  activity: [
    { text: "Maya Iyer completed a skill assessment.", time: "18 minutes ago", icon: "check" },
    { text: "A new React knowledge gap was detected for Rohan Das.", time: "2 hours ago", icon: "gap" },
    { text: "You assigned SQL Performance Tuning Essentials to Priya Menon.", time: "Yesterday", icon: "book" },
    { text: "Aarav Sharma improved his Java score by 12%.", time: "Yesterday", icon: "chart" },
  ],
};

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    gap: <><path d="M4 18V6M4 18h16M7 14l3-4 3 2 5-7" /></>,
    check: <><path d="m8 12 2.5 2.5L16 9" /><circle cx="12" cy="12" r="9" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    chart: <><path d="M4 19V5M4 19h17M8 16v-3M12 16V9M16 16V6M20 16v-5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19 15l2 1-2 3-2-1a7 7 0 0 1-2 1v2h-4v-2a7 7 0 0 1-2-1l-2 1-2-3 2-1a7 7 0 0 1 0-3l-2-1 2-3 2 1a7 7 0 0 1 2-1V6h4v2a7 7 0 0 1 2 1l2-1 2 3-2 1a7 7 0 0 1 0 3Z" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo() {
  return <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-white"><Icon name="chart" className="h-5 w-5" /></span><span><strong className="block text-lg tracking-tight text-white">SkillTrack</strong><small className="text-[10px] text-blue-200">Mentor workspace</small></span></div>;
}

function StatCard({ stat }) {
  const tones = { blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", purple: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600" };
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${tones[stat.tone]}`}><Icon name={stat.icon} /></span><span className="text-xs font-medium text-emerald-600">+8.4%</span></div><p className="mb-1 mt-5 text-xs font-medium text-slate-500">{stat.label}</p><strong className="text-3xl tracking-tight text-[#0b1d35]">{stat.value}</strong><p className="mt-1 text-xs text-slate-400">{stat.note}</p></article>;
}

function SectionHeading({ title, action, onAction }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-[#0b1d35]">{title}</h2><p className="mt-1 text-xs text-slate-500">Keep your mentoring work moving forward.</p></div>{action && <button className="text-xs font-semibold text-blue-600 hover:text-blue-800" onClick={onAction}>{action} <span aria-hidden="true">→</span></button>}</div>;
}

export default function MentorDashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("kgipUser") || "null");
  const [data, setData] = useState(fallbackData);
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [message, setMessage] = useState("");

  useEffect(() => {
    request("/mentor/dashboard").then(setData).catch(() => {});
  }, []);

  const mentees = useMemo(() => data.mentees.filter((mentee) => {
    const query = search.toLowerCase();
    return (!query || `${mentee.name} ${mentee.department} ${mentee.skill}`.toLowerCase().includes(query))
      && (statusFilter === "All statuses" || mentee.status === statusFilter);
  }), [data.mentees, search, statusFilter]);

  function showMessage(text) {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3000);
  }

  function signOut() {
    localStorage.removeItem("kgipToken");
    localStorage.removeItem("kgipUser");
    navigate("/login", { replace: true });
  }

  const firstName = user?.firstName || "Mentor";
  const initials = `${user?.firstName?.[0] || "M"}${user?.lastName?.[0] || ""}`.toUpperCase();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ROLE_MENTOR") return <Navigate to="/dashboard" replace />;

  return <main className="min-h-screen bg-[#f7f9fc] font-sans text-[#0b1d35]">
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#0b1d35] px-4 py-6 max-lg:w-[76px] max-lg:px-3 max-md:hidden">
      <Logo />
      <p className="mb-3 mt-10 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-blue-300 max-lg:hidden">Mentor workspace</p>
      <nav className="space-y-1" aria-label="Mentor workspace">
        {navigation.map(([icon, label]) => <button key={label} onClick={() => setActiveItem(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeItem === label ? "bg-blue-600 font-semibold text-white shadow-lg shadow-blue-950/20" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}><Icon name={icon} className="h-[18px] w-[18px] shrink-0" /><span className="max-lg:hidden">{label}</span></button>)}
      </nav>
      <button onClick={signOut} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-blue-200 hover:bg-rose-500/15 hover:text-white"><span className="text-lg">↪</span><span className="max-lg:hidden">Logout</span></button>
    </aside>

    <section className="ml-64 min-h-screen max-lg:ml-[76px] max-md:ml-0">
      <header className="sticky top-0 z-10 flex min-h-[78px] items-center justify-between gap-5 border-b border-slate-200 bg-white/95 px-8 backdrop-blur max-md:px-4">
        <div><p className="m-0 text-xs font-medium text-slate-400">Mentor workspace / {activeItem}</p><h1 className="m-0 mt-1 text-xl font-bold text-[#0b1d35]">{activeItem === "Dashboard" ? "Mentor Dashboard" : activeItem}</h1></div>
        <div className="flex items-center gap-3"><label className="flex h-10 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 max-md:w-10 max-md:justify-center max-md:px-0"><Icon name="search" className="h-4 w-4 shrink-0" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-[#0b1d35] outline-none max-md:hidden" placeholder="Search mentees..." aria-label="Search mentees" /></label><button className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" onClick={() => showMessage("You have 3 unread notifications.")} aria-label="Notifications"><Icon name="bell" className="h-[18px] w-[18px]" /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" /></button><div className="flex items-center gap-2 border-l border-slate-200 pl-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">{initials}</span><div className="max-md:hidden"><strong className="block text-xs">{firstName} {user?.lastName || ""}</strong><small className="text-[10px] text-slate-400">Mentor</small></div></div></div>
      </header>

      <div className="mx-auto max-w-[1400px] px-8 pb-12 pt-8 max-md:px-4">
        {message && <div role="status" className="fixed right-6 top-24 z-30 rounded-xl bg-[#0b1d35] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
        {activeItem !== "Dashboard" ? <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h2 className="text-2xl font-bold">{activeItem}</h2><p className="mt-2 text-sm text-slate-500">This workspace view is ready for your mentoring workflows.</p><button className="mt-6 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700" onClick={() => setActiveItem("Dashboard")}>Back to dashboard</button></div> : <>
          <section className="flex items-center justify-between gap-5 rounded-2xl bg-gradient-to-br from-[#123c71] to-[#1d5eb1] p-7 text-white shadow-lg shadow-blue-900/10 max-md:flex-col max-md:items-start"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-blue-200">Tuesday, October 27, 2026</p><h2 className="m-0 text-3xl font-bold tracking-tight">Welcome back, Mentor!</h2><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Help your mentees grow by identifying skill gaps and recommending personalized learning paths.</p></div><button onClick={() => showMessage("Session scheduler opened — choose a mentee to continue.")} className="shrink-0 rounded-xl bg-white px-4 py-3 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50">+ Schedule Mentoring Session</button></section>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Mentee progress" action="View all" onAction={() => setActiveItem("My Mentees")} /><div className="mb-4 flex items-center gap-2"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"><option>All statuses</option><option>On Track</option><option>Needs Attention</option><option>Completed</option></select><span className="text-xs text-slate-400">{mentees.length} mentees shown</span></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] border-collapse text-left text-xs"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3 font-semibold">Mentee name</th><th className="px-3 py-3 font-semibold">Department</th><th className="px-3 py-3 font-semibold">Primary skill</th><th className="px-3 py-3 font-semibold">Knowledge gap</th><th className="px-3 py-3 font-semibold">Progress</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Action</th></tr></thead><tbody>{mentees.map((mentee) => <tr key={mentee.name} className="border-b border-slate-50 last:border-0"><td className="px-3 py-4"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600">{mentee.initials}</span><strong>{mentee.name}</strong></div></td><td className="px-3 py-4 text-slate-500">{mentee.department}</td><td className="px-3 py-4 font-medium text-blue-900">{mentee.skill}</td><td className="px-3 py-4 text-slate-500">{mentee.gap}</td><td className="px-3 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${mentee.progress}%` }} /></div><span className="text-[10px] font-semibold">{mentee.progress}%</span></div></td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${mentee.status === "Completed" ? "bg-emerald-50 text-emerald-700" : mentee.status === "Needs Attention" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{mentee.status}</span></td><td className="px-3 py-4"><button className="font-semibold text-blue-600 hover:text-blue-800" onClick={() => showMessage(`Opening ${mentee.name}'s profile.`)}>View</button></td></tr>)}</tbody></table></div></section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Knowledge gap overview" action="View report" onAction={() => setActiveItem("Reports")} /><div className="space-y-5">{data.gaps.map((gap) => <div key={gap.name}><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-600">{gap.name}</span><strong className="text-[#0b1d35]">{gap.value}%</strong></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${gap.color}`} style={{ width: `${gap.value}%` }} /></div></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Recent activity" action="See all" onAction={() => showMessage("All recent activity is displayed on this dashboard.")} /><div className="space-y-4">{data.activity.map((item) => <div key={item.text} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Icon name={item.icon} className="h-4 w-4" /></span><div><p className="m-0 text-xs leading-5 text-slate-600">{item.text}</p><small className="text-[10px] text-slate-400">{item.time}</small></div></div>)}</div></section></div>

          <section className="mt-8"><SectionHeading title="Learning recommendations" action="Manage recommendations" onAction={() => setActiveItem("Learning Recommendations")} /><div className="grid gap-4 md:grid-cols-3">{data.recommendations.map((resource) => <article key={resource.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon name={resource.icon} /></span><p className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-wider text-violet-600">{resource.category}</p><h3 className="m-0 min-h-12 text-sm font-bold leading-5 text-[#0b1d35]">{resource.title}</h3><div className="mt-4 flex gap-2 text-[10px] text-slate-500"><span className="rounded bg-slate-100 px-2 py-1">{resource.difficulty}</span><span className="rounded bg-slate-100 px-2 py-1">{resource.duration}</span></div><button className="mt-5 w-full rounded-lg border border-blue-200 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50" onClick={() => showMessage(`Assigning ${resource.title}.`)}>Assign Resource</button></article>)}</div></section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_.8fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Upcoming sessions" action="Schedule session" onAction={() => showMessage("Session scheduler opened — choose a mentee to continue.")} /><div className="space-y-3">{data.sessions.map((session) => <div key={`${session.name}-${session.date}`} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3.5 max-sm:items-start"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-[10px] font-bold text-blue-700">{session.name.split(" ").map((part) => part[0]).join("")}</span><div><strong className="block text-xs">{session.name}</strong><span className="block text-[11px] text-slate-500">{session.topic}</span></div></div><div className="text-right text-[10px] text-slate-500"><strong className="block text-blue-700">{session.date}</strong><span>{session.time}</span><button className="ml-3 font-semibold text-blue-600" onClick={() => showMessage(`Details for ${session.name}'s session.`)}>View Details</button></div></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Icon name="chart" /></span><div><p className="m-0 text-xs text-slate-500">Mentor impact</p><strong className="text-2xl text-[#0b1d35]">86%</strong></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Your mentees are making consistent progress. Keep focusing on the four high-priority knowledge gaps this month.</p><button onClick={() => setActiveItem("Reports")} className="mt-3 text-xs font-semibold text-blue-600">View impact report →</button></section></div>
        </>}
      </div>
    </section>
  </main>;
}
