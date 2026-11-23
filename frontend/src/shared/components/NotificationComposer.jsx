import { useEffect, useState } from "react";
import { request } from "../services/api";

export default function NotificationComposer({
  recipients = [],
  fixedRecipient,
  includeEveryone = false,
  type = "MESSAGE",
  metadata = {},
  heading = "Send a notification",
  initialTitle = "",
  compact = false,
}) {
  const [recipient, setRecipient] = useState(includeEveryone ? "ALL" : recipients[0]?.email || "");
  const [title, setTitle] = useState(initialTitle);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!includeEveryone && !fixedRecipient && !recipients.some((item) => item.email === recipient)) {
      setRecipient(recipients[0]?.email || "");
    }
  }, [fixedRecipient, includeEveryone, recipient, recipients]);

  async function submit(event) {
    event.preventDefault();
    setStatus("");
    setError("");
    setSending(true);
    try {
      const allRecipients = includeEveryone && recipient === "ALL";
      const result = await request("/notifications/send", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          recipientEmail: fixedRecipient?.email || (allRecipients ? null : recipient),
          allRecipients,
          type,
          metadata,
        }),
      });
      setStatus(`Sent to ${result.sentCount} recipient${result.sentCount === 1 ? "" : "s"}.`);
      setMessage("");
    } catch (sendError) {
      setError(sendError.message || "The notification could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className={`w-full rounded-xl border border-slate-200 bg-white p-4 ${compact ? "" : "shadow-sm"}`}>
      <h3 className="m-0 text-sm font-semibold text-blue-950">{heading}</h3>
      {fixedRecipient ? (
        <p className="mb-0 mt-2 text-xs text-slate-500">To: {fixedRecipient.name || fixedRecipient.email} · {fixedRecipient.email}</p>
      ) : (
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Recipient
          <select
            required
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            {includeEveryone && <option value="ALL">Everyone in the project</option>}
            {recipients.map((item) => (
              <option key={item.email} value={item.email}>
                {item.name || item.email} · {item.email} · {(item.role || "").replace("ROLE_", "").replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="mt-3 block text-xs font-medium text-slate-600">
        Title
        <input
          required
          maxLength="255"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Notification title"
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs"
        />
      </label>
      <label className="mt-3 block text-xs font-medium text-slate-600">
        Message
        <textarea
          required
          maxLength="4000"
          rows="4"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write the message to send…"
          className="mt-1.5 w-full rounded-lg border border-slate-200 p-3 text-xs"
        />
      </label>
      <button
        type="submit"
        disabled={sending || (!fixedRecipient && !includeEveryone && !recipients.length)}
        className="mt-3 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Sending…" : "Send notification"}
      </button>
      {status && <p className="mb-0 mt-3 text-xs text-emerald-700" role="status">{status}</p>}
      {error && <p className="mb-0 mt-3 text-xs text-rose-700" role="alert">{error}</p>}
    </form>
  );
}
