// Regra de lint de arquitetura: proíbe importar o pacote `kysely` (ou o
// driver `pg` bruto) de qualquer arquivo fora de `src/database/` — parte do
// guard de aplicação **estrutural** de `tenant_id` (BE-03, `TASK.md`
// Seção 1.3 / GUARDRAILS.md regra A.2).
//
// Por quê: `TenantScopedRepository` (`src/database/tenant-scoped.
// repository.ts`) é o único ponto do código que tem acesso à conexão real
// do Kysely (campo `private`). Repositórios concretos de módulos de domínio
// (BE-10+) recebem essa conexão só como `unknown` no próprio construtor,
// para repassar a `super(...)` — sem esta regra, nada impediria um desses
// arquivos de também importar `kysely`/`pg` diretamente e montar uma query
// "por fora" do guard (sem `tenant_id`, sem RLS via `set_config`). Com a
// regra, isso exigiria primeiro violar esta regra de lint (visível em CI),
// não só "esquecer" de usar o guard.
//
// Escopo: só avalia o *nome* do pacote importado (`kysely`/`pg`), não
// caminho relativo — plugins ESLint padrão (ex. `no-restricted-imports`)
// resolveriam isso também, mas o projeto já usa o padrão de regra própria
// em `module-boundary-rule.js`; esta regra segue o mesmo estilo por
// consistência (decisão de detalhe do Backend).

import path from 'node:path';

const DATABASE_SEGMENT = '/src/database/';
const FORBIDDEN_PACKAGES = new Set(['kysely', 'pg']);

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
        'Proíbe importar "kysely"/"pg" fora de src/database/ — reforça o guard estrutural de tenant_id (GUARDRAILS.md regra A.2 / TASK.md BE-03).',
    },
    schema: [],
    messages: {
      rawDbImport:
        'Import direto de "{{importSource}}" fora de src/database/ não é permitido. Toda query de tabela de domínio passa por TenantScopedRepository (importado de "src/database/index.js") — GUARDRAILS.md regra A.2.',
    },
  },
  create(context) {
    const rawFilename =
      typeof context.filename === 'string'
        ? context.filename
        : context.getFilename();
    const filename = toPosix(rawFilename);

    if (isInsideDatabaseDir(filename)) {
      return {}; // dentro de src/database/, uso direto é o esperado
    }

    function checkSource(node, source) {
      if (typeof source !== 'string') return;
      if (!FORBIDDEN_PACKAGES.has(source)) return;

      context.report({
        node,
        messageId: 'rawDbImport',
        data: { importSource: source },
      });
    }

    return {
      ImportDeclaration(node) {
        checkSource(node, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkSource(node, node.source.value);
      },
      ExportAllDeclaration(node) {
        if (node.source) checkSource(node, node.source.value);
      },
      ImportExpression(node) {
        if (node.source && node.source.type === 'Literal') {
          checkSource(node, node.source.value);
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'require' &&
          node.arguments.length === 1 &&
          node.arguments[0].type === 'Literal'
        ) {
          checkSource(node, node.arguments[0].value);
        }
      },
    };
  },
};

export default rule;
