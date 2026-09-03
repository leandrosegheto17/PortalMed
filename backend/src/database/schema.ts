import type { Generated } from 'kysely';

/**
 * Tipagem estrutural do schema PostgreSQL (BE-02, `backend/migrations/`) para
 * o Kysely — deliberadamente **mínima**: só as colunas estruturais que toda
 * tabela de domínio garante (`id`, `tenant_id`, `created_at`, `updated_at`
 * quando existe), não as colunas de negócio de cada tabela (ex.:
 * `exams.categoria`, `users.cpf_hash`).
 *
 * Decisão de escopo (BE-03, dentro da autoridade do Backend): nenhuma tarefa
 * de domínio (BE-10+) foi implementada ainda, então nenhuma coluna de
 * negócio tem consumidor de código real — tipá-las agora seria generalizar
 * tipagem para código que não existe (`TASK.md` §1.1, "Simplicidade": não
 * generalizar antes de ser necessário). `TenantScopedRepository` (BE-03) só
 * precisa saber que `tenant_id`/`id` existem para montar o filtro do guard;
 * as tarefas de domínio futuras estendem este arquivo tabela por tabela, à
 * medida que implementam cada entidade real (ver `backend/docs/
 * tenant-guard-and-rls.md`).
 */
interface DomainRowWithUpdatedAt {
  id: Generated<string>;
  tenant_id: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

/**
 * `consent_records` e `audit_events` são append-only por desenho (RN-02/
 * ADR-009, `backend/docs/migrations.md`) — não têm coluna `updated_at`.
 */
interface DomainRowAppendOnly {
  id: Generated<string>;
  tenant_id: string;
  created_at: Generated<Date>;
}

interface TenantsRow {
  id: Generated<string>;
  nome_institucional: string;
  identificador_integracao: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

/**
 * `Database` do Kysely — uma entrada por tabela real do schema (`SDD.md`
 * §5), na mesma lista canônica de `domain-tables.ts` (BE-02) + `tenants`.
 */
export interface Database {
  tenants: TenantsRow;
  users: DomainRowWithUpdatedAt;
  accounts: DomainRowWithUpdatedAt;
  mfa_factors: DomainRowWithUpdatedAt;
  terms_versions: DomainRowWithUpdatedAt;
  consent_records: DomainRowAppendOnly;
  exams: DomainRowWithUpdatedAt;
  exam_results: DomainRowWithUpdatedAt;
  exam_files: DomainRowWithUpdatedAt;
  share_links: DomainRowWithUpdatedAt;
  audit_events: DomainRowAppendOnly;
  branding_configs: DomainRowWithUpdatedAt;
  integration_endpoint_configs: DomainRowWithUpdatedAt;
  exception_queue_items: DomainRowWithUpdatedAt;
}
