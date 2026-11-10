# Manager Dashboard -- Development Progress & Completion Plan

**Project:** Organizational Knowledge Gap Intelligence Platform (KGIP)\
**Module:** Team Lead / Manager Dashboard\
**Documentation date:** 30 October 2026\
**Status:** Running locally; full requirement completion is not yet
verified.

## 1. Purpose

This document records the Manager Dashboard work completed and inspected
on 30 October 2026, describes the observed implementation, and lists the
remaining work against the Team Lead / Manager requirements shared by
the project team.

Status labels used below: - **Observed:** visible in supplied
screenshots or present in inspected source. - **Needs verification:**
code/UI exists, but end-to-end behaviour or data accuracy has not been
demonstrated. - **Not established:** supporting functionality or
database structure was not confirmed in the inspected material.

A visible dashboard card does not prove that its entire workflow is
complete.

## 2. Current status

  --------------------------------------------------------------------------------------------
  Area                    Status                  Notes
  ----------------------- ----------------------- --------------------------------------------
  Manager dashboard page  Running locally         Browser showed
                                                  `http://localhost:5173/manager-dashboard`.

  Dashboard layout        Visible                 Sidebar, top bar, overview banner and
                                                  dashboard sections render.

  Summary cards           Visible                 Screenshot showed employee, mentor,
                                                  skill-gap and critical-gap counts.

  Assessment performance  Visible                 Assessment performance and average-score
                                                  area were visible.

  Skill coverage          Visible                 Section was visible; calculations and source
                                                  data still need validation.

  Manager backend         Present in source       `GET /api/manager/dashboard`; controller
  endpoint                                        validates bearer token and role.

  Dashboard service       Present in source       `ManagerDashboardService` reads users and
                                                  assessment scores.

  Manager-specific team   Not established         Inspected service filters employees by role;
  assignment                                      manager assignment scoping was not
                                                  demonstrated.

  Training and enrollment Not established         Supporting tables and working endpoints were
                                                  not confirmed.

  Mentorship workflows    Not established         Mentor directory UI exists;
                                                  assignment/session workflows need
                                                  verification.

  Reports/export          Needs verification      Sidebar entry exists; complete export
                                                  behaviour has not been demonstrated.
  --------------------------------------------------------------------------------------------

### Values visible in the dashboard screenshot

-   Total Employees: **7**
-   Total Mentors: **2**
-   Employees with Skill Gaps: **2**
-   Critical Skill Gaps: **2**

These are screenshot-time values only. Recheck the live database and API
before using them in a report.

## 3. Work completed / inspected today

### 3.1 Frontend and local runtime

-   Opened the Manager Dashboard at
    `http://localhost:5173/manager-dashboard`.
-   Confirmed that the page rendered without a visible browser error.
-   Inspected the KGIP Manager Workspace sidebar, manager profile/top
    bar, Management Overview banner, Organization Overview cards,
    Assessment Performance section, Average Assessment Score area and
    Skill Coverage area.
-   Inspected these manager frontend files:
    -   `frontend/src/pages/ManagerDashboard.jsx`
    -   `frontend/src/pages/ManagerDashboard.css`
    -   `frontend/src/services/managerApi.js`
    -   `frontend/src/components/manager/ManagerSidebar.jsx`
    -   `frontend/src/components/manager/ManagerTopbar.jsx`
    -   `frontend/src/components/manager/CriticalGapAlerts.jsx`
    -   `frontend/src/components/manager/SkillCoverageChart.jsx`
    -   `frontend/src/components/manager/SkillGapHeatmap.jsx`
    -   `frontend/src/components/manager/SummaryCards.jsx`

The sidebar includes Dashboard, My Employees, Mentor Directory, Skill
Gap Analysis, Skill Gap Heatmap, Assessments, Training Progress,
Critical Alerts and Team Reports. A menu item alone does not prove the
workflow is complete.

### 3.2 Backend files inspected

-   `backend/src/main/java/com/knowledgegap/backend/controller/ManagerDashboardController.java`
-   `backend/src/main/java/com/knowledgegap/backend/service/ManagerDashboardService.java`
-   `backend/src/main/java/com/knowledgegap/backend/model/AssessmentScore.java`
-   `backend/src/main/java/com/knowledgegap/backend/model/AssessmentRecommendation.java`
-   `backend/src/main/java/com/knowledgegap/backend/controller/EmployeeController.java`
-   `backend/src/main/java/com/knowledgegap/backend/config/SecurityConfig.java`

