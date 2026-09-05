import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/index.js';
import { ObjectStorageModule } from '../object-storage/index.js';
import { SecurityModule } from '../security/index.js';
import { IMAGING_GATEWAY_CONFIG } from './imaging-gateway.tokens.js';
import { loadImagingGatewayConfig } from './imaging-gateway-config.js';
import { ImagingGatewayAclService } from './imaging-gateway-acl.service.js';
import { ImagingConversionProcessor } from './imaging-conversion.processor.js';
import { ImagingGatewayController } from './imaging-gateway.controller.js';
import { CoreImagingIngestPlaceholderController } from './core-imaging-ingest-placeholder.controller.js';

/**
 * BE-07 (`TASK.md`) — Anti-Corruption Layer (ACL) entre o Imaging Gateway
 * (Orthanc, self-hosted, ADR-003/ADR-012) e o domínio do core. Mesma
 * categoria arquitetural de `IntegrationEngineModule` (BE-06): não é um
 * bounded context do `SDD.md` §2.1, mas expõe rotas HTTP reais (`POST
 * /internal/imaging-gateway/notifications`, `POST /internal/imaging-ingest`)
 * que precisam estar ativas desde já — são o próprio objeto de teste do
 * critério de aceite desta tarefa. Por isso, ao contrário do padrão dos
 * módulos de infraestrutura transversal (`RedisModule`/`QueueModule`/
 * `ObjectStorageModule`, não importados em `AppModule` até um módulo de
 * domínio precisar), `ImagingGatewayModule` **é** importado em `AppModule`
 * (ver comentário lá).
 *
 * Importa `QueueModule` (BE-05, produtor da fila `imaging-conversion`) e
 * `ObjectStorageModule` (BE-08, persistência da imagem convertida) — as
 * duas interfaces já existentes que esta tarefa consome sem mudança de
 * assinatura. Importa também `SecurityModule` (BE-09) — os dois
 * controllers usam `@UseGuards(ServiceApiKeyGuard)` e
 * `ImagingGatewayAclService` injeta `SERVICE_API_KEY_CONFIG` para anexar o
 * header de saída na chamada para `/internal/imaging-ingest`.
 */
@Module({
  imports: [QueueModule, ObjectStorageModule, SecurityModule],
  controllers: [ImagingGatewayController, CoreImagingIngestPlaceholderController],
  providers: [
    { provide: IMAGING_GATEWAY_CONFIG, useFactory: () => loadImagingGatewayConfig() },
    ImagingGatewayAclService,
    ImagingConversionProcessor,
  ],
})
export class ImagingGatewayModule {}
