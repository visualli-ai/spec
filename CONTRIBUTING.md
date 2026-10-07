# Contributing to Visualli

The official contributor guide has moved to our documentation site. This ensures you always have the most up-to-date instructions for environment setup, schema modifications, and binding generation.

### 👉 [**spec.visualli.ai/contributing**](https://spec.visualli.ai/contributing.html)

---

### Quick Start for Contributors

1.  **Prerequisites**: Python 3.11+ and Node.js 22+.
2.  **Setup**: Run `make install` to initialize the development environment.
3.  **Source of Truth**: All schema changes must start in `visualli.schema.json`.
4.  **Generate Bindings**: Run `make generate` after any schema changes.
5.  **Measure SDK changes**: Any change to the SDK's performance or visuals (rendering, how a map looks or moves, layout, culling, caches, level of detail, event handling, design-system updates) must run `npm run bench:compare`. Read the before / after table yourself to decide how the change performs: explain or fix every row marked *worse*. Then paste the table into your pull request under a *Performance* heading, so reviewers and future PRs can refer to it. See [Changing the SDK: measure performance](https://spec.visualli.ai/contributing.html#4-changing-the-sdk-measure-performance).

For the full technical workflow and style guide, please refer to the [online documentation](https://spec.visualli.ai/contributing.html).
