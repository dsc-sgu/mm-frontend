"""Runs bin/tk as a process against throwaway ticket directories."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

TK = Path(__file__).resolve().parent.parent / "bin" / "tk"


def ticket(ticket_id: str, title: str = "Title", body: str = "", **meta: str) -> str:
    fields = {"id": ticket_id, "status": "open", "deps": "[]", "links": "[]", "created": "2026-10-01T00:00:00Z",
              "type": "task", "priority": "2"}
    fields.update({key.replace("_", "-"): value for key, value in meta.items()})
    front = "\n".join(f"{key}: {value}" for key, value in fields.items())
    return f"---\n{front}\n---\n# {title}\n" + (f"\n{body}\n" if body else "")


class TkCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name)
        self.root = self.base / ".tickets"
        self.root.mkdir()
        self.env = dict(os.environ, TICKETS_DIR=str(self.root), TK_AUTOCOMMIT="0", TICKET_AUTHOR="tester")
        self.env.pop("TICKET_PREFIX", None)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def write(self, ticket_id: str, text: str) -> None:
        (self.root / f"{ticket_id}.md").write_text(text, encoding="utf-8")

    def read(self, ticket_id: str) -> str:
        return (self.root / f"{ticket_id}.md").read_text(encoding="utf-8")

    def tk(self, *args: str, stdin: str = "", ok: bool = True, cwd: Path | None = None) -> subprocess.CompletedProcess:
        result = subprocess.run(
            [sys.executable, str(TK), *args], input=stdin, text=True, env=self.env,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=cwd or self.base,
        )
        if ok and result.returncode != 0:
            self.fail(f"tk {' '.join(args)} failed:\n{result.stderr}")
        if not ok and result.returncode == 0:
            self.fail(f"tk {' '.join(args)} should have failed:\n{result.stdout}")
        return result

    def ids(self, *args: str) -> list:
        return [line.split()[0] for line in self.tk(*args).stdout.splitlines()]


class CreateTest(TkCase):
    def test_numbers_continue_after_the_highest_id_with_its_prefix(self) -> None:
        self.write("mm-7", ticket("mm-7"))
        self.write("mm-41", ticket("mm-41"))
        self.assertEqual(self.tk("create", "Next").stdout.strip(), "mm-42")

    def test_new_ticket_has_no_assignee_and_keeps_the_bash_tk_layout(self) -> None:
        self.write("mm-1", ticket("mm-1"))
        self.tk("create", "Write the spec", "-d", "Body text", "--tags", "a,b", "--parent", "1")
        text = self.read("mm-2")
        self.assertNotIn("assignee", text)
        front, body = text.split("\n---\n", 1)
        self.assertEqual(
            [line.split(":")[0] for line in front.splitlines()[1:]],
            ["id", "status", "deps", "links", "created", "type", "priority", "parent", "tags"],
        )
        self.assertIn("tags: [a, b]", front)
        self.assertEqual(body, "# Write the spec\n\nBody text\n")

    def test_body_from_stdin(self) -> None:
        self.write("mm-1", ticket("mm-1"))
        self.tk("create", "From stdin", "--stdin", stdin="line one\nline two\n")
        self.assertTrue(self.read("mm-2").endswith("# From stdin\n\nline one\nline two\n"))

    def test_prefix_comes_from_the_environment_when_there_are_no_tickets(self) -> None:
        self.tk("create", "First", ok=False)
        self.env["TICKET_PREFIX"] = "mm"
        self.assertEqual(self.tk("create", "First").stdout.strip(), "mm-1")

    def test_parallel_creates_get_distinct_ids(self) -> None:
        self.write("mm-1", ticket("mm-1"))
        with ThreadPoolExecutor(8) as pool:
            ids = list(pool.map(lambda n: self.tk("create", f"T{n}").stdout.strip(), range(8)))
        self.assertEqual(sorted(ids, key=lambda i: int(i[3:])), [f"mm-{n}" for n in range(2, 10)])


class IdTest(TkCase):
    def setUp(self) -> None:
        super().setUp()
        for n in (2, 22, 228):
            self.write(f"mm-{n}", ticket(f"mm-{n}", f"Ticket {n}"))

    def test_bare_number_and_hash_resolve_exactly(self) -> None:
        self.assertIn("# Ticket 22", self.tk("show", "22").stdout)
        self.assertIn("# Ticket 228", self.tk("show", "#228").stdout)

    def test_no_substring_matching(self) -> None:
        self.assertIn("not found", self.tk("show", "mm-22 8", ok=False).stderr)
        self.assertIn("not found", self.tk("show", "m-2", ok=False).stderr)


class GraphTest(TkCase):
    def setUp(self) -> None:
        super().setUp()
        self.write("mm-1", ticket("mm-1", "Epic", type="epic"))
        self.write("mm-2", ticket("mm-2", "Done child", parent="mm-1", status="closed",
                                  closed="2026-10-02T00:00:00Z", close_reason="completed"))
        self.write("mm-3", ticket("mm-3", "Ready child", parent="mm-1", deps="[mm-2]"))
        self.write("mm-4", ticket("mm-4", "Blocked child", parent="mm-1", deps="[mm-3]"))
        self.write("mm-5", ticket("mm-5", "Taken grandchild", parent="mm-3", assignee="someone"))
        self.write("mm-6", ticket("mm-6", "Elsewhere"))

    def test_ready_scoped_to_an_epic_and_unassigned_is_the_frontier(self) -> None:
        self.assertEqual(self.ids("ready"), ["mm-1", "mm-3", "mm-5", "mm-6"])
        self.assertEqual(self.ids("ready", "--parent", "1"), ["mm-3", "mm-5"])
        self.assertEqual(self.ids("ready", "--parent", "1", "--unassigned"), ["mm-3"])

    def test_blocked_names_the_blockers(self) -> None:
        self.assertEqual(self.tk("blocked").stdout.splitlines(), ["mm-4     [P2][open] - Blocked child <- mm-3"])

    def test_show_lists_relations(self) -> None:
        out = self.tk("show", "3").stdout
        self.assertIn("## Parent\n\n- mm-1 [open] Epic", out)
        self.assertIn("## Blocking\n\n- mm-4 [open] Blocked child", out)
        self.assertIn("## Children\n\n- mm-5 [open] Taken grandchild", out)
        self.assertNotIn("## Blockers", out)

    def test_tree_shows_descendants_with_blockers(self) -> None:
        self.assertEqual(self.tk("tree", "1").stdout.splitlines(), [
            "mm-1 [open] Epic",
            "├── mm-2 [closed] Done child",
            "├── mm-3 [open] Ready child",
            "│   └── mm-5 [open] Taken grandchild @someone",
            "└── mm-4 [open] Blocked child  <- mm-3",
        ])

    def test_dep_tree_and_cycles(self) -> None:
        self.assertEqual(self.tk("dep", "tree", "4").stdout.splitlines(), [
            "mm-4 [open] Blocked child",
            "└── mm-3 [open] Ready child",
            "    └── mm-2 [closed] Done child",
        ])
        self.assertEqual(self.tk("dep", "cycle").stdout.strip(), "No dependency cycles found")

    def test_dependency_that_closes_a_cycle_is_refused(self) -> None:
        before = self.read("mm-3")
        self.assertIn("dependency cycle", self.tk("dep", "3", "4", ok=False).stderr)
        self.assertEqual(self.read("mm-3"), before)

    def test_closing_a_ticket_with_open_children_needs_force(self) -> None:
        self.assertIn("open children", self.tk("close", "1", ok=False).stderr)
        self.tk("close", "1", "--force", "--reason", "not_planned")
        self.assertIn("close-reason: not_planned", self.read("mm-1"))


class LifecycleTest(TkCase):
    def setUp(self) -> None:
        super().setUp()
        self.write("mm-1", ticket("mm-1", "One"))
        self.write("mm-2", ticket("mm-2", "Two"))

    def test_close_records_time_and_reason_and_reopen_clears_them(self) -> None:
        self.tk("close", "1", "-r", "duplicate")
        text = self.read("mm-1")
        self.assertIn("status: closed", text)
        self.assertRegex(text, r"closed: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\nclose-reason: duplicate\n")
        self.tk("reopen", "1")
        text = self.read("mm-1")
        self.assertIn("status: open", text)
        self.assertNotIn("closed:", text)
        self.assertNotIn("close-reason", text)

    def test_closed_sorts_by_close_time_not_file_time(self) -> None:
        self.write("mm-1", ticket("mm-1", "Older", status="closed", closed="2026-01-01T00:00:00Z"))
        self.write("mm-2", ticket("mm-2", "Newer", status="closed", closed="2026-05-01T00:00:00Z"))
        os.utime(self.root / "mm-1.md")
        self.assertEqual(self.ids("closed"), ["mm-2", "mm-1"])

    def test_claim_refuses_someone_elses_ticket(self) -> None:
        self.tk("claim", "1")
        self.assertIn("assignee: tester\n", self.read("mm-1"))
        self.assertIn("status: in_progress", self.read("mm-1"))
        self.assertIn("already claimed by tester", self.tk("claim", "1", "--as", "other", ok=False).stderr)
        self.tk("assign", "1")
        self.assertNotIn("assignee", self.read("mm-1"))

    def test_comments_go_under_one_section_with_author_headings(self) -> None:
        self.tk("comment", "1", "first", "note")
        self.tk("comment", "1", "--author", "t3m8ch", stdin="second\nnote\n")
        body = self.read("mm-1").split("\n---\n", 1)[1]
        self.assertEqual(body.count("## Comments"), 1)
        self.assertRegex(body, r"\n### \S+Z · tester\n\nfirst note\n")
        self.assertRegex(body, r"\n### \S+Z · t3m8ch\n\nsecond\nnote\n$")

    def test_links_are_symmetric(self) -> None:
        self.tk("link", "1", "2")
        self.assertIn("links: [mm-2]", self.read("mm-1"))
        self.assertIn("links: [mm-1]", self.read("mm-2"))
        self.tk("unlink", "2", "1")
        self.assertIn("links: []", self.read("mm-1"))

    def test_tags_parent_and_undep(self) -> None:
        self.tk("tag", "1", "bug", "ui")
        self.tk("untag", "1", "ui")
        self.tk("parent", "1", "2")
        self.tk("dep", "2", "1")
        self.tk("undep", "2", "1")
        self.assertIn("parent: mm-2", self.read("mm-1"))
        self.assertIn("tags: [bug]", self.read("mm-1"))
        self.assertIn("deps: []", self.read("mm-2"))
        self.tk("parent", "1", "--none")
        self.assertNotIn("parent", self.read("mm-1"))


class ReadingTest(TkCase):
    def test_meta_prints_an_outline_with_file_line_numbers(self) -> None:
        body = "Intro\n\n## Problem\n\ntext\n\n```md\n## not a heading\n```\n\n## Comments\n\n### 2026-10-01T00:00:00Z · a\n\nhi"
        self.write("mm-1", ticket("mm-1", "One", body))
        out = self.tk("show", "1", "--meta").stdout
        self.assertNotIn("Intro", out)
        lines = self.read("mm-1").split("\n")
        outline = [row.split(maxsplit=1) for row in out.split("## Outline\n\n")[1].splitlines()]
        self.assertEqual([text for _, text in outline], ["## Problem", "## Comments", "### 2026-10-01T00:00:00Z · a"])
        for number, text in outline:
            self.assertEqual(lines[int(number) - 1], text)

    def test_refs_finds_ids_and_github_numbers_with_line_numbers(self) -> None:
        self.write("mm-28", ticket("mm-28", "Target", external_ref="gh-28"))
        self.write("mm-1", ticket("mm-1", "A", "See mm-28 here\nand #28 there\nnot #280 or mm-2800\nhttps://github.com/dsc-sgu/mm-frontend/issues/28 link"))
        out = self.tk("refs", "28").stdout.splitlines()
        lines = self.read("mm-1").split("\n")
        self.assertEqual([row.split(":")[0] for row in out], ["mm-1", "mm-1", "mm-1"])
        for row in out:
            self.assertIn(row.split(": ", 1)[1], lines[int(row.split(":")[1]) - 1])

    def test_query_emits_valid_json_for_awkward_values(self) -> None:
        self.write("mm-1", ticket("mm-1", 'Quote " and \\ backslash', external_ref='x"y'))
        record = json.loads(self.tk("query").stdout)
        self.assertEqual(record["title"], 'Quote " and \\ backslash')
        self.assertEqual(record["external-ref"], 'x"y')
        self.assertEqual(record["deps"], [])

    def test_finds_tickets_beside_a_symlinked_script(self) -> None:
        home = self.base / "repo"
        (home / "bin").mkdir(parents=True)
        (home / ".tickets").mkdir()
        (home / ".tickets" / "mm-1.md").write_text(ticket("mm-1", "Beside"), encoding="utf-8")
        (home / "bin" / "tk").write_text(TK.read_text(encoding="utf-8"), encoding="utf-8")
        link = self.base / "tk-link"
        link.symlink_to(home / "bin" / "tk")
        env = dict(self.env)
        env.pop("TICKETS_DIR")
        elsewhere = tempfile.mkdtemp()
        result = subprocess.run([sys.executable, str(link), "ls"], env=env, cwd=elsewhere,
                                text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.assertIn("Beside", result.stdout, result.stderr)


class CheckTest(TkCase):
    def problems(self) -> list:
        result = self.tk("check", ok=False)
        return result.stdout.splitlines()

    def test_valid_tickets_pass(self) -> None:
        self.write("mm-1", ticket("mm-1", body="Text with a: colon and ---- rule"))
        self.assertEqual(self.tk("check").stdout.strip(), "ok: 1 tickets")

    def test_reports_each_problem_with_its_line(self) -> None:
        self.write("mm-1", ticket("mm-1", parent="mm-9", deps="[mm-1]", wat="1", assignee="a: b"))
        self.write("mm-2", "---\nid: mm-2\ndeps:\n  - mm-1\n---\n# Two\n")
        self.write("mm-3", ticket("mm-3", status="done", priority="7", close_reason="completed"))
        out = "\n".join(self.problems())
        for expected in (
            "mm-1.md:10: unknown key `wat`",
            "mm-1.md:11: `assignee` value 'a: b' must not contain",
            "mm-1.md:9: parent mm-9 does not exist",
            "mm-1.md:4: a ticket cannot depend on itself",
            "mm-2.md:3: `deps` must be a one-line list",
            "mm-3.md:3: `status` must be one of",
            "mm-3.md:8: `priority` must be 0-4",
            "mm-3.md:9: `close-reason` is only allowed on a closed ticket",
        ):
            self.assertIn(expected, out)
        self.assertNotIn("cycle", out)

    def test_unknown_tags_and_missing_attachments(self) -> None:
        (self.root / "tags").write_text("bug , something broken\nwayfinder:map, a map\n", encoding="utf-8")
        (self.root / "mm-1").mkdir()
        (self.root / "mm-1" / "here.png").write_bytes(b"png")
        self.write("mm-1", ticket("mm-1", tags="[bug, wayfinder:map, nope]",
                                  body="![ok](mm-1/here.png) ![gone](mm-1/gone.png) <img src=\"mm-1/x.png\">\n"
                                       "`[t](url)` and `` `[u](v)` `` are code\n```md\n[in](fence)\n```"))
        out = self.problems()
        self.assertEqual(len(out), 3, out)
        self.assertIn("tag `nope` is not described", out[0])
        self.assertIn("attachment mm-1/gone.png does not exist", out[1])
        self.assertIn("attachment mm-1/x.png does not exist", out[2])

    def test_flags_body_lines_bash_tk_would_read_as_frontmatter(self) -> None:
        self.write("mm-1", ticket("mm-1", body="text\n---\nstatus: this is prose\n---\nstatus: fine here"))
        self.assertEqual(self.problems(), ["mm-1.md:14: bash tk reads this line as frontmatter because of the `---` above it"])

    def test_one_sided_link_and_cycles(self) -> None:
        self.write("mm-1", ticket("mm-1", links="[mm-2]", deps="[mm-2]", parent="mm-2"))
        self.write("mm-2", ticket("mm-2", deps="[mm-1]", parent="mm-1"))
        out = "\n".join(self.problems())
        self.assertIn("link to mm-2 is one-sided", out)
        self.assertIn("dependency cycle: mm-1 -> mm-2 -> mm-1", out)
        self.assertIn("parent cycle: mm-1 -> mm-2 -> mm-1", out)

    def test_unparseable_file_is_reported_and_other_commands_still_work(self) -> None:
        self.write("mm-1", ticket("mm-1"))
        self.write("mm-2", "no frontmatter\n")
        self.assertEqual(self.problems(), ["mm-2.md:1: file must start with a `---` frontmatter line"])
        self.assertEqual(self.ids("ls"), ["mm-1"])
        self.assertIn("cannot be parsed", self.tk("show", "2", ok=False).stderr)


class GitTest(TkCase):
    def git(self, *args: str) -> str:
        return subprocess.run(["git", *args], cwd=self.base, check=True, text=True, stdout=subprocess.PIPE).stdout

    def test_each_write_is_committed_alone(self) -> None:
        self.git("init", "-q")
        self.git("config", "user.name", "Tester")
        self.git("config", "user.email", "t@example.com")
        self.write("mm-1", ticket("mm-1"))
        (self.base / "unrelated.txt").write_text("staged elsewhere\n", encoding="utf-8")
        self.git("add", "-A")
        self.git("commit", "-qm", "init")
        (self.base / "unrelated.txt").write_text("dirty\n", encoding="utf-8")
        self.git("add", "unrelated.txt")
        self.env["TK_AUTOCOMMIT"] = "1"
        self.tk("close", "1", "-r", "not_planned")
        self.assertEqual(self.git("log", "-1", "--format=%s"), "tk: close mm-1 (not_planned)\n")
        self.assertEqual(self.git("show", "--name-only", "--format=", "HEAD"), ".tickets/mm-1.md\n")
        self.assertEqual(self.git("diff", "--cached", "--name-only"), "unrelated.txt\n")


if __name__ == "__main__":
    unittest.main()