### 3.3 Manager dashboard API

The controller maps the endpoint:

``` http
GET http://localhost:8080/api/manager/dashboard
```

The inspected controller: 1. Reads the `Authorization` header. 2.
Requires a `Bearer` token. 3. Validates the JWT. 4. Finds the user
associated with the token email. 5. Allows `ROLE_MANAGER`, `ROLE_HR` or
`ROLE_ADMIN`. 6. Calls
`ManagerDashboardService.getDashboardData(manager)` and returns the
response.

Keep frontend role checks consistent with these intended backend roles.

### 3.4 Backend service behaviour

The inspected `ManagerDashboardService`: - Retrieves users with
`userRepository.findAll()`. - Filters users whose role is
`ROLE_EMPLOYEE`. - Sorts employees by name. - Filters users whose role
is `ROLE_MENTOR`. - Uses `AssessmentScoreRepository` to retrieve
assessment information.

**Important:** the inspected service obtains employees by role. It does
not demonstrate a manager-to-employee assignment relation that restricts
results to the logged-in manager's team. Do not describe this as
manager-specific team data until assignment logic exists and is tested.

### 3.5 Assessment data model

`AssessmentScore` maps to `assessment_scores` and contains: - `id` -
`employee_email` - `topic` - `right_answers` - `total_questions` -
`target_answers` - `submitted_at`

`AssessmentRecommendation` maps to `assessment_recommendations` and
contains: - `id` - `employee_email` - `assessment_submitted_at` -
`recommendation_json` - `generated_at`

These records can support assessment summaries and recommendation
history. Skill-gap calculations still require an agreed competency and
required-proficiency definition.

### 3.6 Database inspection

A supplied Neon PostgreSQL database screenshot showed the database
`neondb` with these tables: - `users` - `assessment_scores` -
`assessment_recommendations`

Visible columns included:

**`users`:** `id`, `email`, `first_name`, `last_name`, `password`,
`role`.

**`assessment_scores`:** `id`, `employee_email`, `right_answers`,
`submitted_at`, `target_answers`, `topic`, `total_questions`.

**`assessment_recommendations`:** `id`, `assessment_submitted_at`,
`employee_email`, `generated_at`, `recommendation_json`.

This is the structure visible in the supplied screenshots, not a
guarantee that every project environment has only these tables. Confirm
the live schema before adding migrations.

### 3.7 Development environment observation

-   Vite frontend was running on port `5173`.
-   Spring Boot backend source and project structure were inspected.
-   PostgreSQL command attempts in PowerShell displayed
    `& was unexpected at this time.` This is a command invocation/shell
    syntax issue; it is not proof of a database or Java application
    failure. Use PowerShell's call operator with a correctly quoted
    executable path when invoking `psql.exe` directly.

## 4. Issues identified

### 4.1 Frontend/backend role mismatch

The inspected backend controller accepts `ROLE_MANAGER`, `ROLE_HR` and
`ROLE_ADMIN`. An inspected version of `ManagerDashboard.jsx` checked
only `ROLE_HR` and `ROLE_ADMIN`.

If that is still the current file, a genuine `ROLE_MANAGER` user may be
redirected by the frontend even though the backend permits that role.

**Action:** check the latest `ManagerDashboard.jsx` and align its role
check with the agreed backend permissions. Do not weaken backend
authorization to solve a frontend routing issue.

### 4.2 Employee list may include all employees

The inspected service filters all users by `ROLE_EMPLOYEE`. It does not
demonstrate manager-specific assignment filtering.

**Action:** agree on an assignment model, implement it, and scope
manager endpoints to the authenticated manager. HR/Admin-wide access can
be handled separately according to project permissions.

### 4.3 Avoid invented training and mentorship data

Training adoption, course completion, overdue activities, mentorship
sessions and feedback must come from real records. If the relevant
tables/endpoints do not exist, show a clear empty state instead of
fabricated percentages, names, dates or statuses.

### 4.4 Define skill-gap calculation

Assessment percentages alone do not establish a job-role competency gap.
The application needs a defined mapping of: - Employee or job role -
Competency / skill - Current assessed proficiency - Required
proficiency - Gap severity or priority

