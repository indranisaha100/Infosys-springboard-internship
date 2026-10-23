import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { request } from "../services/api";
import SkillAssessment from "../../../skill-assessment/SkillAssessment";
import { loadResult, scoreByTopic } from "../../../skill-assessment/skillAssessmentData";

const navigation = [
  ["dashboard", "Dashboard"], ["skills", "My Skills"], ["assessment", "Skill Assessment"], ["gaps", "Knowledge Gaps"], ["learning", "Learning"],
  ["bell", "Notifications"], ["report", "Reports"], ["profile", "My Profile"], ["settings", "Settings"],
];
const gaps = [
  { name: "Product", current: 62, required: 77 },
  { name: "Advanced", current: 55, required: 77 },
  { name: "Data-Informed", current: 68, required: 73 },
  { name: "Stakeholder", current: 70, required: 73 },
];
function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    skills: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
    assessment: <><path d="m8 12 2.5 2.5L16 9" /><circle cx="12" cy="12" r="9" /></>,
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
  return <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500 text-white"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 17V13M12 17V8M18 17V5" /></svg></span>;
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
    "Knowledge Gaps": "Prioritize the skills that will have the biggest impact.",
    Learning: "Continue building the skills that matter to your role.",
    Notifications: "Stay up to date with your SkillTrack workspace.",
    Reports: "Review your latest skill and readiness reports.",
    "My Profile": "Manage your employee profile information.",
    Settings: "Manage your workspace preferences.",
  };
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
            <p className="text-sm text-blue-950">{data?.message || "Connected to the employee workspace."}</p>
            {data?.nextAction && <div className="mt-5 rounded-lg bg-blue-50 p-4 text-xs text-blue-800"><strong>Next action</strong><p className="mt-1">{data.nextAction}</p></div>}
            {data?.user && <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-4 text-xs"><strong>Name</strong><p className="mt-1 text-slate-600">{data.user.firstName} {data.user.lastName || ""}</p></div><div className="rounded-lg bg-slate-50 p-4 text-xs"><strong>Email</strong><p className="mt-1 text-slate-600">{data.user.email}</p></div></div>}
            {data?.items && <div className="mt-5 grid gap-3 sm:grid-cols-2">{data.items.map((item) => <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-blue-900" key={item}>{item}<span className="float-right text-blue-500">→</span></div>)}</div>}
            {!data?.items && !data?.user && !data?.nextAction && <div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">This workspace page is connected and ready for your employee data.</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem("kgipUser") || "null"));
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [sectionData, setSectionData] = useState(null);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(loadResult);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
    else request("/employee/dashboard").catch(() => {
      setSectionData({ message: "Dashboard data could not be refreshed from the server." });
    });
  }, [navigate, user]);

  async function selectSection(label) {
    setActiveItem(label);
    if (label === "Dashboard") {
      setSectionData(null);
      setAssessmentResult(loadResult());
      return;
    }
    if (label === "Skill Assessment") {
      setAssessmentResult(loadResult());
      setSectionData(null);
      setSectionLoading(false);
      return;
    }
    setSectionLoading(true);
    const sectionKeys = {
      "My Skills": "skills",
      "Knowledge Gaps": "gaps",
      Learning: "learning",
      Notifications: "notifications",
      Reports: "reports",
      "My Profile": "profile",
      Settings: "settings",
    };
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
  if (!user) return null;
  const firstName = user.firstName || user.email?.split("@")[0] || "there";
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "AM";
  const assessmentScores = assessmentResult ? scoreByTopic(assessmentResult.questions, assessmentResult.answers) : [];
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
      <aside className="flex w-60 shrink-0 flex-col bg-[#172956] p-5 text-blue-50 max-[650px]:w-16 max-[650px]:px-2">
        <div className="flex items-center gap-2 px-2 max-[650px]:justify-center max-[650px]:px-0">
          <SkillTrackLogo />
          <div className="max-[650px]:hidden"><strong className="block text-[17px]">SkillTrack</strong><small className="block text-[8px] text-blue-200">Knowledge that moves forward</small></div>
        </div>
        <p className="mb-2 mt-9 px-4 text-[10px] font-bold uppercase tracking-[1.2px] text-blue-300 max-[650px]:hidden">Employee workspace</p>
        <nav className="grid gap-1" aria-label="Employee workspace">
          {navigation.map(([icon, label]) => (
            <button className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${activeItem === label ? "bg-[#315fae] text-white" : "text-blue-200 hover:bg-[#315fae]"}`} key={label} onClick={() => selectSection(label)}>
              <Icon name={icon} className="h-[18px] w-[18px] shrink-0" /><span className="max-[650px]:hidden">{label}</span>
              {label === "Notifications" && <b className="ml-auto grid h-[18px] w-[18px] place-items-center rounded-full bg-rose-500 text-[10px] text-white">3</b>}
            </button>
          ))}
        </nav>
        <button className="mt-4 flex items-center gap-3 rounded-lg border border-blue-200/20 px-3 py-2.5 text-left text-sm text-blue-200 hover:bg-rose-500/20 hover:text-white max-[650px]:justify-center" onClick={signOut}>
          <span className="text-lg">↪</span><span className="max-[650px]:hidden">Log out</span>
        </button>
        <div className="mt-auto rounded-lg border border-blue-200/20 bg-blue-900/40 p-3.5 max-[650px]:hidden">
          <span className="mb-2 grid h-7 w-7 place-items-center rounded-md bg-blue-900 text-white"><Icon name="learning" className="h-4 w-4" /></span><strong className="text-[13px]">Need a hand?</strong>
          <p className="my-2.5 text-[11px] text-blue-200">Explore the SkillTrack guide</p><button className="text-[11px] text-white">View help center <span>→</span></button>
        </div>
      </aside>

      <section className="relative min-w-0 flex-1">
        <header className="flex min-h-[75px] items-center justify-between gap-5 border-b border-slate-200 bg-white px-8 max-[650px]:px-4">
          <div className="flex items-center gap-3 text-[11px] max-[650px]:hidden"><span className="text-slate-400">My workspace</span><b className="text-base text-slate-300">›</b><strong className="font-medium">{activeItem}</strong></div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex h-[38px] w-[307px] items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-slate-400 max-[900px]:w-[220px] max-[650px]:w-[150px]"><span>⌕</span><input className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[11px] text-blue-950 outline-none" placeholder="Search skills, people or reports..." aria-label="Search" /><kbd className="whitespace-nowrap rounded border border-slate-200 px-1 text-[10px] max-[650px]:hidden">⌘ K</kbd></div>
            <button className="relative grid h-[38px] w-[38px] place-items-center rounded-lg border border-slate-200 bg-white text-slate-500" aria-label="Notifications"><Icon name="bell" className="h-[18px] w-[18px]" /><b className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] text-white">3</b></button>
            <button className="grid grid-cols-[34px_95px_12px] grid-rows-2 gap-x-2 border-0 bg-transparent text-left max-[650px]:grid-cols-[30px_12px]" onClick={() => selectSection("My Profile")}>
              <span className="row-span-2 grid place-items-center rounded-lg border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-600">{initials}</span><strong className="text-[11px] max-[650px]:hidden">{firstName} {user.lastName || ""}</strong><small className="text-[9px] text-slate-400 max-[650px]:hidden">Product Designer</small><i className="col-start-3 row-span-2 self-center text-slate-400">⌄</i>
            </button>
          </div>
        </header>
        {activeItem === "Skill Assessment" ? <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
          <div className="mb-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">My workspace / Skill Assessment</p><h1 className="m-0 text-2xl font-medium text-blue-950">Skill Assessment</h1><p className="mt-2 text-xs text-slate-500">Answer a short set of questions to see your strengths and get focused learning recommendations.</p></div>
          <SkillAssessment onComplete={() => setAssessmentResult(loadResult())} />
        </div> : activeItem !== "Dashboard" ? <SectionPage activeItem={activeItem} data={sectionData} loading={sectionLoading} /> : <div className="mx-auto max-w-[1100px] px-8 pb-14 pt-6 max-[650px]:px-4">
          <div className="flex items-center justify-between gap-5 max-[650px]:flex-col max-[650px]:items-start">
            <div><h1 className="m-0 text-[22px] font-medium tracking-tight text-blue-950">Welcome back, {firstName}</h1><p className="mt-2 text-[11px] text-slate-500">Here&apos;s where your skills stand and what to focus on next.</p></div>
            <div className="flex items-center gap-3 max-[650px]:w-full max-[650px]:flex-wrap">
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2"><span className="grid h-[38px] w-[38px] place-items-center rounded-full border-4 border-emerald-500 border-l-emerald-100 text-[11px] font-bold text-emerald-600">78</span><div><small className="block text-[8px] uppercase tracking-wide text-slate-400">Overall readiness</small><strong className="my-0.5 block text-[10px] text-blue-600">Strong foundation</strong><em className="block text-[8px] not-italic text-emerald-600">Up 6% this quarter</em></div></div>
              <button className="rounded-lg bg-blue-500 px-3.5 py-3 text-[10px] font-bold text-white hover:bg-blue-600" onClick={() => selectSection("Skill Assessment")}>
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
            <StatCard icon={<Icon name="skills" className="h-5 w-5" />} tone="blue" label="Total skills" value="24" note="Across 5 categories" /><StatCard icon={<Icon name="gaps" className="h-5 w-5" />} tone="orange" label="Skills to improve" value="6" note="2 are high priority" /><StatCard icon={<Icon name="learning" className="h-5 w-5" />} tone="purple" label="Learning progress" value="68%" note="+12% this month" /><StatCard icon={<span className="text-xl">✓</span>} tone="green" label="Completed trainings" value="12" note="3 this quarter" />
          </div>
          <div className="mt-4 grid grid-cols-[1.65fr_1fr] gap-4 max-[900px]:grid-cols-1">
            <article className="min-h-[288px] rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between gap-2"><div><h2 className="m-0 text-sm font-medium">Knowledge gap analysis</h2><p className="mt-1.5 text-[10px] text-slate-500">Your current level compared with role expectations</p></div><button className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[9px] text-slate-500">This quarter⌄</button></div>
              <div className="mt-3 flex justify-end gap-3 text-[8px] text-slate-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-500" />Current level</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-200" />Required level</span></div>
              <div className="mt-0 flex h-40 items-end justify-around gap-3 border-b border-slate-200 bg-[repeating-linear-gradient(to_top,transparent_0,transparent_39px,#eff3f8_40px)] px-2 pt-2">
                {gaps.map((gap) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-2" key={gap.name}><div className="flex h-[115px] items-end gap-1"><span className="block w-[18px] rounded-t bg-blue-500" style={{ height: `${gap.current}%` }} /><span className="block w-[18px] rounded-t bg-slate-200" style={{ height: `${gap.required}%` }} /></div><small className="whitespace-nowrap text-[8px] text-slate-500">{gap.name}</small></div>)}
              </div>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="m-0 text-sm font-medium">Focus this week</h2><p className="mt-1.5 text-[10px] text-slate-500">Stay on track with your plan</p><div className="mt-5 grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-500"><Icon name="learning" className="h-5 w-5" /></div><span className="mt-3 inline-block rounded-full bg-orange-50 px-2 py-1 text-[8px] font-bold uppercase text-orange-500">High priority</span><h3 className="mb-1 mt-3 text-sm font-medium">Advanced Prototyping in Figma</h3><p className="m-0 text-[10px] text-slate-500">Build realistic interactions and scalable design systems.</p><div className="mt-4 flex justify-between text-[9px] text-slate-500"><span>5 of 8 modules</span><strong className="text-blue-950">62%</strong></div><div className="mt-1.5 h-1 rounded bg-slate-200"><span className="block h-full w-[62%] rounded bg-blue-500" /></div><button className="mt-4 w-full rounded-lg bg-blue-500 p-2.5 text-[10px] font-bold text-white">Continue learning <span className="float-right text-sm">→</span></button></article>
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
