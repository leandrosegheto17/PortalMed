import { Module } from '@nestjs/common';

/**
 * Bounded context: Notificação (SDD.md §2.1).
 * Requisitos cobertos: RF-02 (e-mail), RF-03 (OTP e-mail), RF-09 (opcional).
 * Tarefas de implementação: BE-36 (TASK.md §3.9).
 *
 * Módulo intencionalmente vazio nesta tarefa (BE-01) — ver nota em
 * `identity-access.module.ts`.
 */
@Module({})
export class NotificacaoModule {}
