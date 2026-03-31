---
reviewers: [claude-opus-4-6]
reviewed_at: "2026-04-01T00:30:00Z"
scope: Full codebase (all 4 phases)
---

# Cross-AI Code Review — AERO

## Opus Review

### Summary

The AERO project is a competently built internal line-of-business application with a clear domain model, well-structured RBAC, and solid use of PostgreSQL transactions for data consistency. However, the review uncovered several security gaps (most notably around route middleware ordering, lack of rate limiting on authentication, and missing CSRF protection), a handful of logic bugs in status transitions and permission checks, and areas where the architecture could be tightened.

### Strengths

- Well-designed domain model with 7-state workflows and explicit transition rules
- Consistent use of database transactions with proper error handling
- Field-level change history for audit trail
- Dynamic RBAC with caching and static fallback
- Shared type definitions preventing frontend/backend drift
- Navigation items removed from DOM (not just hidden) based on permissions
- Structured validation-as-warnings pattern for flight orders
- KML parser with sensible bounds checking

### Security Concerns

| Severity | Issue |
|----------|-------|
| **HIGH** | Route middleware ordering in `index.ts` — auth/permission middleware on `/api/admin` does not propagate to sub-routers mounted separately |
| **HIGH** | No rate limiting on `/api/auth/login` — vulnerable to brute-force |
| **MEDIUM** | No CSRF protection beyond `sameSite: strict` |
| **MEDIUM** | `SESSION_SECRET` not validated at startup — could be `undefined` |
| **MEDIUM** | KML file stores absolute path in database |
| **MEDIUM** | KML upload validates extension only, not content type |
| **LOW** | CORS hardcoded to `localhost:5173` |

### Code Quality Concerns

| Severity | Issue |
|----------|-------|
| **HIGH** | Pervasive use of `any` types in DB helpers |
| **MEDIUM** | Duplicated validation logic (weight/route calc in 3 places) |
| **MEDIUM** | Status labels duplicated instead of imported from shared module |
| **MEDIUM** | `ProtectedRoute` doesn't handle `EDIT_VIEW` level properly |
| **LOW** | No input sanitization beyond `.trim()` |
| **LOW** | Inconsistent Polish diacritics in error messages |

### Bug Risks

| Severity | Issue |
|----------|-------|
| **HIGH** | `requirePermission` doesn't check `EDIT_VIEW` vs `READ` — READ users may pass EDIT_VIEW-required routes |
| **HIGH** | Status cascade on flight order status 7 reverts operations without status guard — could corrupt operations linked to other orders |
| **MEDIUM** | Dashboard expiry queries miss already-expired items (only shows future 30 days) |
| **MEDIUM** | `JSON.parse` of user-provided arrays can throw unhandled exceptions |
| **LOW** | Sequence gaps on transaction rollback (by design in PostgreSQL) |

### Performance Concerns

| Severity | Issue |
|----------|-------|
| **MEDIUM** | N+1 inserts in loops (could use multi-value INSERT) |
| **MEDIUM** | Dashboard fires 6-8 queries per request with unindexed aggregations |
| **LOW** | Permissions cache has no TTL |
| **LOW** | KML parsing blocks event loop (synchronous fs.readFileSync) |

### Suggestions

1. Fix middleware mounting order in `index.ts` — use router nesting or per-router guards
2. Add rate limiting to `/api/auth/login` (express-rate-limit)
3. Add startup validation for required env vars (fail fast)
4. Replace `any` types with proper interfaces
5. Extract weight/route calculation into shared utility
6. Import status labels from shared module
7. Add status guard to cascade query (`WHERE status = 4`)
8. Show already-expired items on dashboard (remove lower bound)
9. Add try/catch around `JSON.parse` for user-provided arrays
10. Store relative KML paths instead of absolute

### Risk Assessment

**MEDIUM-HIGH** — Sound domain modeling and proper transactions, but the middleware mounting bug potentially leaves APIs without authentication. Combined with the RBAC level comparison gap and cascade race condition, there are multiple paths for unauthorized access or data corruption. All issues are straightforward to fix — once addressed, risk drops to LOW-MEDIUM.
