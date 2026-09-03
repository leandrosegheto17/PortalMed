import type { RawBrandingConfigDTO } from './types'

/**
 * Fixture local de `BRANDING_CONFIG` (formato `SDD.md` Seção 5 / ADR-011).
 *
 * *** MOCK — aguardando API real ***
 * O endpoint real de leitura de `BRANDING_CONFIG` é responsabilidade de
 * `TASK.md` BE-32 (Backend — Config de Tenant/Branding), que ainda não foi
 * implementado nem publicado em `API-CONTRACT.yaml` (situação confirmada em
 * 2026-09-02: BE-32 está muito mais adiante no backlog do que FE-01). Como o
 * endpoint **nem existe ainda no contrato**, e FE-01 é uma tarefa de Fase 0
 * (fundação do design system, sem dependência cruzada com o Backend nesta
 * fase — `TASK.md` §4.4), esta fixture representa o formato já definido em
 * `SDD.md`/ADR-011 para permitir a implementação do mecanismo de consumo
 * (nunca hardcoded) sem bloquear.
 *
 * Cor de marca escolhida deliberadamente com luminância intermediária (nem
 * claramente clara, nem claramente escura) para exercitar de verdade a regra
 * de contraste dinâmico em ambiente de desenvolvimento/demo.
 */
export const MOCK_BRANDING_CONFIG_RAW: RawBrandingConfigDTO = {
  id: '11111111-1111-4111-8111-111111111111',
  tenant_id: '22222222-2222-4222-8222-222222222222',
  logo_url: 'https://cdn.example.com/hospital-piloto/logo.svg',
  paleta_cores: JSON.stringify({ primary: '#2E7D32' }),
  status_validacao_contraste: 'aprovado',
  metodo_validacao: 'automatizado',
  validado_por: '33333333-3333-4333-8333-333333333333',
  validado_em: '2026-08-15T14:00:00Z',
  observacoes_validacao: null,
}
