# Backend snapshots, drafts, attempts, and frontend integration

> Verified: 2026-08-25. Backend branches, pull requests, and API contracts may change independently; re-check their current status before implementation.

## Scope and source status

- The inspected local backend `main` is clean at commit [`3f622d351354649fce9112d897838f76c6508787`](https://github.com/dsc-sgu/mm-backend/commit/3f622d351354649fce9112d897838f76c6508787).
- Course editing was merged to `main` through [Course editing](https://github.com/dsc-sgu/mm-backend/pull/158) on 2026-08-12. The separate ADR pull request [docs(ADR 0001): Course editing](https://github.com/dsc-sgu/mm-backend/pull/137) remains open and its document still says `proposed`. Therefore the code on `main` is implemented behavior, while the ADR is useful design rationale but is not a formally accepted record.
- GitHub Discussions are disabled for `dsc-sgu/mm-backend`; relevant first-party discussion is in PR reviews and issues.

## Course editing implemented on `main`

### Concurrency and persistence model

The backend implements the combined design discussed in the frontend map:

1. A teacher acquires a course-scoped, session-bound lease in PostgreSQL.
2. The backend creates or restores a persistent draft snapshot.
3. Block mutations are sent individually to that draft snapshot.
4. Heartbeats renew the lease.
5. Publishing atomically checks the expected course version, points the course at the draft, marks the draft published, and removes the lease.

Primary sources:

- [`internal/courses/service.go` at `3f622d3`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/courses/service.go)
- [`internal/courses/locks/service.go` at `3f622d3`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/courses/locks/service.go)
- [`internal/pg/courses_locks.go` at `3f622d3`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/pg/courses_locks.go)
- [`internal/pg/snapshots.go` at `3f622d3`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/pg/snapshots.go)
- [`internal/pg/courses.go` at `3f622d3`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/pg/courses.go)

The lease TTL is configurable and defaults to 60 seconds. PostgreSQL `NOW()` is used both to set and validate expiry, avoiding application/database clock comparison. The code exposes a heartbeat endpoint, but the heartbeat interval is a frontend policy; the proposed ADR recommends 30 seconds rather than enforcing it server-side.

Sources:

- [`internal/config/config.go` at `3f622d3`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/config/config.go)
- [`internal/pg/courses_locks.go` at `3f622d3`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/pg/courses_locks.go)
- [Proposed course-editing ADR](https://github.com/dsc-sgu/mm-backend/blob/8ec7b3a2c09e926877c2e747e56e8473ee7451a3/docs/adr/0001-course-editing.md)

### Draft initialization is an explicit frontend state machine

`POST /api/v1/courses/{course_id}/lock` returns `draftSnapshotID` plus one of:

- `new`: a new draft was copied from the active snapshot;
- `restored`: the same user's persistent draft is still based on the current published version;
- `stale_conflict`: the same user's draft still exists, but another version has since been published.

A stale draft is preserved for inspection rather than silently overwritten. Attempting to publish it is protected by optimistic concurrency and returns `409 Conflict`. The integration test reproduces lease expiry, another teacher publishing, recovery as `stale_conflict`, and rejection of stale publication.

Sources:

- [`LockAndInitDraft` and `PublishDraft`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/courses/service.go)
- [`TestOptimisticLockingConflictScenario`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/tests/course_optimistic_lock_test.go)
- [ADR review discussion about preserving stale work](https://github.com/dsc-sgu/mm-backend/pull/137#discussion_r3402404170)

This confirms that a frontend course draft is not intended to be merely a browser-local working copy. Reload/navigation recovery should re-enter the lock/init protocol and handle `restored` and `stale_conflict` explicitly.

### Visibility and permissions

- Published course content is visible to an active course member.
- Published snapshot history requires teacher membership.
- Draft metadata and draft blocks additionally require the requesting user/session to hold the active course lease.
- A conflicting lease returns `423 Locked`; when another holder can be resolved, the response includes their ID, names, patronymic, and username.
- Students continue to see the old active snapshot while a teacher edits a draft; the integration test verifies this before and after publication.

Sources:

- [`GetCourseContent`, `getSnapshotForCourse`, and `GetPublishedSnapshots`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/courses/service.go)
- [`LockConflictBody` and HTTP error mapping](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/courses/response.go)
- [`TestCourseEditingWorkflow`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/tests/course_editing_test.go)

### Implemented HTTP surface

All paths are under `/api/v1`:

- `POST /courses/{course_id}/lock`
- `POST /courses/{course_id}/heartbeat`
- `GET /courses/{course_id}/snapshots`
- `GET /courses/{course_id}/snapshots/{snapshot_id}`
- `GET /courses/{course_id}/snapshots/{snapshot_id}/blocks`
- `POST /courses/{course_id}/snapshots/switch`
- `POST /courses/{course_id}/publish`
- `POST /courses/{course_id}/cancel-edit`
- block create/update/move/delete under `/courses/{course_id}/snapshots/{snapshot_id}/blocks`

Source: [`internal/api.go` at `3f622d3`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/api.go).

## Frontend implications and unresolved contract work

### The current frontend save model does not match the backend protocol

The frontend currently keeps a whole-course working copy and submits one whole-course save mutation. The implemented backend expects persistent snapshot initialization, per-block mutations, heartbeat, explicit publish/cancel, and snapshot conflict handling. Integrating the real backend therefore requires a product/data-flow redesign, not merely replacing the mock function with `fetch`.

Backend source: [Course editing](https://github.com/dsc-sgu/mm-backend/pull/158). Frontend sources at the inspected revision: [`page-edit/page.tsx`](https://github.com/dsc-sgu/mm-frontend/blob/a6f0f030d62b6120217b23f716a8827374d3dd16/src/features/course/features/page-edit/page.tsx) and [`page-edit/model/editor-store`](https://github.com/dsc-sgu/mm-frontend/tree/a6f0f030d62b6120217b23f716a8827374d3dd16/src/features/course/features/page-edit/model/editor-store).

### Unsynced browser changes still need navigation protection

The backend persists every accepted atomic block mutation, so a server draft can survive reload. However, text currently being edited or requests not yet acknowledged can still exist only in the browser. A router blocker and `beforeunload` warning should therefore be keyed to **unsynced local changes**, not merely to the existence of a server draft.

This is a frontend product decision; it is not currently specified by a backend endpoint.

### Main contains a cancellation concern worth reconciling

`CancelEdit` finds and discards the user's draft before calling the guarded unlock operation and does not first call `ValidateLock`. A review on the merged implementation explicitly raised this concern. Frontend code should not treat this behavior as a desirable contract until backend owners confirm or fix it.

Sources:

- [`CancelEdit` on main](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/courses/service.go)
- [Review concern on Course editing](https://github.com/dsc-sgu/mm-backend/pull/158#discussion_r3457350288)

## Attempts and `attemptNumber`

### Current backend status

`main` contains only an old, unregistered attempt abstraction; it does not expose the teacher attempts/review API implemented by the frontend prototype. Active attempt work lives in unmerged branches and pull requests:

- [Attempt, Task, Git API](https://github.com/dsc-sgu/mm-backend/pull/159), targeting `main` from `Aljel/AttemptsAPI`;
- [refactor: reworked based on design doc](https://github.com/dsc-sgu/mm-backend/pull/164), targeting the first attempt branch rather than `main`;
- [Create Attempts API](https://github.com/dsc-sgu/mm-backend/issues/3) and related open issues.

The active branch model gives attempts internal UUID identities and proposes `GET /attempts/{task_id}/{participant_id}` for the ordered history. The response model does not currently expose an ordinal `attemptNumber`. Diff proposals address attempts by two UUID IDs.

Sources:

- [`internal/attempts/model.go` on `Aljel/AttemptsAPI`](https://github.com/dsc-sgu/mm-backend/blob/7214e9b1175ebb84eac65a5c2f8983d8e041c01e/internal/attempts/model.go)
- [`internal/attempts/handler.go` on `Aljel/AttemptsAPI`](https://github.com/dsc-sgu/mm-backend/blob/7214e9b1175ebb84eac65a5c2f8983d8e041c01e/internal/attempts/handler.go)
- [Get all attempts for certain pair (task, participant)](https://github.com/dsc-sgu/mm-backend/issues/96)
- [Get diff between two attempts by their ID](https://github.com/dsc-sgu/mm-backend/issues/97)

The agreed frontend route meaning is nevertheless `attemptNumber`, scoped by course + task + student. This does not forbid an internal backend UUID, but the future transport contract must explicitly map the user-facing ordinal to the backend entity. The current attempt branches do not yet provide that mapping, so this is a real frontend/backend alignment item before the MSW contract is treated as final.

### Submission design is still proposed

The attempt-submission ADR branch remains separate from `main` and labels itself `proposed`. It discusses a unified attempt model for UI upload and Git submission, but it should not be described as merged behavior.

Source: [Proposed attempt-submission ADR](https://github.com/dsc-sgu/mm-backend/blob/6dc65eefc3cdda1b7e8507502d916ad21983a739/docs/adr/0002-attempt-submission.md).

## WebSockets and review locks

No WebSocket server, upgrade route, event broker, or review-lock domain was found on backend `main` or in the inspected active attempt branches. Redis/Valkey is currently wired for authentication/session infrastructure, not a visible review-event stream. Therefore “review-lock updates will arrive through WebSockets” is currently a product/architecture intention, not an implemented backend contract.

When implemented, the frontend can keep TanStack Query as the read-model cache: a WebSocket subscription adapter should apply ordered events to the attempts cache or invalidate/refetch it, with reconnect/resynchronization semantics defined by the eventual event protocol.

Primary code locations inspected: [`cmd/server/main.go`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/cmd/server/main.go), [`internal/api.go`](https://github.com/dsc-sgu/mm-backend/blob/3f622d351354649fce9112d897838f76c6508787/internal/api.go), and the [active attempt PR](https://github.com/dsc-sgu/mm-backend/pull/159).

## Theme source of truth

The closed frontend issue [Save chosen theme to localStorage and load system theme](https://github.com/dsc-sgu/mm-frontend/issues/10) specifies only the user-visible requirement: no theme flicker while the JavaScript bundle loads. The implementation satisfies it with an inline pre-React script that reads the saved preference or system preference and immediately updates the root HTML `dark` class. Runtime consumers observe that class.

Source: [`index.html` at the inspected frontend revision](https://github.com/dsc-sgu/mm-frontend/blob/a6f0f030d62b6120217b23f716a8827374d3dd16/index.html).

This supports the agreed model: localStorage persists preference, while the root HTML class is the runtime source of truth. A generic reactive localStorage hook should not introduce a second theme owner.

## Decisions and follow-up questions for the frontend map

### Established

- Route terminology should be `attemptNumber`, not `attemptId`.
- Course drafts are server-persisted snapshots; frontend local state is an unsynced working copy layered over a server draft.
- Course editing must model `new`, `restored`, `stale_conflict`, lease loss, publication conflict, and explicit publish/cancel.
- Unsynced changes need navigation/reload protection even with server-backed drafts.
- Review-lock WebSockets are future intent; there is no current server contract.
- The HTML root class remains the runtime theme source of truth.

### Still requires frontend/backend agreement

- Mapping between user-facing `attemptNumber` and internal backend attempt UUID.
- Exact course metadata vs snapshot-content mutation boundaries.
- Autosave/debounce policy for text blocks and how acknowledgement updates local sync state.
- UX for `423 Locked`, lease recovery, `stale_conflict`, and `409 Conflict`.
- Whether cancellation must validate the current session-bound lease before discarding a draft.
- WebSocket event shape, ordering/version fields, reconnect, and authoritative resync endpoint.
