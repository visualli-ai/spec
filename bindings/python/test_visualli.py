import io
import unittest
from visualli import (
    Meta,
    Extension,
    Layer,
    Node,
    Position,
    Data,
    load_visualli,
    loads_visualli,
    dump_visualli,
    dumps_visualli,
    accent_of,
    ACCENTS,
)


class TestVisualliBindings(unittest.TestCase):
    def test_accents(self):
        self.assertEqual(accent_of("Teal"), "teal")
        self.assertEqual(accent_of("  SUN  "), "sun")
        self.assertIsNone(accent_of("#b7e7f3"))
        self.assertIsNone(accent_of(None))
        self.assertEqual(len(ACCENTS), 8)

    def test_loads_and_dumps(self):
        meta = Meta(type="meta", version="0.1.5", title="Sample")
        layer = Layer(
            type="layer",
            id="layer-0",
            level=0,
            nodes=[
                Node(
                    id="node-1",
                    position=Position(x=10.0, y=20.0),
                    data=Data(label="Test Node", summary="Summary text", color="iris"),
                )
            ],
        )

        content = dumps_visualli([meta, layer])
        self.assertTrue(content.endswith("\n"))
        lines = [line for line in content.split("\n") if line.strip()]
        self.assertEqual(len(lines), 2)

        parsed = loads_visualli(content)
        self.assertEqual(len(parsed), 2)
        self.assertIsInstance(parsed[0], Meta)
        self.assertEqual(parsed[0].title, "Sample")
        self.assertIsInstance(parsed[1], Layer)
        self.assertEqual(parsed[1].id, "layer-0")
        self.assertEqual(len(parsed[1].nodes), 1)
        self.assertEqual(parsed[1].nodes[0].data.label, "Test Node")

    def test_load_and_dump_buffer(self):
        buf = io.StringIO()
        meta = Meta(type="meta", version="0.1.5", title="Buffer Test")
        dump_visualli([meta], buf)

        buf.seek(0)
        items = load_visualli(buf)
        self.assertEqual(len(items), 1)
        self.assertIsInstance(items[0], Meta)
        self.assertEqual(items[0].title, "Buffer Test")

    def test_invalid_json(self):
        with self.assertRaises(ValueError):
            loads_visualli('{"bad json')


if __name__ == "__main__":
    unittest.main()
