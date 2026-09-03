import { MOCK_BRANDING_CONFIG_RAW } from './brandingConfig.mock'
import type { BrandingConfig } from './types'
import { mapRawToBrandingConfig } from './types'

/**
 * *** PONTO DE SINCRONIZAÇÃO COM O BACKEND (mock-aware) ***
 *
 * `TASK.md` §4.1: o Frontend não espera a implementação real do Backend
 * terminar — implementa contra um mock e integra de fato assim que o
 * endpoint estiver publicado em `API-CONTRACT.yaml`. Neste caso específico,
 * o endpoint de `BRANDING_CONFIG` (BE-32, `TASK.md` §3.7) **ainda nem existe**
 * no contrato (não é só "implementação real pendente") — por isso, ao
 * contrário do fluxo normal (mock derivado do contrato publicado), aqui o
 * mock é derivado diretamente do schema já definido em `SDD.md`/ADR-011, que
 * é o que a API vai expor quando publicada.
 *
 * Esta função é o único ponto de troca quando BE-32 publicar o endpoint real:
 * substituir o corpo por uma chamada ao client HTTP (FE-22) contra o
 * endpoint publicado, mantendo a mesma assinatura
 * `() => Promise<BrandingConfig>` para não exigir mudança em
 * `useBrandingTokens`/`BrandTokensProvider`.
 *
 * FE-01 está `Concluída` (decisão do orquestrador, `TASK.md` §3.10 — Fase 0
 * sem dependência cruzada, §4.4) mesmo com esta função ainda mock-aware; a
 * troca pelo endpoint real quando BE-32 for publicado é ajuste pontual aqui,
 * não reabertura de FE-01 (QA-REPORT.md, ressalva registrada em 2026-09-02).
 */
export async function fetchBrandingConfig(): Promise<BrandingConfig> {
  return fetchBrandingConfigMock()
}

/** Implementação mock, exportada separadamente para ser testável de forma isolada. */
export async function fetchBrandingConfigMock(): Promise<BrandingConfig> {
  return mapRawToBrandingConfig(MOCK_BRANDING_CONFIG_RAW)
}
