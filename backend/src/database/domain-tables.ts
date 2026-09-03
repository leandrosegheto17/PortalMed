/**
 * Lista canônica das tabelas de domínio do schema PostgreSQL (BE-02,
 * `TASK.md`), ou seja, toda tabela definida em `SDD.md` §5 **exceto**
 * `tenants` — todas carregam `tenant_id uuid NOT NULL` desde a primeira
 * migration (GUARDRAILS.md, regra A.1).
 *
 * Não inclui `SESSION` (`SDD.md` §5): a própria entidade já anota sua PK como
 * "chave Redis" e ADR-007/`TASK.md` §1.2 estabelece que sessão vive em Redis
 * (estrutura de chave definida em BE-05), não como tabela PostgreSQL — não é
 * uma omissão, é a leitura literal do modelo já feita pelo Software Architect.
 *
 * Fonte única de verdade reaproveitada por:
 * - `test/migrations/schema.e2e-spec.ts` (BE-02): valida que toda tabela
 *   desta lista tem `tenant_id` não nulo após a migration rodar.
 * - BE-03 (RLS por tabela) e BE-04 (teste de vazamento cruzado entre
 *   tenants) podem iterar esta mesma lista em vez de reescrevê-la — reduz o
 *   risco de uma tabela nova ficar de fora de um dos dois testes por
 *   divergência de lista.
 */
export const DOMAIN_TABLES = [
  'users',
  'accounts',
  'mfa_factors',
  'terms_versions',
  'consent_records',
  'exams',
  'exam_results',
  'exam_files',
  'share_links',
  'audit_events',
  'branding_configs',
  'integration_endpoint_configs',
  'exception_queue_items',
] as const;

export type DomainTable = (typeof DOMAIN_TABLES)[number];

/** Única tabela do schema sem `tenant_id` (GUARDRAILS.md, regra A.1). */
export const TENANT_TABLE = 'tenants' as const;
