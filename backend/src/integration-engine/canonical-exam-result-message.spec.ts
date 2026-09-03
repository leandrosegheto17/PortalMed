import { describe, expect, it } from 'vitest';
import { toCanonicalExamResultMessage } from './canonical-exam-result-message.js';
import type { EngineNormalizedMessage } from './engine-normalized-message.js';

const ENGINE_MESSAGE: EngineNormalizedMessage = {
  messageType: 'ORU^R01',
  messageControlId: 'MSG00001',
  sourceSystem: 'LIS',
  patientIdentifier: '123456789',
  patientName: 'SILVA JOAO',
  examCode: 'GLU',
  examName: 'GLICOSE',
  resultValue: '95',
  resultUnit: 'mg/dL',
  receivedAt: '2026-09-03T20:55:09.362Z',
};

/**
 * BE-06 (`TASK.md`) — a tradução real da Anti-Corruption Layer: do
 * vocabulário externo (campos HL7 já extraídos pela engine) para o
 * vocabulário de domínio deste projeto (paciente/exame/resultado).
 */
describe('toCanonicalExamResultMessage', () => {
  it('traduz o envelope da engine para o JSON canônico de domínio (schemaVersion 1.0)', () => {
    expect(toCanonicalExamResultMessage(ENGINE_MESSAGE)).toEqual({
      schemaVersion: '1.0',
      sourceSystem: 'LIS',
      messageType: 'ORU^R01',
      messageControlId: 'MSG00001',
      patient: { identifier: '123456789', name: 'SILVA JOAO' },
      exam: { code: 'GLU', name: 'GLICOSE' },
      result: { value: '95', unit: 'mg/dL' },
      receivedAt: '2026-09-03T20:55:09.362Z',
    });
  });
});
