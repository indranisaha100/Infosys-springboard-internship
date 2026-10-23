import { useState } from 'react'
import './skillAssessment.css'
import {
  buildQuestions, clearResult, growth, loadDone, loadResult, recommendations,
  saveResult, scoreByTopic, toggleDone,
} from './skillAssessmentData'

const LETTERS = ['A', 'B', 'C', 'D']

const Icon = ({ children, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const ArrowLeft = () => <Icon><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Icon>
const ArrowRight = () => <Icon><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Icon>
const Check = () => <Icon><path d="M20 6 9 17l-5-5" /></Icon>
const Clock = () => <Icon size={13}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Icon>
const Book = () => (
  <Icon size={13}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </Icon>
)
const External = () => (
  <Icon size={14}>
    <path d="M15 3h6v6" /><path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icon>
)
const Retake = () => (
  <Icon size={15}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </Icon>
)

/**
 * Self-contained skills and assessment page.
 * Optional prop: onComplete({ scores, recommendations }) runs when an attempt is submitted.
 */
export default function SkillAssessment({ onComplete }) {
  const [saved, setSaved] = useState(loadResult)
  const [questions, setQuestions] = useState(buildQuestions)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [done, setDone] = useState(loadDone)

  const total = questions.length
  const answered = Object.keys(answers).length

  const submit = () => {
    saveResult(questions, answers)
    setSaved(loadResult())
    if (onComplete) {
      const scores = scoreByTopic(questions, answers)
      onComplete({ scores, recommendations: recommendations(scores) })
    }
  }

  // A retake builds a new set of questions.
  const retake = () => {
    clearResult()
    setSaved(null)
    setQuestions(buildQuestions())
    setAnswers({})
    setIndex(0)
  }

  if (saved) {
    return (
      <div className="sa-root">
        <Results saved={saved} done={done} setDone={setDone} onRetake={retake} />
      </div>
    )
  }

  const q = questions[index]
  const isLast = index === total - 1

  return (
    <div className="sa-root">
      <div className="sa-wrap">
        <div className="sa-card">
          <div className="sa-between sa-small">
            <span className="sa-step">Question {index + 1} of {total}</span>
            <span className="sa-faint">{answered}/{total} answered</span>
          </div>
          <div className="sa-track">
            <div className="sa-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>

          <div className="sa-topic">{q.topic}</div>
          <h2 className="sa-question">{q.q}</h2>

          <div className="sa-options" role="radiogroup" aria-label="Answers">
            {q.options.map((opt, i) => {
              const selected = answers[index] === i
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`sa-option${selected ? ' is-selected' : ''}`}
                  onClick={() => setAnswers({ ...answers, [index]: i })}
                >
                  <span className="sa-chip">{LETTERS[i]}</span>
                  <span>{opt}</span>
                </button>
              )
            })}
          </div>

          <div className="sa-nav">
            <button type="button" className="sa-btn plain" disabled={index === 0}
              onClick={() => setIndex(index - 1)}>
              <ArrowLeft /> Previous
            </button>

            <div className="sa-dots">
              {questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Question ${i + 1}`}
                  disabled={answers[i] === undefined && i !== index}
                  className={`sa-dot${i === index ? ' current' : answers[i] !== undefined ? ' answered' : ''}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>

            {isLast ? (
              <button type="button" className="sa-btn primary" disabled={answered < total} onClick={submit}>
                Submit and get recommendations
              </button>
            ) : (
              <button type="button" className="sa-btn primary" disabled={answers[index] === undefined}
                onClick={() => setIndex(index + 1)}>
                Next <ArrowRight />
              </button>
            )}
          </div>
        </div>
        <p className="sa-footer">
          Each attempt uses a different mix of questions. Results are saved in this browser.
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
  const scores = scoreByTopic(saved.questions, saved.answers)
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