## ADDED Requirements

### Requirement: Attempt review page displays changed files and diffs
The system SHALL render a detailed attempt review page for a course task attempt using frontend-only mock review data for the active course, task, student, and attempt.

#### Scenario: Viewer opens attempt page with changed files
- **WHEN** an authorized course participant opens `/courses/[course-slug]/tasks/[task-id]/attempts/[student-username]/[attempt-id]`
- **THEN** the page displays the attempt title, student identity, task maximum score, submission metadata, and grading state
- **AND** the page displays a changed-files navigator
- **AND** the page displays diffs for the current attempt compared with the previous attempt

#### Scenario: First attempt has no previous attempt
- **WHEN** the opened attempt is the first attempt for that student and task
- **THEN** the page renders diffs against an empty baseline
- **AND** files introduced by the attempt are shown as added files

#### Scenario: Later attempt has a previous attempt
- **WHEN** the opened attempt has an earlier attempt for the same student and task
- **THEN** the page renders diffs against that previous attempt
- **AND** the page identifies which previous attempt is being used as the comparison baseline

#### Scenario: Changed file navigator is used
- **WHEN** the viewer selects a file in the changed-files navigator
- **THEN** the page focuses or scrolls to the corresponding file diff
- **AND** the selected file remains visually identifiable in the navigator

### Requirement: Teacher can review attempt with line comments
The system SHALL allow course teachers on the editable review route to create and edit comments attached to individual diff lines.

#### Scenario: Teacher opens editable review route
- **WHEN** an authenticated course teacher opens `/courses/[course-slug]/tasks/[task-id]/attempts/[student-username]/[attempt-id]/review`
- **THEN** the page renders editable review controls
- **AND** line-comment creation controls are available on diff lines

#### Scenario: Teacher adds line comment
- **WHEN** a teacher creates a comment for a diff line
- **THEN** the comment is associated with the file path, diff side, and line number
- **AND** the comment is displayed under the corresponding diff line

#### Scenario: Teacher edits line comment text
- **WHEN** a teacher edits an existing line comment on the editable review page
- **THEN** the changed comment text is retained in the review draft until saved or discarded

#### Scenario: Existing line comments are displayed
- **WHEN** the attempt review data contains line comments
- **THEN** the page displays each comment at its associated diff line
- **AND** comments remain visible when the page is read-only

### Requirement: Review editors support rich formatting
The system SHALL provide WYSIWYG editing for line comments and overall review feedback with the required rich-text formatting controls.

#### Scenario: Teacher edits rich review text
- **WHEN** a teacher edits a line comment or the overall review feedback
- **THEN** the editor allows bold text, italic text, inline code, code blocks, internal links, external links, images by URL, ordered lists, and unordered lists

#### Scenario: Read-only viewer sees rich review text
- **WHEN** a student or read-only viewer opens an attempt with rich review text
- **THEN** the page renders the saved formatting without exposing editing controls

#### Scenario: Teacher inserts link
- **WHEN** a teacher adds a link in the rich-text editor
- **THEN** the link can represent an internal application URL or an external URL
- **AND** the rendered link remains accessible from the saved review text

#### Scenario: Teacher inserts image by URL
- **WHEN** a teacher inserts an image URL in the rich-text editor
- **THEN** the editor includes the image in the review draft
- **AND** the read-only view renders the image in the feedback content

### Requirement: Teacher can save score and overall feedback
The system SHALL allow course teachers to save an overall review message and a numeric score for the attempt.

#### Scenario: Teacher enters fractional score
- **WHEN** a teacher enters a fractional score that is greater than or equal to zero and less than or equal to the task maximum score
- **THEN** the score draft is accepted
- **AND** the save action can persist the score with the review

#### Scenario: Teacher enters score above maximum
- **WHEN** a teacher enters a score greater than the task maximum score
- **THEN** the page shows a validation error
- **AND** the save action is disabled while the invalid score remains

#### Scenario: Teacher saves review
- **WHEN** a teacher activates the save action with valid score, line comments, and overall feedback draft data
- **THEN** the mock review data is updated
- **AND** the attempt is shown with the saved score and review feedback

#### Scenario: Teacher has no unsaved review changes
- **WHEN** the editable review draft matches the saved review data
- **THEN** the save action is disabled or otherwise indicates that there is nothing to save

### Requirement: Attempt history is available from the review page
The system SHALL show previous and adjacent attempts for the same student and task and allow quick navigation between them.

#### Scenario: Attempt has previous attempts
- **WHEN** the opened attempt has earlier attempts for the same student and task
- **THEN** the page displays a previous-attempt history area
- **AND** each previous attempt item displays attempt number, submission time, score if present, diff statistics, and comment count

#### Scenario: Viewer navigates to previous attempt
- **WHEN** the viewer activates a previous-attempt navigation control
- **THEN** the application navigates to that attempt's corresponding attempt page
- **AND** the course, task, and student route context are preserved

#### Scenario: Viewer uses adjacent attempt controls
- **WHEN** the current attempt has a previous or next attempt
- **THEN** the page displays adjacent attempt controls for available directions
- **AND** activating a control navigates to the corresponding attempt

#### Scenario: Attempt has no previous attempts
- **WHEN** the opened attempt is the first attempt for the same student and task
- **THEN** the history area indicates that no previous attempts are available

### Requirement: Student attempt page is read-only
The system SHALL render the same attempt review information to students in read-only mode when the student owns the attempt.

#### Scenario: Student opens own reviewed attempt
- **WHEN** an authenticated course student opens their own attempt page
- **THEN** the page displays diffs, line comments, overall feedback, score, and attempt history in read-only mode
- **AND** score inputs, rich-text toolbars, comment creation controls, and save actions are not available

#### Scenario: Teacher opens base attempt page
- **WHEN** an authenticated course teacher opens the base attempt page without `/review`
- **THEN** the page displays the attempt review information in read-only mode
- **AND** editable review controls are not shown on that route

#### Scenario: Read-only viewer cannot mutate review
- **WHEN** the page is in read-only mode
- **THEN** the viewer cannot create line comments, edit existing comments, edit overall feedback, or change the score
