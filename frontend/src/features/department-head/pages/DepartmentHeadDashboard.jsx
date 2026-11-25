import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDepartmentHeadDashboard } from "../services/departmentHeadApi";
import DashboardHeader from "../../../shared/components/DashboardHeader";
import SidebarIcon from "../../../shared/components/SidebarIcon";
import NotificationInbox from "../../../shared/components/NotificationInbox";
import NotificationComposer from "../../../shared/components/NotificationComposer";
import NotificationCountBadge from "../../../shared/components/NotificationCountBadge";
import useUnreadNotificationCount from "../../../shared/hooks/useUnreadNotificationCount";
import "../styles/DepartmentHeadDashboard.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "overview", label: "Department Overview" },
  { id: "matrix", label: "Department Skill Matrix" },
  { id: "heatmap", label: "Gap Heatmap" },
  { id: "assessments", label: "Assessment Details" },
  { id: "capability", label: "Workforce Capability" },
  { id: "learning", label: "Learning & Mentoring" },
  { id: "risks", label: "Risk & Priority Alerts" },
  { id: "reports", label: "Reports & Analytics" },
  { id: "announcements", label: "Announcements" },
  { id: "notifications", label: "Notifications" },
];

function displayName(person) {
  return person?.name || [
    person?.firstName,
    person?.lastName,
  ].filter(Boolean).join(" ") || person?.email || "Unknown";
}

