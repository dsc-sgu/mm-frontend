# course-page-content Specification

## Purpose

Define frontend mock-backed course root overview content, editable course content block data, and supported rendering behavior.

## Requirements

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

### Requirement: Course page modules are isolated by capability
The system SHALL keep course page API, query, component, and type code in a dedicated course page submodule instead of the flat course module root.

#### Scenario: Course root route renders the course page
- **WHEN** the course root route needs the course page component or query hook
- **THEN** it imports them from `src/course/page/`
- **AND** shared renderers outside the page submodule import course page content types from `src/course/page/`

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

#### Scenario: Rich text nodes are keyed by stable IDs
- **WHEN** inline rich text is modeled for any content block
- **THEN** each rich text node has a stable `id`
- **AND** the renderer uses the stable `id` instead of the node array index as the React key

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
- **AND** the page provides an action to copy the code text

#### Scenario: Code highlighting is available
- **WHEN** course content includes a code block with a supported language id
- **THEN** the page lazy-loads the language grammar and renders highlighted code
- **AND** the highlighted code supports both light and dark color themes

#### Scenario: Code highlighting is unavailable
- **WHEN** course content includes a code block without a language or with an unsupported language id
- **THEN** the page renders the plain preformatted code instead of failing the page

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
