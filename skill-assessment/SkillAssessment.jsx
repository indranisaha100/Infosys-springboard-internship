        <p className="sa-footer">
          Each attempt uses a different mix of questions. Submitted scores are saved to your employee record.
        </p>
      </div>
    </div>
  )
}

function CourseRow({ course, topic, done, onToggle }) {
  const finished = done.includes(course.title)
  return (
    <div className="sa-course">
      <div>
        <div className="sa-small">
          {topic && <span className="sa-topic" style={{ margin: 0 }}>{topic}</span>}
          <span className="sa-level">{course.level}</span>
        </div>
        <div className="sa-course-title">{course.title}</div>
        <div className="sa-meta">
          <span><Clock /> {course.hours} hours</span>
          <span><Book /> {course.source}</span>
        </div>
      </div>
      <div className="sa-actions">
        <a className="sa-btn" href={course.url} target="_blank" rel="noreferrer">
          Find course <External />
        </a>
        <button type="button" className={`sa-btn ${finished ? 'done' : 'primary'}`}
          onClick={() => onToggle(course.title)}>
          {finished ? (<><Check /> Completed</>) : 'Mark complete'}
        </button>
      </div>
    </div>
  )
}

function Results({ saved, done, setDone, onRetake }) {
  const scores = saved.scores || scoreByTopic(saved.questions, saved.answers)
  const recs = recommendations(scores)
  const growing = growth(scores)
  const suggested = recs.flatMap((r) => r.courses)
  const finishedCount = suggested.filter((c) => done.includes(c.title)).length
  const toggle = (title) => setDone(toggleDone(title))

  return (
    <div className="sa-wrap sa-stack">
      <div className="sa-card">
        <h2 className="sa-title">Your scores by topic</h2>
        <div className="sa-scores">
          {scores.map((s) => {
            const ok = s.right >= s.target
            return (
              <div key={s.topic}>
                <div className="sa-score-top">
                  <span>{s.topic}</span>
                  <span style={{ fontWeight: 600, color: ok ? 'var(--sa-ok)' : '#b57a05' }}>
                    {s.right} of {s.total} - target {s.target}
                  </span>
                </div>
                <div className="sa-track" style={{ marginTop: 4 }}>
                  <div className={`sa-fill ${ok ? 'ok' : 'warn'}`}
                    style={{ width: `${(s.right / s.total) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="sa-banner">
        {recs.length === 0
          ? 'You meet the target level in every topic. See the courses below to keep growing.'
          : `Standard recommendations are shown based on your scores. ${finishedCount} of ${suggested.length} suggested courses completed.`}
      </div>

      {recs.map((r) => (
        <div key={r.topic} className="sa-card">
          <div className="sa-between">
            <span className="sa-topic" style={{ margin: 0 }}>{r.topic}</span>
            <span className={`sa-badge ${r.priority.toLowerCase()}`}>{r.priority} priority</span>
          </div>
          <p className="sa-small sa-muted" style={{ margin: '6px 0 4px' }}>
            You scored {r.right} of {r.total} in {r.topic}, which is below the target level for your
            role. Work through these courses in order.
          </p>
          {r.courses.map((c) => (
            <CourseRow key={c.title} course={c} done={done} onToggle={toggle} />
          ))}
        </div>
      ))}

      {growing.length > 0 && (
        <div className="sa-card">
          <h2 className="sa-title">Keep growing</h2>
          <p className="sa-small sa-muted" style={{ margin: '6px 0 4px' }}>
            You met the target in these topics. Advanced courses can take you further.
          </p>
          {growing.map((g) => (
            <CourseRow key={g.course.title} course={g.course} topic={g.topic} done={done} onToggle={toggle} />
          ))}
        </div>
      )}

      <div className="sa-between" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="sa-btn" onClick={onRetake}><Retake /> Retake assessment</button>
        <span className="sa-small sa-muted">
          A retake asks a different mix of questions. Finish some courses first to see your progress.
        </span>
      </div>
    </div>
  )
}
