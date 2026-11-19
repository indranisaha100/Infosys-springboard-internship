export const RESULT_KEY = 'kgip_skill_assessment_result'
export const DONE_KEY = 'kgip_completed_courses'
export const PER_TOPIC = 2 // questions asked from each topic in one attempt

// Question bank: 5 questions per topic, 2 are picked at random for each attempt.
// In the real app the bank lives on the server and correct answers never reach the browser.
const BANK = {
  Java: [
    { q: 'Which keyword prevents a class from being subclassed?', options: ['static', 'abstract', 'private', 'final'], answer: 3 },
    { q: 'What is the default value of an int field in a Java class?', options: ['null', '1', '0', 'undefined'], answer: 2 },
    { q: 'Which interface lets objects be sorted by Collections.sort() without a separate comparator?', options: ['Comparable', 'Comparator', 'Iterable', 'Serializable'], answer: 0 },
    { q: 'Which statement about String in Java is true?', options: ['Strings are mutable', 'Strings are primitive types', 'Strings are immutable', 'Strings cannot be compared'], answer: 2 },
    { q: 'What does the static keyword on a method mean?', options: ['It belongs to the class, not to an object', 'It cannot return a value', 'It runs once at startup', 'It cannot take arguments'], answer: 0 },
  ],
  SQL: [
    { q: 'Which statement adds new rows to a table?', options: ['UPDATE', 'INSERT INTO', 'ALTER TABLE', 'DROP TABLE'], answer: 1 },
    { q: 'Which function counts the rows in a result?', options: ['SUM()', 'LENGTH()', 'TOTAL()', 'COUNT()'], answer: 3 },
    { q: 'What does a PRIMARY KEY guarantee?', options: ['Unique, non-null values for each row', 'Fast sorting of all columns', 'Automatic backups', 'Encrypted columns'], answer: 0 },
    { q: 'Which keyword removes duplicate values from a SELECT result?', options: ['UNIQUE', 'DIFFERENT', 'DISTINCT', 'REMOVE'], answer: 2 },
    { q: 'Which clause sorts the result of a query?', options: ['GROUP BY', 'ORDER BY', 'SORT', 'HAVING'], answer: 1 },
  ],
  React: [
    { q: 'Which hook adds state to a function component?', options: ['useEffect', 'useState', 'useRef', 'useMemo'], answer: 1 },
    { q: 'What is JSX?', options: ['A database query language', 'A CSS preprocessor', 'A syntax for writing HTML-like code inside JavaScript', 'A testing library'], answer: 2 },
    { q: 'Which attribute should each item have when you render a list in React?', options: ['id', 'key', 'ref', 'name'], answer: 1 },
    { q: 'Which hook runs side effects such as fetching data after a render?', options: ['useEffect', 'useState', 'useContext', 'useReducer'], answer: 0 },
    { q: 'How do you pass data from a parent component to a child component?', options: ['Through props', 'Through CSS variables', 'Through the HTML title', 'Through the browser history'], answer: 0 },
  ],
  'Problem Solving': [
    { q: 'Which data structure works on a last-in, first-out basis?', options: ['Queue', 'Array', 'Heap', 'Stack'], answer: 3 },
    { q: 'What is the average time complexity of looking up a key in a hash map?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'], answer: 0 },
    { q: 'What is the best first step when solving a coding problem?', options: ['Write the code immediately', 'Understand the problem, its inputs and outputs', 'Choose a programming language', 'Test on the largest input'], answer: 1 },
    { q: 'Which technique breaks a problem into smaller copies of the same problem?', options: ['Iteration only', 'Hashing', 'Recursion', 'Sorting'], answer: 2 },
    { q: 'What is the simplest way to find the largest value in an unsorted list?', options: ['Sort it first', 'Scan every item once', 'Use binary search', 'Reverse the list'], answer: 1 },
  ],
  'REST APIs': [
    { q: 'Which HTTP method is meant to replace an existing resource completely?', options: ['POST', 'GET', 'PATCH', 'PUT'], answer: 3 },
    { q: 'What does the HTTP status code 201 mean?', options: ['Created', 'OK', 'Not found', 'Forbidden'], answer: 0 },
    { q: 'Which status code means the caller is not authenticated?', options: ['400', '404', '401', '500'], answer: 2 },
    { q: 'What does REST stand for?', options: ['Remote Execution Service Tool', 'Representational State Transfer', 'Reliable Server Transport', 'Resource Sharing Technique'], answer: 1 },
    { q: 'In /users/5, which part identifies the resource?', options: ['The header', 'The body', 'The URL path', 'The cookie'], answer: 2 },
  ],
  'Git and Version Control': [
    { q: 'Which command shows the history of commits?', options: ['git log', 'git status', 'git diff', 'git init'], answer: 0 },
    { q: 'Which command stages all changed files?', options: ['git commit', 'git push', 'git add .', 'git clone'], answer: 2 },
    { q: 'Which command copies a remote repository to your computer?', options: ['git pull', 'git clone', 'git fork', 'git copy'], answer: 1 },
    { q: 'What does git merge do?', options: ['Deletes a branch', 'Uploads commits', 'Combines changes from another branch', 'Reverts the last commit'], answer: 2 },
    { q: 'Which command shows which files have changed?', options: ['git status', 'git remote', 'git tag', 'git config'], answer: 0 },
  ],
}

