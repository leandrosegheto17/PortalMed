export interface TermsContent {
  /** Corresponde a `TERMS_VERSION.versao` (`SDD.md` §5) — repassado a `registrationApi.ts`
   * para compor o registro de consentimento (RN-02, `CONSENT_RECORD` referencia a versão aceita). */
  version: string
  termsOfUseText: string
  privacyPolicyText: string
}

/**
 * *** PONTO DE SINCRONIZAÇÃO COM O BACKEND (mock-aware) — pendência real ***
 *
 * TL-05 (`UX-SPEC.md` §2/§4) carrega o texto de Termos de Uso/Política de
 * Privacidade a partir de `TERMS_VERSION` (RF-12/BE-19, `TASK.md` §3.3,
 * status "A Fazer" nesta data) — nenhum `API-CONTRACT.yaml` publicado no
 * repositório até o momento desta implementação, mesma situação de
 * `patientLookupApi.ts`/FE-06.
 *
 * Diferente do CPF (que depende de um hospital piloto ainda não escolhido,
 * Premissa P1, sem nenhuma fonte de dado plausível para simular), o texto de
 * Termos/Política de Privacidade **não** depende de nenhuma integração
 * externa — é conteúdo estático do próprio produto/jurídico. Por isso este
 * mock retorna um texto placeholder plausível com uma versão fixa
 * (`'1.0.0'`), suficiente para exercitar de verdade os estados de
 * carregamento/erro/sucesso de TL-05 (`UX-SPEC.md` §4) sem depender do
 * endpoint real — diferente do mock de CPF (sempre otimista, nunca falha de
 * verdade em produção), o estado de erro daqui é só simulável via injeção de
 * dependência em teste (mesmo padrão de `lookupPatientByCpf`), já que este
 * mock em si nunca rejeita.
 *
 * Troca pelo endpoint real (quando BE-19 publicar `API-CONTRACT.yaml`) é um
 * ajuste pontual aqui, mantendo a mesma assinatura `() => Promise<TermsContent>`
 * — não reabre a composição de tela de FE-07.
 */
export async function fetchActiveTerms(): Promise<TermsContent> {
  return {
    version: '1.0.0',
    termsOfUseText:
      'Ao utilizar o Portal de Resultados de Exames, você concorda com estes Termos de Uso, ' +
      'que regulam o acesso a laudos, imagens e demais funcionalidades disponibilizadas pelo ' +
      'hospital. O uso da plataforma pressupõe a leitura integral deste documento e da Política ' +
      'de Privacidade vinculada. (Conteúdo definitivo a ser fornecido pela área jurídica do ' +
      'hospital antes do go-live — texto placeholder para fins de implementação e teste.)',
    privacyPolicyText:
      'Esta Política de Privacidade descreve como seus dados pessoais, incluindo dados de saúde, ' +
      'são coletados, armazenados e utilizados pela plataforma, em conformidade com a Lei Geral ' +
      'de Proteção de Dados (LGPD). O tratamento de dados de saúde exige consentimento específico ' +
      'e destacado, separado deste aceite geral, conforme Art. 11, I da LGPD. (Conteúdo definitivo ' +
      'a ser fornecido pela área jurídica do hospital antes do go-live — texto placeholder para ' +
      'fins de implementação e teste.)',
  }
}
