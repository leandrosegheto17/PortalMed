import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * BE-07 (`TASK.md`) — utilitário **só de teste** (não é config-as-code de
 * produção, por isso vive em `test/`, diferente de
 * `backend/imaging-gateway/`) para gerar um arquivo DICOM Part 10 mínimo
 * porém válido e enviá-lo via C-STORE **real** contra o Orthanc — mesma
 * disciplina de "nenhum mock de infraestrutura real" já aplicada por
 * BE-02 a BE-06/BE-08. Em vez de implementar o protocolo DICOM (upper
 * layer/PDUs) à mão no processo de teste (fora de escopo — mesmo gap de
 * especialização em imagem médica já registrado no Gate 1, e o próprio
 * ADR-003 já rejeitou "construir parser/protocolo DICOM próprio" para o
 * core; o mesmo racional se aplica a ferramental de teste), usa o
 * toolkit de mercado `dcm4che` (`json2dcm`/`storescu`, mesmo espírito de
 * usar NextGen Connect em vez de um parser HL7 próprio, ADR-002) via
 * `docker run` — cada chamada aqui sobe um container efêmero e o remove
 * ao final (`--rm`).
 */
export const DICOM_TOOLS_IMAGE = 'dcm4che/dcm4che-tools:5.35.1';

export interface MinimalDicomInstanceDescriptor {
  studyInstanceUid: string;
  seriesInstanceUid: string;
  sopInstanceUid: string;
}

/**
 * UID DICOM é uma sequência de componentes **numéricos** separados por
 * ponto (nunca hexadecimal/UUID) — gera um sufixo aleatório só com
 * dígitos para compor um UID de teste sintaticamente válido (raiz
 * `1.2.826.0.1.3680043.8.498.` é a mesma raiz de teste usada durante a
 * validação empírica manual desta implementação, documentada em
 * `backend/docs/imaging-gateway.md`).
 */
export function buildRandomTestDicomUid(): string {
  const digits = Array.from({ length: 24 }, () => Math.floor(Math.random() * 10)).join('');
  return `1.2.826.0.1.3680043.8.498.${digits}`;
}

export function buildRandomMinimalDicomInstanceDescriptor(): MinimalDicomInstanceDescriptor {
  return {
    studyInstanceUid: buildRandomTestDicomUid(),
    seriesInstanceUid: buildRandomTestDicomUid(),
    sopInstanceUid: buildRandomTestDicomUid(),
  };
}

/** Modelo JSON DICOM (PS3.18 Annex F) do menor dataset válido o suficiente para o Orthanc aceitar via C-STORE e gerar uma prévia PNG real. */
export function buildMinimalSecondaryCaptureDicomJson({
  studyInstanceUid,
  seriesInstanceUid,
  sopInstanceUid,
}: MinimalDicomInstanceDescriptor): Record<string, unknown> {
  return {
    '00080016': { vr: 'UI', Value: ['1.2.840.10008.5.1.4.1.1.7'] }, // SOPClassUID — Secondary Capture Image Storage
    '00080018': { vr: 'UI', Value: [sopInstanceUid] },
    '00080060': { vr: 'CS', Value: ['OT'] }, // Modality
    '00100010': { vr: 'PN', Value: [{ Alphabetic: 'PORTALMED^TESTE' }] },
    '00100020': { vr: 'LO', Value: ['BE07TEST'] },
    '0020000D': { vr: 'UI', Value: [studyInstanceUid] },
    '0020000E': { vr: 'UI', Value: [seriesInstanceUid] },
    '00200013': { vr: 'IS', Value: ['1'] },
    '00280002': { vr: 'US', Value: [1] }, // SamplesPerPixel
    '00280004': { vr: 'CS', Value: ['MONOCHROME2'] },
    '00280010': { vr: 'US', Value: [2] }, // Rows
    '00280011': { vr: 'US', Value: [2] }, // Columns
    '00280100': { vr: 'US', Value: [8] }, // BitsAllocated
    '00280101': { vr: 'US', Value: [8] }, // BitsStored
    '00280102': { vr: 'US', Value: [7] }, // HighBit
    '00280103': { vr: 'US', Value: [0] }, // PixelRepresentation
    '7FE00010': { vr: 'OB', InlineBinary: 'AGD/AA==' }, // PixelData — 2x2, 8-bit
  };
}

/**
 * Gera um arquivo `.dcm` (Part 10, Explicit VR Little Endian) a partir do
 * modelo JSON acima, via `json2dcm` do dcm4che. Devolve o caminho do
 * arquivo gerado (dentro de um diretório temporário criado por esta
 * função).
 */
export async function generateTestDicomFile(
  descriptor: MinimalDicomInstanceDescriptor,
): Promise<{ dir: string; filePath: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), 'portalmed-be07-dicom-'));
  const jsonPath = path.join(dir, 'instance.json');
  const dcmPath = path.join(dir, 'instance.dcm');

  await writeFile(jsonPath, JSON.stringify(buildMinimalSecondaryCaptureDicomJson(descriptor)));

  await execFileAsync('docker', [
    'run',
    '--rm',
    '-v',
    `${dir}:/data`,
    DICOM_TOOLS_IMAGE,
    'bash',
    '-c',
    '/opt/dcm4che/bin/json2dcm -f -t 1.2.840.10008.1.2.1 -j /data/instance.json -o /data/instance.dcm',
  ]);

  return { dir, filePath: dcmPath };
}

export interface SendDicomViaStoreScuInput {
  /** Nome da rede Docker (`testcontainers` `Network`) onde o Orthanc está acessível pelo alias de rede. */
  networkName: string;
  /** AE Title local do Orthanc (Called AE Title) — o alvo do C-STORE. */
  calledAet: string;
  /** Alias de rede do container do Orthanc (ex.: "orthanc") — resolvido via DNS interno da rede Docker. */
  calledHost: string;
  calledPort: number;
  /** AE Title de origem (Calling AE Title) — vira o `RemoteAET` que o Orthanc registra (ADR-012). */
  callingAet: string;
  filePath: string;
}

/** Envia o arquivo DICOM via C-STORE real (`storescu`, dcm4che) contra o Orthanc, na mesma rede Docker. */
export async function sendDicomViaStoreScu({
  networkName,
  calledAet,
  calledHost,
  calledPort,
  callingAet,
  filePath,
}: SendDicomViaStoreScuInput): Promise<void> {
  const dir = path.dirname(filePath);
  const fileName = path.basename(filePath);

  await execFileAsync('docker', [
    'run',
    '--rm',
    '--network',
    networkName,
    '-v',
    `${dir}:/data`,
    DICOM_TOOLS_IMAGE,
    'bash',
    '-c',
    `/opt/dcm4che/bin/storescu -c ${calledAet}@${calledHost}:${calledPort} -b ${callingAet} /data/${fileName}`,
  ]);
}