function heatClass(score) {
  if (score == null || score < 0) return "none";
  if (score < 40) return "critical";
  if (score < 70) return "warning";
  return "good";
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(rows, fileName) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function dateLabel(value) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function MetricCard({ icon, label, value, hint, tone = "blue" }) {
  return (
    <article className="dh-metric-card">
      <span className={`dh-metric-icon ${tone}`}>
        {icon}
      </span>

      <div>
        <p>{label}</p>
        <strong>{value ?? 0}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function EmptyState({
  children = "No records are available for this department yet.",
}) {
  return (
    <div className="dh-empty">
      <span>▧</span>
      <p>{children}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="dh-section-title">
      {eyebrow && <span>{eyebrow}</span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status || "").toLowerCase();

  const type =
    normalized.includes("critical") ||
    normalized.includes("below")
      ? "critical"
      : normalized.includes("attention") ||
        normalized.includes("improvement") ||
        normalized.includes("progress") ||
        normalized.includes("pending")
      ? "warning"
      : "good";

  return (
    <span className={`dh-status ${type}`}>
      {status || "Not assessed"}
    </span>
  );
}

export default function DepartmentHeadDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const sessionUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("kgipUser") || "null"
      );
    } catch {
      return null;
    }
  }, []);
  const [notificationCount, setNotificationCount] = useUnreadNotificationCount(Boolean(sessionUser));

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const result = await getDepartmentHeadDashboard();
      setData(result);
    } catch (err) {
      setError(
        err.message ||
        "Unable to load the Department Head Dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("kgipToken");

    if (
      !token ||
      sessionUser?.role !== "ROLE_DEPARTMENT_HEAD"
    ) {
      navigate("/login", { replace: true });
      return;
    }

    loadDashboard();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    localStorage.removeItem("kgipToken");
    localStorage.removeItem("kgipUser");

    navigate("/login", { replace: true });
  }

  function exportReport() {
    if (!data) return;

    const topics = (data.skillCoverage || []).map((skill) => skill.name);
    const rows = [
      ["Department", data.department?.name || ""],
      ["Department Head", displayName(data.departmentHead)],
      ["Generated", new Date().toLocaleString("en-IN")],
      [],
      ["SUMMARY"],
      ["Assigned employees", data.summary?.totalEmployees ?? 0],
      ["Employees assessed", data.summary?.assessedEmployees ?? 0],
      ["Employees with gaps (<70%)", data.summary?.employeesWithGaps ?? 0],
      ["Critical results (<40%)", data.summary?.criticalGaps ?? 0],
      ["Average score (%)", data.summary?.averageScore ?? 0],
      [],
      ["EMPLOYEES"],
      ["Employee", "Email", "Assessments taken", "Average score (%)", "Status"],
      ...(data.employees || []).map((employee) => [
        displayName(employee), employee.email, employee.assessmentCount,
        employee.averageScore, employee.status,
      ]),
      [],
      ["SKILL COVERAGE"],
      ["Skill / topic", "Average score (%)", "Employees below 70%", "Assessment records"],
      ...(data.skillCoverage || []).map((skill) => [
        skill.name, skill.averageScore, skill.affectedEmployees, skill.assessmentCount,
      ]),
      [],
      ["SKILL GAP HEATMAP (latest score %, blank = not assessed)"],
      ["Employee", "Email", ...topics],
      ...(data.heatmap || []).map((row) => [
        row.employee, row.email,
        ...topics.map((topic) => {
          const score = row.skills?.[topic];
          return score == null || score < 0 ? "" : score;
        }),
      ]),
      [],
      ["ASSESSMENT DETAILS"],
      ["Employee", "Email", "Skill", "Score (%)", "Correct", "Total questions", "Result", "Submitted"],
      ...(data.assessments || []).map((item) => [
        item.employee, item.email, item.topic, item.score, item.right,
        item.total, item.status, item.submittedAt || "",
      ]),
    ];

    const slug = (data.department?.name || "department").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    downloadCsv(rows, `${slug}-team-assessment-report.csv`);
  }

  if (loading) {
    return (
      <div className="dh-state-screen">
        <div className="dh-loader-mark">KG</div>
        <h2>Loading Department Dashboard</h2>
        <p>
          Retrieving department workforce and capability data…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dh-state-screen">
        <h2>Unable to load Department Head Dashboard</h2>

        <p className="dh-error-text">{error}</p>

        <div className="dh-state-actions">
          <button onClick={loadDashboard}>
            Try again
          </button>

          <button
            className="secondary"
            onClick={logout}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const department = data?.department || {};
  const employees = data?.employees || [];
  const assessments = data?.assessments || [];
  const coverage = data?.skillCoverage || [];
  const heatmap = data?.heatmap || [];
  const training = data?.learning || {};
  const mentoring = data?.mentoring || {};
  const programmes = data?.programmes || [];

  const q = search.toLowerCase();

  const filteredEmployees = employees.filter((employee) =>
    `${displayName(employee)} ${employee.email}`.toLowerCase().includes(q)
  );

  const filteredCoverage = coverage.filter((skill) =>
    skill.name.toLowerCase().includes(q)
  );

  const filteredAssessments = assessments.filter((item) =>
    `${item.employee} ${item.email} ${item.topic}`.toLowerCase().includes(q)
  );

  const priorityTopics = [...coverage].sort(
    (a, b) => b.affectedEmployees - a.affectedEmployees || a.averageScore - b.averageScore
  );

  // Latest result per employee and topic that is below 70%, lowest first.
  const latestDates = {};
  assessments.forEach((item) => {
    const key = `${item.email}|${item.topic}`.toLowerCase();
    if (!latestDates[key]) latestDates[key] = item.submittedAt;
  });
  const riskRows = heatmap
    .flatMap((row) =>
      Object.entries(row.skills || {})
        .filter(([, score]) => score >= 0 && score < 70)
        .map(([topic, score]) => ({
          employee: row.employee,
          email: row.email,
          topic,
          score,
          status: score < 40 ? "Critical" : "Needs attention",
          submittedAt: latestDates[`${row.email}|${topic}`.toLowerCase()],
        }))
    )
    .sort((a, b) => a.score - b.score);

  const departmentHead = data?.departmentHead || sessionUser || {};
  const departmentHeadName = displayName(departmentHead);
  const departmentHeadInitials =
    `${departmentHead.firstName?.[0] || departmentHeadName[0] || "D"}${departmentHead.lastName?.[0] || ""}`
      .toUpperCase();

  return (
    <div className="dh-layout">
      <aside
        id="workspace-navigation"
        className={`dh-sidebar workspace-sidebar${sidebarOpen ? " is-open" : ""}`}
      >
        <div className="dh-brand">
          <span className="dh-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 17V13M12 17V8M18 17V5" />
            </svg>
          </span>

          <div>
            <strong>SkillTrack</strong>
            <small>Department Workspace</small>
          </div>
        </div>

        <div className="dh-nav-caption">
          DEPARTMENT
        </div>

        <nav className="dh-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={
                activeSection === item.id ? "active" : ""
              }
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
                setSearch("");
                setSelectedEmployee(null);
              }}
              type="button"
            >
              <SidebarIcon label={item.label} />
              {item.label}
              {item.id === "notifications" && <NotificationCountBadge count={notificationCount} className="sidebar-notification-count" />}
            </button>
          ))}
        </nav>

        <div className="dh-sidebar-footer">
          <p>
            Organizational Knowledge Gap Intelligence Platform
          </p>

        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="dh-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="dh-main">
        <DashboardHeader
          title="Department Dashboard"
          name={departmentHeadName}
          initials={departmentHeadInitials}
          notificationCount={notificationCount}
          onLogout={logout}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          menuExpanded={sidebarOpen}
        />

        <div className="dh-content">

          {activeSection === "dashboard" && (
            <>
              <section className="dh-hero">
                <div>
                  <span>DEPARTMENT INTELLIGENCE</span>
                  <h1>
                    Welcome back, {departmentHead.firstName || "Department Head"}.
                  </h1>
                  <p>
                    Review capability, assessments and learning activity for the
                    employees HR assigned to you in {department.name || "your department"}.
                  </p>
                </div>
                <div className="dh-hero-symbol">◫</div>
              </section>

              {!employees.length && (
                <section className="dh-panel">
                  <EmptyState>
                    No employees are assigned to you yet. Ask HR to assign employees to your department.
                  </EmptyState>
                </section>
              )}

              <SectionTitle
                eyebrow="AT A GLANCE"
                title="Department Overview"
                description="Live figures for your assigned employees only."
              />

              <div className="dh-metrics-grid">
                <MetricCard icon="♙" label="Assigned Employees" value={summary.totalEmployees} hint="Employees assigned by HR" tone="blue" />
                <MetricCard icon="✓" label="Employees Assessed" value={summary.assessedEmployees} hint="At least one assessment submitted" tone="violet" />
                <MetricCard icon="⚑" label="Employees With Skill Gaps" value={summary.employeesWithGaps} hint="Latest topic score below 70%" tone="orange" />
                <MetricCard icon="!" label="Critical Skill Gaps" value={summary.criticalGaps} hint="Latest topic score below 40%" tone="red" />
              </div>

              <div className="dh-two-column">
                <section className="dh-panel">
                  <SectionTitle
                    title="Assessment Performance"
                    description="Average of the latest score for each employee and topic."
                  />
                  <div className="dh-score-highlight">
                    <strong>{summary.averageScore ?? 0}%</strong>
                    <span>Team average</span>
                  </div>
                  <div className="dh-progress-track">
                    <span style={{ width: `${Math.min(100, Math.max(0, summary.averageScore || 0))}%` }} />
                  </div>
                  <div className="dh-panel-foot">
                    <div>
                      <strong>{summary.assessedEmployees || 0}</strong>
                      <span>Employees assessed</span>
                    </div>
                    <div>
                      <strong>{summary.totalAssessments || 0}</strong>
                      <span>Assessments submitted</span>
                    </div>
                  </div>
                </section>

                <section className="dh-panel">
                  <SectionTitle title="Learning Snapshot" description="Based on saved learning-enrollment records." />
                  <div className="dh-learning-numbers">
                    <div><strong>{training.totalEnrollments || 0}</strong><span>Enrollments</span></div>
                    <div><strong>{training.completed || 0}</strong><span>Completed</span></div>
                    <div><strong>{training.inProgress || 0}</strong><span>In progress</span></div>
                  </div>
                  <p className="dh-muted-note">
                    {training.adoptionRate || 0}% of your employees have at least one enrollment.
                  </p>
                </section>
              </div>

              <section className="dh-panel">
                <SectionTitle
                  title="Priority Skill Topics"
                  description="Topics with the most employees scoring below 70%."
                />
                {priorityTopics.length ? (
                  <div className="dh-skill-bars">
                    {priorityTopics.slice(0, 6).map((skill) => (
                      <div className="dh-skill-row" key={skill.name}>
                        <div>
                          <strong>{skill.name}</strong>
                          <span>{skill.averageScore}% average · {skill.affectedEmployees} below 70%</span>
                        </div>
                        <div className="dh-skill-track">
                          <span style={{ width: `${Math.max(0, Math.min(100, skill.averageScore))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>No assessment results have been submitted by your employees yet.</EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "overview" && (
            <>
              <SectionTitle
                eyebrow="PEOPLE & STRUCTURE"
                title="Department Overview"
                description={`Employees HR assigned to you in ${department.name || "your department"}.`}
              />

              <div className="dh-metrics-grid">
                <MetricCard icon="♙" label="Employees" value={summary.totalEmployees} hint="Assigned to you" />
                <MetricCard icon="✧" label="Mentors" value={summary.totalMentors} hint="Mentors in your department" tone="orange" />
                <MetricCard icon="✓" label="Assessed" value={summary.assessedEmployees} hint="Have submitted assessments" tone="violet" />
                <MetricCard icon="◷" label="Not assessed" value={summary.notAssessed} hint="No assessment yet" tone="red" />
              </div>

              <section className="dh-panel">
                {selectedEmployee ? (
                  <div>
                    <button className="dh-primary-button" type="button" onClick={() => setSelectedEmployee(null)}>
                      ← Back to employees
                    </button>
                    <SectionTitle
                      title={displayName(selectedEmployee)}
                      description={`${selectedEmployee.email} · ${selectedEmployee.assessmentCount} assessment(s) · average ${selectedEmployee.averageScore}%`}
                    />
                    <StatusPill status={selectedEmployee.status} />
                    <div className="dh-table-wrap">
                      <table className="dh-table">
                        <thead>
                          <tr><th>Skill</th><th>Score</th><th>Submitted</th></tr>
                        </thead>
                        <tbody>
                          {selectedEmployee.assessments?.length ? (
                            selectedEmployee.assessments.map((item, index) => (
                              <tr key={`${item.topic}-${index}`}>
                                <td>{item.topic}</td>
                                <td><span className={`dh-heat-cell ${heatClass(item.score)}`}>{item.score}%</span></td>
                                <td>{dateLabel(item.submittedAt)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan="3">No assessments submitted yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="dh-panel-heading">
                      <SectionTitle
                        title="Assigned employees"
                        description="Search and open an employee to see individual assessment results."
                      />
                      <input
                        className="dh-search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search name or email…"
                      />
                    </div>

                    {filteredEmployees.length ? (
                      <div className="dh-table-wrap">
                        <table className="dh-table">
                          <thead>
                            <tr>
                              <th>Employee</th>
                              <th>Email</th>
                              <th>Assessments</th>
                              <th>Average score</th>
                              <th>Status</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEmployees.map((person) => (
                              <tr key={person.email}>
                                <td><strong>{displayName(person)}</strong></td>
                                <td>{person.email}</td>
                                <td>{person.assessmentCount}</td>
                                <td>{person.assessmentCount ? `${person.averageScore}%` : "—"}</td>
                                <td><StatusPill status={person.status} /></td>
                                <td>
                                  <button className="dh-primary-button" type="button" onClick={() => setSelectedEmployee(person)}>
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <EmptyState>
                        {employees.length ? "No employees match your search." : "No employees are assigned to you yet. Ask HR to assign employees."}
                      </EmptyState>
                    )}
                  </>
                )}
              </section>
            </>
          )}

          {activeSection === "matrix" && (
            <>
              <SectionTitle
                eyebrow="SKILL INTELLIGENCE"
                title="Department Skill Matrix"
                description="Skill coverage for your assigned employees, based on every assessment they submitted."
              />

              <section className="dh-panel">
                <div className="dh-panel-heading">
                  <div>
                    <h3>Skill / topic coverage</h3>
                    <p>Average score and the number of employees scoring below 70%.</p>
                  </div>
                  <input
                    className="dh-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search topics…"
                  />
                </div>

                {filteredCoverage.length ? (
                  <div className="dh-table-wrap">
                    <table className="dh-table">
                      <thead>
                        <tr>
                          <th>Topic</th>
                          <th>Average score</th>
                          <th>Employees below 70%</th>
                          <th>Assessment records</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCoverage.map((skill) => (
                          <tr key={skill.name}>
                            <td><strong>{skill.name}</strong></td>
                            <td>
                              <span className={`dh-heat-cell ${heatClass(skill.averageScore)}`}>{skill.averageScore}%</span>
                            </td>
                            <td>{skill.affectedEmployees}</td>
                            <td>{skill.assessmentCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>No skill assessment data is available yet.</EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "heatmap" && (
            <>
              <SectionTitle
                eyebrow="CAPABILITY GAPS"
                title="Department Gap Heatmap"
                description="Latest score per employee and topic. Grey means not assessed; red is below 40%; amber is 40–69%; green is 70% or above."
              />

              <section className="dh-panel">
                {heatmap.length && coverage.length ? (
                  <div className="dh-table-wrap">
                    <table className="dh-table dh-heatmap-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          {coverage.map((skill) => (<th key={skill.name}>{skill.name}</th>))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmap.map((person) => (
                          <tr key={person.email}>
                            <td>
                              <strong>{person.employee}</strong>
                              <small>{person.email}</small>
                            </td>
                            {coverage.map((skill) => {
                              const score = person.skills?.[skill.name] ?? -1;
                              return (
                                <td key={skill.name}>
                                  <span
                                    className={`dh-heat-cell ${heatClass(score)}`}
                                    title={`${skill.name}: ${score < 0 ? "Not assessed" : `${score}%`}`}
                                  >
                                    {score < 0 ? "—" : `${score}%`}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>
                    The heatmap appears once your assigned employees submit assessments.
                  </EmptyState>
                )}

                <div className="dh-legend">
                  <span><i className="critical" /> Critical (&lt;40%)</span>
                  <span><i className="warning" /> Needs attention (40–69%)</span>
                  <span><i className="good" /> On track (70%+)</span>
                  <span><i className="none" /> Not assessed</span>
                </div>
              </section>
            </>
          )}

          {activeSection === "assessments" && (
            <>
              <SectionTitle
                eyebrow="ASSESSMENT RECORDS"
                title="Assessment Details"
                description="Every assessment submitted by the employees assigned to you."
              />

              <section className="dh-panel">
                <div className="dh-panel-heading">
                  <div>
                    <h3>{filteredAssessments.length} assessment record(s)</h3>
                  </div>
                  <input
                    className="dh-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search employee or skill…"
                  />
                </div>

                {filteredAssessments.length ? (
                  <div className="dh-table-wrap">
                    <table className="dh-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Skill</th>
                          <th>Score</th>
                          <th>Correct / total</th>
                          <th>Result</th>
                          <th>Submitted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAssessments.map((item, index) => (
                          <tr key={`${item.email}-${item.topic}-${index}`}>
                            <td>
                              {item.employee}
                              <small>{item.email}</small>
                            </td>
                            <td>{item.topic}</td>
                            <td><strong>{item.score}%</strong></td>
                            <td>{item.right} / {item.total}</td>
                            <td><StatusPill status={item.status} /></td>
                            <td>{dateLabel(item.submittedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>No assessment records found for your assigned employees.</EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "capability" && (
            <>
              <SectionTitle
                eyebrow="WORKFORCE STRENGTHS"
                title="Workforce Capability"
                description="Strengths and improvement areas from the latest result per employee and topic."
              />

              <div className="dh-metrics-grid">
                <MetricCard icon="✓" label="On-track results" value={summary.onTrackResults} hint="Latest scores of 70% or above" tone="blue" />
                <MetricCard icon="!" label="Needs attention" value={summary.attentionResults} hint="Latest scores from 40% to 69%" tone="orange" />
                <MetricCard icon="⚑" label="Critical results" value={summary.criticalResults} hint="Latest scores below 40%" tone="red" />
                <MetricCard icon="◷" label="Not yet assessed" value={summary.notAssessed} hint="Employees without assessments" tone="violet" />
              </div>

              <section className="dh-panel">
                <SectionTitle title="Capability by topic" description="Average score and number of affected employees." />
                {coverage.length ? (
                  <div className="dh-skill-bars">
                    {coverage.map((skill) => (
                      <div className="dh-skill-row" key={skill.name}>
                        <div>
                          <strong>{skill.name}</strong>
                          <span>{skill.averageScore}% average · {skill.affectedEmployees} below 70%</span>
                        </div>
                        <div className="dh-skill-track">
                          <span style={{ width: `${Math.max(0, Math.min(100, skill.averageScore))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>No capability assessment data is available.</EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "learning" && (
            <>
              <SectionTitle
                eyebrow="DEVELOPMENT OUTCOMES"
                title="Learning & Mentoring Overview"
                description="Participation of your assigned employees in learning and mentorship."
              />

              <div className="dh-metrics-grid">
                <MetricCard icon="▤" label="Learning enrollments" value={training.totalEnrollments} hint="Saved enrollment records" />
                <MetricCard icon="✓" label="Completed" value={training.completed} hint="Status marked completed" tone="blue" />
                <MetricCard icon="◷" label="In progress" value={training.inProgress} hint="Status marked in progress" tone="orange" />
                <MetricCard icon="♧" label="Mentorship requests" value={mentoring.totalRequests} hint="From your employees" tone="violet" />
              </div>

              <div className="dh-two-column">
                <section className="dh-panel">
                  <SectionTitle title="Training programmes" description="Programmes assigned to this department." />
                  {programmes.length ? (
                    <div className="dh-list">
                      {programmes.map((programme) => (
                        <div className="dh-list-item" key={programme.id}>
                          <div>
                            <strong>{programme.name}</strong>
                            <span>{programme.competency || "Competency not specified"}</span>
                          </div>
                          <StatusPill status={programme.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState>No department-specific training programmes are recorded.</EmptyState>
                  )}
                </section>

                <section className="dh-panel">
                  <SectionTitle title="Mentoring activity" description="Request status for your employees." />
                  <div className="dh-learning-numbers">
                    <div><strong>{mentoring.pending || 0}</strong><span>Pending</span></div>
                    <div><strong>{mentoring.accepted || 0}</strong><span>Accepted</span></div>
                    <div><strong>{mentoring.completed || 0}</strong><span>Completed</span></div>
                  </div>
                </section>
              </div>
            </>
          )}

          {activeSection === "risks" && (
            <>
              <SectionTitle
                eyebrow="PRIORITY REVIEW"
                title="Risk & Priority Alerts"
                description="Latest results below the thresholds: critical below 40%, attention below 70%."
              />

              <div className="dh-metrics-grid">
                <MetricCard icon="⚑" label="Critical results" value={summary.criticalResults} hint="Score below 40%" tone="red" />
                <MetricCard icon="!" label="Attention results" value={summary.attentionResults} hint="Score from 40% to 69%" tone="orange" />
                <MetricCard icon="♙" label="Employees affected" value={summary.employeesWithGaps} hint="Employees with a result below 70%" tone="violet" />
              </div>

              <section className="dh-panel">
                {riskRows.length ? (
                  <div className="dh-table-wrap">
                    <table className="dh-table">
                      <thead>
                        <tr>
                          <th>Priority</th>
                          <th>Employee</th>
                          <th>Topic</th>
                          <th>Score</th>
                          <th>Assessment date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskRows.map((alert) => (
                          <tr key={`${alert.email}-${alert.topic}`}>
                            <td><StatusPill status={alert.status} /></td>
                            <td>
                              {alert.employee}
                              <small>{alert.email}</small>
                            </td>
                            <td>{alert.topic}</td>
                            <td><strong>{alert.score}%</strong></td>
                            <td>{dateLabel(alert.submittedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>
                    No risk alerts: none of your employees has a latest result below 70%, or no assessments have been submitted yet.
                  </EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "reports" && (
            <>
              <SectionTitle
                eyebrow="DEPARTMENT REPORTING"
                title="Reports & Analytics"
                description="Download a report for the employees assigned to you."
              />

              <section className="dh-panel dh-report-panel">
                <div>
                  <h3>Team assessment report</h3>
                  <p>
                    Includes the summary, every assigned employee, skill coverage,
                    the full skill gap heatmap and all assessment records.
                  </p>
                </div>
                <button className="dh-primary-button" onClick={exportReport}>
                  ↓ Download CSV report
                </button>
              </section>

              <div className="dh-metrics-grid">
                <MetricCard icon="♙" label="Assigned employees" value={summary.totalEmployees} hint={department.name || "Department"} />
                <MetricCard icon="▥" label="Skill topics" value={coverage.length} hint="Topics with assessment records" />
                <MetricCard icon="✓" label="Assessments" value={summary.totalAssessments} hint="Submitted by your employees" />
                <MetricCard icon="◈" label="Average score" value={`${summary.averageScore ?? 0}%`} hint="Latest result per employee and topic" />
              </div>

              <section className="dh-panel">
                <SectionTitle title="Report preview" description="All assessment records included in the download." />
                {assessments.length ? (
                  <div className="dh-table-wrap">
                    <table className="dh-table">
                      <thead>
                        <tr><th>Employee</th><th>Skill</th><th>Score</th><th>Result</th><th>Date</th></tr>
                      </thead>
                      <tbody>
                        {assessments.map((item, index) => (
                          <tr key={`${item.email}-${item.topic}-${index}`}>
                            <td>{item.employee}</td>
                            <td>{item.topic}</td>
                            <td>{item.score}%</td>
                            <td><StatusPill status={item.status} /></td>
                            <td>{dateLabel(item.submittedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>No assessment records available for your employees yet.</EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "announcements" && (
            <>
              <SectionTitle
                eyebrow="DEPARTMENT COMMUNICATION"
                title="Announcements"
                description="Department announcements are shown here when an authorised announcement workflow is connected."
              />

              <section className="dh-panel">
                <EmptyState>
                  The current project data model does not provide a department announcement feed yet. No announcements are fabricated.
                </EmptyState>
              </section>
            </>
          )}

          {activeSection === "notifications" && (
            <>
              <SectionTitle
                eyebrow="UPDATES"
                title="Notifications"
                description="Send a message to an approved employee or mentor in your department."
              />

              <div className="dh-two-column">
                <NotificationComposer
                  recipients={[
                    ...(data?.employees || []).map((person) => ({
                      ...person,
                      name: displayName(person),
                    })),
                    ...(data?.mentors || []).map((person) => ({
                      ...person,
                      name: displayName(person),
                    })),
                  ]}
                  type="DEPARTMENT_MESSAGE"
                  metadata={{ department: data?.department?.name || "" }}
                  heading="Message department member"
                />
                <section className="dh-panel">
                  <p className="dh-muted-note">Recipients are limited to the employees HR assigned to you and the mentors in your department.</p>
                </section>
              </div>
              <NotificationInbox roleLabel="Department workspace" onUnreadCountChange={setNotificationCount} />
            </>
          )}

        </div>
      </main>
    </div>
  );
}