import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { request } from "../services/api";

const navigation = [
  ["grid", "Dashboard"],
  ["users", "My Team"],
  ["gap", "Team Skill Gap Analysis"],
  ["chart", "Team Skill Gap Heatmap"],
  ["check", "Employee Assessments"],
  ["sparkle", "Training Recommendations"],
  ["book", "Learning Progress"],
  ["calendar", "Mentorship Management"],
  ["bell", "Alerts and Notifications"],
  ["report", "Team Reports"],
  ["settings", "Settings"],
];

const fallbackData = {
  stats: [
    { label: "Total Team Members", value: 24, note: "Across 5 departments", icon: "users", tone: "blue" },
    { label: "Employees with Skill Gaps", value: 12, note: "4 high priority", icon: "gap", tone: "amber" },
    { label: "Training Adoption Rate", value: 76, note: "Up 8.4% this month", icon: "book", tone: "purple" },
    { label: "Critical Skill Gaps", value: 6, note: "3 require urgent action", icon: "check", tone: "green" },
  ],
  mentees: [
    { name: "Aarav Sharma", initials: "AS", department: "Engineering", skill: "Java", gap: "Spring Boot", progress: 82, status: "On Track" },
    { name: "Priya Menon", initials: "PM", department: "Data & Analytics", skill: "SQL", gap: "Query Optimization", progress: 58, status: "Needs Attention" },
    { name: "Rohan Das", initials: "RD", department: "Product", skill: "React", gap: "State Management", progress: 74, status: "On Track" },
    { name: "Maya Iyer", initials: "MI", department: "Customer Success", skill: "Communication", gap: "Presentation Skills", progress: 100, status: "Completed" },
    { name: "Nikhil Rao", initials: "NR", department: "Operations", skill: "Cloud", gap: "AWS Fundamentals", progress: 63, status: "Needs Attention" },
  ],
  gaps: [
    { name: "Java Programming", value: 72, color: "bg-blue-500" },
    { name: "SQL and Database Management", value: 58, color: "bg-violet-500" },
    { name: "React Development", value: 46, color: "bg-cyan-500" },
    { name: "Cloud Computing", value: 38, color: "bg-amber-500" },
    { name: "Communication Skills", value: 29, color: "bg-emerald-500" },
  ],
  heatmap: [
    { skill: "Java", values: [85, 78, 65, 60, 52] },
    { skill: "SQL", values: [72, 70, 62, 55, 48] },
    { skill: "React", values: [68, 75, 63, 58, 41] },
    { skill: "Cloud", values: [50, 45, 39, 33, 28] },
  ],
  learningProgress: [
    { title: "Not Started", count: 6, color: "bg-slate-200" },
    { title: "In Progress", count: 11, color: "bg-blue-500" },
    { title: "Completed", count: 7, color: "bg-emerald-500" },
  ],
  alerts: [
    { title: "Critical Java skill gap", detail: "5 employees are below required proficiency in Spring Boot.", severity: "High" },
    { title: "Cloud learning deadline", detail: "2 employees have not completed AWS fundamentals training.", severity: "Medium" },
    { title: "Communication coaching", detail: "Presentation readiness is below target for Customer Success team.", severity: "Medium" },
  ],
  recommendations: [
    { title: "Building Production APIs with Spring Boot", category: "Java", difficulty: "Intermediate", duration: "6 hours", icon: "code" },
    { title: "SQL Performance Tuning Essentials", category: "SQL", difficulty: "Advanced", duration: "4 hours", icon: "database" },
    { title: "Modern React State Patterns", category: "React", difficulty: "Intermediate", duration: "3.5 hours", icon: "layers" },
    { title: "AWS Fundamentals for Team Leads", category: "Cloud", difficulty: "Beginner", duration: "5 hours", icon: "chart" },
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
  assessments: [
    { name: "Aarav Sharma", score: 82, change: "+12%", date: "Oct 26" },
    { name: "Priya Menon", score: 58, change: "+5%", date: "Oct 25" },
    { name: "Rohan Das", score: 74, change: "+9%", date: "Oct 24" },
    { name: "Nikhil Rao", score: 63, change: "+7%", date: "Oct 23" },
  ],
};

function normalizeDashboardData(result) {
  if (!result || typeof result !== "object") return fallbackData;

  const arrayFields = [
    "stats",
    "mentees",
    "gaps",
    "heatmap",
    "learningProgress",
    "alerts",
    "recommendations",
    "sessions",
    "activity",
    "assessments",
  ];

  return arrayFields.reduce(
    (normalized, field) => ({
      ...normalized,
      [field]: Array.isArray(result[field]) ? result[field] : fallbackData[field],
    }),
    { ...fallbackData, ...result },
  );
}

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
    report: <><path d="M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5" /><path d="M9 12h6M9 16h6" /></>,
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

const sectionEndpoints = {
  "My Team": "mentees",
  "Team Skill Gap Analysis": "gaps",
  "Team Skill Gap Heatmap": "gaps",
  "Employee Assessments": "assessments",
  "Training Recommendations": "recommendations",
  "Learning Recommendations": "recommendations",
  "Learning Progress": "sessions",
  "Mentorship Management": "sessions",
  "Alerts and Notifications": "reports",
  "Team Reports": "reports",
  Settings: "settings",
};

function SectionWorkspace({ activeItem, data, dashboardData, loading, error, onSelectMentee }) {
  const employees = data?.employees || [];
  const assessments = Array.isArray(data?.assessments) ? data.assessments : [];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-500">Live workspace</p><h2 className="m-0 text-2xl font-bold text-[#0b1d35]">{activeItem}</h2><p className="mt-2 text-sm text-slate-500">{data?.message || "Connected to the mentor workspace."}</p></div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">Live data</span>
      </div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading the latest workspace data...</p> : error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Could not load this section: {error}
        </div>
      ) : activeItem === "Team Skill Gap Analysis" ? (
        <div className="space-y-5">
          {dashboardData.gaps.map((gap) => <div key={gap.name}>
            <div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-700">{gap.name}</span><strong>{gap.value}%</strong></div>
            <div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${gap.color}`} style={{ width: `${gap.value}%` }} /></div>
          </div>)}
        </div>
      ) : activeItem === "Team Skill Gap Heatmap" ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3 font-semibold">Skill</th>{["A", "B", "C", "D", "E"].map((label) => <th key={label} className="px-3 py-3 text-center font-semibold">{label}</th>)}</tr></thead>
            <tbody>{dashboardData.heatmap.map((row) => <tr key={row.skill} className="border-b border-slate-50"><td className="px-3 py-3 font-medium text-slate-700">{row.skill}</td>{row.values.map((value, index) => <td key={`${row.skill}-${index}`} className="px-2 py-3 text-center"><span className={`inline-block h-8 w-8 rounded-lg text-[10px] font-semibold ${value >= 70 ? "bg-emerald-100 text-emerald-700" : value >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{value}</span></td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : activeItem === "Training Recommendations" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {dashboardData.recommendations.map((resource) => <article key={resource.title} className="rounded-xl border border-slate-200 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon name={resource.icon} /></span>
            <p className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-wider text-violet-600">{resource.category}</p>
            <h3 className="m-0 text-sm font-bold text-[#0b1d35]">{resource.title}</h3>
            <p className="mt-2 text-xs text-slate-500">{resource.difficulty} · {resource.duration}</p>
          </article>)}
        </div>
      ) : activeItem === "Learning Progress" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {dashboardData.learningProgress.map((item) => <article key={item.title} className="rounded-xl border border-slate-200 p-4">
            <div className={`mb-3 h-2 rounded-full ${item.color}`} />
            <p className="m-0 text-xs text-slate-500">{item.title}</p>
            <strong className="mt-1 block text-2xl text-[#0b1d35]">{item.count}</strong>
          </article>)}
        </div>
      ) : activeItem === "Employee Assessments" && assessments.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3 font-semibold">Employee</th><th className="px-3 py-3 font-semibold">Skill area</th><th className="px-3 py-3 font-semibold">Score</th><th className="px-3 py-3 font-semibold">Target</th><th className="px-3 py-3 font-semibold">Submitted</th></tr></thead>
            <tbody>{assessments.map((assessment) => <tr key={`${assessment.email}-${assessment.topic}-${assessment.submittedAt}`} className="border-b border-slate-50 last:border-0"><td className="px-3 py-4 font-semibold text-[#0b1d35]">{assessment.employee}</td><td className="px-3 py-4 text-slate-600">{assessment.topic}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${assessment.score >= Math.round((assessment.target / assessment.total) * 100) ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{assessment.score}%</span></td><td className="px-3 py-4 text-slate-500">{Math.round((assessment.target / assessment.total) * 100)}%</td><td className="px-3 py-4 text-slate-500">{new Date(assessment.submittedAt).toLocaleDateString()}</td></tr>)}</tbody>
          </table>
        </div>
      ) : activeItem === "Employee Assessments" ? (
        <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No employee assessments have been submitted yet.</div>
      ) : activeItem === "Mentorship Management" && data?.message ? (
        <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">{data.message}</div>
      ) : employees.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {employees.map((employee) => <button key={employee.email} onClick={() => onSelectMentee(employee)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">{employee.initials}</span>
            <span className="min-w-0"><strong className="block truncate text-sm text-[#0b1d35]">{employee.name}</strong><span className="block truncate text-xs text-slate-500">{employee.email}</span><span className="mt-1 block text-[10px] text-slate-400">{employee.role === "ROLE_EMPLOYEE" ? "Employee" : employee.role}</span></span>
            <span className="ml-auto text-blue-500">→</span>
          </button>)}
        </div>
      ) : <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No employee records are available yet.</div>}
    </div>
  );
}

export default function MentorDashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("kgipUser") || "null");
  const [data, setData] = useState(fallbackData);
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [message, setMessage] = useState("");
  const [dataError, setDataError] = useState("");
  const [authError, setAuthError] = useState(false);
  const [sectionData, setSectionData] = useState(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");

  useEffect(() => {
    let active = true;
    const loadDashboard = () => request("/mentor/dashboard")
      .then((result) => { if (active) { setData(normalizeDashboardData(result)); setDataError(""); setAuthError(false); } })
      .catch((error) => { if (active) { setDataError(error.message); setAuthError(error.status === 401); } });
    loadDashboard();
    const refresh = window.setInterval(loadDashboard, 30000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    const endpoint = sectionEndpoints[activeItem];
    if (!endpoint) {
      setSectionData(null);
      setSectionLoading(false);
      setSectionError("");
      return undefined;
    }
    let active = true;
    setSectionData(null);
    setSectionError("");
    setSectionLoading(true);
    request(`/mentor/sections/${endpoint}`)
      .then((result) => { if (active) setSectionData(result); })
      .catch((error) => { if (active) setSectionError(error.message); })
      .finally(() => { if (active) setSectionLoading(false); });
    return () => { active = false; };
  }, [activeItem]);

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
      <header className="mentor-header sticky top-0 z-10 flex min-h-[78px] items-center justify-between gap-5 border-b border-slate-200 bg-white/95 px-8 backdrop-blur max-md:px-4">
        <div><p className="m-0 text-xs font-medium text-slate-400">Mentor workspace / {activeItem}</p><h1 className="m-0 mt-1 text-xl font-bold text-[#0b1d35]">{activeItem === "Dashboard" ? "Mentor Dashboard" : activeItem}</h1></div>
        <div className="flex min-w-0 items-center gap-3"><label className="mentor-search flex h-10 w-64 shrink items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 max-md:w-10 max-md:justify-center max-md:px-0"><Icon name="search" className="h-4 w-4 shrink-0" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="mentor-search-input min-w-0 flex-1 bg-transparent text-xs text-[#0b1d35] outline-none max-md:hidden" placeholder="Search mentees..." aria-label="Search mentees" /></label><button className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" onClick={() => showMessage("You have 3 unread notifications.")} aria-label="Notifications"><Icon name="bell" className="h-[18px] w-[18px]" /><span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" /></button><div className="flex shrink-0 items-center gap-2 border-l border-slate-200 pl-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">{initials}</span><div className="max-md:hidden"><strong className="block text-xs">{firstName} {user?.lastName || ""}</strong><small className="text-[10px] text-slate-400">Mentor</small></div></div><button onClick={signOut} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100" aria-label="Logout"><span aria-hidden="true">↪</span><span className="max-sm:hidden">Logout</span></button></div>
      </header>

      <div className="mx-auto max-w-[1400px] px-8 pb-12 pt-8 max-md:px-4 max-md:pb-24">
        {message && <div role="status" className="fixed right-6 top-24 z-30 rounded-xl bg-[#0b1d35] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
        {dataError && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"><span>{authError ? "Your mentor session is missing or expired. Sign in again to load live data." : `Live mentor data could not be loaded: ${dataError}`}</span><button className="font-semibold underline" onClick={() => authError ? signOut() : window.location.reload()}>{authError ? "Sign in" : "Retry"}</button></div>}
        {activeItem !== "Dashboard" ? <SectionWorkspace activeItem={activeItem} data={sectionData} dashboardData={data} loading={sectionLoading} error={sectionError} onSelectMentee={(employee) => showMessage(`${employee.name} selected. Assessment and mentoring actions are ready.`)} /> : <>
          <section className="flex items-center justify-between gap-5 rounded-2xl bg-gradient-to-br from-[#123c71] to-[#1d5eb1] p-7 text-white shadow-lg shadow-blue-900/10 max-md:flex-col max-md:items-start"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-blue-200">Tuesday, October 27, 2026</p>          <h2 className="m-0 text-3xl font-bold tracking-tight">Welcome back, Mentor!</h2><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Help your mentees grow by identifying skill gaps and recommending personalized learning paths.</p>
</div><button onClick={() => showMessage("Session scheduler opened — choose a mentee to continue.")} className="shrink-0 rounded-xl bg-white px-4 py-3 text-xs font-bold text-blue-700 shadow-sm hover:bg-blue-50">+ Schedule Mentoring Session</button></section>          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}</section>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Team overview" action="View all" onAction={() => setActiveItem("My Team")} /><div className="mb-4 flex items-center gap-2"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none"><option>All statuses</option><option>On Track</option><option>Needs Attention</option><option>Completed</option></select><span className="text-xs text-slate-400">{mentees.length} team members shown</span></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] border-collapse text-left text-xs"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3 font-semibold">Employee name</th><th className="px-3 py-3 font-semibold">Department</th><th className="px-3 py-3 font-semibold">Primary skill</th><th className="px-3 py-3 font-semibold">Knowledge gap</th><th className="px-3 py-3 font-semibold">Progress</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-3 py-3 font-semibold">Action</th></tr></thead><tbody>{mentees.map((mentee) => <tr key={mentee.name} className="border-b border-slate-50 last:border-0"><td className="px-3 py-4"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600">{mentee.initials}</span><strong>{mentee.name}</strong></div></td><td className="px-3 py-4 text-slate-500">{mentee.department}</td><td className="px-3 py-4 font-medium text-blue-900">{mentee.skill}</td><td className="px-3 py-4 text-slate-500">{mentee.gap}</td><td className="px-3 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${mentee.progress}%` }} /></div><span className="text-[10px] font-semibold">{mentee.progress}%</span></div></td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${mentee.status === "Completed" ? "bg-emerald-50 text-emerald-700" : mentee.status === "Needs Attention" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>{mentee.status}</span></td><td className="px-3 py-4"><button className="font-semibold text-blue-600 hover:text-blue-800" onClick={() => showMessage(`Opening ${mentee.name}'s profile.`)}>View</button></td></tr>)}</tbody></table></div></section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_.95fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Team skill gap analysis" action="View report" onAction={() => setActiveItem("Team Reports")} /><div className="space-y-5">{data.gaps.map((gap) => <div key={gap.name}><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-slate-600">{gap.name}</span><strong className="text-[#0b1d35]">{gap.value}%</strong></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${gap.color}`} style={{ width: `${gap.value}%` }} /></div></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Critical gap alerts" action="See all" onAction={() => setActiveItem("Alerts and Notifications")} /><div className="space-y-4">{data.alerts.map((alert) => <div key={alert.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between"><strong className="text-xs text-[#0b1d35]">{alert.title}</strong><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${alert.severity === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{alert.severity}</span></div><p className="mt-2 text-[11px] leading-5 text-slate-600">{alert.detail}</p></div>)}</div></section></div>

          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Team skill gap heatmap" action="Open heatmap" onAction={() => setActiveItem("Team Skill Gap Heatmap")} /><div className="overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-left text-xs"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400"><th className="px-3 py-3 font-semibold">Skill</th>{["A", "B", "C", "D", "E"].map((label) => <th key={label} className="px-3 py-3 font-semibold text-center">{label}</th>)}</tr></thead><tbody>{data.heatmap.map((row) => <tr key={row.skill} className="border-b border-slate-50"><td className="px-3 py-3 font-medium text-slate-700">{row.skill}</td>{row.values.map((value, index) => <td key={`${row.skill}-${index}`} className="px-2 py-3 text-center"><span className={`inline-block h-8 w-8 rounded-lg text-[10px] font-semibold ${value >= 70 ? "bg-emerald-100 text-emerald-700" : value >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{value}</span></td>)}</tr>)}</tbody></table></div></section>

          <section className="mt-8"><SectionHeading title="Learning recommendations" action="Manage recommendations" onAction={() => setActiveItem("Learning Recommendations")} /><div className="grid gap-4 md:grid-cols-3">{data.recommendations.map((resource) => <article key={resource.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Icon name={resource.icon} /></span><p className="mb-1 mt-4 text-[10px] font-bold uppercase tracking-wider text-violet-600">{resource.category}</p><h3 className="m-0 min-h-12 text-sm font-bold leading-5 text-[#0b1d35]">{resource.title}</h3><div className="mt-4 flex gap-2 text-[10px] text-slate-500"><span className="rounded bg-slate-100 px-2 py-1">{resource.difficulty}</span><span className="rounded bg-slate-100 px-2 py-1">{resource.duration}</span></div><button className="mt-5 w-full rounded-lg border border-blue-200 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50" onClick={() => showMessage(`Assigning ${resource.title}.`)}>Assign Resource</button></article>)}</div></section>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_.8fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading title="Upcoming sessions" action="Schedule session" onAction={() => showMessage("Session scheduler opened — choose a mentee to continue.")} /><div className="space-y-3">{data.sessions.map((session) => <div key={`${session.name}-${session.date}`} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3.5 max-sm:items-start"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-100 text-[10px] font-bold text-blue-700">{session.name.split(" ").map((part) => part[0]).join("")}</span><div><strong className="block text-xs">{session.name}</strong><span className="block text-[11px] text-slate-500">{session.topic}</span></div></div><div className="text-right text-[10px] text-slate-500"><strong className="block text-blue-700">{session.date}</strong><span>{session.time}</span><button className="ml-3 font-semibold text-blue-600" onClick={() => showMessage(`Details for ${session.name}'s session.`)}>View Details</button></div></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Icon name="chart" /></span><div><p className="m-0 text-xs text-slate-500">Mentor impact</p><strong className="text-2xl text-[#0b1d35]">86%</strong></div></div><p className="mt-4 text-xs leading-5 text-slate-500">Your mentees are making consistent progress. Keep focusing on the four high-priority knowledge gaps this month.</p><button onClick={() => setActiveItem("Reports")} className="mt-3 text-xs font-semibold text-blue-600">View impact report →</button></section></div>
        </>}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden" aria-label="Mobile mentor workspace">
        {[["grid", "Dashboard"], ["users", "My Team"], ["report", "Team Reports"], ["settings", "Settings"]].map(([icon, label]) => (
          <button
            key={label}
            onClick={() => setActiveItem(label === "Team Reports" ? "Team Reports" : label === "My Team" ? "My Team" : label === "Settings" ? "Settings" : "Dashboard")}
            className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium ${activeItem === label || (label === "Team Reports" && activeItem === "Team Reports") || (label === "My Team" && activeItem === "My Team") ? "text-blue-600" : "text-slate-500"}`}
          >
            <Icon name={icon} className="h-[18px] w-[18px]" />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={signOut} className="flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium text-slate-500 hover:text-rose-600" aria-label="Logout">
          <span className="text-lg">?</span>
          <span>Logout</span>
        </button>
      </nav>

    </section>

  </main>;
}
