import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { AppModule } from './app.module.js';
import { IdentityAccessModule } from './modules/identity-access/index.js';
import { CadastroConsentimentoModule } from './modules/cadastro-consentimento/index.js';
import { CatalogoExamesModule } from './modules/catalogo-exames/index.js';
import { EntregaLaudoImagemModule } from './modules/entrega-laudo-imagem/index.js';
import { CompartilhamentoModule } from './modules/compartilhamento/index.js';
import { AuditoriaModule } from './modules/auditoria/index.js';
import { ConfigTenantBrandingModule } from './modules/config-tenant-branding/index.js';
import { GestaoUsuariosModule } from './modules/gestao-usuarios/index.js';
import { AjudaSuporteModule } from './modules/ajuda-suporte/index.js';
import { NotificacaoModule } from './modules/notificacao/index.js';
import { FilaExcecaoModule } from './modules/fila-excecao/index.js';

/**
 * Cobre o critério de aceite de BE-01 (TASK.md): "Projeto NestJS inicializado
 * com 1 módulo por bounded context do SDD.md §2.1 (mesmo vazio)". A lista
 * abaixo é exatamente a mesma dos 11 bounded contexts nomeados em
 * GUARDRAILS.md item 34 e SDD.md §2.1 — qualquer divergência (módulo faltando
 * ou módulo extra não rastreável a um bounded context) deve quebrar este
 * teste.
 */
const BOUNDED_CONTEXT_MODULES = [
  IdentityAccessModule,
  CadastroConsentimentoModule,
  CatalogoExamesModule,
  EntregaLaudoImagemModule,
  CompartilhamentoModule,
  AuditoriaModule,
  ConfigTenantBrandingModule,
  GestaoUsuariosModule,
  AjudaSuporteModule,
  NotificacaoModule,
  FilaExcecaoModule,
] as const;

describe('AppModule — bounded contexts (SDD.md §2.1 / ADR-001 / ADR-005)', () => {
  it('registra exatamente os 11 módulos de bounded context, 1:1', () => {
    const imports: unknown[] = Reflect.getMetadata('imports', AppModule) ?? [];

    expect(BOUNDED_CONTEXT_MODULES.length).toBe(11);

    for (const boundedContextModule of BOUNDED_CONTEXT_MODULES) {
      expect(imports).toContain(boundedContextModule);
    }
  });

  it('compila como módulo de teste do NestJS sem erro de wiring (DI, imports)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();

    await moduleRef.close();
  });

  it.each(BOUNDED_CONTEXT_MODULES)(
    'cada módulo de bounded context (%s) compila isoladamente, mesmo vazio',
    async (boundedContextModule) => {
      const moduleRef = await Test.createTestingModule({
        imports: [boundedContextModule],
      }).compile();

      expect(moduleRef).toBeDefined();

      await moduleRef.close();
    },
  );
});
