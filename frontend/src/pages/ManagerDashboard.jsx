
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getManagerDashboard } from "../services/managerApi";

import ManagerSidebar from "../components/manager/ManagerSidebar";
import ManagerTopbar from "../components/manager/ManagerTopbar";

import "./ManagerDashboard.css";

function MetricCard({ icon, label, value, note, color }) {
  return (
    <div className="manager-stat-card">
      <div className={`stat-icon ${color}`}>
        {icon}
      </div>

      <p>{label}</p>

      <h2>{value ?? 0}</h2>

      <small>{note}</small>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="manager-empty">
      <div>📂</div>
      <p>{message}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();

  const className = normalized.includes("critical")
    ? "critical"
    : normalized.includes("improvement")
      ? "warning"
      : normalized.includes("pending")
        ? "pending"
        : "good";

  return (
    <span className={`status-badge ${className}`}>
      {status || "Unknown"}
    </span>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div className="manager-section-heading">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

export default function ManagerDashboard() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const user = useMemo(() => {
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
      const result = await getManagerDashboard();
      setData(result);
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("kgipToken");

    if (
      !token ||
      !user ||
      ![
        "ROLE_MANAGER",
        "ROLE_HR",
        "ROLE_ADMIN",
      ].includes(user.role)
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

  const employees = data?.employees || [];
  const mentors = data?.mentors || [];
  const assessments = data?.assessments || [];
  const coverage = data?.skillCoverage || [];
  const heatmap = data?.heatmap || [];
  const alerts = data?.criticalAlerts || [];

  const summary = data?.summary || {};

  const manager = data?.manager || user || {};

  const filteredEmployees = employees.filter((employee) =>
    [
      employee.name,
      employee.email,
      employee.firstName,
      employee.lastName,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredMentors = mentors.filter((mentor) =>
    [
      mentor.name,
      mentor.email,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredAssessments = assessments.filter((item) =>
    [
      item.employee,
      item.email,
      item.topic,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function exportReport() {
    const rows = [
      [
        "Employee",
        "Email",
        "Skill",
        "Score",
        "Status",
        "Assessment Date",
      ],
      ...assessments.map((item) => [
        item.employee,
        item.email,
        item.topic,
        item.score,
        item.status,
        item.submittedAt || "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) =>
          `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "manager-team-assessment-report.csv";

    link.click();

    URL.revokeObjectURL(url);
  }

  function scoreColor(score) {
    if (score < 0) return "heat-none";
    if (score < 40) return "heat-critical";
    if (score < 70) return "heat-warning";
    return "heat-good";
  }

  function formatDate(date) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="manager-loading">
        <div className="loading-symbol">KG</div>
        <h2>Loading Manager Dashboard</h2>
        <p>Fetching employee, mentor and assessment data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="manager-loading">
        <h2>Unable to load Manager Dashboard</h2>
        <p>{error}</p>

        <button onClick={loadDashboard}>
          Try Again
        </button>

        <button onClick={logout}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="manager-layout">

      <ManagerSidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setSearch("");
          setSelectedEmployee(null);
        }}
        onLogout={logout}
      />

      <main className="manager-main">

        <ManagerTopbar
          manager={manager}
          activeSection={activeSection}
        />

        <section className="manager-content">

          {/* DASHBOARD */}

          {activeSection === "dashboard" && (
            <>

              <div className="manager-welcome">
                <div>
                  <p>MANAGEMENT OVERVIEW</p>

                  <h1>
                    Welcome back, {manager.firstName || "Manager"}!
                  </h1>

                  <span>
                    Monitor employees, mentors, skills and
                    organizational learning performance.
                  </span>
                </div>

                <div className="welcome-icon">
                  👨‍💼
                </div>
              </div>

              <SectionHeading
                title="Organization Overview"
                subtitle="Live information retrieved from PostgreSQL"
              />

              <div className="manager-stats">

                <MetricCard
                  icon="👥"
                  label="Total Employees"
                  value={summary.totalEmployees}
                  note="Registered employee accounts"
                  color="blue"
                />

                <MetricCard
                  icon="🎓"
                  label="Total Mentors"
                  value={summary.totalMentors}
                  note="Registered mentor accounts"
                  color="purple"
                />

                <MetricCard
                  icon="⚠️"
                  label="Employees with Skill Gaps"
                  value={summary.employeesWithGaps}
                  note="Latest scores below 70%"
                  color="orange"
                />

                <MetricCard
                  icon="🚨"
                  label="Critical Skill Gaps"
                  value={summary.criticalGaps}
                  note="Latest scores below 40%"
                  color="green"
                />

              </div>

              <SectionHeading
                title="Assessment Performance"
                subtitle="Latest employee assessment performance"
              />

              <div className="manager-overview-grid">

                <section className="manager-panel">
                  <div className="manager-panel-heading">
                    <div>
                      <h2>Average Assessment Score</h2>
                      <p>Across latest employee skill assessments</p>
                    </div>
                  </div>

                  <div className="score-visual">
                    <div className="score-circle">
                      <strong>
                        {summary.averageScore ?? 0}%
                      </strong>
                      <small>Average</small>
                    </div>
                  </div>

                  <div className="score-details">
                    <div>
                      <span>Assessed employees</span>
                      <strong>{summary.assessedEmployees ?? 0}</strong>
                    </div>

                    <div>
                      <span>Total assessments</span>
                      <strong>{summary.totalAssessments ?? 0}</strong>
                    </div>
                  </div>
                </section>

                <section className="manager-panel">
                  <div className="manager-panel-heading">
                    <div>
                      <h2>Skill Coverage</h2>
                      <p>Average score by competency</p>
                    </div>
                  </div>

                  {coverage.length ? coverage.slice(0, 6).map((skill) => (
                    <div className="coverage-row" key={skill.name}>
                      <div className="coverage-label">
                        <strong>{skill.name}</strong>
                        <span>{skill.averageScore}%</span>
                      </div>

                      <div className="coverage-track">
                        <div
                          className="coverage-fill"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, skill.averageScore)
                            )}%`,
                          }}
                        />
                      </div>

                      <small>
                        {skill.affectedEmployees} employees with gaps
                      </small>
                    </div>
                  )) : (
                    <EmptyState message="No skill assessments available." />
                  )}
                </section>

              </div>

              <SectionHeading
                title="Critical Gap Alerts"
                subtitle="Employees requiring immediate attention"
              />

              <CriticalAlerts alerts={alerts} />

              <SectionHeading
                title="Quick Access"
                subtitle="Explore your employees and mentors"
              />

              <div className="manager-quick-grid">

                <button onClick={() => setActiveSection("employees")}>
                  <span>👥</span>
                  <strong>View Employees</strong>
                  <small>{employees.length} employee accounts</small>
                </button>

                <button onClick={() => setActiveSection("mentors")}>
                  <span>🎓</span>
                  <strong>View Mentors</strong>
                  <small>{mentors.length} mentor accounts</small>
                </button>

                <button onClick={() => setActiveSection("heatmap")}>
                  <span>📊</span>
                  <strong>Skill Heatmap</strong>
                  <small>Visual skill comparison</small>
                </button>

              </div>

            </>
          )}

          {/* EMPLOYEES */}

          {activeSection === "employees" && (
            <section className="manager-panel">

              <div className="manager-panel-heading">
                <div>
                  <h2>👥 Employee Directory</h2>
                  <p>
                    {filteredEmployees.length} registered employees
                  </p>
                </div>

                <input
                  type="search"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {selectedEmployee ? (
                <div className="employee-detail">

                  <button
                    className="back-button"
                    onClick={() => setSelectedEmployee(null)}
                  >
                    ← Back to Employees
                  </button>

                  <div className="detail-profile">
                    <div className="detail-avatar">
                      {selectedEmployee.name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div>
                      <h2>{selectedEmployee.name}</h2>
                      <p>{selectedEmployee.email}</p>
                      <StatusBadge status={selectedEmployee.status} />
                    </div>
                  </div>

                  <div className="detail-metrics">
                    <div>
                      <span>Assessment Count</span>
                      <strong>{selectedEmployee.assessmentCount}</strong>
                    </div>

                    <div>
                      <span>Average Score</span>
                      <strong>{selectedEmployee.averageScore}%</strong>
                    </div>
                  </div>

                  <h3>Individual Skill Assessment Results</h3>

                  <div className="manager-table-wrapper">
                    <table className="manager-table">
                      <thead>
                        <tr>
                          <th>SKILL</th>
                          <th>SCORE</th>
                          <th>SUBMITTED</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedEmployee.assessments?.length ? (
                          selectedEmployee.assessments.map((item, index) => (
                            <tr key={`${item.topic}-${index}`}>
                              <td>{item.topic}</td>
                              <td>{item.score}%</td>
                              <td>{formatDate(item.submittedAt)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3">
                              No assessments submitted yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              ) : (

                <div className="manager-table-wrapper">
                  <table className="manager-table">

                    <thead>
                      <tr>
                        <th>EMPLOYEE</th>
                        <th>EMAIL</th>
                        <th>ASSESSMENTS</th>
                        <th>AVERAGE SCORE</th>
                        <th>STATUS</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredEmployees.length ? (
                        filteredEmployees.map((employee) => (
                          <tr key={employee.id}>
                            <td>
                              <div className="person-cell">
                                <span className="person-avatar">
                                  {employee.name?.charAt(0)?.toUpperCase()}
                                </span>
                                <strong>{employee.name}</strong>
                              </div>
                            </td>

                            <td>{employee.email}</td>

                            <td>{employee.assessmentCount}</td>

                            <td>{employee.averageScore}%</td>

                            <td>
                              <StatusBadge status={employee.status} />
                            </td>

                            <td>
                              <button
                                className="view-button"
                                onClick={() => setSelectedEmployee(employee)}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6">
                            <EmptyState message="No employees found." />
                          </td>
                        </tr>
                      )}
                    </tbody>

                  </table>
                </div>

              )}

            </section>
          )}

          {/* MENTORS */}

          {activeSection === "mentors" && (
            <section className="manager-panel">

              <div className="manager-panel-heading">
                <div>
                  <h2>🎓 Mentor Directory</h2>
                  <p>
                    {filteredMentors.length} registered mentors
                  </p>
                </div>

                <input
                  type="search"
                  placeholder="Search mentor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="mentor-grid">

                {filteredMentors.length ? (
                  filteredMentors.map((mentor) => (
                    <div className="mentor-card" key={mentor.id}>

                      <div className="mentor-avatar">
                        {mentor.name?.charAt(0)?.toUpperCase()}
                      </div>

                      <h3>{mentor.name}</h3>

                      <p>{mentor.email}</p>

                      <span className="mentor-role">
                        {mentor.role.replace("ROLE_", "")}
                      </span>

                    </div>
                  ))
                ) : (
                  <EmptyState message="No mentors registered yet." />
                )}

              </div>

              <div className="info-note">
                <strong>Mentorship information</strong>
                <p>
                  This directory shows registered mentors.
                  Employee-to-mentor assignments, scheduled sessions
                  and feedback require a mentorship workflow in the
                  database.
                </p>
              </div>

            </section>
          )}

          {/* SKILL COVERAGE */}

          {activeSection === "coverage" && (
            <>
              <SectionHeading
                title="📊 Team Skill Gap Analysis"
                subtitle="Assessment-based skill coverage from PostgreSQL"
              />

              <section className="manager-panel">

                {coverage.length ? coverage.map((skill) => (
                  <div className="coverage-row large" key={skill.name}>

                    <div className="coverage-label">
                      <strong>{skill.name}</strong>
                      <span>{skill.averageScore}%</span>
                    </div>

                    <div className="coverage-track">
                      <div
                        className="coverage-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, skill.averageScore))}%`,
                        }}
                      />
                    </div>

                    <div className="coverage-meta">
                      <span>
                        {skill.affectedEmployees} employees with scores below 70%
                      </span>

                      <span>
                        {skill.assessmentCount} assessment records
                      </span>
                    </div>

                  </div>
                )) : (
                  <EmptyState message="No assessment data available." />
                )}

              </section>
            </>
          )}

          {/* HEATMAP */}

          {activeSection === "heatmap" && (
            <>
              <SectionHeading
                title="🔥 Team Skill Gap Heatmap"
                subtitle="Employee-wise latest assessment scores"
              />

              <section className="manager-panel">

                <div className="heatmap-legend">
                  <span><i className="heat-critical" /> Critical: 0–39%</span>
                  <span><i className="heat-warning" /> Improve: 40–69%</span>
                  <span><i className="heat-good" /> Good: 70–100%</span>
                  <span><i className="heat-none" /> Not assessed</span>
                </div>

                {heatmap.length && coverage.length ? (
                  <div className="manager-table-wrapper">

                    <table className="manager-table heatmap-table">
                      <thead>
                        <tr>
                          <th>EMPLOYEE</th>

                          {coverage.map((skill) => (
                            <th key={skill.name}>{skill.name}</th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {heatmap.map((row) => (
                          <tr key={row.email}>
                            <td>
                              <strong>{row.employee}</strong>
                              <small>{row.email}</small>
                            </td>

                            {coverage.map((skill) => {
                              const score = row.skills?.[skill.name] ?? -1;

                              return (
                                <td key={skill.name}>
                                  <span
                                    className={`heat-cell ${scoreColor(score)}`}
                                    title={`${skill.name}: ${
                                      score < 0 ? "Not assessed" : score + "%"
                                    }`}
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
                  <EmptyState message="Submit employee assessments to generate the heatmap." />
                )}

              </section>
            </>
          )}

          {/* ASSESSMENTS */}

          {activeSection === "assessments" && (
            <section className="manager-panel">

              <div className="manager-panel-heading">
                <div>
                  <h2>📋 Employee Assessments</h2>
                  <p>
                    {filteredAssessments.length} assessment records
                  </p>
                </div>

                <input
                  type="search"
                  placeholder="Search employee or skill..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="manager-table-wrapper">
                <table className="manager-table">

                  <thead>
                    <tr>
                      <th>EMPLOYEE</th>
                      <th>EMAIL</th>
                      <th>SKILL</th>
                      <th>SCORE</th>
                      <th>RESULT</th>
                      <th>SUBMITTED</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAssessments.length ? (
                      filteredAssessments.map((item, index) => (
                        <tr key={`${item.email}-${item.topic}-${index}`}>
                          <td>{item.employee}</td>
                          <td>{item.email}</td>
                          <td>{item.topic}</td>
                          <td>{item.score}%</td>
                          <td>
                            <StatusBadge status={item.status} />
                          </td>
                          <td>{formatDate(item.submittedAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6">
                          <EmptyState message="No assessment records found." />
                        </td>
                      </tr>
                    )}
                  </tbody>

                </table>
              </div>

            </section>
          )}

          {/* TRAINING */}

          {activeSection === "training" && (
            <section className="manager-panel">

              <h2>📚 Learning Progress</h2>

              <div className="coming-soon">
                <span>🎓</span>
                <h3>Training Management</h3>

                <p>
                  Training enrollment, course completion,
                  learning milestones and overdue training
                  cannot be retrieved until training records
                  are connected to the backend.
                </p>

                <span className="status-badge pending">
                  Database integration pending
                </span>
              </div>

            </section>
          )}

          {/* ALERTS */}

          {activeSection === "alerts" && (
            <section className="manager-panel">

              <div className="manager-panel-heading">
                <div>
                  <h2>🚨 Critical Skill Gap Alerts</h2>
                  <p>Latest assessment scores below 40%</p>
                </div>

                <span className="alert-count">
                  {alerts.length} alerts
                </span>
              </div>

              <CriticalAlerts alerts={alerts} />

            </section>
          )}

          {/* REPORTS */}

          {activeSection === "reports" && (
            <section className="manager-panel">

              <div className="manager-panel-heading">
                <div>
                  <h2>📑 Team Assessment Reports</h2>
                  <p>Employee competency and assessment summary</p>
                </div>

                <button
                  className="export-button"
                  onClick={exportReport}
                >
                  ↓ Export CSV
                </button>
              </div>

              <div className="report-summary">
                <div>
                  <span>Total Employees</span>
                  <strong>{summary.totalEmployees}</strong>
                </div>

                <div>
                  <span>Total Mentors</span>
                  <strong>{summary.totalMentors}</strong>
                </div>

                <div>
                  <span>Total Assessments</span>
                  <strong>{summary.totalAssessments}</strong>
                </div>

                <div>
                  <span>Average Score</span>
                  <strong>{summary.averageScore}%</strong>
                </div>
              </div>

              <div className="manager-table-wrapper">
                <table className="manager-table">

                  <thead>
                    <tr>
                      <th>EMPLOYEE</th>
                      <th>SKILL</th>
                      <th>SCORE</th>
                      <th>STATUS</th>
                      <th>DATE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {assessments.map((item, index) => (
                      <tr key={`${item.email}-${item.topic}-${index}`}>
                        <td>{item.employee}</td>
                        <td>{item.topic}</td>
                        <td>{item.score}%</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>{formatDate(item.submittedAt)}</td>
                      </tr>
                    ))}

                    {!assessments.length && (
                      <tr>
                        <td colSpan="5">
                          <EmptyState message="No assessment records available." />
                        </td>
                      </tr>
                    )}
                  </tbody>

                </table>
              </div>

            </section>
          )}

          <footer className="manager-footer">
            KGIP · Knowledge Gap Intelligence Platform
          </footer>

        </section>

      </main>

    </div>
  );
}

function CriticalAlerts({ alerts = [] }) {
  if (!alerts.length) {
    return (
      <EmptyState message="No critical assessment gaps detected." />
    );
  }

  return (
    <div className="critical-alert-list">

      {alerts.map((item, index) => (
        <div
          className="critical-alert"
          key={`${item.email}-${item.topic}-${index}`}
        >

          <span className="alert-symbol">!</span>

          <div>
            <strong>{item.employee}</strong>

            <p>
              {item.topic} requires attention.
              Assessment score: {item.score}%.
            </p>

            <small>{item.email}</small>
          </div>

          <span className="status-badge critical">
            Critical
          </span>

        </div>
      ))}

    </div>
  );
}