export const TOPICS = Object.keys(BANK)

// Correct answers needed in each topic to meet the target level for the role.
export const TARGETS = {
  Java: 2,
  SQL: 2,
  React: 1,
  'Problem Solving': 2,
  'REST APIs': 1,
  'Git and Version Control': 1,
}

// Sample catalog, 4 courses per topic in learning order:
// Beginner, Beginner, Intermediate, Advanced. Replace with the real catalog.
export const COURSES = {
  Java: [
    { level: 'Beginner', title: 'Java Basics and Object-Oriented Programming', hours: 6, source: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
    { level: 'Beginner', title: 'Java Syntax, Variables and Control Flow', hours: 4, source: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
    { level: 'Intermediate', title: 'Java Programming Fundamentals and Collections', hours: 4, source: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
    { level: 'Advanced', title: 'Java Streams, Concurrency and Performance', hours: 6, source: 'Oracle Java Tutorials', url: 'https://docs.oracle.com/javase/tutorial/' },
  ],
  SQL: [
    { level: 'Beginner', title: 'SQL Essentials: SELECT, WHERE and JOIN', hours: 4, source: 'W3Schools', url: 'https://www.w3schools.com/sql/' },
    { level: 'Beginner', title: 'Creating and Changing Tables in SQL', hours: 3, source: 'W3Schools', url: 'https://www.w3schools.com/sql/' },
    { level: 'Intermediate', title: 'SQL Grouping, Joins and Subqueries', hours: 5, source: 'W3Schools', url: 'https://www.w3schools.com/sql/' },
    { level: 'Advanced', title: 'SQL Query Optimization and Indexing', hours: 5, source: 'Use The Index, Luke', url: 'https://use-the-index-luke.com/' },
  ],
  React: [
    { level: 'Beginner', title: 'React Basics: Components, JSX and Props', hours: 5, source: 'React docs', url: 'https://react.dev/learn' },
    { level: 'Beginner', title: 'State and Events in React', hours: 4, source: 'React docs', url: 'https://react.dev/learn' },
    { level: 'Intermediate', title: 'React Hooks and Side Effects', hours: 5, source: 'React docs', url: 'https://react.dev/learn' },
    { level: 'Advanced', title: 'Advanced React: Context, Performance and Patterns', hours: 6, source: 'React docs', url: 'https://react.dev/reference/react' },
  ],
  'Problem Solving': [
    { level: 'Beginner', title: 'Problem Solving Basics for Developers', hours: 3, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/learn-data-structures-and-algorithms-dsa-tutorial/' },
    { level: 'Beginner', title: 'Arrays, Strings and Simple Algorithms', hours: 4, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/learn-data-structures-and-algorithms-dsa-tutorial/' },
    { level: 'Intermediate', title: 'Structured Problem Solving for Developers', hours: 2, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/learn-data-structures-and-algorithms-dsa-tutorial/' },
    { level: 'Advanced', title: 'Data Structures and Algorithms in Depth', hours: 10, source: 'GeeksforGeeks', url: 'https://www.geeksforgeeks.org/learn-data-structures-and-algorithms-dsa-tutorial/' },
  ],
  'REST APIs': [
    { level: 'Beginner', title: 'REST API Basics', hours: 2, source: 'restfulapi.net', url: 'https://restfulapi.net/' },
    { level: 'Beginner', title: 'HTTP Methods and Status Codes', hours: 2, source: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP' },
    { level: 'Intermediate', title: 'Designing REST APIs', hours: 3, source: 'restfulapi.net', url: 'https://restfulapi.net/' },
    { level: 'Advanced', title: 'API Security and Versioning', hours: 4, source: 'restfulapi.net', url: 'https://restfulapi.net/' },
  ],
  'Git and Version Control': [
    { level: 'Beginner', title: 'Git Basics', hours: 2, source: 'Pro Git book', url: 'https://git-scm.com/book/en/v2' },
    { level: 'Beginner', title: 'Working with Remote Repositories', hours: 2, source: 'Pro Git book', url: 'https://git-scm.com/book/en/v2' },
    { level: 'Intermediate', title: 'Branching and Merging with Git', hours: 3, source: 'Pro Git book', url: 'https://git-scm.com/book/en/v2' },
    { level: 'Advanced', title: 'Advanced Git: Rebase, Stash and Team Workflows', hours: 4, source: 'Pro Git book', url: 'https://git-scm.com/book/en/v2' },
  ],
}

const shuffle = (list) => {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Picks PER_TOPIC random questions per topic and shuffles each question's options.
export function buildQuestions() {
  return TOPICS.flatMap((topic) =>
    shuffle(BANK[topic])
      .slice(0, PER_TOPIC)
      .map((item) => {
        const opts = shuffle(item.options.map((text, i) => ({ text, ok: i === item.answer })))
        return {
          topic,
          q: item.q,
          options: opts.map((o) => o.text),
          answer: opts.findIndex((o) => o.ok),
        }
      })
  )
}

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

// Latest saved attempt: { questions, answers, submittedAt }, or null.
// Results saved by an older version (a removed topic, or no question list) are ignored.
export function loadResult() {
  const r = read(RESULT_KEY, null)
  const valid =
    r && Array.isArray(r.questions) && r.questions.every((q) => TOPICS.includes(q.topic))
  return valid ? r : null
}

export const saveResult = (questions, answers, submittedAt = new Date().toISOString()) =>
  localStorage.setItem(
    RESULT_KEY,
    JSON.stringify({ questions, answers, submittedAt })
  )

export const clearResult = () => localStorage.removeItem(RESULT_KEY)

export const loadDone = () => read(DONE_KEY, [])
export function toggleDone(title) {
  const done = loadDone()
  const next = done.includes(title) ? done.filter((t) => t !== title) : [...done, title]
  localStorage.setItem(DONE_KEY, JSON.stringify(next))
  return next
}

// [{ topic, right, total, target }] - other pages (for example Knowledge Gaps) can use this.
export function scoreByTopic(questions, answers) {
  return TOPICS.map((topic) => {
    const own = questions.map((q, i) => ({ q, i })).filter((x) => x.q.topic === topic)
    const right = own.filter((x) => answers[x.i] === x.q.answer).length
    return { topic, right, total: own.length, target: TARGETS[topic] ?? own.length }
  })
}

// Topics below target, most urgent first, each with a path of courses.
// A score of 0 starts at Beginner (3 courses). A score of 1 continues with
// Intermediate and Advanced (2 courses).
export function recommendations(scores) {
  return scores
    .filter((s) => s.right < s.target)
    .map((s) => ({
      ...s,
      priority: s.right === 0 ? 'High' : 'Medium',
      courses: s.right === 0 ? COURSES[s.topic].slice(0, 3) : COURSES[s.topic].slice(2, 4),
    }))
    .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'High' ? -1 : 1))
}

// Topics that met the target get an advanced course to keep growing.
export function growth(scores) {
  return scores
    .filter((s) => s.right >= s.target)
    .map((s) => ({ topic: s.topic, course: COURSES[s.topic][3] }))
}