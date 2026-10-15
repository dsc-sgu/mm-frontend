# MergeMinds

MergeMinds is a Git-oriented learning system in which students complete course tasks through immutable repository submissions and teachers assess those submissions through review.

Each term has a canonical Russian rendering (`_По-русски_`). Use it in Russian text — issues, comments, documents — instead of the English term; keep the English term in code and in definitions here.

## Identity and access

**User**:
A person with a stable internal identity and a mutable username.
_По-русски_: пользователь
_Avoid_: using username as User identity

**Course**:
A learning space with a stable internal identity, mutable route slug, members, content, and tasks.
_По-русски_: курс
_Avoid_: using course slug as Course identity

**Course Membership**:
The presence of a User in a Course with exactly one course-local role: Student or Teacher. Absence of the membership means no course access.
_По-русски_: участие в курсе
_Avoid_: deriving course permissions from a global session role

**Student**:
A User participating in a particular Course with the Student role.
_По-русски_: студент

**Teacher**:
A User participating in a particular Course with the Teacher role.
_По-русски_: преподаватель

**Student Group**:
An academic grouping of Students inside a Course. A Course's Student Groups are flat: a lab subgroup is simply another Student Group of that Course. Every Course has at least one Student Group, starting with a single one, and every Student belongs to exactly one Student Group of the Course.
_По-русски_: подгруппа — it is the Student Group itself, not a level nested inside one
_Avoid_: учебная группа, which means an official university group; a nested level inside a Student Group; a Course or Student without a Student Group

## Course structure and editing

**Course Page**:
The visually ordered document shown at the Course route. Every Task of the Course appears in it through exactly one Task Block, but its visual placement does not define its execution order.
_По-русски_: страница курса
_Avoid_: Assignment as the name of a Task

**Course Snapshot**:
An immutable version of Course configuration visible after publication. Attempts and student progress are not part of it, though they can refer to it. The Course slug is not part of it either.
_По-русски_: снапшот курса

**Course Draft Snapshot**:
A Teacher's personal unpublished Course Snapshot, based on one published Course Snapshot. A Teacher has at most one per Course; it becomes stale when another Course Snapshot is published first, and publishing it creates an immutable Course Snapshot rather than mutating an already published one.
_По-русски_: черновик курса
_Avoid_: Course Draft, when the Course access state is meant; a draft shared by all Teachers

**Course Editing Lease**:
Exclusive, expiring permission for one Teacher, in one sign-in session, to change and publish their Course Draft Snapshot. Only one Teacher edits a Course at a time; giving up the lease keeps the draft. All browser tabs of that sign-in session share the lease.
_По-русски_: бронь редактирования курса
_Avoid_: course lock, блокировка — a lease expires and is renewed, and lock already names the Web Lock of the tab protocol; a lease per browser tab

**Course Page Working Copy**:
A teacher's local editable representation of the Course Draft Snapshot. It is either synchronized or has unsynchronized local changes.
_По-русски_: рабочая копия страницы курса
_Avoid_: treating the Working Copy as authoritative server state

**Course Access State**:
The Course is either `draft` or `open`. Opening permits Student access; returning to `draft` is allowed only while the Course has no Student memberships.
_По-русски_: состояние доступа к курсу; `draft` — курс в подготовке, `open` — курс открыт
_Avoid_: черновик for `draft`, since черновик курса is the Course Draft Snapshot

**Task Chain**:
A chain of Tasks with one linear execution order and one repository per Student. Different Task Chains can progress independently. A Task Chain exists only while it has Tasks: it appears with its first Task and disappears with its last.
_По-русски_: цепочка заданий
_Formerly_: Task Group
_Avoid_: Group; an empty Task Chain

**Task Chain Key**:
A short identifier of a Task Chain, unique within the Course, that appears in the address of every Student's repository for that Task Chain. It is separate from the Task Chain's title and can change only while the Course is `draft`.
_По-русски_: ключ цепочки
_Formerly_: Task Group Key
_Avoid_: name, when either the title or the key could be meant; using the Task Chain Key as Task Chain identity

**Task**:
A course activity with a stable identity and a position within one Task Chain. Its execution position is independent of where its Task Block appears on the Course Page. Tasks are added and removed only while the Course is `draft`; once it is open, every Task keeps its Task Chain and its position there.
_По-русски_: задание
_Avoid_: Assignment

**Task Key**:
A short identifier of a Task, unique within its Task Chain, by which a Student names the Task when submitting an Attempt through Git. It is separate from the Task's title and can change only while the Course is `draft`, so a key Students may have used never comes to mean another Task.
_По-русски_: ключ задания
_Avoid_: name, when either the title or the key could be meant; using the Task Key as Task identity

