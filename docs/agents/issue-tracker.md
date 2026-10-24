# Issue tracker: tk

Tickets and specs for this repo live as Markdown files in `.tickets/` on the orphan branch `tickets`, managed with `tk`. The branch shares no history with `main`; its `README.md` describes the format and every command.

GitHub Issues of this repository are a frozen archive of the same tickets: do not create, edit, comment on or close them. A ticket imported from there keeps its number (`#228` is `mm-228`) and an `external-ref: gh-228`.

## Setup

Check the branch out once as a worktree and put `tk` on the `PATH`:

```bash
git worktree add ../mm-frontend-worktrees/tickets tickets
ln -s "$PWD/../mm-frontend-worktrees/tickets/bin/tk" ~/.local/bin/tk
```

`tk` then works from any directory and any worktree. It needs Python 3.9+ and nothing outside the standard library.

## Conventions

- **Name a ticket** `mm-<n>` in new text, never `#<n>`: GitHub keeps numbering pull requests from the same counter. Every command accepts `mm-228`, `228` and `#228`.
- **Create a ticket**: `tk create "Title" --stdin --tags needs-triage <<'EOF'` with the body on stdin; it prints the new id.
- **Read a ticket**: `tk show <id> --meta` prints the frontmatter, relations and a line-numbered outline; then read only the lines you need from `.tickets/mm-<n>.md`. `tk show <id>` prints the whole ticket.
- **List tickets**: `tk ls` (open and in progress), `tk ready` (no open blockers), `tk blocked`, `tk closed`; `ls` and `ready` filter with `--tag`, `--parent`, `--assignee` or `--unassigned`. `tk query | jq …` prints every ticket as a JSON line.
- **Comment**: `tk comment <id> <<'EOF'` with the text on stdin.
- **Apply / remove tags** (the labels of [triage-labels.md](triage-labels.md)): `tk tag <id> <tag>` / `tk untag <id> <tag>`. Every tag must be described in `.tickets/tags`.
- **Close**: `tk close <id> --reason completed` (or `not_planned`, `duplicate`).
- **Find mentions**: `tk refs <id>` lists the tickets whose text mentions it.
- **Search by meaning**: if the qmd MCP server is available, query its `tickets` collection; exact words, ids and tags go through `rg` over `.tickets/`.

Each write is committed alone on the `tickets` branch (`tk: close mm-228 (completed)`), so `git log -- .tickets/mm-228.md` is the ticket's history. After editing a ticket file by hand, run `tk check` and commit it yourself. Nothing is pushed until `tk sync`, which pulls with rebase and pushes; run it after a session's writes.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

Pull requests stay on GitHub. When set to `yes`, PRs run through the same tags and states as tickets, using the `gh pr` commands:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

A bare `#42` in old text may be an imported ticket or a PR: `tk show 42` succeeds only for a ticket, otherwise use `gh pr view 42`.

A PR that implements tickets names them in its body (`Implements mm-228`); GitHub cannot close them. Close each ticket with `tk close` once the PR is merged.

## When a skill says "publish to the issue tracker"

Create a ticket with `tk create`.

## When a skill says "fetch the relevant ticket"

Run `tk show <id> --meta`, then read the parts you need.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single ticket with **child** tickets.

- **Map**: a ticket tagged `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. `tk create "…" --stdin --tags wayfinder:map`.
- **Child ticket**: `tk create "…" --stdin --parent <map> --tags wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: `tk dep <child> <blocker>` adds the blocker to the child's `deps`; `tk undep` removes it. A ticket is unblocked when every ticket in its `deps` is closed. `tk dep tree <id>` shows the chain, `tk dep cycle` finds cycles.
- **Frontier query**: `tk ready --parent <map> --unassigned`: the map's open descendants without open blockers or an assignee. `tk tree <map>` shows the whole map with its blockers.
- **Claim**: `tk claim <id>`, the session's first write. It assigns the ticket to you and starts it, and refuses a ticket someone else holds.
- **Resolve**: `tk comment <id>` with the answer, then `tk close <id> --reason completed`, then append a context pointer (gist + `mm-<n>`) to the map's Decisions-so-far by editing the map file; run `tk check` and commit it.
