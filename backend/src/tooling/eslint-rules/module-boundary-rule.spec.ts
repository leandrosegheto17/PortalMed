import { RuleTester } from 'eslint';
import tsParser from '@typescript-eslint/parser';
import noDeepModuleImport from './module-boundary-rule.js';

/**
 * Cobre o critério de aceite de BE-01 (TASK.md): "regra de lint impede import
 * direto entre módulos fora da interface pública (barrel/index.ts exportado)".
 * Também traduz GUARDRAILS.md item 34 / ADR-001 em um teste verificável, não
 * só documentação.
 */
describe('boundary/no-deep-module-import', () => {
  const ruleTester = new RuleTester({
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2023,
      sourceType: 'module',
    },
  });

  // RuleTester cria suas próprias suítes/casos via describe/it globais — não
  // envolver em um it() manual (vitest não permite suite aninhada em teste).
  ruleTester.run('no-deep-module-import', noDeepModuleImport, {
    valid: [
      {
        // import dentro do mesmo módulo — sempre permitido, mesmo que "profundo"
        filename:
          '/repo/backend/src/modules/identity-access/identity-access.service.ts',
        code: "import { X } from './internal/detalhe-privado.js';",
      },
      {
        // import via barrel (index.js) de outro módulo — interface pública
        filename:
          '/repo/backend/src/modules/identity-access/identity-access.module.ts',
        code: "import { CadastroConsentimentoModule } from '../cadastro-consentimento/index.js';",
      },
      {
        // AppModule (fora de src/modules) importando o barrel de um módulo — permitido
        filename: '/repo/backend/src/app.module.ts',
        code: "import { AuditoriaModule } from './modules/auditoria/index.js';",
      },
      {
        // pacote de terceiro (import não relativo) — regra não se aplica
        filename:
          '/repo/backend/src/modules/identity-access/identity-access.module.ts',
        code: "import { Module } from '@nestjs/common';",
      },
      {
        // import relativo que não cruza nenhum módulo (ex.: pasta compartilhada)
        filename:
          '/repo/backend/src/modules/identity-access/identity-access.module.ts',
        code: "import { EnvConfig } from '../../shared/config/env.js';",
      },
    ],
    invalid: [
      {
        // import direto de arquivo interno de outro módulo — viola a fronteira
        filename:
          '/repo/backend/src/modules/identity-access/identity-access.module.ts',
        code: "import { CadastroConsentimentoService } from '../cadastro-consentimento/cadastro-consentimento.service.js';",
        errors: [{ messageId: 'deepImport' }],
      },
      {
        // import direto de caminho aninhado dentro de outro módulo
        filename: '/repo/backend/src/modules/auditoria/auditoria.module.ts',
        code: "import { HashChain } from '../fila-excecao/domain/hash-chain.js';",
        errors: [{ messageId: 'deepImport' }],
      },
      {
        // re-export (barrel de outro arquivo) apontando para dentro de outro módulo
        filename: '/repo/backend/src/modules/notificacao/notificacao.module.ts',
        code: "export * from '../ajuda-suporte/ajuda-suporte.service.js';",
        errors: [{ messageId: 'deepImport' }],
      },
      {
        // require() apontando para dentro de outro módulo (script/CJS eventual)
        filename:
          '/repo/backend/src/modules/gestao-usuarios/gestao-usuarios.module.ts',
        code: "const x = require('../auditoria/auditoria.service.js');",
        errors: [{ messageId: 'deepImport' }],
      },
      {
        // AppModule (fora de src/modules) tentando pular o barrel de um módulo
        filename: '/repo/backend/src/app.module.ts',
        code: "import { AuditoriaModule } from './modules/auditoria/auditoria.module.js';",
        errors: [{ messageId: 'deepImport' }],
      },
      {
        // Regressão: nome do módulo aparece 2x na string do import (pasta +
        // prefixo do arquivo, ex. 'cadastro-consentimento.module.js') — a
        // sugestão de barrel na mensagem não pode duplicar o segmento.
        filename:
          '/repo/backend/src/modules/identity-access/identity-access.module.ts',
        code: "import { X } from '../cadastro-consentimento/cadastro-consentimento.module.js';",
        errors: [
          {
            messageId: 'deepImport',
            data: {
              targetModule: 'cadastro-consentimento',
              importSource:
                '../cadastro-consentimento/cadastro-consentimento.module.js',
              barrelSuggestion: '../cadastro-consentimento',
            },
          },
        ],
      },
    ],
  });
});