**Task Block**:
The block of the Course Page that shows one Task; every Task has exactly one, so a Task without a Task Block does not exist. Its position on the page is presentational and does not define the Task's execution order; the Task's properties belong to the Task, not to the block. Removing a Task Block removes its Task, so it is possible only while the Course is `draft`; afterwards the block can only be moved.
_По-русски_: блок задания
_Formerly_: Task Reference
_Avoid_: Assignment, assignment block; storing Task properties in the block's data; a Task hidden from the Course Page or shown twice; copying a Task Block

**Task Summary**:
The part of a Task that can be shown without access to its content: its title, deadline, maximum Grade, and an optional annotation written by a Teacher.
_По-русски_: саммари задания
_Avoid_: using the Task statement as its summary

**Student Task Access**:
The monotonic fact that a Task has been opened to a particular Student. A locked Task can expose its Task Summary and prerequisite without exposing its content or accepting an Attempt.
_По-русски_: доступ студента к заданию

**Task Opening Time**:
The earliest moment at which a Task can be opened to Students. A Task may have none and then is not held back by time. Moving it later does not take back Student Task Access already given.
_По-русски_: время открытия задания
_Avoid_: treating a later Task Opening Time as closing a Task again

## Deadlines

**Deadline**:
The moment by which a Student is expected to submit an Attempt for a Task. It does not close the Task: an Attempt submitted later is still accepted and counts as late. A Task may have no Deadline.
_По-русски_: дедлайн
_Avoid_: treating the Deadline as a cut-off after which Attempts are refused

**Deadline Override**:
A Deadline set for one Student Group or one Student that replaces the Task's Deadline for them. It may be later or earlier than the Deadline it replaces, or state that there is no Deadline at all. A value set explicitly stays an override even when it equals the value it replaces, so later changes to that value do not move it. It may carry a reason, visible to Teachers and to the Students it applies to.
_По-русски_: переопределение дедлайна
_Avoid_: Extension, продление, since an override can also be stricter or remove the Deadline

**Effective Deadline**:
The Deadline that applies to a particular Student for a Task: their own Deadline Override if there is one, otherwise their Student Group's, otherwise the Task's. It may be the absence of a Deadline. Whether an Attempt is late is always judged against the Student's current Effective Deadline, so changing a Deadline, a Deadline Override, or the Student's Student Group can change it for Attempts already submitted.
_По-русски_: действующий дедлайн
_Avoid_: showing a Student the Task's Deadline when a Deadline Override applies to them

## Attempts and review

**Attempt**:
An immutable snapshot of one Student submission for one Task and Course Snapshot. Its attempt number increases within the Course, Task, and Student context; the internal Attempt identity remains distinct from that number.
_По-русски_: попытка
_Avoid_: mutable submission, using attempt number as global identity

**Review**:
The published result of checking one Attempt. An Attempt has at most one Review; it appears together with a Grade and can later be updated by a Course Teacher holding the Review Lease.
_По-русски_: проверка
_Avoid_: using Review to mean only feedback text, the review page, or an unsaved working copy

**Grade**:
The numeric value awarded by a Review, from zero through the Task's maximum grade, with at most three decimal places. The maximum becomes immutable when the Course is opened to Students, and an existing Grade cannot be cleared back to an unreviewed state.
_По-русски_: оценка
_Avoid_: Score, балл

**Review Revision**:
One published state of a Review: its Grade, Overall Feedback, and the Teachers' root comments of its Line Comment Threads, made visible to the Student together. Replies are not part of a Review Revision.
_По-русски_: версия проверки
_Avoid_: showing a Student parts of an unpublished revision

**Review Working Copy**:
A Teacher's unpublished changes to the next Review Revision. Nothing in it is visible to the Student until it is published as a whole.
_По-русски_: рабочая копия проверки
_Avoid_: Review draft, черновик проверки; treating the Working Copy as authoritative server state

**Overall Feedback**:
Optional Review text addressing the Attempt as a whole.
_По-русски_: общий отзыв
_Avoid_: Review, when only the text is meant

**Line Comment Thread**:
A Review discussion anchored to a line or line range in the Attempt diff. A Teacher creates the root comment as part of a Review Revision; eligible participants post replies individually, outside any revision and regardless of the Review Lease, and each author manages only their own messages. Deleting a root comment leaves its replies in place.
_По-русски_: тред к строкам, коротко тред; root comment — комментарий преподавателя, reply — ответ
_Avoid_: Comment, when the whole thread is meant; ветка комментариев, which collides with a Git branch

