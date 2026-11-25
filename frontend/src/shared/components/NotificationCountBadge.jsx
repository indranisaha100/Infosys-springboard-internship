export default function NotificationCountBadge({ count = 0, className = "" }) {
  if (count < 1) return null;

  return (
    <span
      className={`unread-notification-count ${className}`}
      role="status"
      aria-label={`${count} unread notification${count === 1 ? "" : "s"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
