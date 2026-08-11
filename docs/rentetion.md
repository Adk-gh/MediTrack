┌───────────────────┬───────────────────────────────────────────────────────────────────────────────────────────┬────────
│ Record type │ Retention before archiving │ Retention before permanent deletion │


│ Student records │ Up to 5 years │ Defined by RETENTION\_STUDENT = 5 in features/Records/records.service.js. │

│ Employee records │ Up to 4 years │ Defined by RETENTION\_EMPLOYEE = 4 in the same file. │

│ Audit logs │ 14 days in the primary store │ After archiving they stay in the archive for up to 90 days (PERMANENT\_RETENTION\_DAYS = 90 │
│ │ │ in frontend\src\features\admin-clinic\AuditLogs.jsx). │


│ General system │ Some items are planned for a 2‑year retention (see docs/archive-implementation-plan.md). │ │
│ items │ │ │

│ To‑do / future │ The project tracks an explicit requirement for audit‑log retention of at least 1 week │ │
│ improvement │ before archiving and another week before permanent deletion (see xtodo.md). │ │
