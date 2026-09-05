import type { OrthancStableInstanceNotification } from './orthanc-stable-instance-notification.js';

/**
 * JSON canônico de domínio deste projeto para uma imagem convertida vinda
 * do Imaging Gateway — o formato com o qual o core (BE-38, tarefa futura)
 * trabalha exclusivamente, nunca com o ID interno proprietário do Orthanc
 * (ADR-012 já decidiu: `EXAM_FILE` guarda os UIDs DICOM padrão, não o ID
 * de recurso do Orthanc). Esta é a fronteira real da Anti-Corruption Layer
 * do lado imagem: tradução do vocabulário do gateway (RemoteAET + ID
 * interno) para o vocabulário de domínio do projeto (UIDs DICOM +
 * referência ao arquivo já convertido no Object Storage).
 *
 * `schemaVersion` fixo em `'1.0'` desde já — mesmo raciocínio de
 * versionamento de payload já aplicado a `CanonicalExamResultMessage`
 * (BE-06) e ao hash chain de auditoria (`TASK.md` §1.4/SPK-05).
 */
export interface CanonicalImagingNotificationMessage {
  schemaVersion: '1.0';
  /** `RemoteAET` nativo do Orthanc — BE-38 casa contra `dicom_remote_ae_title` (ADR-012). */
  remoteAet: string;
  dicom: {
    studyInstanceUid: string;
    seriesInstanceUid: string;
    sopInstanceUid: string;
  };
  convertedFile: {
    /** Chave no Object Storage (BE-08) do JPEG/PNG já convertido — nunca o binário em si neste payload. */
    objectStorageKey: string;
    contentType: string;
  };
  /** Momento em que a conversão/upload concluiu (ISO 8601) — não é o horário do C-STORE original. */
  convertedAt: string;
}

export interface BuildCanonicalImagingNotificationMessageInput {
  notification: OrthancStableInstanceNotification;
  objectStorageKey: string;
  contentType: string;
  convertedAt: string;
}

export function buildCanonicalImagingNotificationMessage({
  notification,
  objectStorageKey,
  contentType,
  convertedAt,
}: BuildCanonicalImagingNotificationMessageInput): CanonicalImagingNotificationMessage {
  return {
    schemaVersion: '1.0',
    remoteAet: notification.remoteAet,
    dicom: {
      studyInstanceUid: notification.studyInstanceUid,
      seriesInstanceUid: notification.seriesInstanceUid,
      sopInstanceUid: notification.sopInstanceUid,
    },
    convertedFile: {
      objectStorageKey,
      contentType,
    },
    convertedAt,
  };
}

/**
 * Convenção de chave do Object Storage (BE-08) para a imagem convertida —
 * decisão de detalhe do Backend (nenhum artefato de origem fixa este
 * valor, mesmo espírito de `TASK.md` §1.7): `SOPInstanceUID` é
 * garantidamente único em todo o universo DICOM (mesma garantia já
 * aplicada ao índice único parcial de `exam_files.dicom_sop_instance_uid`,
 * BE-02/ADR-012) e 1 instância DICOM convertida = 1 `EXAM_FILE` — por
 * isso é a chave natural, sem precisar de nenhum identificador adicional
 * gerado por esta tarefa.
 */
export function buildConvertedImageObjectStorageKey(sopInstanceUid: string): string {
  return `imagens-convertidas/${sopInstanceUid}.png`;
}