Agree on the proficiency scale and thresholds with the team before
calculating gap counts or heatmap colours.

## 5. Requirements checklist

### 5.1 Dashboard Overview

-   [x] Overview page renders locally.
-   [x] Summary cards are visible.
-   [x] Assessment performance and skill coverage sections are visible.
-   [ ] Verify every displayed count against live database records.
-   [ ] Calculate total team members based on manager assignment.
-   [ ] Calculate employees with gaps using defined competency rules.
-   [ ] Calculate training adoption from actual enrollment records.
-   [ ] Calculate critical gaps using agreed severity thresholds.
-   [ ] Show individual learning progress from actual training records.
-   [ ] Add clear loading, error and no-data states.

### 5.2 My Team

-   [ ] Create or confirm manager-to-employee assignment data model.
-   [ ] Return only employees assigned to the logged-in manager.
-   [ ] Display employee name, job role and department.
-   [ ] Display employee skill profile.
-   [ ] Provide permitted access to assessment results and learning
    progress.
-   [ ] Show competency development status.
-   [ ] Add employee search/filter and detail view.

### 5.3 Team Skill Gap Analysis

-   [ ] Define role-to-competency requirements.
-   [ ] Define current proficiency calculation from assessment results.
-   [ ] Compare current proficiency with required proficiency.
-   [ ] Identify missing and below-target skills.
-   [ ] Count affected employees per skill.
-   [ ] Rank/prioritize important gaps.
-   [ ] Ensure values come from backend/database data.

### 5.4 Team Skill Gap Heatmap

-   [ ] Build a matrix of employees versus competencies.
-   [ ] Populate cells from actual proficiency data.
-   [ ] Define and document indicator thresholds.
-   [ ] Distinguish missing assessment data from a low score.
-   [ ] Allow managers to identify employees/skills needing improvement.
-   [ ] Add legend, labels and empty states.

### 5.5 Employee Assessments

-   [ ] Show employee self-assessment results.
-   [ ] Show assessment history.
-   [ ] Compare current and previous submissions.
-   [ ] Highlight improvement or decline by topic.
-   [ ] Identify areas requiring support.
-   [ ] Implement manager evaluations only if the agreed workflow
    supports them.
-   [ ] Enforce permissions for assessment details.

### 5.6 Training Recommendations

-   [ ] Retrieve recommendations based on real skill gaps.
-   [ ] Link each recommendation to the relevant skill.
-   [ ] Show suitable resources for individuals or groups.
-   [ ] Prioritize by competency requirement and gap severity.
-   [ ] Provide L&D coordination workflow where required.
-   [ ] Do not present a suggested resource as an enrolled course
    without an enrollment record.

### 5.7 Learning Progress

-   [ ] Confirm/design course and enrollment tables.
-   [ ] Track Not Started, In Progress and Completed states.
-   [ ] Store progress and completion information.
-   [ ] Track due dates and overdue activities where deadlines exist.
-   [ ] Track learning milestones.
-   [ ] Compare assessments before and after training.
-   [ ] Calculate adoption/completion from actual records.

### 5.8 Mentorship Management

-   [ ] Confirm mentor profile and availability data.
-   [ ] Identify employees who may benefit from mentorship.
-   [ ] Find suitable internal subject-matter experts.
-   [ ] Create/view employee-mentor connections.
-   [ ] Track scheduled sessions.
-   [ ] Store feedback and knowledge-sharing activity where supported.
-   [ ] Enforce role and data-access permissions.

### 5.9 Alerts and Notifications

-   [ ] Generate alerts for critical team skill gaps.
-   [ ] Notify managers about due/overdue training.
-   [ ] Highlight employees needing additional support.
-   [ ] Display relevant learning-progress updates.
-   [ ] Define severity, status and acknowledgement behaviour.
-   [ ] Avoid duplicate or stale alerts.

### 5.10 Team Reports

-   [ ] Generate team-level skill-gap summaries.
-   [ ] Show competency coverage across team members.
-   [ ] Summarize training participation and completion.
-   [ ] Include individual learning-progress snapshots.
-   [ ] Implement CSV/PDF export if required.
-   [ ] Verify report filters and totals against source records.

## 6. Recommended implementation phases

### Phase 1 -- Stabilize the existing dashboard

