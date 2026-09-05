import { Module } from '@nestjs/common';
import { SERVICE_API_KEY_CONFIG } from './service-api-key.tokens.js';
import { loadServiceApiKeyConfig } from './service-api-key-config.js';
import { ServiceApiKeyGuard } from './service-api-key.guard.js';

/**
 * BE-09 (`TASK.md`) — infraestrutura transversal de segurança, mesma
 * categoria de `src/database/`/`src/redis/`/`src/queue/`/`src/object-storage/`
 * (sem rota HTTP própria, consumida via DI por outros módulos) — não é um
 * bounded context do `SDD.md` §2.1, e por isso, como as demais, **não** é
 * importado em `AppModule` diretamente: `IntegrationEngineModule` e
 * `ImagingGatewayModule` importam `SecurityModule` para poder usar
 * `@UseGuards(ServiceApiKeyGuard)` nos próprios controllers.
 *
 * `ServiceApiKeyGuard` é exportado (não só declarado como provider) porque
 * `@UseGuards(ClasseDoGuard)` resolve a instância via o injector do módulo
 * que declara o controller — sem o export, `IntegrationEngineModule`/
 * `ImagingGatewayModule` não conseguiriam resolver a dependência.
 *
 * `SERVICE_API_KEY_CONFIG` também é exportado: `IntegrationEngineAclService`/
 * `ImagingGatewayAclService` injetam o mesmo token para anexar o header de
 * saída (`X-Service-Api-Key`) na chamada HTTP real para os endpoints
 * placeholder do core (hop 2) — mesma credencial usada pelo guard para
 * validar a entrada, único jeito de o hop 2 (originado pela própria ACL, no
 * mesmo processo) também passar pela autenticação exigida por
 * `GUARDRAILS.md` item 13.
 */
@Module({
  providers: [
    { provide: SERVICE_API_KEY_CONFIG, useFactory: () => loadServiceApiKeyConfig() },
    ServiceApiKeyGuard,
  ],
  exports: [ServiceApiKeyGuard, SERVICE_API_KEY_CONFIG],
})
export class SecurityModule {}
