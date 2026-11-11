# Department Head Dashboard

## Overview

The Department Head Dashboard is an additional role-based dashboard for
the Organizational Knowledge Gap Intelligence Platform (KGIP).

It is integrated into the existing application rather than being a
separate project. The frontend uses React and Vite, the backend uses
Spring Boot, and dashboard information is retrieved through the existing
PostgreSQL-backed application data layer.

The dashboard is intended to provide a department-level view of
workforce composition, assessment results, capability gaps, learning
participation, mentoring activity, and risk indicators.

## Technology Stack

-   **Frontend:** React, Vite, React Router
-   **Backend:** Java, Spring Boot, Spring Data repositories
-   **Database:** PostgreSQL
-   **Authentication:** Existing JWT-based login/session mechanism
-   **Reporting:** CSV export in the browser

## Dashboard Features

The Department Head Dashboard contains the following sections:

  -----------------------------------------------------------------------
  Section                             Description
  ----------------------------------- -----------------------------------
  Dashboard                           Department workforce, assessment
                                      averages, learning snapshot, and
                                      priority skill topics

  Department Overview                 Department account directory and
                                      role counts

  Department Skill Matrix             Assessment averages and counts
                                      grouped by topic

  Gap Heatmap                         Latest employee assessment score
                                      for each topic

  Workforce Capability                Summary of on-track, attention,
                                      critical, and not-yet-assessed
                                      results

  Learning & Mentoring Overview       Learning enrollment and mentorship
                                      request summaries

  Risk & Priority Alerts              Latest assessment results below the
                                      configured score threshold

  Reports & Analytics                 Downloadable CSV report

  Announcements                       Placeholder until a department
                                      announcement feed is connected

  Notifications                       Placeholder until a
                                      department-specific notification
                                      feed is connected
  -----------------------------------------------------------------------

### Assessment score bands

The current dashboard service uses these score bands:

-   **Critical:** below 40%
-   **Needs attention:** 40% to below 70%
-   **On track:** 70% or higher

These are implementation thresholds used for dashboard indicators. They
are not a formal job-role competency framework.

## Files Added

### Frontend

  --------------------------------------------------------------------------------------
  File                                               Purpose
  -------------------------------------------------- -----------------------------------
  `frontend/src/pages/DepartmentHeadDashboard.jsx`   Main Department Head dashboard
                                                     component, navigation, metrics,
                                                     tables, heatmap, alerts, and CSV
                                                     export

  `frontend/src/pages/DepartmentHeadDashboard.css`   Dashboard layout, responsive
                                                     styling, cards, tables, heatmap,
                                                     and status styles

  `frontend/src/services/departmentHeadApi.js`       Calls the Department Head dashboard
                                                     API through the existing frontend
                                                     API request helper
  --------------------------------------------------------------------------------------

### Backend

  ----------------------------------------------------------------------------------------------------------------------------------------
  File                                                                                                 Purpose
  ---------------------------------------------------------------------------------------------------- -----------------------------------
  `backend/src/main/java/com/knowledgegap/backend/controller/DepartmentHeadDashboardController.java`   Exposes the Department Head
                                                                                                       dashboard endpoint and checks the
                                                                                                       authenticated user's role and
                                                                                                       department

  `backend/src/main/java/com/knowledgegap/backend/service/DepartmentHeadDashboardService.java`         Builds department-scoped workforce,
                                                                                                       assessment, learning, mentoring,
                                                                                                       skill, and risk summaries
  ----------------------------------------------------------------------------------------------------------------------------------------

## Existing Files Updated

  ------------------------------------------------------------------------
  File                                 Change
  ------------------------------------ -----------------------------------
  `frontend/src/App.jsx`               Imports the Department Head
                                       dashboard component and registers
                                       `/department-head-dashboard`

  `frontend/src/pages/LoginPage.jsx`   Redirects `ROLE_DEPARTMENT_HEAD`
                                       users to
                                       `/department-head-dashboard` after
                                       successful login
  ------------------------------------------------------------------------

The existing Employee, Mentor, HR, and Manager dashboard routes are
retained. The existing registration flow and existing database entities
are not replaced by this dashboard integration.

## API Endpoint

``` http
GET /api/department-head/dashboard
Authorization: Bearer <JWT>
```

The frontend calls this endpoint through:

``` javascript
import { request } from "./api";

export function getDepartmentHeadDashboard() {
  return request("/department-head/dashboard", {
    method: "GET",
  });
}
```

The backend controller:

1.  Reads the bearer token from the `Authorization` header.
2.  Validates the JWT using the project's existing JWT provider.
3.  Retrieves the user associated with the token email.
4.  Checks that the user has the `ROLE_DEPARTMENT_HEAD` role.
5.  Checks the account approval status when a status is present.
6.  Checks that the Department Head account has a department assigned.
7.  Calls the dashboard service to return department data.

## Data Scope and Calculation Notes

The dashboard service uses the Department Head account's department
value to identify department records. Department matching is
case-insensitive and ignores surrounding whitespace.

The implementation uses the project's existing data models and
repositories for:

-   User accounts
-   Assessment scores
-   Learning enrollments
-   Mentorship requests
-   Training programmes

