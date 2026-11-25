
import SidebarIcon from "../../../shared/components/SidebarIcon";

const menuItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "employees", label: "My Employees" },
  { id: "mentors", label: "Mentor Directory" },
  { id: "coverage", label: "Skill Gap Analysis" },
  { id: "heatmap", label: "Skill Gap Heatmap" },
  { id: "assessments", label: "Assessments" },
  { id: "alerts", label: "Critical Alerts" },
  { id: "reports", label: "Team Reports" },
  { id: "notifications", label: "Notifications" },
];

export default function ManagerSidebar({
  activeSection,
  onSectionChange,
  isOpen = false,
}) {
  return (
    <aside
      id="workspace-navigation"
      className={`manager-sidebar workspace-sidebar${isOpen ? " is-open" : ""}`}
    >

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
            <SidebarIcon label={item.label} />
            {item.label}
          </button>
        ))}
      </nav>

    </aside>
  );
}
