import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { parseEngineNormalizedMessage } from './engine-normalized-message.js';

const VALID_ENVELOPE = {
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
 * BE-06 (`TASK.md`) — validação do envelope publicado pela Integration
 * Engine (`POST /internal/integration-engine/messages`). Nenhum campo
 * ausente/vazio é aceito silenciosamente (mesma filosofia de
 * `parsePositiveInt`/`parseStrictBoolean`, `src/config/parse-env.ts`).
 */
describe('parseEngineNormalizedMessage', () => {
  it('aceita um envelope válido com todos os campos e devolve exatamente os mesmos valores', () => {
    expect(parseEngineNormalizedMessage(VALID_ENVELOPE)).toEqual(VALID_ENVELOPE);
  });

  it.each([null, undefined, 'string', 42, ['array']])(
    'rejeita corpo que não é um objeto: %s',
    (body) => {
      expect(() => parseEngineNormalizedMessage(body)).toThrow(BadRequestException);
    },
  );

  it.each(Object.keys(VALID_ENVELOPE))(
    'rejeita quando o campo obrigatório "%s" está ausente',
    (field) => {
      const { [field]: _omitted, ...rest } = VALID_ENVELOPE;
      expect(() => parseEngineNormalizedMessage(rest)).toThrow(
        new RegExp(field),
      );
    },
  );

  it.each(Object.keys(VALID_ENVELOPE))(
    'rejeita quando o campo obrigatório "%s" está vazio',
    (field) => {
      expect(() =>
        parseEngineNormalizedMessage({ ...VALID_ENVELOPE, [field]: '' }),
      ).toThrow(new RegExp(field));
    },
  );

  it('rejeita quando um campo obrigatório não é string (ex.: número)', () => {
    expect(() =>
      parseEngineNormalizedMessage({ ...VALID_ENVELOPE, resultValue: 95 }),
    ).toThrow(/resultValue/);
  });

  it('lista todos os campos ausentes de uma vez, não só o primeiro', () => {
    expect(() => parseEngineNormalizedMessage({})).toThrow(
      /messageType.*messageControlId.*sourceSystem/s,
    );
  });
});
