// Interface pública de `src/imaging-gateway/` (BE-07, `TASK.md`) —
// Anti-Corruption Layer entre o Imaging Gateway (Orthanc, ADR-003/
// ADR-012) e o domínio do core. Mesma disciplina de barrel único dos
// demais diretórios (`src/integration-engine/`, `src/object-storage/`) —
// só o que precisa ser consumido de fora deste diretório é reexportado
// aqui.
export { ImagingGatewayModule } from './imaging-gateway.module.js';
export { ImagingGatewayController } from './imaging-gateway.controller.js';
export { CoreImagingIngestPlaceholderController } from './core-imaging-ingest-placeholder.controller.js';
export { ImagingGatewayAclService, type ConvertedPreviewImage } from './imaging-gateway-acl.service.js';
export { ImagingConversionProcessor } from './imaging-conversion.processor.js';
export {
  parseOrthancStableInstanceNotification,
  parseOrthancStableInstanceNotificationFromJobData,
  type OrthancStableInstanceNotification,
} from './orthanc-stable-instance-notification.js';
export {
  buildCanonicalImagingNotificationMessage,
  buildConvertedImageObjectStorageKey,
  type CanonicalImagingNotificationMessage,
} from './canonical-imaging-notification-message.js';
export {
  loadImagingGatewayConfig,
  type ImagingGatewayConfig,
} from './imaging-gateway-config.js';
export { IMAGING_CONVERSION_QUEUE_NAME } from './imaging-gateway.tokens.js';
