// Interface pública de `src/database` (BE-02/BE-03) — único ponto de
// entrada permitido para módulos de domínio (mesmo padrão de
// GUARDRAILS.md item 34 / ADR-001, aplicado aqui a este diretório de
// infraestrutura transversal, e reforçado pela regra de lint
// `no-raw-kysely-outside-database`, ver `src/tooling/eslint-rules/`).
//
// Deliberadamente NÃO reexporta `createKyselyConnection` (só usada
// internamente por `DatabaseModule`) nem qualquer tipo do pacote `kysely`
// — repositórios de domínio (BE-10+) recebem a conexão como parâmetro
// `unknown` do próprio construtor (ver `tenant-scoped.repository.ts`).
//
// **Correção de `QA-BUG-002` (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6.1,
// 2026-09-03)**: `KYSELY_CONNECTION` deixou de ser reexportado aqui. O QA
// provou empiricamente que reexportar o token de DI permitia que qualquer
// provider comum do NestJS (não só `TenantScopedRepository`) o injetasse
// diretamente via `@Inject(KYSELY_CONNECTION)` e executasse query sem
// `TenantContext.run()` ativo — sem violar nenhuma regra de lint existente.
// Módulos de domínio agora usam `provideTenantScopedRepository(...)` para
// registrar seu repositório concreto como provider — a injeção do token
// continua acontecendo, mas inteiramente dentro de `src/database/`, nunca
// exposta a um arquivo de domínio. Reforçado por
// `boundary/no-kysely-connection-token-outside-database`, que proíbe
// qualquer referência ao identificador `KYSELY_CONNECTION` fora deste
// diretório, mesmo via import "por fora" do barrel.
export { DatabaseModule } from './database.module.js';
export { provideTenantScopedRepository } from './provide-tenant-scoped-repository.js';
export {
  TenantScopedRepository,
  type DomainRow,
} from './tenant-scoped.repository.js';
export {
  TenantContext,
  MissingTenantContextError,
} from './tenant-context.js';
export {
  DOMAIN_TABLES,
  TENANT_TABLE,
  type DomainTable,
} from './domain-tables.js';
