import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { request } from "../services/api";
import DashboardHeader from "../components/DashboardHeader";

const sections = ["Dashboard", "Account Requests", "Employee Directory", "Mentor Directory", "Role Benchmarks"];

const emerald = {
  primary: "#72CBA6",
  secondary: "#208967",
  forest: "#0B2B22",
  deepForest: "#123D30",
  mint: "#EDF7F1",
  highlight: "#B5E8D1",
};
function displayError(error) {
  return error instanceof Error ? error.message : "The request failed.";
}

function MetricCard({ label, value, note }) {
  return (
    <article className="rounded-2xl border border-[#A3E4D7] bg-white p-5 shadow-sm">
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <strong className="mt-3 block text-3xl font-semibold text-[#0F5257]">{value ?? "—"}</strong>
      <p className="mb-0 mt-2 text-xs text-slate-500">{note}</p>
    </article>
  );
}

function TrendChart({ points }) {
  const width = 560;
  const height = 190;
  const coordinates = points.map((point, index) => {
    const x = points.length < 2 ? width / 2 : 18 + index * ((width - 36) / (points.length - 1));
    const y = height - 20 - (Math.max(0, Math.min(100, point.readiness_score)) / 100) * (height - 44);
    return `${x},${y}`;
  }).join(" ");

  if (!points.length) {
    return <p className="rounded-xl bg-[#E8F8F5] p-5 text-sm text-slate-500">Assessment history will appear here after employees submit assessments.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 min-w-[420px] w-full" role="img" aria-label="Assessment readiness trend">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = height - 20 - (value / 100) * (height - 44);
          return <g key={value}><line x1="18" x2={width - 18} y1={y} y2={y} stroke="#E8F8F5" /><text x="0" y={y + 4} fontSize="10" fill="#64748b">{value}</text></g>;
        })}
        <polyline points={coordinates} fill="none" stroke={emerald.secondary} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => {
          const x = points.length < 2 ? width / 2 : 18 + index * ((width - 36) / (points.length - 1));
          const y = height - 20 - (Math.max(0, Math.min(100, point.readiness_score)) / 100) * (height - 44);
          return <g key={point.date}><circle cx={x} cy={y} r="5" fill={emerald.forest} /><text x={x} y={height - 2} textAnchor="middle" fontSize="9" fill="#64748b">{point.date.slice(5)}</text></g>;
        })}
      </svg>
    </div>
  );
}

function EnrollmentDonut({ entries }) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  let start = 0;
  const segments = entries.map((entry) => {
    const end = start + (total ? (entry.value / total) * 360 : 0);
    const segment = `${entry.color} ${start}deg ${end}deg`;
    start = end;
    return segment;
  });
  if (!total) return <p className="rounded-xl bg-[#E8F8F5] p-4 text-sm text-slate-500">No learning enrollments have been recorded.</p>;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-6">
      <div className="grid h-36 w-36 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${segments.join(", ")})` }} role="img" aria-label="Learning enrollment status breakdown">
        <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center"><div><strong className="block text-2xl text-[#0F5257]">{total}</strong><small className="text-[10px] text-slate-500">enrollments</small></div></div>
      </div>
      <div className="space-y-3">{entries.map((entry) => <div key={entry.label} className="flex items-center gap-2 text-xs"><span className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }}/><span>{entry.label.replaceAll("_", " ")}</span><strong className="ml-auto">{entry.value}</strong></div>)}</div>
    </div>
  );
}

