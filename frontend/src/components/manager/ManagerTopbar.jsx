
export default function ManagerTopbar({
  manager,
  activeSection,
}) {
  const titles = {
    dashboard: "Dashboard Overview",
    employees: "Employee Directory",
    mentors: "Mentor Directory",
    coverage: "Team Skill Gap Analysis",
    heatmap: "Team Skill Gap Heatmap",
    assessments: "Employee Assessments",
    training: "Learning Progress",
    alerts: "Critical Gap Alerts",
    reports: "Team Reports",
  };

  const name = [
    manager?.firstName,
    manager?.lastName,
  ].filter(Boolean).join(" ") || "Manager";

  return (
    <header className="manager-topbar">

      <div>
        <span>Workspace / </span>
        <strong>
          {titles[activeSection] || "Dashboard"}
        </strong>
      </div>

      <div className="manager-profile">

        <span className="manager-avatar">
          {name.charAt(0).toUpperCase()}
        </span>

        <div>
          <strong>{name}</strong>
          <small>Team Lead / Manager</small>
        </div>

      </div>

    </header>
  );
}
