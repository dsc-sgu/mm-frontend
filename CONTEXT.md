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
An academic grouping of Students inside a Course.
_Avoid_: Group, when Task Group could also be meant

## Course structure and editing

**Course Page**:
The visually ordered document shown at the Course route. A Task can be referenced from this document, but its visual placement does not define its execution order.
_Avoid_: Assignment as the name of a referenced Task

**Course Snapshot**:
An immutable version of Course configuration visible after publication. Attempts and student progress are not part of it, though they can refer to it.

**Course Draft Snapshot**:
The unpublished Course Snapshot that teachers are preparing. Publication creates an immutable Course Snapshot rather than mutating an already published one.
_Avoid_: Course Draft, when the Course access state is meant

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

**Student Task Access**:
The monotonic fact that a Task has been opened to a particular Student. A locked Task can expose its summary and prerequisite without exposing its content or accepting an Attempt.

## Attempts and review

**Attempt**:
An immutable snapshot of one Student submission for one Task and Course Snapshot. Its attempt number increases within the Course, Task, and Student context; the internal Attempt identity remains distinct from that number.
_Avoid_: mutable submission, using attempt number as global identity

**Review**:
The published result of checking one Attempt. An Attempt has at most one Review; it appears together with a Grade and can later be updated by a Course Teacher holding the Review Lease.
_Avoid_: using Review to mean only feedback text, the review page, or an unsaved working copy

**Grade**:
The numeric value awarded by a Review, from zero through the Task's maximum grade. The maximum becomes immutable when the Course is opened to Students, and an existing Grade cannot be cleared back to an unreviewed state.
_Avoid_: Score

**Overall Feedback**:
Optional Review text addressing the Attempt as a whole.
_Avoid_: Review, when only the text is meant

**Line Comment Thread**:
A Review discussion anchored to a line or line range in the Attempt diff. A Teacher creates the root comment; eligible participants can reply, and each author manages only their own messages.
_Avoid_: Comment, when the whole thread is meant

**Review Lease**:
Exclusive, expiring permission for one Teacher to edit a Review. Other Teachers can read the Review while the lease is held.
_Avoid_: permanent reviewer assignment

**Review Read State**:
Whether the Student has seen the latest visible revision of a Review. A visible change to the Grade, Overall Feedback, or a Teacher's line comment makes the Review unread again.
_Avoid_: Attempt lifecycle state
