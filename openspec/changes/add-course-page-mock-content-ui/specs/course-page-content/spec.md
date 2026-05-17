## ADDED Requirements

### Requirement: Course root page displays mock course overview
The system SHALL render the course root page using frontend mock course page data for authenticated course participants.

#### Scenario: Participant opens course root page
- **WHEN** an authenticated course participant navigates to `/courses/[course-slug]`
- **THEN** the page displays the course title
- **AND** the page displays the course description
- **AND** the page displays the course teachers
- **AND** the page displays the course icon using the course visual style

#### Scenario: Course page mock data is loading
- **WHEN** the course root page is waiting for mock course page data
- **THEN** the page displays a loading state instead of placeholder text

#### Scenario: Course page mock data cannot find the course
- **WHEN** the course root page mock API reports the requested course as not found
- **THEN** the page displays a course not found state instead of rendering empty content

### Requirement: Course content uses rank-ordered editable block data
The system SHALL model course page content as serializable content blocks with stable identifiers and LexoRank-style sibling ordering.

#### Scenario: Course content blocks are rendered
- **WHEN** the course page receives content blocks in any array order
- **THEN** the page renders sibling blocks ordered by their `rank` values
- **AND** blocks with equal `rank` values are ordered deterministically by `id`

#### Scenario: Spoiler child blocks are rendered
- **WHEN** a spoiler block contains nested content blocks
- **THEN** the spoiler renders nested sibling blocks ordered by their `rank` values

#### Scenario: List items are rendered
- **WHEN** a list block contains list items
- **THEN** the list renders sibling items ordered by their `rank` values

### Requirement: Course content renders supported block types
The system SHALL render the supported course content block types in the course root page content area.

#### Scenario: Text structure blocks are present
- **WHEN** course content includes paragraph, heading, quote, ordered list, or unordered list blocks
- **THEN** the page renders each block with readable typography and spacing

#### Scenario: Spoiler block is present
- **WHEN** course content includes a spoiler block
- **THEN** the page renders a control that can be clicked or keyboard-activated to show or hide the spoiler content

#### Scenario: Code block is present
- **WHEN** course content includes a code block
- **THEN** the page renders the code in a preformatted code area
- **AND** the page shows the language or file name when that metadata is provided

#### Scenario: Image block is present
- **WHEN** course content includes an image block
- **THEN** the page renders the image with alternative text
- **AND** the page renders a caption when one is provided

#### Scenario: Files block is present
- **WHEN** course content includes a files block
- **THEN** the page renders a list of file links with file names
- **AND** the page displays file metadata such as size or MIME type when available

#### Scenario: Assignment block is present
- **WHEN** course content includes an assignment block
- **THEN** the page renders an assignment card with the assignment title
- **AND** the card links to the corresponding task route for the same course
- **AND** the card displays due date or maximum score metadata when available

#### Scenario: Video content is not supported by this change
- **WHEN** course content is modeled for this change
- **THEN** the model and renderer do not include a video block type

### Requirement: Course content supports rich inline text
The system SHALL render inline rich text within course content blocks.

#### Scenario: Rich text marks are present
- **WHEN** inline content includes bold or italic marks
- **THEN** the marked text is rendered with the corresponding emphasis

#### Scenario: Internal link is present
- **WHEN** inline content includes an internal MergeMinds link
- **THEN** the link is rendered as a navigable link to the internal path

#### Scenario: External link is present
- **WHEN** inline content includes an external resource link
- **THEN** the link opens as an external link without replacing the current application tab context
