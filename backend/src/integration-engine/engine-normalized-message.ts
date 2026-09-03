import { BadRequestException } from '@nestjs/common';

/**
 * Envelope publicado pela Integration Engine (NextGen Connect, ADR-002)
 * depois da normalização estrutural feita pelo próprio motor (transformer
 * step JavaScript nativo — ver
 * `backend/integration-engine/channels/hl7v2-oru-canonical-test-channel.xml`).
 * Este é o "formato normalizado pela engine" que a ACL recebe — ainda não é
 * o JSON canônico de domínio do projeto (ver `canonical-exam-result-message.ts`
 * para a tradução final).
 *
 * Todo campo é string deliberadamente (nenhuma tipagem numérica/data ainda)
 * — a engine só extrai texto dos componentes HL7 v2.x; validação/tipagem de
 * domínio (ex.: `resultValue` numérico, `receivedAt` como `Date`) é
 * responsabilidade de quem consome o JSON canônico a partir de BE-24, não
 * desta camada de tradução estrutural.
 */
export interface EngineNormalizedMessage {
  messageType: string;
  messageControlId: string;
  sourceSystem: string;
  patientIdentifier: string;
  patientName: string;
  examCode: string;
  examName: string;
  resultValue: string;
  resultUnit: string;
  receivedAt: string;
}

const REQUIRED_STRING_FIELDS: ReadonlyArray<keyof EngineNormalizedMessage> = [
  'messageType',
  'messageControlId',
  'sourceSystem',
  'patientIdentifier',
  'patientName',
  'examCode',
  'examName',
  'resultValue',
  'resultUnit',
  'receivedAt',
];

/**
 * Valida o corpo bruto recebido em `POST /internal/integration-engine/messages`
 * — falha explícita (`BadRequestException`, 400) para qualquer campo
 * ausente/vazio, nunca aceita silenciosamente um envelope incompleto (mesma
 * filosofia de `parsePositiveInt`/`parseStrictBoolean`, `src/config/parse-env.ts`).
 * Sem `class-validator` nesta tarefa (nenhum outro módulo do projeto usa a
 * biblioteca ainda) — decisão de detalhe dentro da autoridade do Backend:
 * introduzir uma dependência nova só para validar um único DTO simples de
 * 10 campos string seria generalizar além do que esta tarefa exige
 * (`TASK.md` §1.1, "Simplicidade"); reavaliar se um módulo de domínio
 * futuro precisar de validação de DTO mais rica.
 */
export function parseEngineNormalizedMessage(body: unknown): EngineNormalizedMessage {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new BadRequestException(
      'Corpo da requisição precisa ser um objeto JSON com a mensagem normalizada pela Integration Engine.',
    );
  }

  const record = body as Record<string, unknown>;
  const missing = REQUIRED_STRING_FIELDS.filter(
    (field) => typeof record[field] !== 'string' || (record[field] as string).length === 0,
  );
  if (missing.length > 0) {
    throw new BadRequestException(
      `Mensagem normalizada pela Integration Engine inválida — campo(s) ausente(s)/vazio(s): ${missing.join(', ')}.`,
    );
  }

  return {
    messageType: record.messageType as string,
    messageControlId: record.messageControlId as string,
    sourceSystem: record.sourceSystem as string,
    patientIdentifier: record.patientIdentifier as string,
    patientName: record.patientName as string,
    examCode: record.examCode as string,
    examName: record.examName as string,
    resultValue: record.resultValue as string,
    resultUnit: record.resultUnit as string,
    receivedAt: record.receivedAt as string,
  };
}
