
export default function SkillGapHeatmap({ assessments = [] }) {
  function getLevel(score) {
    if (score < 40) return "gap-high";
    if (score < 70) return "gap-medium";
    return "gap-low";
  }

  return (
    <section className="manager-panel">
      <div className="manager-panel-heading">
        <div>
          <h2>Knowledge Gap Heatmap</h2>
          <p>Assessment performance by employee and skill</p>
        </div>
      </div>

      {assessments.length === 0 ? (
        <p className="manager-empty">
          No assessment records available.
        </p>
      ) : (
        <div className="manager-table-wrapper">
          <table className="manager-table">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>SKILL</th>
                <th>SCORE</th>
                <th>GAP STATUS</th>
              </tr>
            </thead>

            <tbody>
              {assessments.map((item, index) => (
                <tr key={`${item.email}-${item.topic}-${index}`}>
                  <td>{item.employee}</td>
                  <td>{item.topic}</td>
                  <td>{item.score}%</td>
                  <td>
                    <span className={`gap-badge ${getLevel(item.score)}`}>
                      {item.score < 40
                        ? "Critical"
                        : item.score < 70
                          ? "Needs Improvement"
                          : "Good"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
