// Drizzle schema. Grows one slice at a time.
//
// Architecture rule: every tenant-owned table carries `org_id` and every query is org-scoped.

export const __schemaVersion = "s4-walking-skeleton";
