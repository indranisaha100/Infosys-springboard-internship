import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { request } from "../services/api";

const navigation = [
  ["grid", "Dashboard"],
  ["users", "Account Requests"],
  ["users", "Employee Directory"],
  ["layers", "Competency Framework"],
  ["briefcase", "Role Requirements"],
  ["gap", "Organisation Skill Gap Analysis"],
  ["book", "Learning Catalogue"],
  ["path", "Learning Paths"],
  ["calendar", "Training Programmes"],
  ["mentor", "Mentor Directory"],
  ["progress", "Learning Progress"],
  ["feedback", "Feedback & Effectiveness"],
  ["report", "Reports & Analytics"],
  ["bell", "Notifications"],
];

const moduleConfig = {
  "Competency Framework": {
    endpoint: "competencies",
    title: "Competency Framework",
    description:
      "Maintain the organisation's technical and soft-skill expectations.",
    fields: [
      ["name", "Name"],
      ["category", "Category"],
      ["expectedProficiency", "Expected proficiency"],
      ["description", "Description"],
    ],
  },
  "Role Requirements": {
    endpoint: "role-requirements",
    title: "Role Requirements",
    description: "Define the proficiency expectations for each job role.",
    fields: [
      ["roleName", "Role name"],
      ["competency", "Competency"],
      ["requiredProficiency", "Required proficiency"],
    ],
  },
  "Learning Catalogue": {
    endpoint: "resources",
    title: "Learning Catalogue",
    description: "Manage approved courses and learning resources.",
    fields: [
      ["title", "Title"],
      ["category", "Category"],
      ["difficulty", "Difficulty"],
      ["competency", "Competency"],
      ["url", "Course URL"],
      ["pdfFile", "PDF file"],
    ],
  },
  "Learning Paths": {
    endpoint: "learning-paths",
    title: "Learning Paths",
    description:
      "Create structured learning sequences aligned with identified gaps.",
    fields: [
      ["name", "Path name"],
      ["competency", "Competency"],
      ["targetProficiency", "Target proficiency"],
      ["description", "Description"],
    ],
  },
  "Training Programmes": {
    endpoint: "programmes",
    title: "Training Programmes",
    description: "Coordinate organisation-wide programmes and schedules.",
    fields: [
      ["name", "Programme name"],
      ["department", "Department"],
      ["competency", "Required competency"],
      ["startDate", "Start date"],
      ["endDate", "End date"],
    ],
  },
  "Learning Progress": {
    endpoint: "learning-progress",
    title: "Learning Progress",
    description:
      "Monitor employee participation and completion using enrolment records.",
    fields: [
      ["employeeEmail", "Employee email"],
      ["learningTitle", "Learning title"],
      ["status", "Status"],
      ["progressPercent", "Progress percent"],
    ],
  },
  "Feedback & Effectiveness": {
    endpoint: "feedback",
    title: "Feedback & Effectiveness",
    description: "Review learner feedback and programme outcomes.",
    fields: [
      ["employeeEmail", "Employee email"],
      ["subject", "Course or programme"],
      ["rating", "Rating (1-5)"],
      ["comment", "Comment"],
    ],
  },
  Notifications: {
    endpoint: "notifications",
    title: "Notifications",
    description: "Send authorised learning announcements and reminders.",
    fields: [
      ["title", "Title"],
      ["message", "Message"],
      ["audience", "Audience"],
    ],
    requiredFields: ["title", "message", "audience"],
  },
  "Mentor Directory": {
    endpoint: "mentors",
    title: "Mentor Directory",
    description:
      "View mentor expertise and availability without exposing private conversations.",
    fields: [],
    readOnly: true,
  },
};

