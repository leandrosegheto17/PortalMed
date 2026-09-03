import type { EngineNormalizedMessage } from './engine-normalized-message.js';

/**
 * JSON canônico de domínio deste projeto para um resultado de exame vindo
 * do Integration Gateway — o formato com o qual o core (BE-24, tarefa
 * futura) trabalha exclusivamente, nunca com HL7/FHIR bruto nem com o
 * envelope intermediário da engine (ADR-002/GUARDRAILS.md item 11). Esta é
 * a fronteira real da Anti-Corruption Layer: tradução do vocabulário
 * externo (campos HL7 já extraídos pela engine) para o vocabulário de
 * domínio do projeto (paciente/exame/resultado).
 *
 * `schemaVersion` fixo em `'1.0'` desde já — mesmo raciocínio de
 * versionamento de payload já aplicado ao hash chain de auditoria
 * (`TASK.md` §1.4/SPK-05): evita que uma mudança futura de formato quebre
 * silenciosamente um consumidor (BE-24) que já dependa deste contrato.
 */
export interface CanonicalExamResultMessage {
  schemaVersion: '1.0';
  sourceSystem: string;
  messageType: string;
  messageControlId: string;
  patient: {
    identifier: string;
    name: string;
  };
  exam: {
    code: string;
    name: string;
  };
  result: {
    value: string;
    unit: string;
  };
  receivedAt: string;
}

export function toCanonicalExamResultMessage(
  message: EngineNormalizedMessage,
): CanonicalExamResultMessage {
  return {
    schemaVersion: '1.0',
    sourceSystem: message.sourceSystem,
    messageType: message.messageType,
    messageControlId: message.messageControlId,
    patient: {
      identifier: message.patientIdentifier,
      name: message.patientName,
    },
    exam: {
      code: message.examCode,
      name: message.examName,
    },
    result: {
      value: message.resultValue,
      unit: message.resultUnit,
    },
    receivedAt: message.receivedAt,
  };
}
