import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDepartmentHeadDashboard } from "../services/departmentHeadApi";
import "./DepartmentHeadDashboard.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "overview", label: "Department Overview", icon: "▤" },
  { id: "matrix", label: "Department Skill Matrix", icon: "▥" },
  { id: "heatmap", label: "Gap Heatmap", icon: "▦" },
  { id: "capability", label: "Workforce Capability", icon: "♙" },
  { id: "learning", label: "Learning & Mentoring", icon: "◈" },
  { id: "risks", label: "Risk & Priority Alerts", icon: "⚑" },
  { id: "reports", label: "Reports & Analytics", icon: "▧" },
  { id: "announcements", label: "Announcements", icon: "▣" },
  { id: "notifications", label: "Notifications", icon: "♢" },
];

function displayName(person) {
  return [
    person?.firstName,
    person?.lastName,
  ].filter(Boolean).join(" ") || person?.email || "Unknown";
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
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const sessionUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("kgipUser") || "null"
      );
    } catch {
      return null;
    }
  }, []);

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

  function exportCsv() {
    if (!data) return;

    const rows = [
      ["Department", data.department?.name || ""],
      [],
      [
        "Skill / Topic",
        "Average assessment score",
        "Assessed employees",
        "Employees needing attention",
      ],
      ...(data.skills || []).map((skill) => [
        skill.name,
        skill.averageScore,
        skill.assessedEmployees,
        skill.employeesAtRisk,
      ]),
      [],
      [
        "Employee",
        "Email",
        "Topic",
        "Score",
        "Status",
        "Assessment date",
      ],
      ...(data.assessments || []).map((item) => [
        item.employeeName,
        item.email,
        item.topic,
        item.score,
        item.status,
        item.submittedAt,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "department-capability-report.csv";
    link.click();

    URL.revokeObjectURL(url);
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
  const skills = data?.skills || [];
  const assessments = data?.assessments || [];
  const alerts = data?.riskAlerts || [];
  const heatmap = data?.heatmap || [];
  const training = data?.learning || {};
  const mentoring = data?.mentoring || {};
  const programmes = data?.programmes || [];

  const filteredEmployees = employees.filter((employee) =>
    `${displayName(employee)} ${employee.email} ${employee.role}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(search.toLowerCase())
  );

  const pageTitle =
    NAV_ITEMS.find((item) => item.id === activeSection)?.label ||
    "Dashboard";

  return (
    <div className="dh-layout">
      <aside className="dh-sidebar">
        <div className="dh-brand">
          <span className="dh-brand-mark">KG</span>

          <div>
            <strong>KGIP</strong>
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
                setSearch("");
              }}
              type="button"
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="dh-sidebar-footer">
          <p>
            Organizational Knowledge Gap Intelligence Platform
          </p>

          <button type="button" onClick={logout}>
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="dh-main">
        <header className="dh-topbar">
          <div>
            <span>Workspace / </span>
            <strong>{pageTitle}</strong>
          </div>

          <div className="dh-user-chip">
            <span>
              {(
                displayName(
                  data?.departmentHead || sessionUser
                ).charAt(0) || "D"
              ).toUpperCase()}
            </span>

            <div>
              <strong>
                {displayName(
                  data?.departmentHead || sessionUser
                )}
              </strong>
              <small>Department Head</small>
            </div>
          </div>
        </header>

        <div className="dh-content">

          {activeSection === "dashboard" && (
            <>
              <section className="dh-hero">
                <div>
                  <span>DEPARTMENT INTELLIGENCE</span>

                  <h1>
                    Welcome back,{" "}
                    {data?.departmentHead?.firstName ||
                      sessionUser?.firstName ||
                      "Department Head"}.
                  </h1>

                  <p>
                    Review workforce capability, skill assessment
                    trends and learning activity across{" "}
                    {department.name || "your department"}.
                  </p>
                </div>

                <div className="dh-hero-symbol">
                  ◫
                </div>
              </section>

              <SectionTitle
                eyebrow="AT A GLANCE"
                title="Department Overview"
                description="Live figures calculated from records associated with your department."
              />

              <div className="dh-metrics-grid">
                <MetricCard
                  icon="♙"
                  label="Department Workforce"
                  value={summary.totalWorkforce}
                  hint="Approved department accounts"
                  tone="blue"
                />

                <MetricCard
                  icon="▤"
                  label="Employees"
                  value={summary.totalEmployees}
                  hint="Employee accounts"
                  tone="violet"
                />

                <MetricCard
                  icon="⚑"
                  label="Employees Needing Attention"
                  value={summary.employeesWithGaps}
                  hint="Latest topic score below 70%"
                  tone="orange"
                />

                <MetricCard
                  icon="!"
                  label="Critical Assessment Results"
                  value={summary.criticalGaps}
                  hint="Latest topic score below 40%"
                  tone="red"
                />
              </div>

              <div className="dh-two-column">
                <section className="dh-panel">
                  <SectionTitle
                    title="Assessment Performance"
                    description="Average of the latest recorded score for each employee and topic."
                  />

                  <div className="dh-score-highlight">
                    <strong>
                      {summary.averageScore ?? 0}%
                    </strong>
                    <span>Department average</span>
                  </div>

                  <div className="dh-progress-track">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, summary.averageScore || 0)
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="dh-panel-foot">
                    <div>
                      <strong>
                        {summary.assessedEmployees || 0}
                      </strong>
                      <span>Employees assessed</span>
                    </div>

                    <div>
                      <strong>
                        {summary.totalAssessments || 0}
                      </strong>
                      <span>Latest topic results</span>
                    </div>
                  </div>
                </section>

                <section className="dh-panel">
                  <SectionTitle
                    title="Learning Snapshot"
                    description="Based on saved learning-enrollment records."
                  />

                  <div className="dh-learning-numbers">
                    <div>
                      <strong>
                        {training.totalEnrollments || 0}
                      </strong>
                      <span>Enrollments</span>
                    </div>

                    <div>
                      <strong>{training.completed || 0}</strong>
                      <span>Completed</span>
                    </div>

                    <div>
                      <strong>{training.inProgress || 0}</strong>
                      <span>In progress</span>
                    </div>
                  </div>

                  <p className="dh-muted-note">
                    Training participation:{" "}
                    {training.adoptionRate || 0}% of department
                    employees have at least one enrollment.
                  </p>
                </section>
              </div>

              <section className="dh-panel">
                <SectionTitle
                  title="Priority Skill Topics"
                  description="Topics with the most latest assessment results below 70%."
                />

                {skills.length ? (
                  <div className="dh-skill-bars">
                    {skills.slice(0, 6).map((skill) => (
                      <div
                        className="dh-skill-row"
                        key={skill.name}
                      >
                        <div>
                          <strong>{skill.name}</strong>
                          <span>
                            {skill.averageScore}% average ·{" "}
                            {skill.employeesAtRisk} need attention
                          </span>
                        </div>

                        <div className="dh-skill-track">
                          <span
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, skill.averageScore)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>
                    No assessment topic records were found for this department.
                  </EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "overview" && (
            <>
              <SectionTitle
                eyebrow="PEOPLE & STRUCTURE"
                title="Department Overview"
                description={`Workforce records associated with ${department.name || "your department"}.`}
              />

              <div className="dh-metrics-grid">
                <MetricCard
                  icon="♙"
                  label="Employees"
                  value={summary.totalEmployees}
                  hint="Approved employee accounts"
                />

                <MetricCard
                  icon="▣"
                  label="Managers"
                  value={summary.totalManagers}
                  hint="Department manager accounts"
                  tone="violet"
                />

                <MetricCard
                  icon="✧"
                  label="Mentors"
                  value={summary.totalMentors}
                  hint="Department mentor accounts"
                  tone="orange"
                />

                <MetricCard
                  icon="▤"
                  label="Other roles"
                  value={summary.otherRoles}
                  hint="Other approved department accounts"
                  tone="red"
                />
              </div>

              <section className="dh-panel">
                <div className="dh-panel-heading">
                  <SectionTitle
                    title="Department workforce"
                    description="Search and review department account directory."
                  />

                  <input
                    className="dh-search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search name, email or role…"
                  />
                </div>

                {filteredEmployees.length ? (
                  <div className="dh-table-wrap">
                    <table className="dh-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Email</th>
                          <th>Platform role</th>
                          <th>Assessment status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredEmployees.map((person) => (
                          <tr key={person.email}>
                            <td>
                              <strong>
                                {displayName(person)}
                              </strong>
                            </td>

                            <td>{person.email}</td>

                            <td>
                              {person.role
                                ?.replace("ROLE_", "")
                                .replaceAll("_", " ")}
                            </td>

                            <td>
                              <StatusPill
                                status={
                                  person.assessed
                                    ? "Assessed"
                                    : "Not assessed"
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>
                    No department accounts match your search.
                  </EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "matrix" && (
            <>
              <SectionTitle
                eyebrow="SKILL INTELLIGENCE"
                title="Department Skill Matrix"
                description="Assessment topic scores aggregated from the latest submission for each employee and topic. These are assessment results, not a formal job-role proficiency certification."
              />

              <section className="dh-panel">
                <div className="dh-panel-heading">
                  <div>
                    <h3>Skill / topic coverage</h3>
                    <p>
                      Scores are calculated as right answers
                      divided by total questions.
                    </p>
                  </div>

                  <input
                    className="dh-search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search topics…"
                  />
                </div>

                {filteredSkills.length ? (
                  <div className="dh-table-wrap">
                    <table className="dh-table">
                      <thead>
                        <tr>
                          <th>Topic</th>
                          <th>Average score</th>
                          <th>Assessed employees</th>
                          <th>Below 70%</th>
                          <th>Below 40%</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredSkills.map((skill) => (
                          <tr key={skill.name}>
                            <td>
                              <strong>{skill.name}</strong>
                            </td>
                            <td>{skill.averageScore}%</td>
                            <td>{skill.assessedEmployees}</td>
                            <td>{skill.employeesAtRisk}</td>
                            <td>{skill.criticalEmployees}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>
                    No skill assessment data is available yet.
                  </EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "heatmap" && (
            <>
              <SectionTitle
                eyebrow="CAPABILITY GAPS"
                title="Department Gap Heatmap"
                description="Latest score per employee and topic. Grey means no assessment record; red is below 40%; amber is 40–69%; green is 70% or above."
              />

              <section className="dh-panel">
                {heatmap.length && skills.length ? (
                  <div className="dh-table-wrap">
                    <table className="dh-table dh-heatmap-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          {skills.map((skill) => (
                            <th key={skill.name}>
                              {skill.name}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {heatmap.map((person) => (
                          <tr key={person.email}>
                            <td>
                              <strong>{person.name}</strong>
                              <small>{person.email}</small>
                            </td>

                            {skills.map((skill) => {
                              const score =
                                person.scores?.[skill.name];

                              const className =
                                score == null
                                  ? "none"
                                  : score < 40
                                  ? "critical"
                                  : score < 70
                                  ? "warning"
                                  : "good";

                              return (
                                <td key={skill.name}>
                                  <span
                                    className={`dh-heat-cell ${className}`}
                                  >
                                    {score == null
                                      ? "—"
                                      : `${score}%`}
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
                    There are not enough assessment records to build the department heatmap.
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

          {activeSection === "capability" && (
            <>
              <SectionTitle
                eyebrow="WORKFORCE STRENGTHS"
                title="Workforce Capability"
                description="Department strengths and improvement areas inferred from recorded assessment topics."
              />

              <div className="dh-metrics-grid">
                <MetricCard
                  icon="✓"
                  label="On-track topic results"
                  value={summary.onTrackResults}
                  hint="Latest scores of 70% or above"
                  tone="blue"
                />

                <MetricCard
                  icon="!"
                  label="Needs attention"
                  value={summary.attentionResults}
                  hint="Latest scores from 40% to 69%"
                  tone="orange"
                />

                <MetricCard
                  icon="⚑"
                  label="Critical results"
                  value={summary.criticalGaps}
                  hint="Latest scores below 40%"
                  tone="red"
                />

                <MetricCard
                  icon="◷"
                  label="Not yet assessed"
                  value={Math.max(
                    0,
                    summary.totalEmployees -
                      summary.assessedEmployees
                  )}
                  hint="Employees without assessment records"
                  tone="violet"
                />
              </div>

              <section className="dh-panel">
                <SectionTitle
                  title="Capability by topic"
                  description="Average score and number of affected employees."
                />

                {skills.length ? (
                  <div className="dh-skill-bars">
                    {skills.map((skill) => (
                      <div
                        className="dh-skill-row"
                        key={skill.name}
                      >
                        <div>
                          <strong>{skill.name}</strong>
                          <span>
                            {skill.assessedEmployees} assessed ·{" "}
                            {skill.employeesAtRisk} below 70%
                          </span>
                        </div>

                        <div className="dh-skill-track">
                          <span
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, skill.averageScore)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState>
                    No capability assessment data is available.
                  </EmptyState>
                )}
              </section>
            </>
          )}

          {activeSection === "learning" && (
            <>
              <SectionTitle
                eyebrow="DEVELOPMENT OUTCOMES"
                title="Learning & Mentoring Overview"
                description="Aggregate participation derived from department learning enrollments, programmes and mentorship requests."
              />

              <div className="dh-metrics-grid">
                <MetricCard
                  icon="▤"
                  label="Learning enrollments"
                  value={training.totalEnrollments}
                  hint="Saved enrollment records"
                />

                <MetricCard
                  icon="✓"
                  label="Completed"
                  value={training.completed}
                  hint="Status marked completed"
                  tone="blue"
                />

                <MetricCard
                  icon="◷"
                  label="In progress"
                  value={training.inProgress}
                  hint="Status marked in progress"
                  tone="orange"
                />

                <MetricCard
                  icon="♧"
                  label="Mentorship requests"
                  value={mentoring.totalRequests}
                  hint="Requests from department employees"
                  tone="violet"
                />
              </div>

              <div className="dh-two-column">
                <section className="dh-panel">
                  <SectionTitle
                    title="Training programmes"
                    description="Programmes explicitly assigned to this department."
                  />

                  {programmes.length ? (
                    <div className="dh-list">
                      {programmes.map((programme) => (
                        <div
                          className="dh-list-item"
                          key={programme.id}
                        >
                          <div>
                            <strong>{programme.name}</strong>
                            <span>
                              {programme.competency ||
                                "Competency not specified"}
                            </span>
                          </div>

                          <StatusPill
                            status={programme.status}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState>
                      No department-specific training programmes are recorded.
                    </EmptyState>
                  )}
                </section>

                <section className="dh-panel">
                  <SectionTitle
                    title="Mentoring activity"
                    description="Request status totals for department employees."
                  />

                  <div className="dh-learning-numbers">
                    <div>
                      <strong>{mentoring.pending || 0}</strong>
                      <span>Pending</span>
                    </div>

                    <div>
                      <strong>{mentoring.accepted || 0}</strong>
                      <span>Accepted</span>
                    </div>

                    <div>
                      <strong>{mentoring.completed || 0}</strong>
                      <span>Completed</span>
                    </div>
                  </div>

                  <p className="dh-muted-note">
                    This is based on mentorship request records;
                    scheduled sessions and feedback are not represented
                    unless separately stored.
                  </p>
                </section>
              </div>
            </>
          )}

          {activeSection === "risks" && (
            <>
              <SectionTitle
                eyebrow="PRIORITY REVIEW"
                title="Risk & Priority Alerts"
                description="Assessment results below the configured score thresholds: critical below 40%, attention below 70%."
              />

              <div className="dh-metrics-grid">
                <MetricCard
                  icon="⚑"
                  label="Critical results"
                  value={summary.criticalGaps}
                  hint="Score below 40%"
                  tone="red"
                />

                <MetricCard
                  icon="!"
                  label="Attention results"
                  value={summary.attentionResults}
                  hint="Score from 40% to 69%"
                  tone="orange"
                />

                <MetricCard
                  icon="♙"
                  label="Employees affected"
                  value={summary.employeesWithGaps}
                  hint="Distinct employees with a result below 70%"
                  tone="violet"
                />
              </div>

              <section className="dh-panel">
                {alerts.length ? (
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
                        {alerts.map((alert) => (
                          <tr
                            key={`${alert.email}-${alert.topic}`}
                          >
                            <td>
                              <StatusPill status={alert.status} />
                            </td>

                            <td>
                              {alert.employeeName}
                              <small>{alert.email}</small>
                            </td>

                            <td>{alert.topic}</td>

                            <td>
                              <strong>{alert.score}%</strong>
                            </td>

                            <td>{dateLabel(alert.submittedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState>
                    No risk alerts. This means there are no latest assessment results below 70%, or no assessment results have been recorded.
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
                description="Export a CSV snapshot of the currently available department assessment and capability records."
              />

              <section className="dh-panel dh-report-panel">
                <div>
                  <h3>Department capability report</h3>
                  <p>
                    Includes skill averages, assessed employee counts,
                    risk counts and latest assessment results.
                  </p>
                </div>

                <button
                  className="dh-primary-button"
                  onClick={exportCsv}
                >
                  ↓ Export CSV report
                </button>
              </section>

              <div className="dh-metrics-grid">
                <MetricCard
                  icon="♙"
                  label="Workforce"
                  value={summary.totalWorkforce}
                  hint={department.name || "Department"}
                />

                <MetricCard
                  icon="▥"
                  label="Skill topics"
                  value={skills.length}
                  hint="Topics with assessment records"
                />

                <MetricCard
                  icon="✓"
                  label="Assessment results"
                  value={summary.totalAssessments}
                  hint="Latest employee/topic results"
                />

                <MetricCard
                  icon="◈"
                  label="Training enrollments"
                  value={training.totalEnrollments}
                  hint="Saved records"
                />
              </div>
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
                description="Department-specific notifications and acknowledgement status."
              />

              <section className="dh-panel">
                <EmptyState>
                  The current project does not expose a Department Head notification endpoint yet. No notification records are fabricated.
                </EmptyState>
              </section>
            </>
          )}

        </div>
      </main>
    </div>
  );
}