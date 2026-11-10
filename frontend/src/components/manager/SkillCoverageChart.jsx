
export default function SkillCoverageChart({ assessments = [] }) {
  const topics = {};

  assessments.forEach((item) => {
    if (!topics[item.topic]) {
      topics[item.topic] = {
        total: 0,
        count: 0,
      };
    }

    topics[item.topic].total += Number(item.score) || 0;
    topics[item.topic].count += 1;
  });

  const chartData = Object.entries(topics).map(
    ([name, value]) => ({
      name,
      score: Math.round(value.total / value.count),
    })
  );

  return (
    <section className="manager-panel">
      <div className="manager-panel-heading">
        <div>
          <h2>Skill Coverage</h2>
          <p>Average assessment score by topic</p>
        </div>
      </div>

      {chartData.length === 0 ? (
        <p className="manager-empty">
          No assessment data available yet.
        </p>
      ) : (
        chartData.map((item) => (
          <div className="coverage-row" key={item.name}>
            <div className="coverage-label">
              <strong>{item.name}</strong>
              <span>{item.score}%</span>
            </div>

            <div className="coverage-track">
              <div
                className="coverage-fill"
                style={{
                  width: `${Math.min(100, item.score)}%`,
                }}
              />
            </div>
          </div>
        ))
      )}
    </section>
  );
}
