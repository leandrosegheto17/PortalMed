// Regra de lint de arquitetura: impede import direto para dentro de outro
// módulo (bounded context, ADR-001/SDD.md §2.1) fora da interface pública
// (barrel `index.ts`) do módulo.
//
// Regra prática correspondente: GUARDRAILS.md item 34 ("Módulos NestJS
// mapeados 1:1 aos bounded contexts... PROIBIDO import direto entre módulos
// fora da interface pública do módulo (enforced por lint de arquitetura)")
// e TASK.md BE-01 ("regra de lint impede import direto entre módulos fora da
// interface pública").
//
// Escopo desta regra (proporcional a BE-01, 4 dp): só avalia specifiers
// relativos dentro de `src/modules/<nome>/`. Import não-relativo (pacote de
// terceiro) não é avaliado. Path alias (`@modules/...`) não existe ainda
// neste projeto — se for introduzido em tarefa futura, esta regra precisa de
// um ajuste equivalente (decisão de detalhe registrada aqui, não decidida em
// silêncio).

import path from 'node:path';

const MODULES_SEGMENT = '/src/modules/';

/** Normaliza separador de caminho para posix, independente do SO. */
function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

/**
 * Resolve um import relativo (ex.: '../cadastro-consentimento/index.js')
 * contra o diretório do arquivo atual, retornando um caminho posix
 * absoluto-relativo (sem extensão .js/.ts) para comparação estável.
 */
function resolveRelativeImport(currentFilePosix, importSource) {
  if (!importSource.startsWith('.')) {
    return null; // import não-relativo (pacote externo) — regra não avalia
  }
  const currentDir = path.posix.dirname(currentFilePosix);
  const resolved = path.posix.normalize(
    path.posix.join(currentDir, importSource),
  );
  return resolved.replace(/\.(js|ts|mjs|mts)$/, '');
}

/** Extrai o nome do módulo (bounded context) de um caminho dentro de src/modules/<nome>/... */
function getModuleName(posixPath) {
  const idx = posixPath.indexOf(MODULES_SEGMENT);
  if (idx === -1) return null;
  const rest = posixPath.slice(idx + MODULES_SEGMENT.length);
  const [moduleName] = rest.split('/');
  return moduleName || null;
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Proíbe import direto para dentro de outro módulo (bounded context) fora da interface pública (barrel index.ts) — GUARDRAILS.md item 34 / ADR-001.',
    },
    schema: [],
    messages: {
      deepImport:
        "Import direto para dentro do módulo '{{targetModule}}' não é permitido ('{{importSource}}'). Importe apenas a interface pública do módulo, via '{{barrelSuggestion}}/index.js'.",
    },
  },
  create(context) {
    const rawFilename =
      typeof context.filename === 'string'
        ? context.filename
        : context.getFilename();
    const filename = toPosix(rawFilename);
    const currentModule = getModuleName(filename);

    function checkSource(node, source) {
      if (typeof source !== 'string') return;

      const resolved = resolveRelativeImport(filename, source);
      if (!resolved) return;

      const targetModule = getModuleName(resolved);
      if (!targetModule) return; // import relativo fora de src/modules/

      if (targetModule === currentModule) return; // dentro do próprio módulo, sempre permitido

      const modulesSegmentEnd =
        resolved.indexOf(MODULES_SEGMENT) + MODULES_SEGMENT.length;
      const moduleRoot = resolved.slice(0, modulesSegmentEnd) + targetModule;
      const isBarrel =
        resolved === moduleRoot || resolved === `${moduleRoot}/index`;

      if (isBarrel) return;

      context.report({
        node,
        messageId: 'deepImport',
        data: {
          targetModule,
          importSource: source,
          barrelSuggestion: source.slice(
            0,
            source.indexOf(targetModule) + targetModule.length,
          ),
        },
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
