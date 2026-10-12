# MergeMinds

MergeMinds is a Git-oriented learning system in which students complete course tasks through immutable repository submissions and teachers assess those submissions through review.

## Identity and access

**User**:
A person with a stable internal identity and a mutable username.
_Avoid_: using username as User identity

**Course**:
A learning space with a stable internal identity, mutable route slug, members, content, and tasks.
_Avoid_: using course slug as Course identity

**Course Membership**:
The presence of a User in a Course with exactly one course-local role: Student or Teacher. Absence of the membership means no course access.
_Avoid_: deriving course permissions from a global session role

**Student**:
A User participating in a particular Course with the Student role.

**Teacher**:
A User participating in a particular Course with the Teacher role.

**Student Group**:
An academic grouping of Students inside a Course. A Course's Student Groups are flat: a lab subgroup is simply another Student Group of that Course. Every Course has at least one Student Group, starting with a single one, and every Student belongs to exactly one Student Group of the Course.
_Avoid_: Group, when Task Group could also be meant; subgroup as a separate level inside a Student Group; a Course or Student without a Student Group

## Course structure and editing

**Course Page**:
The visually ordered document shown at the Course route. A Task can be referenced from this document through a Task Reference, but its visual placement does not define its execution order.
_Avoid_: Assignment as the name of a referenced Task

**Course Snapshot**:
An immutable version of Course configuration visible after publication. Attempts and student progress are not part of it, though they can refer to it. The Course slug is not part of it either.

**Course Draft Snapshot**:
A Teacher's personal unpublished Course Snapshot, based on one published Course Snapshot. A Teacher has at most one per Course; it becomes stale when another Course Snapshot is published first, and publishing it creates an immutable Course Snapshot rather than mutating an already published one.
_Avoid_: Course Draft, when the Course access state is meant; a draft shared by all Teachers

**Course Editing Lease**:
Exclusive, expiring permission for one Teacher, in one sign-in session, to change and publish their Course Draft Snapshot. Only one Teacher edits a Course at a time; giving up the lease keeps the draft. All browser tabs of that sign-in session share the lease.
_Avoid_: course lock, a lease per browser tab

**Course Page Working Copy**:
A teacher's local editable representation of the Course Draft Snapshot. It is either synchronized or has unsynchronized local changes.
_Avoid_: treating the Working Copy as authoritative server state

**Course Access State**:
The Course is either `draft` or `open`. Opening permits Student access; returning to `draft` is allowed only while the Course has no Student memberships.

**Task Group**:
A group of Tasks with one linear execution order and one repository per Student. Different Task Groups can progress independently.
_Avoid_: Group

**Task**:
A course activity with a stable identity and a position within one Task Group. Its execution position is independent of where references to it appear on the Course Page.
_Avoid_: Assignment

**Task Reference**:
A place on the Course Page that refers to one Task. Its position on the page is presentational and does not define the Task's execution order; the Task's properties belong to the Task, not to the reference.
_Avoid_: Assignment, assignment block

**Task Summary**:
The part of a Task that can be shown without access to its content: its title, deadline, maximum Grade, and an optional annotation written by a Teacher.
_Avoid_: using the Task statement as its summary

**Student Task Access**:
The monotonic fact that a Task has been opened to a particular Student. A locked Task can expose its Task Summary and prerequisite without exposing its content or accepting an Attempt.

## Deadlines

**Deadline**:
The moment by which a Student is expected to submit an Attempt for a Task. It does not close the Task: an Attempt submitted later is still accepted and counts as late. A Task may have no Deadline.
_Avoid_: treating the Deadline as a cut-off after which Attempts are refused

**Deadline Override**:
A Deadline set for one Student Group or one Student that replaces the Task's Deadline for them. It may be later or earlier than the Deadline it replaces, or state that there is no Deadline at all. A value set explicitly stays an override even when it equals the value it replaces, so later changes to that value do not move it. It may carry a reason, visible to Teachers and to the Students it applies to.
_Avoid_: Extension, since an override can also be stricter

**Effective Deadline**:
The Deadline that applies to a particular Student for a Task: their own Deadline Override if there is one, otherwise their Student Group's, otherwise the Task's. It may be the absence of a Deadline. Whether an Attempt is late is always judged against the Student's current Effective Deadline, so changing a Deadline, a Deadline Override, or the Student's Student Group can change it for Attempts already submitted.
_Avoid_: showing a Student the Task's Deadline when a Deadline Override applies to them

## Attempts and review

**Attempt**:
An immutable snapshot of one Student submission for one Task and Course Snapshot. Its attempt number increases within the Course, Task, and Student context; the internal Attempt identity remains distinct from that number.
_Avoid_: mutable submission, using attempt number as global identity

**Review**:
The published result of checking one Attempt. An Attempt has at most one Review; it appears together with a Grade and can later be updated by a Course Teacher holding the Review Lease.
_Avoid_: using Review to mean only feedback text, the review page, or an unsaved working copy

**Grade**:
The numeric value awarded by a Review, from zero through the Task's maximum grade, with at most three decimal places. The maximum becomes immutable when the Course is opened to Students, and an existing Grade cannot be cleared back to an unreviewed state.
_Avoid_: Score

**Review Revision**:
One published state of a Review: its Grade, Overall Feedback, and the Teachers' root comments of its Line Comment Threads, made visible to the Student together. Replies are not part of a Review Revision.
_Avoid_: showing a Student parts of an unpublished revision

**Review Working Copy**:
A Teacher's unpublished changes to the next Review Revision. Nothing in it is visible to the Student until it is published as a whole.
_Avoid_: Review draft, treating the Working Copy as authoritative server state

**Overall Feedback**:
Optional Review text addressing the Attempt as a whole.
_Avoid_: Review, when only the text is meant

**Line Comment Thread**:
A Review discussion anchored to a line or line range in the Attempt diff. A Teacher creates the root comment as part of a Review Revision; eligible participants post replies individually, outside any revision and regardless of the Review Lease, and each author manages only their own messages. Deleting a root comment leaves its replies in place.
_Avoid_: Comment, when the whole thread is meant

**Review Lease**:
Exclusive, expiring permission for one Teacher, in one sign-in session, to edit the Review of an Attempt, including publishing its first Review. The holder can change the Grade, Overall Feedback, and their own root comments, but not other Teachers' root comments. Other Teachers can read the Review while the lease is held. All browser tabs of that sign-in session share the lease.
_Avoid_: permanent reviewer assignment, a lease per browser tab

**Review Read State**:
Whether the Student has seen the latest Teacher-visible change to a Review. A new Review Revision or a Teacher's reply makes the Review unread again; the Student's own replies do not.
_Avoid_: Attempt lifecycle state
