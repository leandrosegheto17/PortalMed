/**
 * Tipos do módulo de branding dinâmico (Camada 1, UX-SPEC.md §3.3).
 *
 * `RawBrandingConfigDTO` espelha a entidade `BRANDING_CONFIG` do `SDD.md`
 * (Seção 5) e ADR-011 — é o formato que a API real (BE-32, ainda não
 * publicada em `API-CONTRACT.yaml`) deve retornar quando existir. Mantido
 * separado do tipo interno (`BrandingConfig`) para que uma mudança de forma
 * na API (ex.: nomes em `snake_case`) não vaze para o resto do design system —
 * só `mapRawToBrandingConfig` precisa mudar.
 */
export interface RawBrandingConfigDTO {
  id: string
  tenant_id: string
  logo_url: string
  /**
   * JSON serializado (`SDD.md` Seção 5: `BRANDING_CONFIG.paleta_cores` é
   * `string`). Contém ao menos a cor primária de marca — outras chaves podem
   * ser adicionadas pelo Backend sem quebrar este parser (campos
   * desconhecidos são ignorados).
   */
  paleta_cores: string
  status_validacao_contraste: 'pendente' | 'aprovado' | 'reprovado'
  metodo_validacao: 'automatizado' | 'manual' | 'ambos' | null
  validado_por: string | null
  validado_em: string | null
  observacoes_validacao: string | null
}

/** Forma interna, tipada, consumida pelo design system (`applyBrandTokens`). */
export interface BrandingConfig {
  tenantId: string
  logoUrl: string
  colorPrimary: string
  /** Repassado para permitir que a UI trate configuração ainda não aprovada (ADR-011/Guardrail G.29) de forma explícita, se necessário. */
  statusValidacaoContraste: RawBrandingConfigDTO['status_validacao_contraste']
}

export class InvalidBrandingConfigError extends Error {
  constructor(reason: string) {
    super(`BRANDING_CONFIG inválido: ${reason}`)
    this.name = 'InvalidBrandingConfigError'
  }
}

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/**
 * Converte o DTO bruto (formato de API/`SDD.md`) para o tipo interno tipado,
 * validando o mínimo necessário para a regra de contraste dinâmico funcionar
 * (cor primária precisa ser um hex válido). Ponto único de mapeamento — ao
 * trocar o mock pelo endpoint real (BE-32), só este arquivo (e `brandingApi.ts`)
 * muda, não o restante do design system.
 */
export function mapRawToBrandingConfig(raw: RawBrandingConfigDTO): BrandingConfig {
  let parsedPalette: unknown
  try {
    parsedPalette = JSON.parse(raw.paleta_cores)
  } catch {
    throw new InvalidBrandingConfigError(
      `paleta_cores não é um JSON válido: "${raw.paleta_cores}"`,
    )
  }

  const colorPrimary =
    typeof parsedPalette === 'object' &&
    parsedPalette !== null &&
    'primary' in parsedPalette
      ? (parsedPalette as { primary: unknown }).primary
      : undefined

  if (typeof colorPrimary !== 'string' || !HEX_COLOR_PATTERN.test(colorPrimary)) {
    throw new InvalidBrandingConfigError(
      `paleta_cores.primary ausente ou não é um hex válido: ${JSON.stringify(colorPrimary)}`,
    )
  }

  if (!raw.logo_url) {
    throw new InvalidBrandingConfigError('logo_url ausente')
  }

  return {
    tenantId: raw.tenant_id,
    logoUrl: raw.logo_url,
    colorPrimary,
    statusValidacaoContraste: raw.status_validacao_contraste,
  }
}
