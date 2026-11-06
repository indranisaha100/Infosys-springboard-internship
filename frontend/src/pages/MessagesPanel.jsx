import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "../services/api";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const post = (path, body) => request(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
const merge = (prev, latest) => {
  const firstId = latest.length ? latest[0].id : Infinity;
  return [...prev.filter((m) => m.id < firstId), ...latest];
};
const sizeLabel = (bytes) => (bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

// Only http/https links become clickable.
const linkify = (text) => text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => (
  /^https?:\/\//.test(part)
    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline">{part}</a>
    : part
));

async function uploadForm(path, form) {
  const token = localStorage.getItem("kgipToken");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(body?.message || `Upload failed (HTTP ${res.status}).`);
  return body;
}

async function downloadFile(att) {
  const token = localStorage.getItem("kgipToken");
  const res = await fetch(`${API}/chat/attachments/${att.id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Could not download the file.");
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = att.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function MessagesPanel() {
  const role = JSON.parse(localStorage.getItem("kgipUser") || "null")?.role;
  const isEmployee = role === "ROLE_EMPLOYEE";
  const [tab, setTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [people, setPeople] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [goals, setGoals] = useState({});
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const readUpTo = useRef(0);
  const skipScroll = useRef(false);

  const loadLists = useCallback(async () => {
    try {
      const q = encodeURIComponent(search);
      setConversations(await request(`/chat/conversations?q=${q}&archived=${showArchived}`));
      setContacts(await request(`/chat/contacts?q=${q}`));
      if (isEmployee) {
        setMentors(await request("/mentorship/mentors"));
        setPeople(await request("/connections"));
      } else {
        setIncoming(await request("/mentorship/requests/incoming"));
      }
    } catch (e) {
      setError(e.message);
    }
  }, [search, isEmployee, showArchived]);

  useEffect(() => {
    loadLists();
    const timer = window.setInterval(loadLists, 5000);
    return () => window.clearInterval(timer);
  }, [loadLists]);

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    readUpTo.current = 0;
    setMessages([]);
    setHasMore(false);
    const load = async (first) => {
      try {
        const res = await request(`/chat/conversations/${active.id}/messages?limit=30`);
        if (!alive) return;
        if (first) setHasMore(res.hasMore);
        setMessages((prev) => merge(prev, res.messages));
        const last = res.messages[res.messages.length - 1];
        if (last && !last.mine && last.id > readUpTo.current) {
          readUpTo.current = last.id;
          post(`/chat/conversations/${active.id}/read`).catch(() => {});
        }
        setError("");
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    load(true);
    const timer = window.setInterval(() => load(false), 3000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [active]);

  useEffect(() => {
    if (skipScroll.current) { skipScroll.current = false; return; }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function openWith(contact) {
    try {
      const { id } = await post("/chat/conversations", { with: contact.email });
      setActive({ id, name: contact.name, role: contact.role });
      setTab("chats");
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadOlder() {
    if (!messages.length) return;
    try {
      const res = await request(`/chat/conversations/${active.id}/messages?limit=30&before=${messages[0].id}`);
      skipScroll.current = true;
      setMessages((prev) => [...res.messages, ...prev]);
      setHasMore(res.hasMore);
    } catch (e) {
      setError(e.message);
    }
  }

  async function refreshMessages() {
    const res = await request(`/chat/conversations/${active.id}/messages?limit=30`);
    setMessages((prev) => merge(prev, res.messages));
    loadLists();
  }

  async function send(event) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !active) return;
    setInput("");
    try {
      await post(`/chat/conversations/${active.id}/messages`, { text });
      await refreshMessages();
    } catch (e) {
      setError(e.message);
    }
  }

  async function attach(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !active) return;
    const form = new FormData();
    form.append("file", file);
    form.append("caption", input.trim());
    setInput("");
    try {
      await uploadForm(`/chat/conversations/${active.id}/attachments`, form);
      await refreshMessages();
    } catch (e) {
      setError(e.message);
    }
  }

  async function flag(kind, value) {
    try {
      await post(`/chat/conversations/${active.id}/${kind}`, { value });
      if (kind === "archive") setActive(null);
      await loadLists();
    } catch (e) {
      setError(e.message);
    }
  }

  async function report() {
    const reason = window.prompt("Why are you reporting this conversation?");
    if (!reason || !reason.trim()) return;
    try {
      await post(`/chat/conversations/${active.id}/report`, { reason: reason.trim() });
      setError("");
      window.alert("Report submitted. Thank you.");
    } catch (e) {
      setError(e.message);
    }
  }

  async function act(path, body) {
    try {
      await post(path, body);
      await loadLists();
    } catch (e) {
      setError(e.message);
    }
  }

  const current = conversations.find((c) => c.id === active?.id);
  const muted = Boolean(current?.muted);
  const archivedChat = Boolean(current?.archived);

  const tabs = isEmployee
    ? [["chats", "Chats"], ["new", "Start chat"], ["network", "Network"]]
    : [["chats", "Chats"], ["new", "Start chat"], ["requests", `Requests${incoming.length ? ` (${incoming.length})` : ""}`]];
  const tabClass = (name) => `flex-1 border-0 px-2 py-2.5 text-[11px] font-semibold ${tab === name ? "bg-blue-50 text-blue-700" : "bg-white text-slate-500"}`;
  const btn = "rounded-md px-2 py-1 text-[10px] font-semibold";
  const outline = `${btn} border border-slate-200 bg-white text-slate-600`;
  const heading = "m-0 px-4 pt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400";
  const empty = "px-4 py-2 text-xs text-slate-500";

  return (
    <div className="grid h-[75vh] overflow-hidden rounded-xl border border-slate-200 bg-white md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col border-b border-slate-200 md:border-b-0 md:border-r">
        <div className="p-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts and chats..."
            aria-label="Search" style={{ padding: "8px 10px", fontSize: "12px", borderRadius: "8px" }} />
        </div>
        <div className="flex border-b border-slate-100">
          {tabs.map(([name, label]) => <button key={name} className={tabClass(name)} onClick={() => setTab(name)}>{label}</button>)}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "chats" && <>
            <div className="flex justify-end px-3 pt-2">
              <button type="button" className="border-0 bg-transparent text-[11px] font-semibold text-blue-600"
                onClick={() => { setShowArchived(!showArchived); setActive(null); }}>
                {showArchived ? "Back to chats" : "Archived chats"}
              </button>
            </div>
            {conversations.length === 0 && <p className={empty}>{showArchived ? "No archived chats." : "No chats yet. Use Start chat."}</p>}
            {conversations.map((c) => (
              <button key={c.id} onClick={() => setActive({ id: c.id, name: c.name, role: c.role })}
                className={`block w-full border-0 px-4 py-3 text-left hover:bg-slate-50 ${active?.id === c.id ? "bg-blue-50" : "bg-white"}`}>
                <span className="flex items-center justify-between gap-2">
                  <strong className="min-w-0 truncate text-xs text-blue-950">{c.name}{c.muted ? " (muted)" : ""}</strong>
                  <span className="shrink-0 text-[10px] text-slate-400">{time(c.lastMessageAt)}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[11px] text-slate-500">{c.lastMessage}</span>
                  {c.unread > 0 && <b className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-blue-500 px-1 text-[9px] text-white">{c.unread}</b>}
                </span>
              </button>
            ))}
          </>}

          {tab === "new" && <>
            {contacts.length === 0 && <p className={empty}>{isEmployee ? "No contacts yet. Connect with colleagues or request a mentor in Network." : "No accepted mentees yet."}</p>}
            {contacts.map((c) => (
              <button key={c.email} onClick={() => openWith(c)} className="block w-full border-0 bg-white px-4 py-3 text-left hover:bg-slate-50">
                <strong className="block text-xs text-blue-950">{c.name}</strong>
                <span className="text-[10px] text-slate-500">{c.role}</span>
              </button>
            ))}
          </>}

          {tab === "network" && isEmployee && <>
            <p className={heading}>Mentors</p>
            {mentors.length === 0 && <p className={empty}>No mentors available.</p>}
            {mentors.map((m) => (
              <div key={m.email} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <strong className="min-w-0 truncate text-xs text-blue-950">{m.name}</strong>
                  {m.status === "ACCEPTED" && <span className="text-[10px] text-emerald-600">Accepted</span>}
                  {m.status === "PENDING" && <span className="text-[10px] text-slate-500">Pending</span>}
                </div>
                {m.status === "NONE" && (
                  <div className="mt-2 flex gap-1">
                    <input value={goals[m.email] || ""} onChange={(e) => setGoals({ ...goals, [m.email]: e.target.value })}
                      placeholder="Your skill goal" maxLength={500}
                      style={{ flex: 1, minWidth: 0, width: "auto", padding: "6px 8px", fontSize: "11px", borderRadius: "6px" }} />
                    <button className={`${btn} border-0 bg-blue-500 text-white`}
                      onClick={() => act("/mentorship/requests", { mentorEmail: m.email, skillGoal: goals[m.email] || "" })}>Request</button>
                  </div>
                )}
              </div>
            ))}

            <p className={heading}>Colleagues</p>
            {people.length === 0 && <p className={empty}>No other employees yet.</p>}
            {people.map((p) => (
              <div key={p.email} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <strong className="min-w-0 truncate text-xs text-blue-950">{p.name}</strong>
                {p.status === "NONE" && <button className={`${btn} border-0 bg-blue-500 text-white`} onClick={() => act("/connections/request", { to: p.email })}>Connect</button>}
                {p.status === "SENT" && <button className={outline} onClick={() => act(`/connections/${p.connectionId}/decline`)}>Cancel</button>}
                {p.status === "RECEIVED" && (
                  <span className="flex shrink-0 gap-1">
                    <button className={`${btn} border-0 bg-blue-500 text-white`} onClick={() => act(`/connections/${p.connectionId}/accept`)}>Accept</button>
                    <button className={outline} onClick={() => act(`/connections/${p.connectionId}/decline`)}>Decline</button>
                  </span>
                )}
                {p.status === "CONNECTED" && <span className="text-[10px] text-emerald-600">Connected</span>}
              </div>
            ))}
          </>}

          {tab === "requests" && !isEmployee && <>
            {incoming.length === 0 && <p className={empty}>No pending mentorship requests.</p>}
            {incoming.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <strong className="block text-xs text-blue-950">{r.name}</strong>
                <p className="my-1 text-[11px] text-slate-600">Goal: {r.skillGoal}</p>
                <span className="flex gap-1">
                  <button className={`${btn} border-0 bg-blue-500 text-white`} onClick={() => act(`/mentorship/requests/${r.id}/accept`)}>Accept</button>
                  <button className={outline} onClick={() => act(`/mentorship/requests/${r.id}/decline`)}>Decline</button>
                </span>
              </div>
            ))}
          </>}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        {!active ? <p className="m-auto px-4 text-center text-xs text-slate-500">Select a conversation or start an authorised chat.</p> : (
          <>
            <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 p-4">
              <div>
                <strong className="block text-sm text-blue-950">{active.name}</strong>
                <span className="text-[10px] text-slate-500">{active.role}</span>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className={outline} onClick={() => flag("mute", !muted)}>{muted ? "Unmute" : "Mute"}</button>
                <button className={outline} onClick={() => flag("archive", !archivedChat)}>{archivedChat ? "Unarchive" : "Archive"}</button>
                <button className={outline} onClick={report}>Report</button>
              </div>
            </header>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {hasMore && <button className="mx-auto block border-0 bg-transparent text-[11px] font-semibold text-blue-600" onClick={loadOlder}>Load older messages</button>}
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[75%] ${m.mine ? "ml-auto text-right" : ""}`}>
                  <div className={`rounded-lg px-3 py-2 text-left text-xs leading-5 ${m.mine ? "bg-blue-500 text-white" : "bg-slate-100 text-blue-950"}`}>
                    {m.text && <p className="m-0 whitespace-pre-wrap break-words">{linkify(m.text)}</p>}
                    {m.attachment && (
                      <button type="button" onClick={() => downloadFile(m.attachment).catch((e) => setError(e.message))}
                        className={`mt-1 block w-full rounded-md border px-2 py-1.5 text-left text-[11px] ${m.mine ? "border-white/40 bg-white/10 text-white" : "border-slate-200 bg-white text-blue-700"}`}>
                        {m.attachment.fileName} ({sizeLabel(m.attachment.size)})
                      </button>
                    )}
                  </div>
                  <small className="text-[9px] text-slate-400">{time(m.sentAt)}{m.mine ? (m.read ? " · Seen" : " · Sent") : ""}</small>
                </div>
              ))}
              <div ref={endRef} />
            </div>
            {error && <p className="m-0 px-4 text-[10px] text-rose-600" role="alert">{error}</p>}
            <form onSubmit={send} style={{ display: "flex", gap: "8px", alignItems: "center" }} className="border-t border-slate-100 p-3">
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.docx" onChange={attach} style={{ display: "none" }} />
              <button type="button" aria-label="Attach file" onClick={() => fileRef.current?.click()}
                className="grid h-10 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-blue-950 hover:bg-slate-50">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000} placeholder="Type a message..."
                aria-label="Message" style={{ flex: 1, minWidth: 0, width: "auto", padding: "10px 12px", fontSize: "12px", borderRadius: "8px" }} />
              <button type="submit" aria-label="Send" className="grid h-10 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-blue-950 hover:bg-slate-50">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 14 21 3" /><path d="m21 3-6.5 18a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1L21 3Z" />
                </svg>
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}