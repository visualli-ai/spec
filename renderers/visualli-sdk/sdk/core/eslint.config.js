import { config } from '@visualli/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  // Copied verbatim from design-system/ by scripts/gen-design-system.mjs: fixed upstream, never here.
  { ignores: ['dist/**', 'src/generated/**'] },
];
