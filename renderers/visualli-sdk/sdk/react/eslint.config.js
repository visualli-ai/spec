import { config } from '@visualli/eslint-config/react-internal';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  // Generated from design-system/ by scripts/gen-design-system.mjs: fixed upstream, never here.
  { ignores: ['dist/**', 'src/generated/**'] },
];
