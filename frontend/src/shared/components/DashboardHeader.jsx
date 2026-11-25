import { useEffect, useState } from "react";
import NotificationCountBadge from "./NotificationCountBadge";

export default function DashboardHeader({
  title,
  name,
  initials,
  notificationCount = 0,
  onProfileClick,
  onLogout,
  onMenuClick,
  menuExpanded = false,
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const date = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  const avatar = (
    <span className="workspace-header-avatar-wrap">
      <span className="workspace-header-avatar" aria-hidden="true">{initials}</span>
      <NotificationCountBadge count={notificationCount} className="header-notification-count" />
    </span>
  );

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
        <div className="workspace-header-datetime" aria-label={`${date}, ${time}`}>
          <time dateTime={now.toISOString()}>{date}</time>
          <time dateTime={now.toISOString()}>{time}</time>
        </div>
        {onProfileClick ? (
          <button type="button" className="workspace-header-profile" onClick={onProfileClick}>
            {avatar}
            <strong>{name}</strong>
          </button>
        ) : (
          <div className="workspace-header-profile">
            {avatar}
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
