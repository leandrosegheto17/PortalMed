import { BadRequestException } from '@nestjs/common';

/**
 * Envelope publicado pelo script Lua do Orthanc (`OnStableStudy`, ver
 * `backend/imaging-gateway/on-stable-study.lua`) — um por instância DICOM
 * estável, via `HttpPost` nativo do Orthanc (recurso do próprio produto,
 * nenhum parser/protocolo DICOM construído pelo core, ADR-003). Este é o
 * "envelope bruto do gateway" que a ACL recebe — ainda não é o JSON
 * canônico de domínio (ver `canonical-imaging-notification-message.ts`).
 *
 * Todo campo é string deliberadamente — mesma filosofia de
 * `EngineNormalizedMessage` (`src/integration-engine/`, BE-06): validação/
 * tradução de domínio acontece na camada canônica, não aqui.
 */
export interface OrthancStableInstanceNotification {
  /**
   * `RemoteAET` nativo do Orthanc — AE Title de origem do PACS do hospital
   * que enviou o DICOM via C-STORE. É o dado que BE-38 vai casar contra
   * `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title` para resolver
   * `tenant_id` (ADR-012) — esta tarefa só propaga o valor, nunca resolve
   * tenant (GUARDRAILS.md item 5/regra A.5).
   */
  remoteAet: string;
  studyInstanceUid: string;
  seriesInstanceUid: string;
  sopInstanceUid: string;
  /**
   * ID interno de recurso do Orthanc (não é um UID DICOM padrão) — usado
   * apenas por esta ACL para buscar a prévia convertida
   * (`GET /instances/{id}/preview`) e nunca propagado para além dela (a
   * notificação canônica ao core, hop 2, carrega só os UIDs DICOM padrão —
   * ADR-012 já decidiu que o modelo de dados de domínio usa UIDs, não o ID
   * proprietário do Orthanc).
   */
  orthancInstanceId: string;
}

const REQUIRED_STRING_FIELDS: ReadonlyArray<keyof OrthancStableInstanceNotification> = [
  'remoteAet',
  'studyInstanceUid',
  'seriesInstanceUid',
  'sopInstanceUid',
  'orthancInstanceId',
];

/**
 * Valida o corpo bruto recebido em
 * `POST /internal/imaging-gateway/notifications` — falha explícita
 * (`BadRequestException`, 400) para qualquer campo ausente/vazio, mesma
 * filosofia de `parseEngineNormalizedMessage` (BE-06): nenhum envelope
 * incompleto é aceito silenciosamente. Sem `class-validator` (mesma
 * decisão de detalhe de BE-06 — nenhum outro módulo do projeto usa a
 * biblioteca ainda, `TASK.md` §1.1 "Simplicidade").
 */
export function parseOrthancStableInstanceNotification(
  body: unknown,
): OrthancStableInstanceNotification {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException(
      'Corpo da requisição precisa ser um objeto JSON com a notificação de instância estável do Orthanc.',
    );
  }

  const record = body as Record<string, unknown>;
  const missing = REQUIRED_STRING_FIELDS.filter(
    (field) => typeof record[field] !== 'string' || (record[field] as string).length === 0,
  );
  if (missing.length > 0) {
    throw new BadRequestException(
      `Notificação do Imaging Gateway inválida — campo(s) ausente(s)/vazio(s): ${missing.join(', ')}.`,
    );
  }

  return {
    remoteAet: record.remoteAet as string,
    studyInstanceUid: record.studyInstanceUid as string,
    seriesInstanceUid: record.seriesInstanceUid as string,
    sopInstanceUid: record.sopInstanceUid as string,
    orthancInstanceId: record.orthancInstanceId as string,
  };
}

/**
 * Mesma validação de `parseOrthancStableInstanceNotification`, mas usada
 * pelo processor da fila (`imaging-conversion.processor.ts`) sobre o
 * `job.data` já enfileirado — o payload é serializado/desserializado pelo
 * BullMQ (JSON) entre o enqueue (controller) e o processamento (worker),
 * então revalidar aqui é defesa em profundidade barata, não redundância
 * inútil (ex.: um job antigo na fila de uma versão anterior do payload).
 */
export function parseOrthancStableInstanceNotificationFromJobData(
  data: unknown,
): OrthancStableInstanceNotification {
  return parseOrthancStableInstanceNotification(data);
}
