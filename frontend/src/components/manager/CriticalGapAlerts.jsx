
export default function CriticalGapAlerts({ assessments = [] }) {
  const critical = assessments.filter(
    (item) => Number(item.score) < 40
  );

  return (
    <section className="manager-panel">
      <div className="manager-panel-heading">
        <div>
          <h2>Critical Gap Alerts</h2>
          <p>Employees with assessment scores below 40%</p>
        </div>

        <span className="alert-count">
          {critical.length} Alerts
        </span>
      </div>

      {critical.length === 0 ? (
        <div className="manager-empty">
          No critical assessment gaps detected.
        </div>
      ) : (
        critical.map((item, index) => (
          <div
            className="critical-alert"
            key={`${item.email}-${item.topic}-${index}`}
          >
            <span className="alert-symbol">!</span>

            <div>
              <strong>{item.employee}</strong>
              <p>
                {item.topic} requires attention.
                Current score: {item.score}%.
              </p>
              <small>{item.email}</small>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
