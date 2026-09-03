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

// Um módulo NestJS por bounded context do SDD.md §2.1 (ADR-001/ADR-005,
// GUARDRAILS.md item 34) — mapeamento 1:1, todos importados só pela
// interface pública (barrel `index.ts`) de cada módulo.
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