Assessment rows are restricted to employee accounts identified as
belonging to the Department Head's department. The latest assessment for
each employee and topic is used for the score summaries and heatmap.

The dashboard calculates assessment percentage as:

``` text
(right answers / total questions) * 100
```

The learning summary is based on saved enrollment records. Mentoring
counts are based on mentorship request records. Training programmes are
included when their department matches the Department Head's department.

### Important limitations

-   The current data model does not provide a separate job-title
    competency requirement mapping. The skill matrix therefore reports
    assessment-topic performance, not a comparison against formal
    job-role proficiency requirements.
-   If the project does not assign a department to the Department Head
    account, the endpoint returns a bad-request response asking for the
    department to be assigned.
-   Employee records need a matching department value to be included in
    the department view.
-   Announcements and Department Head notifications are placeholders
    because a department-specific feed has not been connected in this
    implementation.
-   The dashboard does not create or migrate database tables.
-   Department-level filtering in this implementation is based on
    department membership. Any additional organisation-specific
    authorisation requirements should be reviewed before production
    deployment.

## Prerequisites

Before running the dashboard, ensure that:

-   Java and the project's configured JDK are installed.
-   PostgreSQL is running.
-   The project's database and application configuration are set up.
-   Backend dependencies can be resolved by Maven.
-   Frontend dependencies are installed.
-   An approved Department Head account exists.
-   The Department Head account has a department value.
-   Employee accounts use the same department name.

## Run the Application Locally

Run the backend and frontend in separate terminals.

### 1. Start the backend

From the project root:

``` powershell
cd backend
.\mvnw.cmd clean compile
.\mvnw.cmd spring-boot:run
```

Wait for Spring Boot to finish starting. The configured backend port is
commonly `8080`; check the application's startup log and configuration
for the actual port.

### 2. Start the frontend

Open a second terminal from the project root:

``` powershell
cd frontend
npm install
npm run dev
```

Vite prints the local development URL in the terminal. Open that URL in
a browser.

### 3. Log in as Department Head

1.  Open the application's login page.
2.  Sign in using an approved account with role `ROLE_DEPARTMENT_HEAD`.
3.  The login redirect should navigate to `/department-head-dashboard`.
4.  Confirm that the Department Head dashboard loads.

Typical local route:

``` text
http://localhost:5173/department-head-dashboard
```

Use the actual local URL printed by Vite if it selects a different port.

## Testing Checklist

-   [ ] Backend starts without errors.
-   [ ] Frontend starts without errors.
-   [ ] Department Head login succeeds.
-   [ ] Department Head is redirected to `/department-head-dashboard`.
-   [ ] Dashboard endpoint returns data for the logged-in department.
-   [ ] Department Overview displays department accounts.
-   [ ] Skill Matrix displays assessment-topic summaries when records
    exist.
-   [ ] Heatmap displays latest employee/topic scores when records
    exist.
-   [ ] Risk alerts display results below 70%.
-   [ ] Learning and mentoring sections display saved records when
    available.
-   [ ] CSV report downloads from Reports & Analytics.
-   [ ] Existing Employee dashboard still opens.
-   [ ] Existing Mentor dashboard still opens.
-   [ ] Existing HR dashboard still opens.
-   [ ] Existing Manager dashboard still opens.

## Troubleshooting

  ------------------------------------------------------------------------------------------
  Symptom                             Checks
  ----------------------------------- ------------------------------------------------------
  Login redirects to Manager          Confirm the login role mapping uses
  Dashboard                           `ROLE_DEPARTMENT_HEAD: "/department-head-dashboard"`

  HTTP 401                            Check that the login session contains a valid JWT and
                                      the frontend API helper sends the bearer token

  HTTP 403                            Confirm the logged-in user has `ROLE_DEPARTMENT_HEAD`
                                      and is approved

  HTTP 400                            Assign a department to the Department Head account

  Dashboard shows no employees        Confirm employee accounts have the same department
                                      value

  Dashboard shows zero assessment     Confirm assessment records exist for employees in that
  metrics                             department

  HTTP 500                            Read the Spring Boot terminal stack trace and verify
                                      entity/repository method names against the current
                                      source

  CORS error                          Review the existing CORS configuration and allowed
                                      frontend origin

  Frontend route not found            Confirm the import and route in `frontend/src/App.jsx`
  ------------------------------------------------------------------------------------------

## Git Workflow

It is safer to commit this work on a feature branch rather than directly
on the shared `main` branch.

``` powershell
git checkout -b feature/department-head-dashboard
git status
git diff
```

After reviewing the changes and testing the application:

``` powershell
git add .
git commit -m "Add Department Head Dashboard"
git push -u origin feature/department-head-dashboard
```

Create a pull request so the changes can be reviewed before merging into
`main`.

## References

-   [Spring Boot -- Running Your
    Application](https://docs.spring.io/spring-boot/reference/using/running-your-application.html)
-   [Spring Boot -- Building an
    Application](https://spring.io/guides/gs/spring-boot)

------------------------------------------------------------------------

**Project:** Organizational Knowledge Gap Intelligence Platform (KGIP)\
**Feature:** Department Head Dashboard\
**Status:** Added to the existing application; verify runtime behavior
and data against the current project environment.
