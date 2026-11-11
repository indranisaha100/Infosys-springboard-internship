export default function DashboardHeader({ title, name, initials, onProfileClick }) {
  return (
    <header className="workspace-header">
      <h1>{title}</h1>
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
    </header>
  );
}
