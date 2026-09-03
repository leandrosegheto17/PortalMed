import { Module } from '@nestjs/common';

/**
 * Bounded context: Identity & Access (SDD.md §2.1).
 * Requisitos cobertos: RF-01, RF-02, RF-03, RF-04, RN-03, RN-04.
 * Tarefas de implementação: BE-10 a BE-17 (TASK.md §3.2).
 *
 * Módulo intencionalmente vazio nesta tarefa (BE-01) — só a fronteira
 * (bounded context) e a interface pública (`index.ts`) nascem aqui;
 * providers/controllers chegam nas tarefas de domínio correspondentes.
 */
@Module({})
export class IdentityAccessModule {}
