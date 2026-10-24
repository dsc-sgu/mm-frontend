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
id: mm-228-REV6.2
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
- Attachments of `mm-228-REV6.2` live in `.tickets/mm-228/` and are linked as `mm-228/name.png`.
- Every tag is described in `.tickets/tags` (`name , description`).
- `tk check` enforces all of this and the references between tickets; `tk` refuses a write that would break it.

## Ids

An id is `mm-<core>` with an optional slice code after it: `mm-228-REV6.2`, `mm-k7q2x`, `mm-k7q2x-ACC5`. The file is named after the id.

- **Core.** A ticket imported from GitHub Issues at the move keeps its number: `#228` is `mm-228`. Every other ticket, created here or imported later from any forge or bug tracker, gets 5 random characters of Crockford base32 with at least one letter and one digit, so it never looks like an issue number and two people who create tickets before `tk sync` do not collide. The core never changes; where a ticket came from is its `external-ref`.
- **Slice code.** The code of a slice in a plan or an epic (`ACC4`, `REV6.2`, `W0-1`), set with `tk create --code` or later with `tk code <id> <code>`, removed with `tk code <id> --none`. It may hold hyphens; everything after the core is one code.
- **Source.** `external-ref: <source>-<key>` names the issue a ticket came from: `gh-290`, `sgu-17`. `.tickets/sources` lists the sources with their URL templates (`gh , https://github.com/dsc-sgu/mm-frontend/issues/{n}`); the first one is what a bare `#290` means. `tk check` rejects an unknown source and two tickets with the same `external-ref`, and `tk show --meta` prints the `url` of the original.
- **Lookup.** Every command finds a ticket by any part of its id or by its `external-ref`, in any case: `mm-228-REV6.2`, `mm-228`, `228`, `#228`, `gh-228`, `REV6.2`, `rev6.2`, `228-REV6.2`; `mm-k7q2x-ACC5` also answers to `k7q2x` and `ACC5`, and to `sgu-17` if it came from there. A part that two tickets share is an error that lists both, and `tk check` reports it.
- **Relations.** `deps`, `parent` and `links` name `mm-<core>` without the code, so changing a code renames one file and touches no other ticket; `tk check` rejects a relation written with the code.
- **In text** name a ticket by its full id or by `mm-<core>`, never `#<n>`: GitHub keeps numbering pull requests from the same counter. `tk refs` finds `mm-<core>`, the slice code, the `external-ref`, the URL of the original and, for the first source, `#<n>`.

Lists sort by priority, then by `created`.

## Commands

```bash
tk ready --parent mm-218 --unassigned  # the frontier of an epic
tk show 228 --meta                     # frontmatter, relations and a line-numbered outline
sed -n 19,82p .tickets/mm-228-REV6.2.md  # then read only the part you need
tk tree 218                            # an epic's descendants with their blockers
tk refs REV6.2                         # tickets whose text mentions mm-228, REV6.2 or #228
tk create "Title" --stdin --parent 218 --code REV9 --tags ready-for-agent <<'EOF'
Body.
EOF
tk claim 228                           # assign to yourself and start; refuses someone else's ticket
tk comment 228 --author t3m8ch <<'EOF'
Comment text.
EOF
tk close 228 --reason completed
tk code 228 REV6.4                     # rename mm-228-REV6.2 to mm-228-REV6.4
tk query | jq -r 'select(.status == "open") | .id'
tk help
```

Each write is committed alone (`tk: close mm-228 (completed)`), so `git log --follow -- .tickets/mm-228-REV6.2.md` is the ticket's history across code changes. Set `TK_AUTOCOMMIT=0` to skip it. `tk sync` pulls with rebase and pushes; nothing is pushed otherwise. The comment author is `$TICKET_AUTHOR`, else `git config user.name`.

## Development

```bash
python3 -m unittest discover -s tests
podman run --rm -v "$PWD:/w:Z" -w /w docker.io/library/python:3.9-slim \
  sh -c 'apt-get -qq update && apt-get -qq install -y git >/dev/null && python -m unittest discover -s tests'
```

`tools/import_github.py` imported the GitHub Issues snapshot; it only reads from GitHub. `tools/import_github.py --issue 290` imports one issue taken from outside contributors with a random id and `external-ref: gh-290`, checks it and commits it; labels that `.tickets/tags` does not describe and blockers that are not tickets are dropped. An importer for another source writes the same `external-ref: <source>-<key>` after adding the source to `.tickets/sources`.
