export default function DashboardHeader({
  title,
  name,
  initials,
  onProfileClick,
  onLogout,
  onMenuClick,
  menuExpanded = false,
}) {
  return (
    <header className="workspace-header">
      {onMenuClick && (
        <button
          type="button"
          className="workspace-menu-button"
          onClick={onMenuClick}
          aria-label={menuExpanded ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuExpanded}
          aria-controls="workspace-navigation"
        >
          <span aria-hidden="true">{menuExpanded ? "×" : "☰"}</span>
        </button>
      )}
      <h1>{title}</h1>
      <div className="workspace-header-actions">
        {onProfileClick ? (
          <button type="button" className="workspace-header-profile" onClick={onProfileClick}>
            <span className="workspace-header-avatar" aria-hidden="true">{initials}</span>
            <strong>{name}</strong>
          </button>
        ) : (
          <div className="workspace-header-profile">
            <span className="workspace-header-avatar" aria-hidden="true">{initials}</span>
            <strong>{name}</strong>
          </div>
        )}
        {onLogout && (
          <button type="button" className="workspace-logout-button" onClick={onLogout}>
            LOG OUT
          </button>
        )}
      </div>
    </header>
  );
}
