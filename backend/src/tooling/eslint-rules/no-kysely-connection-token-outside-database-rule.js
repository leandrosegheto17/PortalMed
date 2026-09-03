// Regra de lint de arquitetura: proíbe qualquer referência ao identificador
// `KYSELY_CONNECTION` (import, import renomeado, re-export, uso em
// decorator/expressão) fora de `src/database/` — correção de `QA-BUG-002`
// (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6.1, 2026-09-03).
//
// Por quê: até esta correção, `KYSELY_CONNECTION` era reexportado pelo
// barrel público `src/database/index.ts` só para que um repositório
// concreto de domínio pudesse `@Inject(KYSELY_CONNECTION)` no próprio
// construtor e repassar a `super(...)`. O QA provou empiricamente que isso
// também permitia que **qualquer** provider comum do NestJS — sem nenhuma
// relação com `TenantScopedRepository`, sem importar `kysely`/`pg` (logo
// sem violar `no-raw-kysely-outside-database`) — injetasse a mesma conexão
// real diretamente e executasse uma query sem `TenantContext.run()` ativo.
// A correção removeu a reexportação pelo barrel (o vetor que o QA
// reproduziu deixa de compilar/existir para quem só usa `index.ts`), mas
// isso sozinho não impede um import "por fora" apontando direto para
// `kysely-connection.ts` (nada no sistema de módulos do Node/TypeScript
// bloqueia um import relativo profundo) — esta regra fecha essa lacuna
// residual: qualquer uso do identificador fora de `src/database/`, por
// qualquer caminho de import, fica visível em CI (`npm run lint:boundaries`,
// `--max-warnings=0`).
//
// Uso legítimo: apenas módulos de domínio consumindo
// `provideTenantScopedRepository` (que nunca referencia `KYSELY_CONNECTION`
// pelo nome no código de domínio, só repassa a classe do repositório
// concreto).

import path from 'node:path';

const DATABASE_SEGMENT = '/src/database/';
const FORBIDDEN_IDENTIFIER = 'KYSELY_CONNECTION';

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function isInsideDatabaseDir(posixPath) {
  return posixPath.includes(DATABASE_SEGMENT);
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Proíbe referenciar o identificador KYSELY_CONNECTION fora de src/database/, por qualquer caminho de import — GUARDRAILS.md regra A.2 / TASK.md BE-03 / QA-BUG-002.',
    },
    schema: [],
    messages: {
      rawTokenUsage:
        'Uso do identificador "KYSELY_CONNECTION" fora de src/database/ não é permitido, mesmo via import renomeado ou apontando direto para o arquivo interno (fora do barrel). Registre o repositório de domínio com provideTenantScopedRepository(SuaClasseDeRepositorio) (importado de "src/database/index.js") em vez de injetar o token diretamente — GUARDRAILS.md regra A.2 / QA-BUG-002.',
    },
  },
  create(context) {
    const rawFilename =
      typeof context.filename === 'string'
        ? context.filename
        : context.getFilename();
    const filename = toPosix(rawFilename);

    if (isInsideDatabaseDir(filename)) {
      return {}; // dentro de src/database/, referenciar o token é o esperado
    }

    function report(node) {
      context.report({ node, messageId: 'rawTokenUsage' });
    }

    return {
      // Cobre `import { KYSELY_CONNECTION } from '...'` e
      // `import { KYSELY_CONNECTION as Foo } from '...'` (renomeado) —
      // avalia o nome *importado*, não o nome local, então o alias não
      // escapa a regra.
      ImportSpecifier(node) {
        if (node.imported && node.imported.name === FORBIDDEN_IDENTIFIER) {
          report(node);
        }
      },
      // Cobre `export { KYSELY_CONNECTION }`/`export { KYSELY_CONNECTION as Foo }`.
      ExportSpecifier(node) {
        if (node.local && node.local.name === FORBIDDEN_IDENTIFIER) {
          report(node);
        }
      },
      // Cobre qualquer outro uso do identificador fora de um import/export
      // (ex.: `@Inject(KYSELY_CONNECTION)`, `const { KYSELY_CONNECTION } =
      // await import(...)`, referência direta em qualquer expressão) — exclui
      // os nós já cobertos acima para não duplicar o relato da mesma
      // violação.
      'Identifier:exit'(node) {
        if (node.name !== FORBIDDEN_IDENTIFIER) return;
        const parentType = node.parent && node.parent.type;
        if (parentType === 'ImportSpecifier' || parentType === 'ExportSpecifier') return;
        report(node);
      },
    };
  },
};

export default rule;
