## ADDED Requirements

### Requirement: Teacher attempts list displays mock-backed attempt cards
The system SHALL render the course attempts page for course teachers using frontend-only mock attempts data for the active course.

#### Scenario: Teacher opens attempts page with available attempts
- **WHEN** an authenticated course teacher navigates to `/courses/[course-slug]/attempts`
- **THEN** the page displays a left filter sidebar
- **AND** the page displays attempt cards for the active course
- **AND** each attempt card displays the attempt number, task title, student name, group or subgroup, submission timestamp, deadline timing, grading status, and diff added/deleted line counts

#### Scenario: Attempt is ungraded
- **WHEN** an attempt has no saved grade
- **THEN** its card displays an ungraded status
- **AND** its primary action is labeled `Оценить`
- **AND** activating the action navigates to the attempt review route for that attempt

#### Scenario: Attempt is graded
- **WHEN** an attempt has a saved grade
- **THEN** its card displays the grading timestamp, teacher name, score, and maximum score
- **AND** its primary action is still available for opening the attempt review route

#### Scenario: Attempt has diff statistics
- **WHEN** an attempt has added and deleted line counts
- **THEN** the card displays added lines as positive diff text
- **AND** the card displays deleted lines as negative diff text

### Requirement: Attempts filters are applied through URL search parameters
The system SHALL store applied attempts filters in the attempts page URL search parameters and keep draft sidebar changes local until the user applies them.

#### Scenario: Teacher opens attempts page with search filters
- **WHEN** a teacher opens `/courses/[course-slug]/attempts` with task, student, or grade-status search parameters
- **THEN** the page displays only attempts matching the normalized search filters
- **AND** the filter sidebar reflects the applied filter values

#### Scenario: Teacher changes draft filters
- **WHEN** a teacher changes task, student, or grade-status controls in the sidebar
- **THEN** the attempt list remains filtered by the currently applied URL filters
- **AND** the `Применить` button becomes enabled when the draft filters differ from the applied filters

#### Scenario: Teacher applies draft filters
- **WHEN** a teacher presses `Применить` after changing filters
- **THEN** the route search parameters are updated to represent the draft filters
- **AND** the attempt list is refreshed using the new applied filters
- **AND** the `Применить` button becomes disabled again

#### Scenario: Filter draft equals applied filters
- **WHEN** the sidebar draft filters are identical to the applied URL filters
- **THEN** the `Применить` button is disabled

### Requirement: Attempts filters support task, student, and grading status controls
The system SHALL provide sidebar controls for filtering by tasks, students, and whether an attempt has a grade.

#### Scenario: Teacher filters by tasks
- **WHEN** a teacher selects one or more task filters and applies them
- **THEN** the page displays attempts whose task is one of the selected tasks

#### Scenario: Teacher filters by students
- **WHEN** a teacher selects one or more student filters and applies them
- **THEN** the page displays attempts submitted by one of the selected students

#### Scenario: Teacher searches within filter options
- **WHEN** a teacher enters text into a task or student filter search field
- **THEN** the corresponding filter option list is narrowed to options matching the search text

#### Scenario: Teacher filters by ungraded status
- **WHEN** a teacher applies the grade-status filter value `Нет`
- **THEN** the page displays only attempts without a saved grade

#### Scenario: Teacher filters by graded status
- **WHEN** a teacher applies the grade-status filter value `Да`
- **THEN** the page displays only attempts with a saved grade

#### Scenario: Teacher uses neutral grading status
- **WHEN** a teacher applies the grade-status filter value `Неважно`
- **THEN** the page does not filter attempts by saved grade status

### Requirement: Teacher can select attempts and use bulk action controls
The system SHALL allow teachers to select visible attempts and display bulk action controls for the current selection.

#### Scenario: Teacher selects an attempt
- **WHEN** a teacher checks an attempt card selection control
- **THEN** the attempt is included in the current selection
- **AND** the bottom action bar displays selection actions

#### Scenario: Teacher clears selection
- **WHEN** one or more attempts are selected and the teacher activates `Очистить выбор`
- **THEN** all attempts are removed from the current selection
- **AND** the page returns to the non-selection bottom action state

