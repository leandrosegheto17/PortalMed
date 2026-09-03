import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
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
import { IntegrationEngineModule } from './integration-engine/index.js';

// Um módulo NestJS por bounded context do SDD.md §2.1 (ADR-001/ADR-005,
// GUARDRAILS.md item 34) — mapeamento 1:1, todos importados só pela
// interface pública (barrel `index.ts`) de cada módulo.
//
// `IntegrationEngineModule` (BE-06) é a única exceção deliberada ao
// mapeamento 1:1 acima: não é um dos 11 bounded contexts do SDD.md §2.1,
// mas — diferente de `DatabaseModule`/`RedisModule`/`QueueModule`/
// `ObjectStorageModule` (infraestrutura transversal sem rota HTTP própria,
// não importados aqui até um módulo de domínio precisar) — expõe rotas
// HTTP reais (`/internal/integration-engine/messages`, `/internal/ingest`)
// que precisam estar ativas desde já: são o próprio objeto de teste do
// critério de aceite de BE-06. Ver `src/integration-engine/integration-engine.module.ts`.
@Module({
  imports: [
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
    IntegrationEngineModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
