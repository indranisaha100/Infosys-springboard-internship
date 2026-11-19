
const cards = [
  {
    key: "totalEmployees",
    label: "Total Employees",
    icon: "♙",
    color: "blue",
    note: "Registered employees",
  },
  {
    key: "totalMentors",
    label: "Total Mentors",
    icon: "♧",
    color: "purple",
    note: "Available mentors",
  },
  {
    key: "totalHR",
    label: "HR Members",
    icon: "♙",
    color: "orange",
    note: "Management accounts",
  },
  {
    key: "totalAssessments",
    label: "Assessments",
    icon: "✓",
    color: "green",
    note: "Submitted assessments",
  },
];

export default function SummaryCards({ data }) {
  return (
    <div className="manager-stats">
      {cards.map((card) => (
        <div className="manager-stat-card" key={card.key}>
          <span className={`stat-icon ${card.color}`}>
            {card.icon}
          </span>

          <p>{card.label}</p>

          <h2>{data?.[card.key] ?? 0}</h2>

          <small>{card.note}</small>
        </div>
      ))}
    </div>
  );
}
