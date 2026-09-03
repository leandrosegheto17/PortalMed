import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import noRawKyselyOutsideDatabase from './no-raw-kysely-outside-database-rule.js';

/**
 * Cobre a parte "estrutural" do guard de aplicação de BE-03 (`TASK.md`):
 * nenhum arquivo fora de `src/database/` pode importar `kysely`/`pg`
 * diretamente — só `TenantScopedRepository` tem acesso à conexão real
 * (GUARDRAILS.md regra A.2).
 */
describe('boundary/no-raw-kysely-outside-database', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module',
    },
  });

  ruleTester.run('no-raw-kysely-outside-database', noRawKyselyOutsideDatabase, {
    valid: [
      {
        // dentro de src/database/, uso direto é o esperado
        filename: '/repo/backend/src/database/kysely-connection.ts',
        code: "import { Kysely, PostgresDialect } from 'kysely';",
      },
      {
        filename: '/repo/backend/src/database/kysely-connection.ts',
        code: "import pg from 'pg';",
      },
      {
        // módulo de domínio consumindo só a interface pública (barrel) de
        // src/database — desde a correção de QA-BUG-002 (`TASK.md` BE-03/
        // `QA-REPORT.md` Seção 1.6.1), o padrão sancionado é
        // `provideTenantScopedRepository`, nunca `KYSELY_CONNECTION`
        // diretamente (ver `no-kysely-connection-token-outside-database-rule`
        // para a regra dedicada a essa proibição)
        filename:
          '/repo/backend/src/modules/catalogo-exames/exam.repository.ts',
        code: "import { TenantScopedRepository, provideTenantScopedRepository } from '../../database/index.js';",
      },
      {
        // pacote não relacionado, fora de src/database — não avaliado
        filename:
          '/repo/backend/src/modules/catalogo-exames/exam.repository.ts',
        code: "import { Injectable } from '@nestjs/common';",
      },
    ],
    invalid: [
      {
        // repositório de domínio tentando importar kysely diretamente
        filename:
          '/repo/backend/src/modules/catalogo-exames/exam.repository.ts',
        code: "import { Kysely } from 'kysely';",
        errors: [{ messageId: 'rawDbImport' }],
      },
      {
        // mesmo problema, via pg bruto
        filename:
          '/repo/backend/src/modules/catalogo-exames/exam.repository.ts',
        code: "import { Pool } from 'pg';",
        errors: [{ messageId: 'rawDbImport' }],
      },
      {
        // require() (script/CJS eventual) apontando para kysely fora de src/database
        filename: '/repo/backend/src/modules/auditoria/auditoria.service.ts',
        code: "const { sql } = require('kysely');",
        errors: [{ messageId: 'rawDbImport' }],
      },
      {
        // re-export de kysely fora de src/database
        filename: '/repo/backend/src/modules/auditoria/index.ts',
        code: "export { sql } from 'kysely';",
        errors: [{ messageId: 'rawDbImport' }],
      },
    ],
  });
});
