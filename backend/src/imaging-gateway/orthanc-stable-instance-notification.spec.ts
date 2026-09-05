import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  parseOrthancStableInstanceNotification,
  parseOrthancStableInstanceNotificationFromJobData,
} from './orthanc-stable-instance-notification.js';

const VALID_NOTIFICATION = {
  remoteAet: 'HOSP_PACS_01',
  studyInstanceUid: '1.2.826.0.1.3680043.8.498.1',
  seriesInstanceUid: '1.2.826.0.1.3680043.8.498.2',
  sopInstanceUid: '1.2.826.0.1.3680043.8.498.3',
  orthancInstanceId: 'b866515e-fd9962f4-a43d054d-38596491-79e610ab',
};

describe('parseOrthancStableInstanceNotification (BE-07)', () => {
  it('aceita um envelope válido e devolve exatamente os 5 campos esperados', () => {
    expect(parseOrthancStableInstanceNotification(VALID_NOTIFICATION)).toEqual(VALID_NOTIFICATION);
  });

  it('rejeita corpo que não é um objeto', () => {
    expect(() => parseOrthancStableInstanceNotification('string')).toThrow(BadRequestException);
    expect(() => parseOrthancStableInstanceNotification(null)).toThrow(BadRequestException);
    expect(() => parseOrthancStableInstanceNotification([1, 2, 3])).toThrow(BadRequestException);
  });

  it.each(Object.keys(VALID_NOTIFICATION))(
    'rejeita quando o campo obrigatório "%s" está ausente',
    (field) => {
      const { [field]: _omitted, ...incomplete } = VALID_NOTIFICATION;
      expect(() => parseOrthancStableInstanceNotification(incomplete)).toThrow(BadRequestException);
    },
  );

  it('rejeita quando um campo obrigatório está vazio', () => {
    expect(() =>
      parseOrthancStableInstanceNotification({ ...VALID_NOTIFICATION, remoteAet: '' }),
    ).toThrow(BadRequestException);
  });

  it('rejeita quando um campo obrigatório tem tipo errado', () => {
    expect(() =>
      parseOrthancStableInstanceNotification({ ...VALID_NOTIFICATION, sopInstanceUid: 123 }),
    ).toThrow(BadRequestException);
  });
});

describe('parseOrthancStableInstanceNotificationFromJobData (BE-07)', () => {
  it('aplica a mesma validação sobre o job.data já enfileirado pelo BullMQ', () => {
    expect(parseOrthancStableInstanceNotificationFromJobData(VALID_NOTIFICATION)).toEqual(
      VALID_NOTIFICATION,
    );
  });

  it('rejeita job.data incompleto (defesa em profundidade — job antigo de payload divergente)', () => {
    expect(() => parseOrthancStableInstanceNotificationFromJobData({})).toThrow(BadRequestException);
  });
});