#### Scenario: Teacher selects all visible attempts
- **WHEN** no attempts are selected and the teacher activates `Выбрать всё`
- **THEN** all currently visible attempts are selected

#### Scenario: Selected attempt card primary action
- **WHEN** an attempt is selected
- **THEN** its card primary action is labeled `Посмотреть`
- **AND** activating the action opens the attempt diff route for that attempt

### Requirement: Bulk grading action validates selected attempt compatibility
The system SHALL disable the selected-attempts bulk grading action when the selection cannot be graded together and SHALL expose the reason to the teacher.

#### Scenario: Selected attempts have different maximum scores
- **WHEN** selected attempts do not all have the same maximum score
- **THEN** the bulk `Оценить` action is disabled
- **AND** hovering or focusing the disabled action area explains that selected attempts have different maximum scores

#### Scenario: Selected attempts include review-locked attempts
- **WHEN** one or more selected attempts are already taken for review by a teacher
- **THEN** the bulk `Оценить` action is disabled
- **AND** hovering or focusing the disabled action area lists the attempts that are already taken for review

#### Scenario: Selected attempts are compatible for grading
- **WHEN** selected attempts all have the same maximum score
- **AND** none of the selected attempts are taken for review
- **THEN** the bulk `Оценить` action is enabled
- **AND** activating it enters quick grading mode for the selected attempts

### Requirement: Quick grading mode supports score editing and saving
The system SHALL provide a quick grading mode where teachers can enter or modify scores for attempts without opening the full review page.

#### Scenario: Teacher enters quick grading from all visible attempts
- **WHEN** no attempts are selected and the teacher activates `Быстрая оценка`
- **THEN** the page enters quick grading mode for the currently visible attempts
- **AND** each quick grading card shows a score input and the attempt maximum score

#### Scenario: Teacher enters quick grading from compatible selection
- **WHEN** compatible attempts are selected and the teacher activates the bulk `Оценить` action
- **THEN** the page enters quick grading mode for the selected attempts only

#### Scenario: Teacher edits score
- **WHEN** a teacher changes a quick grading score input
- **THEN** the `Сохранить` action becomes enabled
- **AND** the changed score is retained in the quick grading draft until saved or discarded

#### Scenario: Teacher saves quick grades
- **WHEN** a teacher activates `Сохранить` with changed quick grading scores
- **THEN** the mock attempts data is updated with the changed scores
- **AND** the affected attempts are shown as graded
- **AND** the page exits or refreshes quick grading state without losing the applied filters

#### Scenario: Teacher exits quick grading without saving
- **WHEN** a teacher activates `Выйти из быстрой оценки`
- **THEN** the page leaves quick grading mode
- **AND** unsaved quick grading score drafts are discarded

### Requirement: Quick grading mode respects attempts taken for review
The system SHALL prevent quick score editing for attempts that are already taken for review and SHALL identify the reviewing teacher.

#### Scenario: Quick grading card is review-locked
- **WHEN** an attempt in quick grading mode is taken for review by a teacher
- **THEN** its score input is disabled
- **AND** the card states which teacher has taken the attempt for review

#### Scenario: Saving quick grades with review-locked cards present
- **WHEN** quick grading mode includes review-locked attempts
- **THEN** saving quick grades does not change scores for the review-locked attempts

### Requirement: Quick grading shows future feedback text control without textarea
The system SHALL render the `Показать поле текста отзыва` control in quick grading mode but SHALL NOT render a feedback textarea until the attempt review feedback design is defined.

#### Scenario: Teacher sees feedback text toggle
- **WHEN** the page is in quick grading mode
- **THEN** the bottom quick grading bar displays a `Показать поле текста отзыва` checkbox
- **AND** no feedback textarea is rendered by this change

#### Scenario: Quick grading code marks deferred feedback field implementation
- **WHEN** a developer inspects the quick grading feedback toggle implementation
- **THEN** the code contains a TODO comment referencing the future issue #25 feedback textarea design

#### Scenario: Teacher saves quick grade with feedback text hidden
- **WHEN** a teacher saves quick grade changes while `Показать поле текста отзыва` is off
- **THEN** the mock save behavior may clear existing feedback text for changed attempts
