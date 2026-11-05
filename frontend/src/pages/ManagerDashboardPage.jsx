import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { request } from "../services/api";

const menu = ["Dashboard", "My Team", "Team Skill Inventory", "Team Gap Analysis", "Skill Gap Heatmap", "Employee Assessments", "Learning Recommendations", "Learning Progress", "Mentorship Support", "Alerts & Notifications", "Team Reports", "Calendar"];

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("kgipUser") || "null");
  const [active, setActive] = useState("Dashboard");
  const [data, setData] = useState({ stats: [], employees: [], assessments: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    request("/manager/dashboard").then(setData).catch((requestError) => setError(requestError.message));
  }, []);

  function signOut() {
    localStorage.removeItem("kgipToken");
    localStorage.removeItem("kgipUser");
    navigate("/login", { replace: true });
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ROLE_MANAGER") return <Navigate to="/login" replace />;

  return <main className="min-h-screen bg-[#f7f9fc] font-sans text-[#0b1d35]">
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#0b1d35] px-4 py-6 max-lg:w-[76px] max-lg:px-3 max-md:hidden">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-white">▥</span><span className="max-lg:hidden"><strong className="block text-lg text-white">SkillTrack</strong><small className="text-[10px] text-blue-200">Manager workspace</small></span></div>
      <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-blue-300 max-lg:hidden">Team capability</p>
      <nav className="space-y-1" aria-label="Manager workspace">{menu.map((item) => <button key={item} onClick={() => setActive(item)} className={`w-full rounded-xl px-3 py-3 text-left text-xs transition ${active === item ? "bg-blue-600 font-semibold text-white" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}>{item}</button>)}</nav>
      <button onClick={signOut} className="mt-auto rounded-xl px-3 py-3 text-left text-sm text-blue-200 hover:bg-rose-500/15 hover:text-white">↪ Logout</button>
    </aside>
    <section className="ml-64 min-h-screen max-lg:ml-[76px] max-md:ml-0">
      <header className="flex min-h-[78px] items-center justify-between border-b border-slate-200 bg-white px-8 max-md:px-4"><div><p className="m-0 text-xs text-slate-400">Manager workspace / {active}</p><h1 className="m-0 mt-1 text-xl font-bold">{active === "Dashboard" ? "Team Capability Dashboard" : active}</h1></div><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">{`${user.firstName?.[0] || "M"}${user.lastName?.[0] || ""}`.toUpperCase()}</span><button onClick={signOut} className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Logout</button></div></header>
      <div className="mx-auto max-w-[1300px] px-8 pb-12 pt-8 max-md:px-4">
        {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</div>}
        {active !== "Dashboard" ? <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="m-0 text-lg">{active}</h2><p className="mt-2 text-sm text-slate-500">This manager view is restricted to assigned team data. Private employee and mentor conversations are not displayed.</p></section> : <>
          <section className="rounded-2xl bg-gradient-to-br from-[#123c71] to-[#1d5eb1] p-7 text-white"><p className="text-xs uppercase tracking-[.16em] text-blue-200">Team capability overview</p><h2 className="m-0 mt-2 text-3xl font-bold">Welcome back, {user.firstName || "Manager"}!</h2><p className="mt-2 text-sm text-blue-100">Review team gaps, assessments and development priorities without accessing private conversations.</p></section>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{data.stats.map((stat) => <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="m-0 text-xs text-slate-500">{stat.label}</p><strong className="mt-1 block text-2xl">{stat.value}</strong><small className="text-[10px] text-slate-400">{stat.note}</small></article>)}</section>
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="m-0 text-sm font-semibold">Assigned team</h2><div className="mt-4 grid gap-3 md:grid-cols-2">{data.employees.map((employee) => <article key={employee.id} className="rounded-xl bg-slate-50 p-4"><strong className="text-sm">{employee.name}</strong><p className="mt-1 text-xs text-slate-500">{employee.email}</p><small className="text-[10px] text-slate-400">{employee.department}</small></article>)}</div></section>
        </>}
      </div>
    </section>
  </main>;
}