1.  Confirm the latest frontend and backend files.
2.  Fix frontend role check to match intended backend roles.
3.  Test `/api/manager/dashboard` with a valid manager token.
4.  Verify dashboard values against PostgreSQL.
5.  Remove placeholder/hardcoded manager metrics.
6.  Add loading, error and empty states.

**Exit criteria:** intended Manager/HR/Admin access works and dashboard
values can be traced to database records.

### Phase 2 -- My Team and access control

1.  Agree on manager/employee assignment model.
2.  Add database migration and JPA model/repository.
3.  Add manager-scoped backend queries/endpoints.
4.  Build My Team list and employee detail view.
5.  Test that managers cannot access another manager's restricted team
    data.

**Exit criteria:** each manager sees only the employees allowed by the
agreed access rules.

### Phase 3 -- Skill analysis and heatmap

1.  Define competency catalogue and role requirements.
2.  Define proficiency and severity thresholds.
3.  Calculate employee-level gaps.
4.  Aggregate gaps by competency.
5.  Populate heatmap and coverage chart from API responses.
6.  Test missing assessment data and edge cases.

**Exit criteria:** charts, counts and heatmap cells are reproducible
from assessment and competency data.

### Phase 4 -- Assessment history and recommendations

1.  Add/verify employee assessment-history endpoints.
2.  Compare latest submission with previous submission.
3.  Connect recommendation records to employee, assessment and skill.
4.  Display priority and rationale.
5.  Add permission checks.

**Exit criteria:** managers can inspect assessment progress and relevant
recommendations using saved data.

### Phase 5 -- Training and learning progress

1.  Agree on course catalogue and enrollment lifecycle.
2.  Add training/enrollment schema, entities and repositories.
3.  Add enrollment/progress APIs.
4.  Build course status and progress views.
5.  Calculate adoption, completion and overdue metrics.
6.  Compare pre-training and post-training assessments.

**Exit criteria:** learning metrics are calculated from actual
enrollment and completion records.

### Phase 6 -- Mentorship

1.  Confirm mentor profile and availability requirements.
2.  Design mentor-employee assignment and session records.
3.  Implement discovery and assignment workflows.
4.  Add session schedule and feedback views.
5.  Test access permissions.

**Exit criteria:** mentorship connections and activity are backed by
persisted records.

### Phase 7 -- Alerts, reports and final QA

1.  Implement alert creation and status handling.
2.  Add notifications for critical gaps and learning deadlines.
3.  Build team reports and required export formats.
4.  Test empty, partial and populated datasets.
5.  Test every sidebar section using Manager, HR and Admin accounts.
6.  Verify responsive layout and browser console/network errors.
7.  Run backend tests and a clean frontend build.

**Exit criteria:** all agreed manager requirements are implemented and
tested; unsupported features are clearly identified.

## 7. Local development commands

Run frontend and backend in separate terminals.

### Frontend

``` powershell
cd path\to\Infosys-springboard-internship\frontend
npm install
npm run dev
```

Open `http://localhost:5173/manager-dashboard`. The exact route depends
on the current React Router configuration.

### Backend

``` powershell
cd path\to\Infosys-springboard-internship\backend
.\mvnw.cmd spring-boot:run
```

Configure valid database connection settings before starting Spring
Boot. The project README documents variables such as `DB_URL`,
`DB_USERNAME` and `DB_PASSWORD`. Use the team's configured values
locally; never commit passwords or API keys.

The frontend's default local API base is `http://localhost:8080/api`.

### Build and compile checks

Frontend:

``` powershell
npm run build
```

Backend:

``` powershell
.\mvnw.cmd clean test
```

If the project does not yet have a configured test suite, at minimum
run:

``` powershell
.\mvnw.cmd clean compile
```

## 8. API and database verification

### Manager dashboard endpoint

``` http
GET /api/manager/dashboard
Authorization: Bearer <JWT_TOKEN>
```

The inspected controller accepts `ROLE_MANAGER`, `ROLE_HR` and
`ROLE_ADMIN`. Use a valid token from the application's login flow. Never
commit or publish real tokens.

### Suggested read-only PostgreSQL checks

Run these against the correct project database. The table names match
the supplied database screenshots.