function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3.1-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    layers: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    gap: (
      <>
        <path d="M4 18V6M4 18h16M7 14l3-4 3 2 5-7" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </>
    ),
    path: (
      <>
        <circle cx="6" cy="6" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M8.5 7.5 15.5 16.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    mentor: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 21a7 7 0 0 1 14 0M19 11a3 3 0 0 1 3 3" />
      </>
    ),
    progress: (
      <>
        <path d="M4 19V5M4 19h17M8 16v-3M12 16V9M16 16V6M20 16v-5" />
      </>
    ),
    feedback: (
      <>
        <path d="M4 5h16v12H8l-4 4V5Z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
    report: (
      <>
        <path d="M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5M9 12h6M9 16h6" />
      </>
    ),
    bell: (
      <>
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
  };
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Stat({ stat }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5">
      <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
        ◆
      </span>
      <p className="m-0 text-xs text-slate-500">{stat.label}</p>
      <strong className="mt-1 block text-2xl text-[#0b1d35]">
        {stat.value}
      </strong>
      <small className="mt-1 block text-[10px] text-slate-400">
        {stat.note}
      </small>
    </article>
  );
}

function ModulePage({
  config,
  data,
  search,
  onSearch,
  onCreate,
  onDelete,
  saving,
}) {
  const [form, setForm] = useState({});
  const [showForm, setShowForm] = useState(false);
  const rows = (data || []).filter((item) =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  );
  const update = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const requiredFields = new Set(
    config.requiredFields ||
      config.fields
        .filter(([name]) => !["description", "comment", "url", "pdfFile"].includes(name))
        .map(([name]) => name),
  );
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg">{config.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{config.description}</p>
        </div>
        {!config.readOnly && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
          >
            {showForm ? "Close" : "Add new"}
          </button>
        )}
      </div>
      {showForm && !config.readOnly && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (config.endpoint === "resources" && form.pdfFile
              && form.pdfFile.type !== "application/pdf"
              && !form.pdfFile.name.toLowerCase().endsWith(".pdf")) {
              return;
            }
            onCreate(form);
            setForm({});
            setShowForm(false);
          }}
          className="mb-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"
        >
          {config.fields.map(([name, label]) => (
            <label
              key={name}
              className={
                ["description", "comment", "message"].includes(name)
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <span className="mb-1 block text-[10px] font-semibold text-slate-500">
                {label}
              </span>
              {name === "pdfFile" ? (
                <input
                  name={name}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setForm({ ...form, [name]: event.target.files?.[0] })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                />
              ) : ["description", "comment", "message"].includes(name) ? (
                <textarea
                  name={name}
                  value={form[name] || ""}
                  onChange={update}
                  required={requiredFields.has(name)}
                  rows="3"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400"
                />
              ) : name === "audience" ? (
                <select
                  name={name}
                  value={form[name] || ""}
                  onChange={update}
                  required={requiredFields.has(name)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  <option value="">Select audience</option>
                  <option value="all">Everyone</option>
                  <option value="employee">Employees</option>
                  <option value="mentor">Mentors</option>
                  <option value="manager">Managers</option>
                  <option value="hr">HR Team</option>
                  <option value="department">Specific Department</option>
                  <option value="individual">Individual Employee</option>
                </select>
              ) : (
                <input
                  name={name}
                  value={form[name] || ""}
                  onChange={update}
                  type={name.toLowerCase().includes("date") ? "date" : "text"}
                  required={requiredFields.has(name)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-400"
                />
              )}
            </label>
          ))}
          <button
            disabled={saving}
            className="rounded-lg bg-[#0b1d35] px-4 py-2 text-xs font-semibold text-white sm:col-span-2"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      )}
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={`Search ${config.title.toLowerCase()}...`}
        className="mb-4 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400"
      />
      {rows.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {" "}
          {rows.map((item) => (
            <article
              key={item.id || item.email}
              className="rounded-xl border border-slate-100 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-sm">
                  {item.name || item.title || item.email}
                </strong>
                {item.id && !config.readOnly && (
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-xs text-rose-600"
                  >
                    Deactivate
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {item.description ||
                  item.category ||
                  item.competency ||
                  item.email ||
                  "No additional details."}
              </p>
              {item.pdfFileName && <span className="mt-3 inline-block rounded bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700">PDF: {item.pdfFileName}</span>}
              <small className="mt-3 block text-[10px] text-slate-400">
                {item.expectedProficiency ||
                  item.difficulty ||
                  item.status ||
                  "Available"}
              </small>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-slate-50 p-8 text-center text-xs text-slate-500">
          No records found.
        </div>
      )}
    </section>
  );
}

export default function HRDashboardPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("kgipUser") || "null");
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [search, setSearch] = useState("");
  const [dashboard, setDashboard] = useState({
    stats: [],
    employees: [],
    gaps: [],
  });
  const [moduleData, setModuleData] = useState({});
  const [reportData, setReportData] = useState(null);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [reviewNotes, setReviewNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (activeItem !== "Account Requests") return;
    request("/auth/registration-requests")
      .then(setRegistrationRequests)
      .catch((requestError) => setError(requestError.message));
  }, [activeItem]);

  useEffect(() => {
    request("/hr/dashboard")
      .then(setDashboard)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const config = moduleConfig[activeItem];
    if (!config || moduleData[config.endpoint]) return;
    request(`/hr/${config.endpoint}`)
      .then((result) => {
        const records = Array.isArray(result) ? result : result.records || [];
        setModuleData((current) => ({
          ...current,
          [config.endpoint]: records,
        }));
      })
      .catch((requestError) => setError(requestError.message));
  }, [activeItem, moduleData]);

  useEffect(() => {
    if (activeItem !== "Reports & Analytics" || reportData) return;
    request("/hr/reports/summary")
      .then(setReportData)
      .catch((requestError) => setError(requestError.message));
  }, [activeItem, reportData]);

  const employees = useMemo(
    () =>
      (dashboard.employees || []).filter((employee) =>
        JSON.stringify(employee).toLowerCase().includes(search.toLowerCase()),
      ),
    [dashboard.employees, search],
  );
  function signOut() {
    localStorage.removeItem("kgipToken");
    localStorage.removeItem("kgipUser");
    navigate("/login", { replace: true });
  }
  function selectSection(label) {
    setActiveItem(label);
    setSearch("");
    setError("");
  }
  async function reviewRegistration(id, action) {
    try {
      await request(`/auth/registration-requests/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ action, note: reviewNotes[id] || "" }),
      });
      setRegistrationRequests((current) => current.filter((item) => item.id !== id));
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }
  async function createRecord(config, form) {
    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        typeof value === "string" ? value.trim() : value,
      ]),
    );
    if (config.endpoint === "resources" && payload.pdfFile) {
      if (payload.pdfFile.type !== "application/pdf" && !payload.pdfFile.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are allowed.");
        setSaving(false);
        return;
      }
      payload.pdfFileName = payload.pdfFile.name;
      payload.pdfContentType = "application/pdf";
      payload.pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("The PDF could not be read."));
        reader.readAsDataURL(payload.pdfFile);
      });
      delete payload.pdfFile;
    }
    const body = JSON.stringify(payload);
    const endpoint = `/hr/${config.endpoint}`;
    request(endpoint, {
      method: "POST",
      body,
    })
      .then((created) =>
        setModuleData((current) => ({
          ...current,
          [config.endpoint]: [...(current[config.endpoint] || []), created],
        })),
      )
      .catch((requestError) => setError(requestError.message))
      .finally(() => setSaving(false));
  }
  function deleteRecord(config, id) {
    request(`/hr/${config.endpoint}/${id}`, { method: "DELETE" })
      .then(() =>
        setModuleData((current) => ({
          ...current,
          [config.endpoint]: (current[config.endpoint] || []).filter(
            (item) => item.id !== id,
          ),
        })),
      )
      .catch((requestError) => setError(requestError.message));
  }
  function exportReport() {
    if (!reportData) return;
    const csv = `Metric,Value\n${Object.entries(reportData)
      .map(([key, value]) => `${key},${value}`)
      .join("\n")}`;
    const link = document.createElement("a");
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = "skilltrack-hr-report.csv";
    link.click();
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!["ROLE_ADMIN", "ROLE_HR"].includes(user.role))
    return <Navigate to="/login" replace />;
  const config = moduleConfig[activeItem];

  return (
    <main className="min-h-screen bg-[#f7f9fc] font-sans text-[#0b1d35]">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col overflow-y-auto bg-[#0b1d35] px-4 py-6 max-lg:w-[76px] max-lg:px-3 max-md:hidden">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500 text-white">
            <Icon name="progress" />
          </span>
          <span className="max-lg:hidden">
            <strong className="block text-lg text-white">SkillTrack</strong>
            <small className="text-[10px] text-blue-200">HR workspace</small>
          </span>
        </div>
        <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-blue-300 max-lg:hidden">
          Organisation capability
        </p>
        <nav className="space-y-1" aria-label="HR workspace">
          {navigation.map(([icon, label]) => (
            <button
              key={label}
              onClick={() => selectSection(label)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition ${activeItem === label ? "bg-blue-600 font-semibold text-white" : "text-blue-200 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon name={icon} className="h-[17px] w-[17px] shrink-0" />
              <span className="max-lg:hidden">{label}</span>
            </button>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="mt-6 flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-blue-200 hover:bg-rose-500/15 hover:text-white"
        >
          <span>↪</span>
          <span className="max-lg:hidden">Logout</span>
        </button>
      </aside>
      <section className="ml-64 min-h-screen max-lg:ml-[76px] max-md:ml-0">
        <header className="sticky top-0 z-10 flex min-h-[78px] items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-8 backdrop-blur max-md:px-4">
          <div>
            <p className="m-0 text-xs text-slate-400">
              HR workspace / {activeItem}
            </p>
            <h1 className="m-0 mt-1 text-xl font-bold">
              {activeItem === "Dashboard"
                ? "Organisation Skill Dashboard"
                : activeItem}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
              {`${user.firstName?.[0] || "H"}${user.lastName?.[0] || ""}`.toUpperCase()}
            </div>
            <button
              onClick={signOut}
              className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="mx-auto max-w-[1400px] px-8 pb-12 pt-8 max-md:px-4">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
            >
              {error}
            </div>
          )}
          {loading && activeItem === "Dashboard" && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"
            >
              Loading organisation skill data...
            </div>
          )}
          {activeItem === "Account Requests" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-5">
                <h2 className="m-0 text-lg">Registration requests</h2>
                <p className="mt-1 text-xs text-slate-500">Approve a requested role, reject the request, or ask the applicant to provide more details.</p>
              </div>
              {registrationRequests.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {registrationRequests.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><strong className="text-sm">{item.name || item.email}</strong><p className="mt-1 text-xs text-slate-500">{item.email}</p></div>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">{item.status.replaceAll("_", " ")}</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-600">Requested: {String(item.requestedRole || "").replace("ROLE_", "").replaceAll("_", " ")} · {item.department || "No department"}</p>
                      {item.reviewNote && <p className="mt-2 text-xs text-slate-500">HR note: {item.reviewNote}</p>}
                      <textarea aria-label={`HR note for ${item.email}`} placeholder="Optional note for the applicant" value={reviewNotes[item.id] || ""} onChange={(event) => setReviewNotes((notes) => ({ ...notes, [item.id]: event.target.value }))} rows="2" className="mt-3 w-full rounded-lg border border-slate-200 p-2 text-xs" />
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={() => reviewRegistration(item.id, "APPROVE")} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve</button>
                        <button onClick={() => reviewRegistration(item.id, "REQUEST_DETAILS")} disabled={!reviewNotes[item.id]?.trim()} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-50">Request details</button>
                        <button onClick={() => reviewRegistration(item.id, "REJECT")} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Reject</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="rounded-xl bg-slate-50 p-8 text-center text-xs text-slate-500">No registration requests to review.</p>}
            </section>
          ) : config ? (
            <ModulePage
              config={config}
              data={moduleData[config.endpoint]}
              search={search}
              onSearch={setSearch}
              saving={saving}
              onCreate={(form) => createRecord(config, form)}
              onDelete={(id) => deleteRecord(config, id)}
            />
          ) : activeItem === "Reports & Analytics" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="m-0 text-lg">Reports & Analytics</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Current organisation capability and learning totals.
                  </p>
                </div>
                <button
                  onClick={exportReport}
                  disabled={!reportData}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reportData ? (
                  Object.entries(reportData).map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                      <small className="block text-[10px] uppercase text-slate-400">
                        {label}
                      </small>
                      <strong className="mt-1 block text-2xl">{value}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">
                    Loading report data...
                  </p>
                )}
              </div>
            </section>
          ) : activeItem === "Organisation Skill Gap Analysis" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="m-0 text-lg">Organisation Skill Gap Analysis</h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest assessment target gaps across the organisation.
              </p>
              <div className="mt-5 space-y-4">
                {(dashboard.gaps || []).map((gap) => (
                  <div key={gap.label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{gap.label}</span>
                      <strong>{gap.value}% gap</strong>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-amber-500"
                        style={{ width: `${Math.min(gap.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : activeItem === "Employee Directory" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="m-0 text-lg">Employee Directory</h2>
              <p className="mt-1 text-xs text-slate-500">
                Search employees by name, email or ID.
              </p>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees..."
                className="my-4 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none"
              />
              <div className="grid gap-3 md:grid-cols-2">
                {employees.map((employee) => (
                  <article
                    key={employee.id}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <strong className="text-sm">{employee.name}</strong>
                    <p className="mt-1 text-xs text-slate-500">
                      {employee.email}
                    </p>
                    <small className="text-[10px] text-slate-400">
                      {employee.department} · {employee.role}
                    </small>
                  </article>
                ))}
              </div>
            </section>
          ) : activeItem !== "Dashboard" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="m-0 text-lg">{activeItem}</h2>
              <p className="mt-2 text-sm text-slate-500">
                This workspace is connected to the HR role. Its persistent data
                model is ready for the next workflow-specific records.
              </p>
            </section>
          ) : (
            <>
              <section className="rounded-2xl bg-gradient-to-br from-[#123c71] to-[#1d5eb1] p-7 text-white shadow-lg shadow-blue-900/10">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[.16em] text-blue-200">
                  Organisation capability overview
                </p>
                <h2 className="m-0 text-3xl font-bold">
                  Welcome back, {user.firstName || "HR Specialist"}!
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                  Turn workforce skill intelligence into focused learning
                  programmes and measurable outcomes.
                </p>
              </section>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(dashboard.stats || []).map((stat) => (
                  <Stat key={stat.label} stat={stat} />
                ))}
              </section>
              <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="m-0 text-sm font-semibold">
                        Priority organisation skill gaps
                      </h2>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Calculated from latest assessments
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        selectSection("Organisation Skill Gap Analysis")
                      }
                      className="text-xs font-semibold text-blue-600"
                    >
                      View analysis →
                    </button>
                  </div>
                  <div className="space-y-5">
                    {(dashboard.gaps || []).map((gap) => (
                      <div key={gap.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{gap.label}</span>
                          <strong>{gap.value}%</strong>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(gap.value, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h2 className="m-0 text-sm font-semibold">
                    HR quick actions
                  </h2>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Manage capability and learning operations
                  </p>
                  <div className="mt-5 grid gap-3">
                    {[
                      "Competency Framework",
                      "Learning Catalogue",
                      "Learning Paths",
                      "Training Programmes",
                    ].map((item) => (
                      <button
                        key={item}
                        onClick={() => selectSection(item)}
                        className="rounded-xl bg-slate-50 p-3 text-left text-xs font-semibold hover:bg-blue-50"
                      >
                        {item}
                        <span className="float-right text-blue-500">→</span>
                      </button>
                    ))}
                  </div>
                </section>
              </div>
              <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="m-0 text-sm font-semibold">
                  Employee directory snapshot
                </h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(dashboard.employees || []).slice(0, 6).map((employee) => (
                    <div
                      key={employee.id}
                      className="rounded-xl bg-slate-50 p-3"
                    >
                      <strong className="text-xs">{employee.name}</strong>
                      <p className="mt-1 text-[10px] text-slate-500">
                        {employee.email}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
