import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { SERVICE_API_KEY_CONFIG, SERVICE_API_KEY_HEADER } from './service-api-key.tokens.js';
import type { ServiceApiKeyConfig } from './service-api-key-config.js';

/**
 * BE-09 (`TASK.md`) — guard NestJS (`CanActivate`) que autentica o tráfego
 * serviço-a-serviço (Integration Gateway/Imaging Gateway → Core,
 * `GUARDRAILS.md` item 13) por API key de serviço, **nunca** credencial de
 * usuário final (ADR-007 reserva sessão/cookie para usuário final; este
 * guard não tem nenhuma relação com aquele mecanismo).
 *
 * Aplicado nos 4 endpoints internos que hoje recebem esse tráfego (ver
 * `backend/docs/service-api-key-auth.md` para a decisão completa, incluindo
 * por que os dois placeholders "hop 2" também precisam do guard, não só os
 * dois controllers de ACL "hop 1"):
 * - `IntegrationEngineController` (`POST /internal/integration-engine/messages`)
 * - `CoreIngestPlaceholderController` (`POST /internal/ingest`)
 * - `ImagingGatewayController` (`POST /internal/imaging-gateway/notifications`)
 * - `CoreImagingIngestPlaceholderController` (`POST /internal/imaging-ingest`)
 *
 * **Comparação resistente a timing attack**: nunca `===`/comparação direta
 * de string (vazaria o prefixo correto via diferença de tempo de execução,
 * já que a comparação de string do JavaScript retorna no primeiro caractere
 * divergente). Em vez de `crypto.timingSafeEqual` diretamente sobre os dois
 * buffers (que lança se os tamanhos diferirem — o que por si só vazaria
 * informação sobre o tamanho da chave esperada via exceção/branch
 * observável), este guard compara o **hash SHA-256** (tamanho fixo, 32
 * bytes, dos dois lados) via `timingSafeEqual` — elimina tanto o vazamento
 * de conteúdo quanto o de tamanho, mesmo rigor de segurança já demonstrado
 * no restante do projeto (`pgcrypto`/RLS, `TASK.md` §1.2/1.3).
 *
 * **Sem vazar informação sobre o valor esperado**: toda falha (header
 * ausente, vazio ou com valor incorreto) responde com a mesma mensagem
 * genérica via `UnauthorizedException` (401) — nenhuma distinção de motivo
 * é exposta ao chamador.
 */
@Injectable()
export class ServiceApiKeyGuard implements CanActivate {
  constructor(
    @Inject(SERVICE_API_KEY_CONFIG) private readonly config: ServiceApiKeyConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[SERVICE_API_KEY_HEADER];
    const providedValue = Array.isArray(provided) ? provided[0] : provided;

    if (!providedValue || !isServiceApiKeyValid(providedValue, this.config.serviceApiKey)) {
      throw new UnauthorizedException('Credencial de serviço ausente ou inválida.');
    }

    return true;
  }
}

/**
 * Função pura extraída para ser testável isoladamente (unitário, sem subir
 * um `ExecutionContext`/app NestJS inteiro) — mesmo raciocínio de
 * `buildSessionRedisKey`/`parsePositiveInt` (funções puras ao lado do
 * componente que as consome).
 */
export function isServiceApiKeyValid(provided: string, expected: string): boolean {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}
