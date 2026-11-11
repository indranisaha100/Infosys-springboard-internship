# HR skill-gap dashboard

The HR workspace is available at `/hr-dashboard`. It includes registration
request review, employee and mentor directories, role benchmarks, and a
skill-gap analysis dashboard.

## Skill-gap workflow

1. Employees submit assessment scores through `POST /api/employee/assessments`.
   HR analysis reads the latest score per employee and competency.
2. Role benchmarks are stored through `GET` and `POST
   /api/hr/role-requirements`. A benchmark's role name should match an
   employee's department; requested account role is used when no department
   match exists. Assessment targets remain the fallback benchmark.
3. HR records mentor expertise in the Mentor Directory. Skills are entered as
   comma-separated values and stored on the mentor account.
4. `GET /api/hr/skill-gap-analysis` returns current metrics and chart datasets
   without creating records.
5. HR can explicitly run `POST /api/hr/skill-gap-analysis/generate`. For each
   open employee/competency gap, it creates one active generated program,
   creates the employee's pending learning enrollment (or updates the mentor
   reference on an existing enrollment), and creates
   a pending mentorship request when a mentor's recorded expertise matches.
   Re-running the endpoint reuses active programs and does not send duplicate
   notifications for them.

Both analysis responses use this top-level JSON structure:

```json
{
  "summary_kpis": {},
  "generated_programs": [],
  "notification_payloads": [],
  "chart_data": {}
}
```

Generated program records include employee and mentor IDs when a mentor match
exists. `chart_data` contains bar, donut, trend-line, and heatmap datasets with
the requested Emerald palette. Notifications are persisted, recipient-scoped
in-app messages exposed by the existing employee and mentor notification
endpoints. Employee and mentor dashboards refresh unread counts periodically;
the application does not currently integrate native browser push or a
third-party push service.

Mentor expertise is not inferred from assessment scores: the application had
no mentor skill-profile field, so HR must populate expertise in the directory.
Employees without an applicable assessment or matching role benchmark do not
receive an invented skill gap.
