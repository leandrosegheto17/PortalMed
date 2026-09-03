import { Module } from '@nestjs/common';

/**
 * Bounded context: Config de Tenant/Branding (SDD.md §2.1).
 * Requisitos cobertos: RF-11, RN-10, RNF-11, RN-09.
 * Tarefas de implementação: BE-32 a BE-34, ADR-011 (TASK.md §3.7).
 *
 * Módulo intencionalmente vazio nesta tarefa (BE-01) — ver nota em
 * `identity-access.module.ts`.
 */
@Module({})
export class ConfigTenantBrandingModule {}