``` sql
-- List tables in public schema
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Count users by role
SELECT role, COUNT(*) AS total
FROM users
GROUP BY role
ORDER BY role;

-- Inspect recent assessment submissions
SELECT
    employee_email,
    topic,
    right_answers,
    total_questions,
    target_answers,
    submitted_at
FROM assessment_scores
ORDER BY submitted_at DESC;

-- Inspect saved recommendations
SELECT
    employee_email,
    assessment_submitted_at,
    generated_at
FROM assessment_recommendations
ORDER BY generated_at DESC;
```

These queries are read-only. Adapt them only after checking the live
schema if table names or schema differ.

## 9. Database capabilities to confirm or add

The following are **design requirements to assess**, not claims that
these tables already exist.

  -----------------------------------------------------------------------
  Capability                          Data that may be required
  ----------------------------------- -----------------------------------
  Manager team assignment             Manager ID/email, employee
                                      ID/email, assignment status and
                                      dates

  Department and job role             Department, job role and employee
                                      association

  Competency requirements             Skill, role, required proficiency
                                      and effective dates

  Employee proficiency                Employee, skill, assessed
                                      proficiency, assessment reference
                                      and date

  Training catalogue                  Course/resource, skill mapping,
                                      provider, duration and metadata

  Training enrollment                 Employee, course, status, progress,
                                      enrollment date, due date and
                                      completion date

  Mentorship                          Mentor, employee/mentee, assignment
                                      status, start/end dates

  Mentorship sessions                 Connection, scheduled time,
                                      completion status and feedback

  Alerts                              Recipient, type, severity, message,
                                      source record, created date and
                                      acknowledgement status

  Reports                             Generate from verified source data;
                                      persist report metadata only if
                                      needed
  -----------------------------------------------------------------------

Compare this list with the complete schema in the active environment
before writing migrations. Avoid duplicate tables or conflicting
relationships.

## 10. Final acceptance checklist

### Functional

-   [ ] Manager can log in and reach the manager dashboard.
-   [ ] HR/Admin access follows agreed permissions.
-   [ ] Manager sees only the permitted team.
-   [ ] Every summary metric is calculated from actual data.
-   [ ] Skill gap analysis uses documented competency requirements.
-   [ ] Heatmap accurately represents proficiency and missing data.
-   [ ] Assessment history and comparisons work.
-   [ ] Recommendations are linked to actual employee gaps.
-   [ ] Training enrollment and progress states work.
-   [ ] Overdue training is identified when due dates exist.
-   [ ] Mentorship connections and sessions work.
-   [ ] Alerts can be viewed and handled.
-   [ ] Reports show correct team-level data and export works if
    required.

### Technical

-   [ ] Backend validates authentication and authorization.
-   [ ] Frontend role checks match backend permissions.
-   [ ] Manager-scoped queries prevent cross-team data leakage.
-   [ ] No secrets are committed.
-   [ ] API errors and empty responses are handled.
-   [ ] Database migrations work on a clean/test database.
-   [ ] Backend tests pass.
-   [ ] Frontend production build succeeds.
-   [ ] No critical browser console or network errors remain.

### Documentation and handover

-   [ ] Database schema changes are documented.
-   [ ] API endpoints and response shapes are documented.
-   [ ] Setup instructions are verified on another developer's machine.
-   [ ] Screenshots are updated after final implementation.
-   [ ] Remaining limitations are explicitly recorded.

## 11. Current completion statement

As of **30 October 2026**, the Manager Dashboard page is running locally
and its main overview layout and summary/assessment sections are
visible. The inspected backend contains a manager dashboard endpoint and
a service that reads user and assessment data.

The module is **not yet confirmed complete** against the full ten-part
Team Lead / Manager specification. In particular, manager-specific team
assignment, competency requirements, training enrollment/progress,
mentorship workflows, actionable notifications and team report export
require implementation or end-to-end verification.

The next recommended task is to verify the active database schema and
current source files, then complete **Phase 1 (dashboard correctness and
role consistency)** before adding new schema or replacing working files.

## 12. References

-   [GitHub documentation: About repository README
    files](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
-   Team Lead / Manager Dashboard requirements supplied by the project
    team.
-   Project source files and screenshots inspected during the 30 October
    2026 development session.

------------------------------------------------------------------------

**Maintenance note:** Update this document as each phase is implemented.
Mark checklist items complete only after the relevant feature has been
tested with real data.
