export const MEET_NEW_URL = "https://meet.google.com/new";
const MEET_PATTERN = /^https:\/\/meet\.google\.com\/[A-Za-z0-9_\-/?=&.%]{3,200}$/;

export function isValidMeetLink(value) {
  return !value || MEET_PATTERN.test(value.trim());
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function relativeTime(iso) {
  if (!iso) return "";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/** Value for <input type="datetime-local"> in the user's own timezone. */
export function toLocalInputValue(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "live" | "soon" (starts within 15 min) | "upcoming" | "past" */
export function sessionTiming(session) {
  const start = new Date(session.scheduledAt).getTime();
  const end = new Date(session.endsAt || start + (session.durationMinutes || 30) * 60000).getTime();
  const now = Date.now();
  if (now >= start && now <= end) return "live";
  if (start - now <= 15 * 60000 && start > now) return "soon";
  return now < start ? "upcoming" : "past";
}

/** Opens Google Calendar with the event pre-filled (guest, Meet link in location + details). */
export function googleCalendarUrl(session) {
  const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = session.endsAt || new Date(new Date(session.scheduledAt).getTime() + (session.durationMinutes || 30) * 60000).toISOString();
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates: `${stamp(session.scheduledAt)}/${stamp(end)}`,
    details: [session.agenda, session.meetLink ? `Join: ${session.meetLink}` : ""].filter(Boolean).join("\n\n"),
    add: [session.employeeEmail, session.mentorEmail].filter(Boolean).join(","),
  });
  if (session.meetLink) params.set("location", session.meetLink);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
