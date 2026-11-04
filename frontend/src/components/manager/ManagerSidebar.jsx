
const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "employees", label: "My Employees", icon: "♙" },
  { id: "mentors", label: "Mentor Directory", icon: "♧" },
  { id: "coverage", label: "Skill Gap Analysis", icon: "▥" },
  { id: "heatmap", label: "Skill Gap Heatmap", icon: "▦" },
  { id: "assessments", label: "Assessments", icon: "✓" },
  { id: "training", label: "Training Progress", icon: "◈" },
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
        <span>KG</span>
        <div>
          <strong>KGIP</strong>
          <small>Manager Workspace</small>
        </div>
      </div>

      <p className="manager-nav-title">MANAGEMENT</p>

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
        <p>Organizational Knowledge Gap Intelligence Platform</p>

        <button type="button" onClick={onLogout}>
          ↪ Sign out
        </button>
      </div>

    </aside>
  );
}
