
const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "employees", label: "My Employees", icon: "♙" },
  { id: "mentors", label: "Mentor Directory", icon: "♧" },
  { id: "coverage", label: "Skill Gap Analysis", icon: "▥" },
  { id: "heatmap", label: "Skill Gap Heatmap", icon: "▦" },
  { id: "assessments", label: "Assessments", icon: "✓" },
  { id: "alerts", label: "Critical Alerts", icon: "⚑" },
  { id: "reports", label: "Team Reports", icon: "▤" },
];

export default function ManagerSidebar({
  activeSection,
  onSectionChange,
  onLogout,
}) {
  return (
    <aside className="manager-sidebar">

      <div className="manager-brand">
        <span aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 17V13M12 17V8M18 17V5" />
          </svg>
        </span>
        <div>
          <strong>SkillTrack</strong>
          <small>Manager Workspace</small>
        </div>
      </div>

      <p className="manager-nav-title">MANAGER WORKSPACE</p>

      <nav className="manager-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              activeSection === item.id ? "active" : ""
            }
            onClick={() => onSectionChange(item.id)}
          >
            <span>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="manager-sidebar-bottom">
        <button type="button" onClick={onLogout}>
          ↪ Sign out
        </button>
      </div>

    </aside>
  );
}
