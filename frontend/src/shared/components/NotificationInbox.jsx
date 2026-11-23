import { useCallback, useEffect, useState } from "react";
import { request } from "../services/api";

function formatSentAt(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

export default function NotificationInbox({ roleLabel = "workspace", onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [view, setView] = useState("unread");

  const loadNotifications = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const result = await request("/notifications");
      const loaded = Array.isArray(result) ? result : [];
      setNotifications(loaded);
      onUnreadCountChange?.(loaded.filter((notification) => !notification.isRead).length);
    } catch (loadError) {
      setError(loadError.message || "Notifications could not be loaded.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    loadNotifications();
    const refresh = window.setInterval(() => loadNotifications(false), 15000);
    return () => window.clearInterval(refresh);
  }, [loadNotifications]);

  async function markAsRead(notificationId) {
    setPendingId(notificationId);
    setError("");
    try {
      await request(`/notifications/${notificationId}/read`, { method: "POST" });
      const updated = notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true, readAt: new Date().toISOString() }
          : notification
      );
      setNotifications(updated);
      onUnreadCountChange?.(updated.filter((notification) => !notification.isRead).length);
    } catch (readError) {
      setError(readError.message || "The notification could not be marked as read.");
    } finally {
      setPendingId(null);
    }
  }

  const visible = notifications.filter((notification) =>
    view === "unread" ? !notification.isRead : notification.isRead
  );

  return (
    <section className="mx-auto max-w-[1100px] px-8 pb-14 pt-8 max-[650px]:px-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-500">
            {roleLabel} / Notifications
          </p>
          <h1 className="m-0 text-2xl font-medium text-blue-950">Notifications</h1>
          <p className="mt-2 text-xs text-slate-500">
            New messages stay unread until you mark them as seen, then move to history.
          </p>
        </div>
        <button
          type="button"
          onClick={loadNotifications}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 flex gap-2" role="tablist" aria-label="Notification views">
        <button
          type="button"
          role="tab"
          aria-selected={view === "unread"}
          onClick={() => setView("unread")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold ${view === "unread" ? "bg-emerald-700 text-white" : "bg-white text-slate-600"}`}
        >
          Unread ({notifications.filter((notification) => !notification.isRead).length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "history"}
          onClick={() => setView("history")}
          className={`rounded-lg px-4 py-2 text-xs font-semibold ${view === "history" ? "bg-emerald-700 text-white" : "bg-white text-slate-600"}`}
        >
          History ({notifications.filter((notification) => notification.isRead).length})
        </button>
      </div>

      {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700" role="alert">{error}</p>}
      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500" role="status">Loading notifications…</p>
      ) : visible.length ? (
        <div className="space-y-3">
          {visible.map((notification) => (
            <article key={notification.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-sm font-semibold text-blue-950">{notification.title}</h2>
                  <p className="mt-1 text-[10px] text-slate-500">
                    From {notification.senderEmail || "HR"}{notification.senderRole ? ` · ${notification.senderRole.replace("ROLE_", "").replaceAll("_", " ")}` : ""}
                    {" · "}{formatSentAt(notification.sentAt)}
                  </p>
                </div>
                {notification.type && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{notification.type.replaceAll("_", " ")}</span>}
              </div>
              <p className="mb-0 mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{notification.message}</p>
              {notification.isRead ? (
                <p className="mb-0 mt-3 text-[10px] text-slate-400">Seen {formatSentAt(notification.readAt)}</p>
              ) : (
                <button
                  type="button"
                  disabled={pendingId === notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className="mt-4 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {pendingId === notification.id ? "Saving…" : "Mark as seen"}
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          {view === "unread" ? "You’re all caught up." : "No notification history yet."}
        </p>
      )}
    </section>
  );
}