**Review Lease**:
Exclusive, expiring permission for one Teacher, in one sign-in session, to edit the Review of an Attempt, including publishing its first Review. The holder can change the Grade, Overall Feedback, and their own root comments, but not other Teachers' root comments. Other Teachers can read the Review while the lease is held. All browser tabs of that sign-in session share the lease.
_По-русски_: бронь проверки; holder — держатель брони; taking the lease — забронировать проверку
_Avoid_: permanent reviewer assignment, блокировка; a lease per browser tab

**Review Read State**:
Whether the Student has seen the latest Teacher-visible change to a Review. A new Review Revision or a Teacher's reply makes the Review unread again; the Student's own replies do not.
_По-русски_: прочитанность проверки
_Avoid_: Attempt lifecycle state

## Engineering vocabulary

Terms used in issues, ADRs and prototypes about how the system is built and tested. They are not domain concepts, but Russian text uses these renderings consistently.

**Attempt page**:
The page of one Attempt with its published Review (`…/$attemptNumber`). The Student sees the result there; a Teacher views it without the Review Lease.
_По-русски_: страница попытки

**Review editor**:
The Teacher-only page that holds the Review Lease and the Review Working Copy and publishes Review Revisions (`…/$attemptNumber/review`).
_По-русски_: редактор проверки
_Avoid_: using it for the rich-text editor of review text (редактор текста проверки)

**Course Attempts**:
The Teacher's list of Attempts across a Course.
_По-русски_: список попыток курса

**Quick grading**:
Entering Grades directly from Course Attempts without opening the Review editor.
_По-русски_: быстрое оценивание

**Changed-files manifest**:
The authoritative, atomically delivered list of an Attempt's file entries relative to its baseline. File contents load separately; completeness is checked against the manifest.
_По-русски_: манифест изменённых файлов, коротко манифест; its entries — записи манифеста

**Baseline**:
What an Attempt is compared with: an earlier Attempt, a template, or an empty tree. The backend chooses it.
_По-русски_: база сравнения

**Projection**:
A read model of server state shaped for one screen and cached on its own, such as the Review, the Attempt header, or Course Attempts.
_По-русски_: проекция
_Avoid_: представление, which developers read as a UI view or a database view

**Idempotency key**:
A client-generated key that makes a retried write apply at most once.
_По-русски_: ключ идемпотентности

**Sign-in session**:
One authenticated session of a browser; leases belong to it.
_По-русски_: сессия входа, коротко сессия
_Avoid_: сеанс; сессия alone where the review session state machine or the exam session could be meant

**Writer tab**:
The one browser tab of a sign-in session that may write an editor's Working Copy to the server; the other tabs show its live copy. Handing over writing is a handoff, either voluntary or forced.
_По-русски_: пишущая вкладка; live copy — лайв-копия; handoff — передача (добровольная или силовая)

**Vertical**:
A product area designed end to end, through model, API, UI and tests, such as Review → Grade → Student result, Course access or Transport kernel. A vertical is delivered as slices.
_По-русски_: вертикаль
_Avoid_: сквозной сценарий — not every vertical is a user flow

**Slice**:
A portion of a vertical that cuts through every layer, is merged as one PR and leaves the application working, such as REV1 or ATT3.
_По-русски_: этап or срез, as synonyms: этап (рефакторинга) where order matters, срез where cutting through all layers matters

**Test contract**:
An observable behavior a test pins, with an id such as REV-12 or TAB-08, a test layer and an owning slice.
_По-русски_: тестовый контракт

**Test layer**:
Where a test contract is checked: Model/Static, Stateful, Boundary, Component, or Real browser/E2E.
_По-русски_: уровень тестирования: модельный, с состоянием, на границе API, компонентный, в браузере (E2E)

**Seam**:
A place where a test attaches to code and can change its behavior without editing that place (Feathers, *Working Effectively with Legacy Code*), such as a pure function, a hook rendered with `renderHook`, or a Worker factory replaced by a fake.
_По-русски_: шов

**Trust seam**:
The single place where untrusted input becomes trusted model data, such as HTML paste into review text.
_По-русски_: граница доверия

**World**:
A named, relationship-safe set of mock backend data a test starts from, such as `world:review`.
_По-русски_: тестовый мир; a single named piece of test data — фикстура

**Mock backend**:
The MSW-based backend the frontend runs against in development and tests.
_По-русски_: мок-бэкенд
