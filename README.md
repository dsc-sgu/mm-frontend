# MergeMinds tickets

This orphan branch holds the tickets of `mm-frontend` as Markdown files, and `tk`, the tool that reads and writes them. It shares no history with `main`; check it out as its own worktree:

```bash
git worktree add ../mm-frontend-worktrees/tickets tickets
ln -s "$PWD/../mm-frontend-worktrees/tickets/bin/tk" ~/.local/bin/tk
```

`tk` finds `.tickets/` through `$TICKETS_DIR`, then the current directory and its parents, then beside its own (symlink-resolved) location, so the symlink works from any worktree. It needs Python 3.9+ and nothing outside the standard library.

## Format

The format is that of [wedow/ticket](https://github.com/wedow/ticket), so its bash `tk` reads the same files.

```md
---
id: mm-228
status: open                 # open | in_progress | closed
deps: [mm-226, mm-227]       # blocked by these until they close
links: []                    # symmetric "see also"
created: 2026-10-14T10:59:33Z
type: task                   # bug | feature | task | epic | chore
priority: 2                  # 0 is highest
assignee: t3m8ch             # absent = free to claim
external-ref: gh-228
parent: mm-218
tags: [ready-for-agent]
closed: 2026-10-20T12:00:00Z # only when closed
close-reason: completed      # completed | not_planned | duplicate
---
# Title

Body.

## Comments

### 2026-10-20T12:00:00Z · t3m8ch

Comment text.
```

- Lists stay on one line; values contain no `: `, `[` or `]`.
- Attachments of `mm-228` live in `.tickets/mm-228/` and are linked as `mm-228/name.png`.
- Every tag is described in `.tickets/tags` (`name , description`).
- `tk check` enforces all of this and the references between tickets; `tk` refuses a write that would break it.

## Ids

Tickets imported from GitHub Issues keep their number: `#228` is `mm-228`. New tickets continue the sequence. GitHub keeps numbering pull requests from the same counter, so new text names tickets as `mm-<n>`, never `#<n>`. Every command accepts `mm-228`, `228` and `#228`.

## Commands

```bash
tk ready --parent mm-218 --unassigned  # the frontier of an epic
tk show 228 --meta                     # frontmatter, relations and a line-numbered outline
sed -n 19,82p .tickets/mm-228.md       # then read only the part you need
tk tree 218                            # an epic's descendants with their blockers
tk refs 228                            # tickets whose text mentions mm-228 or #228
tk create "Title" --stdin --parent 218 --tags ready-for-agent <<'EOF'
Body.
EOF
tk claim 228                           # assign to yourself and start; refuses someone else's ticket
tk comment 228 --author t3m8ch <<'EOF'
Comment text.
EOF
tk close 228 --reason completed
tk query | jq -r 'select(.status == "open") | .id'
tk help
```

Each write is committed alone (`tk: close mm-228 (completed)`), so `git log -- .tickets/mm-228.md` is the ticket's history. Set `TK_AUTOCOMMIT=0` to skip it. `tk sync` pulls with rebase and pushes; nothing is pushed otherwise. The comment author is `$TICKET_AUTHOR`, else `git config user.name`.

## Development

```bash
python3 -m unittest discover -s tests
podman run --rm -v "$PWD:/w:Z" -w /w docker.io/library/python:3.9-slim \
  sh -c 'apt-get -qq update && apt-get -qq install -y git >/dev/null && python -m unittest discover -s tests'
```

`tools/import_github.py` imported the GitHub Issues snapshot; it only reads from GitHub.
