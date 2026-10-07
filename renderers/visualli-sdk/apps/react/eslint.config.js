import { config } from '@visualli/eslint-config/react-internal';

/** @type {import("eslint").Linter.Config[]} */
export default [...config, { ignores: ['dist/**', 'dist-bench/**', 'dist-loader/**'] }];