function Dashboard({ analysis, onGenerate, generating }) {
  const kpis = analysis?.summary_kpis || {};
  const charts = analysis?.chart_data || {};
  const gaps = charts.top_gaps_bar || [];
  const enrollments = charts.enrollment_status_donut || [];
  const heatmap = charts.employee_skill_heatmap || { competencies: [], rows: [] };
  const maxGap = Math.max(1, ...gaps.map((gap) => gap.value));

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl bg-gradient-to-br from-[#123D30] to-[#0B2B22] p-7 text-white shadow-lg">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-[#A3E4D7]">Workforce skill intelligence</p>
          <h2 className="m-0 text-3xl font-bold">HR Skill Gap Analysis</h2>
          <p className="mb-0 mt-2 max-w-2xl text-sm leading-6 text-emerald-50">Live assessment and role benchmark data, matched against mentor expertise.</p>
        </div>
        <button onClick={onGenerate} disabled={generating} className="rounded-xl bg-[#50C878] px-5 py-3 text-sm font-bold text-[#073d37] shadow-sm hover:bg-[#A3E4D7] disabled:cursor-wait disabled:opacity-60">
          {generating ? "Generating plans…" : "Generate plans & notify"}
        </button>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Active employees" value={kpis.active_employees} note="Approved employee accounts" />
        <MetricCard label="Available mentors" value={kpis.active_mentors} note={`${kpis.assigned_mentors ?? 0} currently assigned`}/>
        <MetricCard label="Readiness score" value={typeof kpis.readiness_score === "number" ? `${kpis.readiness_score}%` : kpis.readiness_score || "—"} note={`${kpis.assessed_employees ?? 0} employees assessed`}/>
        <MetricCard label="Open skill gaps" value={kpis.open_skill_gaps} note="Below assessment or role targets" />
        <MetricCard label="Learning completion" value={`${kpis.program_completion_rate ?? 0}%`} note={`${kpis.active_generated_programs ?? 0} active generated plans`} />
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
          <h3 className="m-0 text-base font-semibold text-[#0F5257]">Top skill gaps</h3>
          <p className="mt-1 text-xs text-slate-500">Average gap to target, with affected employee counts.</p>
          {gaps.length ? <div className="mt-5 space-y-4">{gaps.map((gap) => <div key={gap.label}>
            <div className="mb-1 flex justify-between gap-3 text-xs"><span>{gap.label} <span className="text-slate-400">· {gap.employees_affected}</span></span><strong>{gap.value}%</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E8F8F5]"><div className="h-full rounded-full bg-[#2ECC71]" style={{ width: `${Math.min(100, (gap.value / maxGap) * 100)}%` }}/></div>
          </div>)}</div> : <p className="mt-5 rounded-xl bg-[#E8F8F5] p-4 text-sm text-slate-500">No skill gaps found. Assessment and role requirement data will show here.</p>}
        </section>

        <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
          <h3 className="m-0 text-base font-semibold text-[#0F5257]">Learning completion</h3>
          <p className="mt-1 text-xs text-slate-500">Current employee enrollment statuses.</p>
          <EnrollmentDonut entries={enrollments}/>
        </section>

        <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
          <h3 className="m-0 text-base font-semibold text-[#0F5257]">Readiness trend</h3>
          <p className="mt-1 text-xs text-slate-500">Historical assessment scores grouped by submission date.</p>
          <div className="mt-4"><TrendChart points={charts.readiness_trend_line || []}/></div>
        </section>

        <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
          <h3 className="m-0 text-base font-semibold text-[#0F5257]">Employee skill heatmap</h3>
          <p className="mt-1 text-xs text-slate-500">Latest score by employee and competency.</p>
          {heatmap.rows.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[440px] border-collapse text-left text-xs">
            <thead><tr className="border-b border-slate-100 text-[10px] uppercase text-slate-400"><th className="py-2 pr-3">Employee</th>{heatmap.competencies.map((skill) => <th className="px-2 py-2 text-center" key={skill}>{skill}</th>)}</tr></thead>
            <tbody>{heatmap.rows.map((row) => <tr className="border-b border-slate-50" key={row.employee_id}><td className="py-2 pr-3 font-medium">{row.employee}</td>{heatmap.competencies.map((skill) => {
              const score = row.values[skill];
              return <td className="px-2 py-2 text-center" key={skill}><span className="inline-grid h-8 w-9 place-items-center rounded-lg font-semibold text-[#0F5257]" style={{ backgroundColor: score >= 75 ? "#A3E4D7" : score >= 50 ? "#E8F8F5" : "#f1f5f9" }}>{score ?? "—"}</span></td>;
            })}</tr>)}</tbody>
          </table></div> : <p className="mt-5 rounded-xl bg-[#E8F8F5] p-4 text-sm text-slate-500">Submit employee assessments to populate the heatmap.</p>}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-[#A3E4D7] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="m-0 text-base font-semibold text-[#0F5257]">Generated development plans</h3><p className="mt-1 text-xs text-slate-500">Plans are saved once per employee and competency; re-running analysis will not duplicate active assignments.</p></div><span className="rounded-full bg-[#E8F8F5] px-3 py-1 text-xs font-semibold text-[#0F5257]">{analysis?.generated_programs?.length || 0} records</span></div>
        {analysis?.generated_programs?.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{analysis.generated_programs.slice(0, 8).map((program) => <article key={program.program_id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3"><strong className="text-sm">{program.competency}</strong><span className="rounded-full bg-[#E8F8F5] px-2 py-1 text-[10px] font-semibold text-[#0F5257]">{program.status}</span></div>
          <p className="mb-0 mt-2 text-xs text-slate-600">{program.target_employee_name} · {program.current_score}% → {program.target_score}%</p>
          <p className="mb-0 mt-1 text-xs text-slate-500">{program.program_name}{program.mentor_name ? ` · Mentor: ${program.mentor_name}` : " · Mentor expertise match not available"}</p>
        </article>)}</div> : <p className="mt-4 rounded-xl bg-[#E8F8F5] p-4 text-sm text-slate-500">No generated plans yet. Use “Generate plans & notify” to process current skill gaps.</p>}
      </section>
    </>
  );
}

export default function HRDashboardPage() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("kgipUser") || "null");
    } catch {
      return null;
    }
  }, []);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [analysis, setAnalysis] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [roleRequirements, setRoleRequirements] = useState([]);
  const [requests, setRequests] = useState([]);
  const [mentorExpertise, setMentorExpertise] = useState({});
  const [search, setSearch] = useState("");
  const [reviewNotes, setReviewNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingMentor, setSavingMentor] = useState(null);
  const [savingBenchmark, setSavingBenchmark] = useState(false);
  const [benchmarkForm, setBenchmarkForm] = useState({ roleName: "", competency: "", requiredProficiency: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      request("/hr/skill-gap-analysis"),
      request("/hr/employees"),
      request("/hr/mentors"),
      request("/auth/registration-requests"),
      request("/hr/role-requirements"),
    ]);
    const failures = [];
    if (results[0].status === "fulfilled") setAnalysis(results[0].value);
    else failures.push(`Skill analysis: ${displayError(results[0].reason)}`);
    if (results[1].status === "fulfilled") {
      const result = results[1].value;
      setEmployees(Array.isArray(result) ? result : result.employees || []);
    } else failures.push(`Employee directory: ${displayError(results[1].reason)}`);
    if (results[2].status === "fulfilled") {
      const result = Array.isArray(results[2].value) ? results[2].value : [];
      setMentors(result);
      setMentorExpertise(Object.fromEntries(result.map((mentor) => [mentor.id, mentor.expertise || ""])));
    } else failures.push(`Mentor directory: ${displayError(results[2].reason)}`);
    if (results[3].status === "fulfilled") setRequests(results[3].value || []);
    else failures.push(`Account requests: ${displayError(results[3].reason)}`);
    if (results[4].status === "fulfilled") setRoleRequirements(results[4].value || []);
    else failures.push(`Role benchmarks: ${displayError(results[4].reason)}`);
    setError(failures.join(" "));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && ["ROLE_ADMIN", "ROLE_HR"].includes(user.role)) loadWorkspace();
  }, [loadWorkspace, user]);

  const filteredEmployees = employees.filter((employee) =>
    JSON.stringify(employee).toLowerCase().includes(search.toLowerCase()),
  );
  const filteredMentors = mentors.filter((mentor) =>
    JSON.stringify(mentor).toLowerCase().includes(search.toLowerCase()),
  );

  function signOut() {
    localStorage.removeItem("kgipToken");
    localStorage.removeItem("kgipUser");
    navigate("/login", { replace: true });
  }

  async function reviewRegistration(id, action) {
    setError("");
    setSuccess("");
    try {
      await request(`/auth/registration-requests/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ action, note: reviewNotes[id] || "" }),
      });
      setRequests((current) => current.filter((item) => item.id !== id));
      const outcome = { APPROVE: "approved", REQUEST_DETAILS: "returned for more details", REJECT: "rejected" };
      setSuccess(`Registration request ${outcome[action] || "updated"}.`);
    } catch (requestError) {
      setError(displayError(requestError));
    }
  }

  async function updateMentorExpertise(id) {
    setSavingMentor(id);
    setError("");
    setSuccess("");
    try {
      const updated = await request(`/hr/mentors/${id}/expertise`, {
        method: "PUT",
        body: JSON.stringify({ expertise: mentorExpertise[id] || "" }),
      });
      setMentors((current) => current.map((mentor) => mentor.id === id
        ? { ...mentor, expertise: updated.expertise || mentorExpertise[id] || "" }
        : mentor));
      setSuccess("Mentor expertise saved.");
    } catch (requestError) {
      setError(displayError(requestError));
    } finally {
      setSavingMentor(null);
    }
  }

  async function generatePlans() {
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const result = await request("/hr/skill-gap-analysis/generate", { method: "POST" });
      setAnalysis(result);
      setSuccess(`${result.generated_programs.filter((program) => program.created).length} new plan(s) generated; ${result.notification_payloads.length} targeted in-app notification(s) created.`);
    } catch (requestError) {
      setError(displayError(requestError));
    } finally {
      setGenerating(false);
    }
  }

  async function createBenchmark(event) {
    event.preventDefault();
    setSavingBenchmark(true);
    setError("");
    setSuccess("");
    try {
      const created = await request("/hr/role-requirements", {
        method: "POST",
        body: JSON.stringify({
          roleName: benchmarkForm.roleName.trim(),
          competency: benchmarkForm.competency.trim(),
          requiredProficiency: benchmarkForm.requiredProficiency.trim(),
        }),
      });
      setRoleRequirements((current) => [...current, created]);
      setBenchmarkForm({ roleName: "", competency: "", requiredProficiency: "" });
      setSuccess("Role benchmark saved. Re-run the analysis to use it.");
    } catch (requestError) {
      setError(displayError(requestError));
    } finally {
      setSavingBenchmark(false);
    }
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!["ROLE_ADMIN", "ROLE_HR"].includes(user.role)) return <Navigate to="/login" replace />;

  return (
    <main className="min-h-screen bg-[#f4f8f5] font-sans text-[#123d30]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#0b2b22] px-4 py-6 text-white max-lg:w-[76px] max-lg:px-3 max-md:hidden">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#50C878] text-[#073d37]" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 17V13M12 17V8M18 17V5" /></svg></span><span className="max-lg:hidden"><strong className="block text-lg">SkillTrack</strong><small className="text-[10px] text-[#A3E4D7]">HR workspace</small></span></div>
        <p className="mb-3 mt-9 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[#A3E4D7] max-lg:hidden">HR workspace</p>
        <nav className="space-y-1" aria-label="HR workspace">{sections.map((section) => <button key={section} onClick={() => { setActiveSection(section); setSearch(""); setError(""); setSuccess(""); }} className={`w-full rounded-xl px-3 py-3 text-left text-sm transition ${activeSection === section ? "bg-[#208967] font-semibold text-white" : "text-emerald-50 hover:bg-white/10"}`}><span className="max-lg:hidden">{section}</span><span className="hidden max-lg:inline" aria-hidden="true">{section.slice(0, 1)}</span></button>)}</nav>
        <div className="mt-auto border-t border-white/15 pt-4"><p className="mb-3 px-3 text-xs text-emerald-100 max-lg:hidden">{user.firstName || user.email}</p><button onClick={signOut} className="w-full rounded-xl px-3 py-3 text-left text-xs text-emerald-50 hover:bg-white/10">Log out</button></div>
      </aside>

      <section className="ml-64 min-h-screen max-lg:ml-[76px] max-md:ml-0">
        <DashboardHeader
          title="HR Dashboard"
          name={`${user.firstName || user.email}${user.lastName ? ` ${user.lastName}` : ""}`}
          initials={`${user.firstName?.[0] || "H"}${user.lastName?.[0] || ""}`.toUpperCase()}
        />
        <nav className="grid grid-cols-2 gap-2 border-b border-[#A3E4D7] bg-white p-3 md:hidden" aria-label="Mobile HR workspace">
          {sections.map((section) => <button key={section} onClick={() => { setActiveSection(section); setSearch(""); setError(""); setSuccess(""); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${activeSection === section ? "bg-[#208967] text-white" : "bg-[#E8F8F5] text-[#0F5257]"}`}>{section}</button>)}
          <button onClick={signOut} className="rounded-lg bg-[#0B2B22] px-3 py-2 text-sm font-semibold text-white">Log out</button>
        </nav>
        <div className="mx-auto max-w-[1440px] px-8 pb-12 pt-7 max-md:px-4">
          {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
          {success && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-[#E8F8F5] px-4 py-3 text-sm text-[#0F5257]">{success}</div>}
          {loading ? <div role="status" className="rounded-xl border border-[#A3E4D7] bg-white p-6 text-sm text-slate-500">Loading HR workspace data…</div> : activeSection === "Dashboard" ? (
            <Dashboard analysis={analysis} onGenerate={generatePlans} generating={generating}/>
          ) : activeSection === "Account Requests" ? (
            <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
              <div className="mb-5"><h2 className="m-0 text-lg font-semibold text-[#0F5257]">Account requests</h2><p className="mt-1 text-xs text-slate-500">Approve requested roles, reject requests, or ask applicants to provide more details.</p></div>
              {requests.length ? <div className="grid gap-3 lg:grid-cols-2">{requests.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-sm">{item.name || item.email}</strong><p className="mt-1 text-xs text-slate-500">{item.email}</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">{(item.status || "").replaceAll("_", " ")}</span></div>
                <p className="mt-3 text-xs text-slate-600">Requested: {String(item.requestedRole || "").replace("ROLE_", "").replaceAll("_", " ")} · {item.department || "No department"}</p>
                {item.reviewNote && <p className="mt-2 text-xs text-slate-500">HR note: {item.reviewNote}</p>}
                <textarea aria-label={`HR note for ${item.email}`} placeholder="Optional note for the applicant" value={reviewNotes[item.id] || ""} onChange={(event) => setReviewNotes((current) => ({ ...current, [item.id]: event.target.value }))} rows="2" className="mt-3 w-full rounded-lg border border-slate-200 p-2 text-xs"/>
                <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => reviewRegistration(item.id, "APPROVE")} className="rounded-lg bg-[#2ECC71] px-3 py-2 text-xs font-semibold text-[#073d37]">Approve</button><button onClick={() => reviewRegistration(item.id, "REQUEST_DETAILS")} disabled={!reviewNotes[item.id]?.trim()} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 disabled:opacity-50">Request details</button><button onClick={() => reviewRegistration(item.id, "REJECT")} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Reject</button></div>
              </article>)}</div> : <p className="rounded-xl bg-[#E8F8F5] p-8 text-center text-sm text-slate-500">No registration requests to review.</p>}
            </section>
          ) : activeSection === "Employee Directory" ? (
            <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-[#0F5257]">Employee directory</h2><p className="mt-1 text-xs text-slate-500">{employees.length} approved employee accounts</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees…" className="h-10 rounded-xl border border-[#A3E4D7] bg-[#f8fcfa] px-3 text-xs outline-none focus:border-[#50C878]"/></div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredEmployees.map((employee) => <article key={employee.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#E8F8F5] text-sm font-bold text-[#0F5257]">{(employee.name || employee.email || "E").slice(0, 1).toUpperCase()}</span><div><strong className="text-sm">{employee.name || employee.email}</strong><p className="mt-1 text-xs text-slate-500">{employee.email}</p></div></div><p className="mb-0 mt-4 text-xs text-slate-600">{employee.department || "Unassigned"} · {employee.role || "Employee"}</p><small className="mt-2 block text-[10px] text-slate-400">Status: {employee.status || "APPROVED"}</small></article>)}</div>
              {!filteredEmployees.length && <p className="mt-5 rounded-xl bg-[#E8F8F5] p-8 text-center text-sm text-slate-500">No employees matched your search.</p>}
            </section>
          ) : activeSection === "Mentor Directory" ? (
            <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold text-[#0F5257]">Mentor directory</h2><p className="mt-1 text-xs text-slate-500">Maintain mentor expertise so the plan generator can make skill-based matches.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search mentors…" className="h-10 rounded-xl border border-[#A3E4D7] bg-[#f8fcfa] px-3 text-xs outline-none focus:border-[#50C878]"/></div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">{filteredMentors.map((mentor) => <article key={mentor.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#E8F8F5] text-sm font-bold text-[#0F5257]">{(mentor.name || mentor.email || "M").slice(0, 1).toUpperCase()}</span><div><strong className="text-sm">{mentor.name || mentor.email}</strong><p className="mt-1 text-xs text-slate-500">{mentor.email}</p></div></div><p className="mb-3 mt-3 text-xs text-slate-500">{mentor.department || "No department assigned"}</p><label className="block text-xs font-semibold text-slate-600">Expertise <span className="font-normal text-slate-400">(comma-separated skills)</span><input value={mentorExpertise[mentor.id] || ""} onChange={(event) => setMentorExpertise((current) => ({ ...current, [mentor.id]: event.target.value }))} placeholder="Java, SQL, React" className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs font-normal outline-none focus:border-[#50C878]"/></label><button onClick={() => updateMentorExpertise(mentor.id)} disabled={savingMentor === mentor.id} className="mt-3 rounded-lg bg-[#0F5257] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{savingMentor === mentor.id ? "Saving…" : "Save expertise"}</button></article>)}</div>
              {!filteredMentors.length && <p className="mt-5 rounded-xl bg-[#E8F8F5] p-8 text-center text-sm text-slate-500">No mentors matched your search.</p>}
            </section>
          ) : (
            <section className="rounded-2xl border border-[#A3E4D7] bg-white p-5">
              <div className="mb-5"><h2 className="m-0 text-lg font-semibold text-[#0F5257]">Role benchmarks</h2><p className="mt-1 text-xs text-slate-500">Use an employee department or requested role as the role name. Proficiency accepts Beginner, Intermediate, Advanced, or a percentage.</p></div>
              <form onSubmit={createBenchmark} className="grid gap-3 rounded-xl bg-[#f4fbf8] p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                <label className="text-xs font-semibold text-slate-600">Role / department<input required value={benchmarkForm.roleName} onChange={(event) => setBenchmarkForm((form) => ({ ...form, roleName: event.target.value }))} placeholder="Engineering" className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal"/></label>
                <label className="text-xs font-semibold text-slate-600">Competency<input required value={benchmarkForm.competency} onChange={(event) => setBenchmarkForm((form) => ({ ...form, competency: event.target.value }))} placeholder="Java" className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal"/></label>
                <label className="text-xs font-semibold text-slate-600">Target proficiency<input required value={benchmarkForm.requiredProficiency} onChange={(event) => setBenchmarkForm((form) => ({ ...form, requiredProficiency: event.target.value }))} placeholder="Advanced or 90%" className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal"/></label>
                <button disabled={savingBenchmark} className="self-end rounded-lg bg-[#0F5257] px-4 py-3 text-xs font-semibold text-white disabled:opacity-60">{savingBenchmark ? "Saving…" : "Add benchmark"}</button>
              </form>
              <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[480px] border-collapse text-left text-xs"><thead><tr className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400"><th className="py-3">Role / department</th><th className="py-3">Competency</th><th className="py-3">Target</th></tr></thead><tbody>{roleRequirements.map((benchmark) => <tr key={benchmark.id} className="border-b border-slate-50"><td className="py-3">{benchmark.roleName}</td><td className="py-3">{benchmark.competency}</td><td className="py-3">{benchmark.requiredProficiency}</td></tr>)}</tbody></table></div>
              {!roleRequirements.length && <p className="mt-4 rounded-xl bg-[#E8F8F5] p-5 text-sm text-slate-500">No role benchmarks have been configured yet.</p>}
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
