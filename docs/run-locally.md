# Run locally

The fastest way to experience Visualli is to run the canonical demo on your own machine.

## Viewing Locally

Clone the repo, start a static server, and open the example previewer:

```bash
git clone https://github.com/visualli-ai/spec.git
cd spec
python3 -m http.server 8000
```

Then open [http://localhost:8000/examples/example.html](http://localhost:8000/examples/example.html) in your browser.

Modify [`example.visualli`](https://github.com/visualli-ai/spec/blob/main/examples/example.visualli) and refresh to see the changes live.

## Water Cycle Demo

The main example — [`example.visualli`](https://github.com/visualli-ai/spec/blob/main/examples/example.visualli) — is a comprehensive water-cycle explanation that demonstrates every major feature:

- ✅ Metadata header (`Meta`)
- 🧩 Extension payloads (`semantic-anchors`)
- 🗂️ 5 hierarchical layers (level 0 → level 4) with `parentLayerId` / `parentNodeId`
- 🔀 Connections with labels and styling
- 📦 Containers with formations (`linear`, `circular`, etc.) and border styles

It's the perfect place to start when learning the format.
