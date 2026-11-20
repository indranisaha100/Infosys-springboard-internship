export default function DashboardHeader({ title, name, initials, onProfileClick, onLogout }) {
  return (
    <header className="workspace-header">
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
