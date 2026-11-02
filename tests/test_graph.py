"""Граф тикетов: выбор корней, обход зависимостей и готовый артефакт."""
import json

from test_tk import TkCase, ticket


class GraphTest(TkCase):
    def setUp(self):
        super().setUp()
        self.write("mm-1", ticket("mm-1", "Цель", priority="0", deps="[mm-2]", links="[mm-5]"))
        self.write("mm-2-SPEC", ticket("mm-2-SPEC", "Спецификация", priority="1", deps="[mm-3]"))
        self.write("mm-3", ticket("mm-3", "Исследование", deps="[mm-4]"))
        self.write("mm-4", ticket("mm-4", "Готово", status="closed"))
        self.write("mm-5", ticket("mm-5", "Связанный тикет"))
        self.write("mm-6", ticket("mm-6", "Независимая цель", priority="0", status="in_progress"))

    def graph(self, *args):
        return json.loads(self.tk("graph", *args).stdout)

    def test_transitive_blockers_keep_other_priorities_and_resolve_slice_ids(self):
        """Блокеры добавляются независимо от приоритета; links не становятся рёбрами."""
        graph = self.graph("--priority", "0")
        self.assertEqual(graph["roots"], ["mm-1", "mm-6"])
        self.assertEqual({n["id"] for n in graph["nodes"]}, {"mm-1", "mm-2-SPEC", "mm-3", "mm-6"})
        self.assertEqual(graph["edges"], [{"from": "mm-2-SPEC", "to": "mm-1"}, {"from": "mm-3", "to": "mm-2-SPEC"}])
        self.assertEqual(graph["summary"], {"roots": 2, "nodes": 4, "edges": 2, "cycles": 0, "ready_roots": 1})
        ready = {n["id"]: n["ready"] for n in graph["nodes"]}
        self.assertEqual(ready, {"mm-1": False, "mm-6": True, "mm-2-SPEC": False, "mm-3": True})

    def test_closed_dependency_stops_traversal_unless_requested(self):
        self.write("mm-4", ticket("mm-4", status="closed", deps="[mm-5]"))
        self.assertNotIn("mm-5", {n["id"] for n in self.graph("1")["nodes"]})
        graph = self.graph("1", "--include-closed")
        self.assertEqual(len(graph["nodes"]), 5)
        self.assertIn("class t3 closed", graph["mermaid"])

    def test_dependents_and_both_directions(self):
        graph = self.graph("SPEC", "--direction", "dependents")
        self.assertEqual({n["id"] for n in graph["nodes"]}, {"mm-1", "mm-2-SPEC"})
        self.assertEqual(graph["edges"], [{"from": "mm-2-SPEC", "to": "mm-1"}])
        graph = self.graph("SPEC", "--direction", "both")
        self.assertEqual({n["id"] for n in graph["nodes"]}, {"mm-1", "mm-2-SPEC", "mm-3"})

    def test_depth_uses_shortest_distance_from_any_root(self):
        self.assertEqual(len(self.graph("1", "--depth", "0")["nodes"]), 1)
        self.assertEqual(len(self.graph("1", "--depth", "1")["nodes"]), 2)
        graph = self.graph("1", "SPEC", "--depth", "1")
        self.assertEqual(len(graph["nodes"]), 3)
        self.assertEqual(graph["summary"]["roots"], 2)
        self.assertIn("--depth must be non-negative", self.tk("graph", "--depth", "-1", ok=False).stderr)

    def test_shared_dependencies_are_not_repeated(self):
        self.write("mm-6", ticket("mm-6", priority="0", deps="[mm-2]"))
        graph = self.graph("--priority", "0")
        self.assertEqual(len(graph["nodes"]), 4)
        self.assertEqual(len(graph["edges"]), 3)

    def test_cycles_are_reported_without_looping(self):
        self.write("mm-3", ticket("mm-3", deps="[mm-1]"))
        graph = self.graph("1")
        self.assertEqual(graph["cycles"], [["mm-1", "mm-3", "mm-2-SPEC"]])
        self.assertEqual(graph["summary"]["cycles"], 1)
        self.assertIn("stroke:#dc2626", graph["mermaid"])

    def test_root_filters_do_not_filter_dependencies(self):
        self.write("mm-1", ticket("mm-1", priority="0", parent="mm-5", assignee="tester", tags="[chosen]", deps="[mm-2]"))
        graph = self.graph("--parent", "5", "--assignee", "tester", "--tag", "chosen", "--status", "open")
        self.assertEqual(graph["roots"], ["mm-1"])
        self.assertEqual(len(graph["nodes"]), 3)
        self.assertEqual(self.graph("--unassigned", "--priority", "0")["roots"], ["mm-6"])
        self.assertEqual(self.graph("--status", "closed")["roots"], ["mm-4"])
        self.assertEqual(self.graph("6", "--parent", "5")["nodes"], [])

    def test_unknown_roots_and_dependencies_are_errors(self):
        self.assertIn("not found", self.tk("graph", "99", ok=False).stderr)
        self.write("mm-3", ticket("mm-3", deps="[mm-99]"))
        self.assertIn("unresolved dependency", self.tk("graph", "1", ok=False).stderr)

    def test_malformed_tickets_are_not_silently_omitted(self):
        self.write("mm-7", "broken")
        self.assertIn("malformed tickets", self.tk("graph", "--priority", "0", ok=False).stderr)

    def test_empty_selection_and_safe_mermaid_labels(self):
        self.assertIn("Нет подходящих тикетов", self.graph("--priority", "4")["mermaid"])
        title = 'Кавычки " и <img src=x> & #quot; ; {опасно}'
        self.write("mm-6", ticket("mm-6", title, priority="0"))
        graph = self.graph("6", "--layout", "TB")
        self.assertEqual(graph["nodes"][0]["title"], title)
        self.assertTrue(graph["mermaid"].startswith("flowchart TB"))
        self.assertNotIn('<img', graph["mermaid"])
        self.assertIn('#34;', graph["mermaid"])
        self.assertIn('#60;', graph["mermaid"])
        self.assertNotIn('#quot;', graph["mermaid"])

    def test_file_output_returns_only_path_and_summary_and_does_not_mutate_tickets(self):
        before = {p.name: p.read_bytes() for p in self.root.glob("*.md")}
        output = self.base / "artifacts" / "p0.json"
        result = json.loads(self.tk("graph", "--priority", "0", "--output", str(output)).stdout)
        graph = json.loads(output.read_text())
        self.assertEqual(result, {"path": str(output), **graph["summary"]})
        self.assertNotIn("mermaid", result)
        self.assertEqual(graph, self.graph("--priority", "0"))
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.root.glob("*.md")})
        self.assertIn("must not overwrite", self.tk("graph", "-o", str(self.root / "mm-1.md"), ok=False).stderr)

    def test_output_errors_are_concise(self):
        output = self.base / "file"
        output.write_text("not a directory")
        result = self.tk("graph", "-o", str(output / "p0.json"), ok=False)
        self.assertIn("cannot write graph", result.stderr)
        self.assertNotIn("Traceback", result.stderr)
