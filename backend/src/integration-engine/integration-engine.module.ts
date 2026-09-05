import { Module } from '@nestjs/common';
import { SecurityModule } from '../security/index.js';
import { INTEGRATION_ENGINE_CONFIG } from './integration-engine.tokens.js';
import { loadIntegrationEngineConfig } from './integration-engine-config.js';
import { IntegrationEngineAclService } from './integration-engine-acl.service.js';
import { IntegrationEngineController } from './integration-engine.controller.js';
import { CoreIngestPlaceholderController } from './core-ingest-placeholder.controller.js';

/**
 * BE-06 (`TASK.md`) — Anti-Corruption Layer (ACL) entre a Integration
 * Engine (NextGen Connect, self-hosted, ADR-002) e o domínio do core.
 *
 * Diferente de `src/database/`, `src/redis/`, `src/queue/`,
 * `src/object-storage/` (infraestrutura transversal sem rota HTTP própria,
 * consumida via DI por um módulo de domínio futuro) — este módulo **expõe
 * rotas HTTP reais** (`POST /internal/integration-engine/messages`,
 * `POST /internal/ingest`) que precisam estar ativas desde já, porque são
 * o próprio objeto de teste do critério de aceite desta tarefa ("ACL
 * normaliza mensagem de teste... e publica para endpoint interno do
 * core"). Por isso, ao contrário do padrão dos módulos de infraestrutura
 * anteriores, `IntegrationEngineModule` **é** importado em `AppModule` —
 * ver comentário lá.
 *
 * Não é um bounded context do `SDD.md` §2.1 (a lista de 11 módulos de
 * domínio não muda) — é um componente de integração/borda, mesma categoria
 * arquitetural do próprio Integration Gateway (`SDD.md` §1.3, item 4),
 * só que a parte que roda dentro do processo do core.
 *
 * Importa `SecurityModule` (BE-09) — os dois controllers usam
 * `@UseGuards(ServiceApiKeyGuard)`, que precisa resolver a dependência via
 * o injector deste módulo.
 */
@Module({
  imports: [SecurityModule],
  controllers: [IntegrationEngineController, CoreIngestPlaceholderController],
  providers: [
    { provide: INTEGRATION_ENGINE_CONFIG, useFactory: () => loadIntegrationEngineConfig() },
    IntegrationEngineAclService,
  ],
})
export class IntegrationEngineModule {}
