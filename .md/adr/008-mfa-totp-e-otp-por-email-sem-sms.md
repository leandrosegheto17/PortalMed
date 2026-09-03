# ADR-008: Implementar MFA via TOTP (RFC 6238) e OTP por E-mail, sem Dependência de SMS

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect
- **Tags**: architecture, security, authentication

## Contexto e Problema

RF-03 eleva MFA a Must-have inegociável (R3, risco LGPD sobre dado de saúde
sensível), sem especificar o método técnico do segundo fator. O BA já
registrou uma interpretação de detalhe (`PRD-TECNICO.md`, Seção 7.2) de que o
MVP usa e-mail (OTP) e/ou aplicativo autenticador (TOTP), não SMS — porque SMS
depende de um provedor externo que o próprio `PRD.md` classifica como fora do
MVP (RF-S01, Release 2). Cabe ao Software Architect decidir a realização
técnica concreta desse mecanismo (biblioteca/padrão), não redefinir o método.

## Decision Drivers

- RN-03: MFA obrigatório, sem exceção, para todo perfil (paciente,
  administrador, suporte) — o mecanismo escolhido precisa ser viável para
  todos os perfis, não só para o paciente.
- RF-03: "código válido por um período limitado" — TOTP (RFC 6238) já é
  desenhado para isso nativamente (janela de 30 segundos); OTP por e-mail
  precisa de expiração explícita (5 minutos, valor sugerido pelo BA).
- RF-03: caminho de recuperação assistida via suporte quando o paciente perde
  acesso ao segundo fator — o mecanismo escolhido não pode depender de um
  único fator sem fallback operacional.
- Não introduzir dependência de provedor de SMS não orçado/priorizado no MVP
  (RF-S01 é Release 2).

## Considered Options

- **TOTP (RFC 6238) exclusivo**, via aplicativo autenticador (Google
  Authenticator, Authy, etc.)
- **OTP por e-mail exclusivo**, código de uso único enviado ao e-mail
  cadastrado
- **TOTP como método primário + OTP por e-mail como fallback**, sem SMS

## Decision Outcome

Opção escolhida: **"TOTP como método primário + OTP por e-mail como
fallback"**, porque cobre o requisito de MFA sem exceção (RN-03) mesmo para o
paciente que não tem/não quer instalar um aplicativo autenticador — OTP por
e-mail sempre funciona como caminho alternativo, dado que e-mail já é
credencial de cadastro obrigatória (RF-01/RF-15). TOTP é padrão aberto (RFC
6238), sem custo de provedor externo por envio (diferente de SMS/e-mail
transacional), reduzindo custo operacional recorrente. A implementação usa
biblioteca padrão RFC 6238 (ex.: `otplib`/`speakeasy` no ecossistema Node.js,
ADR-005), sem necessidade de serviço terceirizado para o fator TOTP em si.

### Positive Consequences

- Cobre RN-03 (MFA sem exceção para todo perfil) sem introduzir dependência
  de provedor de SMS não priorizado.
- TOTP não gera custo recorrente por verificação (ao contrário de SMS/e-mail
  transacional para cada login) — reduz custo operacional de longo prazo.
- OTP por e-mail como fallback garante que nenhum paciente fica bloqueado só
  por não ter aplicativo autenticador instalado.

### Negative Consequences

- OTP por e-mail depende da disponibilidade do provedor de e-mail transacional
  — se o provedor cair, o fallback também cai (mitigação parcial: paciente
  ainda pode usar TOTP se já configurado; ver Seção 6 do `SDD.md`, risco de
  disponibilidade).
- TOTP exige que o paciente instale um aplicativo autenticador — fricção de
  onboarding maior que SMS para parte do público (idosos, menor familiaridade
  digital, já um risco de acessibilidade sinalizado por RNF-06/RNF-16); OTP
  por e-mail mitiga, mas não elimina essa fricção.
- Recuperação de acesso ao segundo fator (RF-03, "perde o acesso ao segundo
  fator") não tem self-service no MVP — depende de verificação manual via
  suporte (RF-16), o que é operacionalmente mais custoso que um fluxo
  automatizado, aceito conscientemente pelo próprio PRD-TECNICO.md como
  escopo de Release 2+.

## Pros and Cons of the Options

### TOTP + OTP por e-mail (fallback) ✅ Chosen

- ✅ Sem custo recorrente de SMS
- ✅ Cobre todo perfil sem exceção (RN-03)
- ✅ Fallback garante que ausência de app autenticador não bloqueia acesso
- ❌ Fricção de onboarding do TOTP para parte do público
- ❌ Fallback por e-mail depende de provedor externo

### TOTP exclusivo

- ✅ Sem custo recorrente, sem dependência de provedor externo por envio
- ❌ Paciente sem aplicativo autenticador fica bloqueado — incompatível com
  RN-03 (sem exceção) combinado com o público-alvo (inclui pacientes idosos,
  RNF-06)

### OTP por e-mail exclusivo

- ✅ Nenhuma fricção de instalação de aplicativo
- ❌ Depende 100% da disponibilidade do provedor de e-mail para todo login —
  ponto único de falha mais crítico do que o modelo combinado

## Links

- `SDD.md`, Seções 3 e 7
- `PRD-TECNICO.md`, RF-03, RN-03
- `PRD-TECNICO.md`, Seção 7.2 (interpretação do BA sobre método de MFA)
