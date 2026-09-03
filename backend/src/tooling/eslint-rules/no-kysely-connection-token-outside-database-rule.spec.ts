import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import noKyselyConnectionTokenOutsideDatabase from './no-kysely-connection-token-outside-database-rule.js';

/**
 * Regressão adversarial de `QA-BUG-002` (`TASK.md` BE-03/`QA-REPORT.md`
 * Seção 1.6.1, 2026-09-03): o QA provou empiricamente que
 * `KYSELY_CONNECTION`, reexportado à época pelo barrel público
 * `src/database/index.ts`, podia ser injetado por **qualquer** provider
 * comum do NestJS — sem estender `TenantScopedRepository`, sem importar
 * `kysely`/`pg` (logo sem violar `no-raw-kysely-outside-database`) — e
 * executar uma query real sem `TenantContext.run()` ativo.
 *
 * Esta suíte replica o vetor **literal** do QA (a classe
 * `NotARepositoryService` do relato, com `@Inject(KYSELY_CONNECTION)` no
 * próprio construtor) e confirma que a nova regra o reporta, tanto quando o
 * import aponta para o barrel público (`../../database/index.js`, que já
 * nem exporta mais o símbolo — a correção primária) quanto quando aponta
 * "por fora" do barrel, direto para o arquivo interno
 * (`../../database/kysely-connection.js`, caminho ainda tecnicamente
 * alcançável pelo sistema de módulos, e que só esta regra fecha).
 */
describe('boundary/no-kysely-connection-token-outside-database', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module',
    },
  });

  ruleTester.run(
    'no-kysely-connection-token-outside-database',
    noKyselyConnectionTokenOutsideDatabase,
    {
      valid: [
        {
          // dentro de src/database/, referenciar o token é o esperado
          filename: '/repo/backend/src/database/kysely-connection.ts',
          code: "export const KYSELY_CONNECTION = Symbol('KYSELY_CONNECTION');",
        },
        {
          filename: '/repo/backend/src/database/database.module.ts',
          code: "import { KYSELY_CONNECTION } from './kysely-connection.js';",
        },
        {
          filename: '/repo/backend/src/database/provide-tenant-scoped-repository.ts',
          code: "import { KYSELY_CONNECTION } from './kysely-connection.js';",
        },
        {
          // padrão sancionado pós-QA-BUG-002: módulo de domínio nunca
          // referencia KYSELY_CONNECTION, só repassa a classe concreta
          filename:
            '/repo/backend/src/modules/catalogo-exames/catalogo-exames.module.ts',
          code: "import { DatabaseModule, provideTenantScopedRepository } from '../../database/index.js';\nimport { ExamsRepository } from './exams.repository.js';",
        },
      ],
      invalid: [
        {
          // vetor literal de QA-BUG-002: tentativa via barrel público
          filename:
            '/repo/backend/src/modules/catalogo-exames/not-a-repository.service.ts',
          code: [
            "import { Inject, Injectable } from '@nestjs/common';",
            "import { KYSELY_CONNECTION } from '../../database/index.js';",
            '',
            '@Injectable()',
            'class NotARepositoryService {',
            '  constructor(@Inject(KYSELY_CONNECTION) private readonly rawConnection: unknown) {}',
            '  runRawQuery() {',
            "    return (this.rawConnection as any).selectFrom('exception_queue_items').selectAll().execute();",
            '  }',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'rawTokenUsage' }, { messageId: 'rawTokenUsage' }],
        },
        {
          // mesmo vetor, mas "por fora" do barrel — caminho que a remoção
          // da reexportação sozinha não fecha
          filename:
            '/repo/backend/src/modules/catalogo-exames/not-a-repository.service.ts',
          code: [
            "import { Inject, Injectable } from '@nestjs/common';",
            "import { KYSELY_CONNECTION } from '../../database/kysely-connection.js';",
            '',
            '@Injectable()',
            'class NotARepositoryService {',
            '  constructor(@Inject(KYSELY_CONNECTION) private readonly rawConnection: unknown) {}',
            '}',
          ].join('\n'),
          errors: [{ messageId: 'rawTokenUsage' }, { messageId: 'rawTokenUsage' }],
        },
        {
          // import renomeado não escapa a regra
          filename: '/repo/backend/src/modules/auditoria/auditoria.service.ts',
          code: "import { KYSELY_CONNECTION as RawConn } from '../../database/index.js';",
          errors: [{ messageId: 'rawTokenUsage' }],
        },
        {
          // re-export fora de src/database também é bloqueado
          filename: '/repo/backend/src/modules/auditoria/index.ts',
          code: "export { KYSELY_CONNECTION } from '../../database/index.js';",
          errors: [{ messageId: 'rawTokenUsage' }],
        },
        {
          // desestruturação renomeada de import dinâmico (outra forma de
          // obter o símbolo sem um `import` estático de nível de módulo) —
          // renomeado para produzir uma única ocorrência determinística do
          // identificador proibido (a chave da desestruturação), evitando
          // depender de como cada parser resolve nós duplicados em
          // desestruturação "shorthand"
          filename:
            '/repo/backend/src/modules/catalogo-exames/not-a-repository.service.ts',
          code: "async function attempt() { const { KYSELY_CONNECTION: rawConn } = await import('../../database/index.js'); return rawConn; }",
          errors: [{ messageId: 'rawTokenUsage' }],
        },
      ],
    },
  );
});
