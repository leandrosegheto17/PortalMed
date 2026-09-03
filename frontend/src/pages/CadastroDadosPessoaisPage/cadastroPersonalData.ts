/**
 * Dados pessoais coletados em TL-02 (`CadastroDadosPessoaisPage`, FE-06),
 * repassados via `location.state` do `react-router-dom` para as telas
 * seguintes do fluxo de cadastro (TL-05 → TL-06 → TL-07, FE-07) — nenhuma
 * store global foi introduzida para isso, desproporcional ao escopo de FE-07
 * (4 dp); `location.state` é mecanismo nativo do roteador já em uso no
 * projeto desde FE-05.
 *
 * Tipo extraído para um módulo próprio (em vez de definido inline em
 * `CadastroDadosPessoaisPage.tsx`) para ser importável pelas telas de FE-07
 * sem criar uma dependência de teste/implementação inteira daquele
 * componente — só o formato do dado.
 *
 * Todo consumidor downstream (`CadastroTermosConsentimentoPage`,
 * `CadastroDefinirSenhaPage`) trata este dado como **opcional**
 * (`Partial`/`| undefined`): navegação direta por URL (sem passar por TL-02)
 * ou um `location.state` vazio em teste não podem quebrar a tela — o dado
 * ausente só significa que o payload final de cadastro (mock,
 * `registrationApi.ts`) fica incompleto, o que já é esperado de um mock.
 */
export interface CadastroPersonalData {
  nome: string
  cpf: string
  dataNascimento: string
  email: string
  celular: string
}
