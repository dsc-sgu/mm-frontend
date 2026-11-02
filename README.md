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

An id is `mm-<core>` with an optional slice code after it: `mm-228-REV6.2`, `mm-281`, `mm-281-ACC5`. The file is named after the id.

- **Number.** The tickets imported from GitHub Issues at the move kept their issue number: `#228` is `mm-228`. Every later ticket gets the next number of this tracker when `tk sync` first pushes it, whether it was created here or imported from a forge or bug tracker.
- **Unsynced ticket.** `tk create` needs no network: a new ticket is `mm-<5 random characters>` (Crockford base32 with a letter and a digit, like `mm-k7q2x`) until `tk sync`. Before pushing, `tk sync` renames each such ticket to the next free number, rewrites `deps`, `parent`, `links` and `mm-k7q2x` mentions in every ticket, moves its attachment folder, and keeps `k7q2x` in `aliases`, so a branch or commit that already says `mm-k7q2x` still finds it. Nobody else has seen the ticket before that push, so the rename breaks nothing; if the push is rejected because someone pushed first, `tk sync` undoes its numbering, pulls and numbers again. A random id in `tk ls` is a ticket you have not synced.
- **Slice code.** The code of a slice in a plan or an epic (`ACC4`, `REV6.2`, `W0-1`), set with `tk create --code` or later with `tk code <id> <code>`, removed with `tk code <id> --none`. It may hold hyphens; everything after the number is one code.
- **Source.** `external-ref: <source>-<key>` names the issue a ticket came from: `gh-290`, `sgu-17`. `.tickets/sources` lists the sources with their URL templates (`gh , https://github.com/dsc-sgu/mm-frontend/issues/{n}`). `tk check` rejects an unknown source and two tickets with the same `external-ref`, and `tk show --meta` prints the `url` of the original. A number is always this tracker's: `#290` is `mm-290`, the GitHub issue #290 is `gh-290`.
- **Lookup.** Every command finds a ticket by any part of its id, an alias or its `external-ref`, in any case: `mm-228-REV6.2`, `mm-228`, `228`, `#228`, `gh-228`, `REV6.2`, `rev6.2`, `228-REV6.2`; `mm-281-ACC5` also answers to `ACC5`, to its alias `k7q2x` and to `sgu-17` if it came from there. A name that two tickets share is an error that lists both, and `tk check` reports it.
- **Relations.** `deps`, `parent` and `links` name `mm-<number>` without the code, so changing a code renames one file and touches no other ticket; `tk check` rejects a relation written with the code.
- **In text** name a ticket by its full id or by `mm-<number>`, never `#<n>`: GitHub keeps numbering pull requests from the same counter. `tk refs` finds `mm-<number>`, the aliases, the slice code, the `external-ref`, the URL of the original and, for the tickets imported at the move, `#<n>` outside code: in code it is a line or attempt number.

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
tk graph --priority 0 --output /tmp/p0.json # P0 and their transitive open blockers
tk help
```

`tk sync` is the only command that talks to the remote. Each write is committed alone (`tk: close mm-228 (completed)`), so `git log --follow -- .tickets/mm-228-REV6.2.md` is the ticket's history across code changes. Set `TK_AUTOCOMMIT=0` to skip it. `tk sync` pulls with rebase, numbers new tickets and pushes; nothing is pushed otherwise. Your name, for `tk claim` and comments, is `$TICKET_AUTHOR`, else `git config tk.author`, else `git config user.name`; set it once to your forge login: `git config --global tk.author t3m8ch`.

## Графы тикетов

`tk graph` строит граф по `deps`, разрешает сокращённые ID и возвращает JSON
с `nodes`, `edges`, `roots`, `cycles`, `summary` и готовой диаграммой `mermaid`.
Стрелка всегда направлена от блокера к зависимому тикету; `links` и `parent`
не превращаются в рёбра. Толстая рамка отмечает исходные тикеты, цвет — приоритет,
полупрозрачность — закрытый тикет, красная рамка — цикл.

```bash
tk graph --priority 0 --output /tmp/p0.json
tk graph mm-288 --output /tmp/blockers.json
tk graph mm-269 --direction dependents --output /tmp/unblocks.json
tk graph mm-288 --direction both --depth 2 --include-closed --output /tmp/context.json
tk graph --parent mm-218 --tag ready-for-agent --unassigned --output /tmp/frontier.json
```

Позиционные ID и фильтры `--priority`, `--status`, `--parent`, `--tag`,
`--assignee`, `--unassigned` выбирают только исходные тикеты. По умолчанию
это все открытые и выполняемые тикеты (`--status active`). При обходе
зависимости добавляются с любым приоритетом, исполнителем и тегами.
`--status all` снимает фильтр состояния исходных тикетов.

Обход идёт к блокерам (`--direction blockers`), к зависимым тикетам
(`dependents`) или в обе стороны (`both`). По умолчанию закрытые тикеты
останавливают обход и не попадают в граф, если не выбраны исходными;
`--include-closed` добавляет их и продолжает обход через них. `--depth 0`
оставляет только исходные тикеты и рёбра между ними; без `--depth`
обход не ограничен. `--layout TB` меняет расположение слева направо на сверху вниз.

С `--output` команда сохраняет артефакт и печатает только абсолютный путь
и счётчики: модели не нужно читать и повторять все названия и связи.
Без `--output` полный JSON выводится в stdout. Для BB сохраняйте файл
в `$BB_THREAD_STORAGE`, затем передавайте `Load(путь).mermaid` в `Diagram`
внутри `Card`. Сводка `summary` содержит число исходных тикетов, узлов,
рёбер, циклов и исходных тикетов без открытых блокеров (`ready_roots`).
Циклы не прерывают обход, а возвращаются отдельно; повреждённые тикеты
и неразрешённые зависимости в обходе завершают команду с ошибкой.

## Development

```bash
python3 -m unittest discover -s tests
podman run --rm -v "$PWD:/w:Z" -w /w docker.io/library/python:3.9-slim \
  sh -c 'apt-get -qq update && apt-get -qq install -y git >/dev/null && python -m unittest discover -s tests'
```

`tools/import_github.py` imported the GitHub Issues snapshot; it only reads from GitHub. `tools/import_github.py --issue 290` imports one issue taken from outside contributors as a new unsynced ticket with `external-ref: gh-290`, checks it and commits it; `tk sync` numbers it like any other; labels that `.tickets/tags` does not describe and blockers that are not tickets are dropped. An importer for another source writes the same `external-ref: <source>-<key>` after adding the source to `.tickets/sources`.
