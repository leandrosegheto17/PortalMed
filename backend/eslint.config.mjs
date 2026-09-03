// ESLint dedicado exclusivamente à regra de fronteira de módulo (arquitetura
// modular, ADR-001/GUARDRAILS.md item 34). Lint de estilo/correção geral já é
// coberto por `oxlint` (ver package.json "lint:oxlint") — este arquivo não
// duplica esse papel, propositalmente enxuto (decisão de escopo de BE-01).
import tsParser from '@typescript-eslint/parser';
import moduleBoundaryRule from './src/tooling/eslint-rules/module-boundary-rule.js';
import noRawKyselyOutsideDatabaseRule from './src/tooling/eslint-rules/no-raw-kysely-outside-database-rule.js';
import noKyselyConnectionTokenOutsideDatabaseRule from './src/tooling/eslint-rules/no-kysely-connection-token-outside-database-rule.js';

const boundaryPlugin = {
  rules: {
    'no-deep-module-import': moduleBoundaryRule,
    'no-raw-kysely-outside-database': noRawKyselyOutsideDatabaseRule,
    'no-kysely-connection-token-outside-database': noKyselyConnectionTokenOutsideDatabaseRule,
  },
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    plugins: {
      boundary: boundaryPlugin,
    },
    rules: {
      'boundary/no-deep-module-import': 'error',
      'boundary/no-raw-kysely-outside-database': 'error',
      'boundary/no-kysely-connection-token-outside-database': 'error',
    },
  },
];
