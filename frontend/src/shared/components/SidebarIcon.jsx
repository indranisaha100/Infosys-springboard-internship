export default function SidebarIcon({ label, name, className = "h-[18px] w-[18px] shrink-0" }) {
  const normalized = String(label || name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  let icon = "dashboard";

  if (normalized === "dashboard") icon = "dashboard";
  else if (normalized.includes("profile")) icon = "profile";
  else if (normalized.includes("assessment") || normalized.includes("benchmarks")) icon = "assessment";
  else if (normalized.includes("knowledge gap") || normalized.includes("gap analysis") || normalized.includes("gap heatmap")) icon = "gap";
  else if (normalized.includes("recommendation")) icon = "sparkle";
  else if (normalized.includes("learning")) icon = "learning";
  else if (normalized.includes("mentor")) icon = "mentor";
  else if (normalized.includes("message") || normalized.includes("chat")) icon = "message";
  else if (normalized.includes("notification") || normalized.includes("announcement")) icon = "bell";
  else if (normalized.includes("report") || normalized.includes("analytics")) icon = "report";
  else if (normalized.includes("risk") || normalized.includes("alert") || normalized.includes("priority")) icon = "alert";
  else if (normalized.includes("heatmap") || normalized.includes("matrix")) icon = "chart";
  else if (normalized.includes("employee") || normalized.includes("team") || normalized.includes("directory") || normalized.includes("workforce") || normalized.includes("account requests")) icon = "users";
  else if (normalized.includes("overview") || normalized.includes("department")) icon = "overview";

  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    profile: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    assessment: <><path d="m8 12 2.5 2.5L16 9" /><circle cx="12" cy="12" r="9" /></>,
    gap: <><path d="M4 18V6M4 18h16M7 14l3-4 3 2 5-7" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
    learning: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>,
    mentor: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /><path d="M8 3v4M16 3v4" /></>,
    message: <><path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" /><path d="M8 10h8M8 14h5" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    report: <><path d="M7 3h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
    alert: <><path d="M12 3 2.8 19a1.5 1.5 0 0 0 1.3 2h15.8a1.5 1.5 0 0 0 1.3-2L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
    chart: <><path d="M4 19V5M4 19h17M8 16v-3M12 16V9M16 16V6M20 16v-5" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    overview: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[icon]}
    </svg>
  );
}
