import { describe, expect, it } from 'vitest';
import {
  buildCanonicalImagingNotificationMessage,
  buildConvertedImageObjectStorageKey,
} from './canonical-imaging-notification-message.js';
import type { OrthancStableInstanceNotification } from './orthanc-stable-instance-notification.js';

const notification: OrthancStableInstanceNotification = {
  remoteAet: 'HOSP_PACS_01',
  studyInstanceUid: '1.2.826.0.1.3680043.8.498.1',
  seriesInstanceUid: '1.2.826.0.1.3680043.8.498.2',
  sopInstanceUid: '1.2.826.0.1.3680043.8.498.3',
  orthancInstanceId: 'b866515e-fd9962f4-a43d054d-38596491-79e610ab',
};

describe('buildCanonicalImagingNotificationMessage (BE-07)', () => {
  it('traduz a notificação do gateway para o JSON canônico de domínio, sem vazar o ID interno do Orthanc', () => {
    const canonical = buildCanonicalImagingNotificationMessage({
      notification,
      objectStorageKey: 'imagens-convertidas/1.2.826.0.1.3680043.8.498.3.png',
      contentType: 'image/png',
      convertedAt: '2026-09-04T12:00:00.000Z',
    });

    expect(canonical).toEqual({
      schemaVersion: '1.0',
      remoteAet: 'HOSP_PACS_01',
      dicom: {
        studyInstanceUid: '1.2.826.0.1.3680043.8.498.1',
        seriesInstanceUid: '1.2.826.0.1.3680043.8.498.2',
        sopInstanceUid: '1.2.826.0.1.3680043.8.498.3',
      },
      convertedFile: {
        objectStorageKey: 'imagens-convertidas/1.2.826.0.1.3680043.8.498.3.png',
        contentType: 'image/png',
      },
      convertedAt: '2026-09-04T12:00:00.000Z',
    });
    expect(JSON.stringify(canonical)).not.toContain('orthancInstanceId');
    expect(JSON.stringify(canonical)).not.toContain(notification.orthancInstanceId);
  });
});

describe('buildConvertedImageObjectStorageKey (BE-07)', () => {
  it('usa o SOPInstanceUID como chave (único no universo DICOM — mesma garantia do índice de exam_files, ADR-012)', () => {
    expect(buildConvertedImageObjectStorageKey('1.2.826.0.1.3680043.8.498.3')).toBe(
      'imagens-convertidas/1.2.826.0.1.3680043.8.498.3.png',
    );
  });
});
