export interface PatientLookupResult {
  found: boolean
}

/**
 * *** PONTO DE SINCRONIZAÇÃO COM O BACKEND (mock-aware) — pendência real ***
 *
 * Cobre a segunda metade do critério de aceite de RF-15/RN-01
 * (`PRD-TECNICO.md`): "WHEN o CPF informado não é localizado como paciente do
 * hospital na integração THE SYSTEM SHALL bloquear o cadastro..." — depende
 * do match de CPF contra o cadastro do paciente no sistema RIS/HIS do
 * hospital piloto via Integration Gateway (RF-14/BE-06), exposto ao Frontend
 * por BE-18 (`TASK.md` §3.4, status "A Fazer" nesta data).
 *
 * Diferente do mock de `BRANDING_CONFIG` (FE-01, `design-system/branding/brandingApi.ts`):
 * - Lá, o endpoint (BE-32) também não existia ainda em `API-CONTRACT.yaml`,
 *   mas havia um schema completo e estável em `SDD.md`/ADR-011 para derivar
 *   uma fixture fiel.
 * - Aqui não existe **nenhum** `API-CONTRACT.yaml` publicado no projeto até o
 *   momento desta implementação, e mais importante: não existe nenhuma fonte
 *   de dado plausível para simular "pacientes reais do hospital piloto" —
 *   isso depende do RIS/HIS de um hospital que sequer foi escolhido ainda
 *   (Premissa P1, `PRD-TECNICO.md` §6.1/§9). Inventar uma lista fixa de CPFs
 *   "válidos" criaria uma falsa sensação de cobertura desta regra de negócio
 *   específica, sem nenhum lastro real.
 *
 * Por isso este mock é deliberadamente **otimista**: sempre resolve
 * `{ found: true }`, isto é, hoje nenhum paciente real é de fato barrado por
 * "CPF não localizado" ao usar a aplicação — apenas pela regra de maioridade
 * (RN-01), que é 100% cliente e não depende disto (ver `ageValidation.ts`).
 *
 * O estado de erro TL-04 (CPF não localizado, `UX-SPEC.md`) **é** implementado
 * e coberto por teste automatizado na tela consumidora
 * (`CadastroDadosPessoaisPage.test.tsx`), injetando uma implementação
 * alternativa desta mesma função (mesmo padrão de injeção de dependência já
 * usado por `useBrandingTokens`/FE-01, prop `fetchFn`) — não pode ser
 * desencadeado de verdade pela UI em produção hoje, só simulado em teste.
 *
 * FE-06 está `Concluída` (decisão do orquestrador, `TASK.md` §3.11 — mesmo
 * princípio de FE-01/§4.4: mecanismo testável via injeção de dependência é
 * suficiente, causa raiz é premissa de negócio não resolvida, não lacuna de
 * implementação) mesmo com este módulo ainda mock-aware; a troca pelo
 * endpoint real quando BE-18 publicar `API-CONTRACT.yaml` é ajuste pontual
 * aqui, mantendo a mesma assinatura `(cpf: string) => Promise<PatientLookupResult>`,
 * não reabertura de FE-06 (QA-REPORT.md, QA-DEBT-011).
 */
export async function lookupPatientByCpf(_cpf: string): Promise<PatientLookupResult> {
  return { found: true }
}
