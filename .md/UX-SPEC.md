# UX-SPEC.md — Portal de Resultados de Exames (Aplicação White Label para Hospitais)

**Dono**: UX/UI
**Data**: 2026-09-02
**Status**: Completo e **liberado para o Tech Lead** — checklist de Critérios de
Pronto ao final deste documento, todos os itens verificados, incluindo a resolução
do único bloqueio aberto durante este trabalho (ver nota abaixo). Publicado para o
Tech Lead (estimativa de esforço) e, como contexto futuro, Frontend/Mobile/QA.
**Input**: `SDD.md` (aprovado no Gate 2 do CTO, **Aprovado com ressalvas**,
2026-09-02, `CTO-REVIEW.md`; releitura pós-resolução do Bloqueio 001 em
2026-09-02, com ADR-011 e nova §7.7) + `PRD-TECNICO.md` (Business Analyst,
2026-09-02) + `PRD.md` Seção 4.1 (PM, escopo do MVP)

> Este é o **primeiro** `UX-SPEC.md` do projeto — não existe design system prévio a
> reaproveitar. Todo componente listado na Seção 3 é, por definição, novo; a marcação
> "novo" é aplicada mesmo assim, explicitamente, componente a componente, para que
> este documento sirva de baseline de design system dela em diante (próximos
> projetos/releases reaproveitam a partir daqui, não a partir do zero de novo).
>
> Durante este trabalho, uma tensão real foi identificada entre experiência
> desejada e restrição técnica (contraste de marca do hospital vs. WCAG 2.1 AA):
> mitigada no nível de componente dentro da autoridade do UX/UI (regra de token de
> design, Seção 3.3), mas com uma lacuna de processo fora dessa autoridade
> (nenhuma validação de contraste do ativo de marca — logo/paleta — antes do
> go-live). Essa lacuna foi escalada ao Software Architect via `BLOCKERS.md`
> (Bloqueio 001), nunca resolvida unilateralmente pelo UX/UI. **O Software
> Architect já resolveu o bloqueio** (ADR-011, `SDD.md` §7.7, campos novos em
> `BRANDING_CONFIG`) — `BLOCKERS.md` marca o Bloqueio 001 como Resolvido. Ver
> Seção 7.2 para a confirmação de que essa resolução não exige nenhuma mudança de
> tela/componente neste documento (gate inteiramente interno ao processo de
> configuração, sem superfície na SPA).

---

## Índice de Telas por Fluxo (referência rápida para o Tech Lead)

| Fluxo (PRD-TECNICO §4) | RFs/RNs cobertos | Telas (ID) |
|---|---|---|
| 4.1 Cadastro de Paciente | RF-15, RF-12, RN-01, RN-02 | TL-01 a TL-07 |
| 4.2 Login com MFA | RF-01, RF-03, RF-04, RN-03, RN-04 | TL-08 a TL-16 |
| 4.3 Recuperação de Senha | RF-02 | TL-17 a TL-20 |
| 4.4 Consulta e Download de Exame | RF-05, RF-06, RF-07, RF-08, RF-10 | TL-21 a TL-24 |
| 4.5 Compartilhamento por Link Temporário | RF-09, RN-06, RN-07 | TL-25 a TL-29 |
| 4.6 Ingestão via Integração LIS/PACS/RIS/HIS | RF-14 | **Nenhuma** — fluxo interno/técnico (hospital → plataforma), sem interface de usuário. Ver nota abaixo. |
| 4.7 Gestão de Usuários (Admin Operacional) | RF-13, RN-04, RNF-11 | TL-30 a TL-33 |
| — (RF-16, transversal, sem diagrama próprio no PRD-TECNICO) | RF-16, RN-13 | TL-34, TL-35 |

**Nota sobre o fluxo 4.6**: conforme o próprio `PRD-TECNICO.md` (§4.6) e o `SDD.md`
(§2.2, diagrama de sequência), este é um fluxo *push* do sistema do hospital para a
plataforma (Integration Gateway/Imaging Gateway), sem paciente ou administrador
envolvido em nenhum passo. O paciente só volta a aparecer no modelo *pull* já coberto
pelo fluxo 4.4 (TL-21). Não há tela a mapear aqui — registrado para rastreabilidade,
não como lacuna.

Telas globais/persistentes (não amarradas a um único fluxo, usadas em todas as
telas autenticadas): Header institucional (branding dinâmico por tenant), Navegação
Principal, Footer institucional. Ver Seção 3.

---

## 1. Fluxos de Tela

### 1.1 Cadastro de Paciente (RF-15, RF-12, RN-01, RN-02)

Mapeamento direto do fluxograma do `PRD-TECNICO.md` §4.1 para telas:

```
TL-01 Landing pública
   │  (ação: "Criar conta")
   ▼
TL-02 Criar Conta – Dados Pessoais
   │  (nome, CPF, data de nascimento, e-mail, celular)
   ▼
[decisão: idade ≥ 18? RN-01]
   │                              │
   │ não                         │ sim
   ▼                              ▼
TL-03 Bloqueio –          [decisão: CPF localizado no
Menor de Idade             hospital via RF-14?]
(fim do fluxo)                    │                │
                                   │ não            │ sim
                                   ▼                ▼
                          TL-04 Erro – CPF    TL-05 Termos de Uso
                          não localizado      e Consentimento LGPD
                          (fim do fluxo)             │
                                          [decisão: aceita consentimento
                                           específico de dado de saúde? RN-02]
                                                      │            │
                                                      │ não        │ sim
                                                      ▼            ▼
                                              (permanece em    TL-06 Definir Senha
                                               TL-05, botão            │
                                               "Concluir" inativo)     ▼
                                                                TL-07 Confirmação
                                                                de Cadastro (sucesso)
                                                                       │
                                                                       ▼
                                                                 redireciona → TL-08 (Login)
```

Pontos de decisão herdados do PRD-TECNICO.md, sem reinterpretação: maioridade
(bloqueio definitivo nesta release, TL-03); localização do paciente no sistema do
hospital (bloqueio até correção presencial, TL-04); consentimento específico de dado
de saúde (bloqueio até aceite, permanece em TL-05).

### 1.2 Login com MFA (RF-01, RF-03, RF-04, RN-03, RN-04)

```
TL-08 Login (usuário/senha)
   │
   ▼
[decisão: credenciais válidas?]
   │                    │
   │ não                │ sim
   ▼                    ▼
[decisão: excedeu    [decisão: MFA já configurado
 limite de           para esta conta?]
 tentativas? RN-04]        │                  │
   │           │           │ não              │ sim
   │ não       │ sim       ▼                  ▼
   ▼           ▼      TL-11 Configuração   TL-13 MFA –
TL-09 Erro   TL-10    de MFA (1º acesso)   Verificação de
Genérico,    Conta         │                Código
volta a      Bloqueada     ▼
TL-08        (fim)    TL-12 MFA – Setup
                       TOTP (QR Code) ou
                       confirmação de
                       e-mail OTP
                            │
                            └──────────────────┘
                                     │
                                     ▼
                    [decisão: código MFA válido dentro do prazo?]
                                 │                    │
                                 │ não                │ sim
                                 ▼                    ▼
                    [decisão: excedeu          TL-08b Sessão criada →
                     tentativas de MFA?]        redireciona → TL-21
                       │            │            (Meus Exames)
                       │ não        │ sim
                       ▼            ▼
                  volta a       TL-10 Conta
                  TL-13,        Bloqueada
                  oferece
                  reenvio
                  (link para
                  TL-14 se
                  "perdi o
                  acesso ao
                  meu segundo
                  fator")
```

Durante a sessão ativa: `TL-15` (aviso de expiração por inatividade, modal
sobreposto a qualquer tela autenticada) pode disparar a qualquer momento; se o
paciente não responde, leva a `TL-16` (sessão expirada). Logout manual (RF-04)
invalida a sessão imediatamente e retorna a `TL-08`, sem passar por `TL-15`/`TL-16`.

`TL-14` (MFA — recuperação assistida) é acessível a partir de `TL-13` quando o
paciente perde acesso ao segundo fator — encaminha para o canal de suporte (RF-16,
`TL-35`), **não** é um self-service de reset (SDD.md §6.2, dívida técnica aceita:
"sem self-service de reset de MFA — depende de verificação manual via suporte").

### 1.3 Recuperação de Senha por E-mail (RF-02)

```
TL-08 Login → link "Esqueci minha senha"
   ▼
TL-17 Esqueci Minha Senha (informa e-mail)
   ▼
[decisão: e-mail existe na base? — resposta do sistema é idêntica nos dois
 casos, por mitigação de enumeração de conta]
   ▼
TL-18 Confirmação de Envio (mensagem genérica, sempre exibida)
   │
   ▼ (paciente clica no link recebido, se o e-mail existir)
[decisão: link dentro do prazo de expiração?]
   │                          │
   │ não                      │ sim
   ▼                          ▼
TL-20 Link Expirado      TL-19 Redefinir Senha (nova senha + confirmação)
(oferece novo envio,          │
volta a TL-17)          [decisão: senha atende política mínima?]
                               │                    │
                               │ não                │ sim
                               ▼                    ▼
                          permanece em TL-19    atualiza senha, invalida
                          com erro de           sessões ativas anteriores,
                          validação inline      redireciona → TL-08 (Login)
                                                 com mensagem de sucesso
```

### 1.4 Consulta e Download de Exame (RF-05, RF-06, RF-07, RF-08, RF-10)

```
TL-21 Meus Exames (lista + filtros por data/tipo/categoria)
   │
   ▼
[decisão: há exames disponíveis?]
   │                    │
   │ não                │ sim
   ▼                    ▼
(estado vazio      paciente aplica filtro (opcional) → lista atualizada
 dentro da           │
 própria TL-21)       ▼
                  paciente seleciona um exame
                       │
                       ▼
              [decisão: tipo de exame]
                  │                    │
                  │ laboratorial/      │ imagem
                  │ anatomopatológico  │
                  ▼                    ▼
           TL-22 Detalhe –      TL-23 Detalhe –
           Laudo (PDF/HTML)     Imagem (JPEG/PNG)
                  │                    │
                  └──────────┬─────────┘
                             ▼
                  [decisão: paciente aciona "baixar"?]
                        │                    │
                        │ não                │ sim
                        ▼                    ▼
                  permanece na       [decisão: regra do hospital
                  tela de detalhe     permite download deste tipo?]
                                          │                  │
                                          │ sim              │ não
                                          ▼                  ▼
                                  gera download,       botão de download
                                  registra evento       oculto/desabilitado
                                  em auditoria (RF-10)  com motivo resumido
```

`TL-24` (Meu Histórico) é acessível a partir da navegação principal em qualquer
momento pós-login — não é um passo sequencial deste fluxo, é uma tela de consulta
paralela que reflete os eventos gerados por TL-22/TL-23/downloads/compartilhamentos
(RF-10).

### 1.5 Compartilhamento por Link Temporário (RF-09, RN-06, RN-07)

```
A partir de TL-22 ou TL-23 → paciente aciona "Compartilhar"
   │
   ▼
[decisão: regra de segurança do hospital permite compartilhar este tipo
 de exame? RN-07]
   │                              │
   │ não                          │ sim
   ▼                              ▼
opção "Compartilhar" não     TL-25 Compartilhar Exame (modal de geração,
aparece na tela de detalhe   confirma qual exame será vinculado ao link)
(nenhuma tela dedicada)            │
                                    ▼
                              TL-26 Link Gerado (URL + prazo de expiração
                              exibido + botão "copiar" + botão "revogar")
                                    │
                                    ├──── evento "link gerado" registrado
                                    │     em auditoria (RF-10, visível em TL-24)
                                    ▼
                              paciente pode acessar TL-27 (Meus Links
                              Compartilhados) a qualquer momento depois,
                              pela navegação, para ver/revogar links ativos
```

Caminho do destinatário (fora da sessão autenticada do paciente):

```
Destinatário abre o link recebido (fora da plataforma, por canal
escolhido pelo próprio paciente — nunca por e-mail enviado pela
plataforma, RN-05/Won't)
   ▼
[decisão: link dentro da validade e não revogado?]
   │                              │
   │ não                          │ sim
   ▼                              ▼
TL-29 Link Expirado          TL-28 Visualização do Destinatário
ou Inválido (nenhum          (exibe **apenas** o exame vinculado
dado do exame exibido)       ao link — nunca a conta do paciente
                              ou outros exames, RN-07)
                                    │
                                    ▼
                              evento "acesso ao link" registrado em
                              auditoria (RF-10), visível ao paciente
                              em TL-24, nunca ao destinatário
```

### 1.6 Gestão de Usuários — Administrador Operacional (RF-13, RN-04, RNF-11)

Fluxo linear, sem ramificação de decisão relevante além do já coberto por RN-04
(desbloqueio) e RNF-11 (isolamento entre hospitais) — mesmo racional do BA em
`PRD-TECNICO.md` §4.7 para não desenhar diagrama de fluxo próprio, mas com telas
mapeadas para estimativa:

```
Admin autentica (reusa TL-08/TL-11 a TL-13, mesmo fluxo de MFA — RN-03
não abre exceção por perfil)
   ▼
TL-31 Painel de Gestão de Usuários (lista de pacientes do próprio
hospital — nunca de outro tenant, RNF-11)
   ▼
Admin seleciona um usuário → TL-32 Detalhe de Usuário / Ações
(consultar, desbloquear, desativar)
   ▼
Ação aplicada → confirmação inline + evento registrado em auditoria
(RF-10), com identificação do administrador responsável
```

`TL-33` (Painel de Auditoria do Hospital) é acessível a partir da navegação
administrativa, em paralelo — mostra os eventos de auditoria do hospital (RF-10),
nunca de outro tenant (RNF-11).

### 1.7 Ajuda e Suporte (RF-16, RN-13)

Fluxo simples, transversal a todas as telas autenticadas e à landing pública:

```
Qualquer tela → link "Ajuda" no footer/navegação
   ▼
TL-34 Central de Ajuda / Manual de Uso (como consultar, baixar,
compartilhar exames; como recuperar senha; como funciona o MFA)
   ▼ (se dúvida não resolvida)
TL-35 Contato de Suporte (canal de contato + horário de atendimento
declarado, RN-13 — sem SLA formal nesta release)
```

---

## 2. Wireframes / Descrição de Layout por Tela

> Layout descrito em blocos funcionais (região → conteúdo), não em pixel exato —
> grid e breakpoint exatos ficam na Seção 6. Todas as telas autenticadas
> compartilham o mesmo Header/Footer (Seção 3.1), omitido na descrição individual
> abaixo para não repetir.

### TL-01 — Landing Pública
- Header: logo do hospital (branding dinâmico, RF-11), nome institucional.
- Bloco central: mensagem de boas-vindas curta, dois CTAs primários — "Entrar" e
  "Criar conta".
- Footer: links institucionais (Termos de Uso, Política de Privacidade, Ajuda).

### TL-02 — Criar Conta – Dados Pessoais
- Formulário de coluna única (RNF-16, usabilidade): nome completo, CPF (com
  máscara e validação de formato), data de nascimento (seletor de data acessível,
  não só texto livre), e-mail, celular.
- Texto de apoio abaixo do campo de data de nascimento explicando o motivo da
  coleta (validação de maioridade, RN-01) — transparência, não só validação
  silenciosa.
- CTA único: "Continuar". Sem submissão parcial.

### TL-03 — Bloqueio – Menor de Idade (RN-01)
- Bloco central único (sem formulário): ícone informativo (não de erro/alerta
  vermelho — é uma regra de negócio, não uma falha do paciente), mensagem clara de
  que o autoatendimento digital está indisponível para menores de idade nesta
  release, orientação objetiva para procurar a recepção do hospital.
- CTA único: "Voltar à página inicial" (retorna a TL-01).
- Sem opção de tentar novamente com outra data — regra é definitiva nesta
  release, conforme RN-01/EXCEPTION ("Nenhuma nesta release").

### TL-04 — Erro – CPF não localizado
- Mesmo padrão visual de TL-03 (bloco central, sem formulário), mas com tom de
  "ação necessária" em vez de "regra definitiva": orienta o paciente a procurar a
  recepção do hospital para verificar seu cadastro no sistema interno (RF-15).
- CTA: "Voltar à página inicial" + link secundário "Já tenho cadastro, entrar"
  (para o caso do paciente ter se enganado e já possuir conta).

### TL-05 — Termos de Uso e Consentimento LGPD (RF-12, RN-02)
- Bloco de texto rolável com Termos de Uso e Política de Privacidade (conteúdo
  completo, não resumo).
- **Dois controles de aceite distintos e visualmente separados** (nunca um único
  checkbox combinado, RN-02/Art. 11, I): (1) "Li e aceito os Termos de Uso e a
  Política de Privacidade"; (2) checkbox destacado (contraste/posição diferenciada,
  não apenas mais um item da lista) — "Autorizo especificamente o tratamento dos
  meus dados de saúde para os fins descritos na Política de Privacidade".
- CTA "Concluir cadastro" permanece desabilitado até os dois aceites — nunca
  apenas visualmente indicado como recomendado, RN-02 é bloqueio real de submit.

### TL-06 — Definir Senha
- Formulário simples: campo de senha + confirmação de senha, com indicador de
  força/política mínima visível antes da tentativa de submissão (não só depois do
  erro).
- CTA: "Criar conta".

### TL-07 — Confirmação de Cadastro (sucesso)
- Mensagem de sucesso + CTA único "Ir para o login" (não login automático — RF-01
  exige autenticação explícita mesmo logo após o cadastro, incluindo MFA).

### TL-08 — Login (usuário/senha)
- Formulário centralizado: e-mail/CPF, senha, CTA "Entrar".
- Link secundário "Esqueci minha senha" (→ TL-17) e "Criar conta" (→ TL-02).
- Área de mensagem de erro reservada acima do formulário (não move o layout ao
  aparecer — relevante para leitor de tela e usuário com baixa visão, Seção 5).

### TL-09 — Erro Genérico (credenciais inválidas)
- Não é tela própria — é um estado de TL-08 (banner de erro inline, mensagem
  genérica "usuário ou senha inválidos", sem indicar qual dos dois está incorreto).

### TL-10 — Conta Bloqueada
- Bloco central: mensagem informando bloqueio temporário por tentativas
  malsucedidas (RN-04), orientação de contato com o suporte (RF-16, → TL-35) para
  desbloqueio — SDD.md não define ainda um fluxo automatizado equivalente ao de
  RF-02 para desbloqueio; enquanto isso não existir, o caminho é sempre suporte
  humano.

### TL-11 — Configuração de MFA (primeiro acesso)
- Exibida uma única vez, logo após o primeiro login bem-sucedido de usuário/senha
  sem MFA configurado ainda.
- Duas opções apresentadas lado a lado (paridade visual, nenhuma pré-selecionada
  como "recomendada" sem justificativa): "Aplicativo autenticador (TOTP)" e
  "Código por e-mail". Texto de apoio explica brevemente a diferença (TOTP não
  depende de internet no momento do login; e-mail não exige instalar app).
- RN-03 aplicado sem exceção: não há opção de "pular" nesta tela.

### TL-12 — MFA – Setup (TOTP ou confirmação de e-mail)
- **Caminho TOTP**: QR code + código alfanumérico alternativo (para quem não pode
  escanear), campo para inserir o primeiro código gerado como confirmação de setup
  bem-sucedido.
- **Caminho e-mail OTP**: mensagem confirmando que um código foi enviado ao e-mail
  cadastrado, campo para inserção do código.
- CTA: "Confirmar" (permanece desabilitado até 6 dígitos preenchidos).

### TL-13 — MFA – Verificação de Código (logins subsequentes)
- Campo único de código (6 dígitos, teclado numérico em mobile), CTA "Verificar".
- Link "Reenviar código" (caminho e-mail) ou "Perdi acesso ao meu segundo fator"
  (→ TL-14, ambos os métodos).
- Contador de expiração do código visível (RF-03, valor a confirmar) — nunca
  hardcoded no texto da tela; consumido de configuração para não exigir mudança de
  UI quando o valor for confirmado (Seção 7).

### TL-14 — MFA – Recuperação Assistida (perda de dispositivo)
- Bloco explicativo: não há reset self-service nesta release; orienta contato com
  suporte técnico (RF-16, → TL-35) com verificação manual de identidade.
- Sem formulário de "prova de identidade" nesta tela — a verificação manual
  acontece no canal de suporte, fora do escopo desta interface (SDD.md §6.2).

### TL-15 — Aviso de Expiração de Sessão (modal)
- Modal sobreposto, não navegação de página inteira — preserva o que o paciente
  estava fazendo.
- Contagem regressiva visível, dois CTAs: "Continuar conectado" (renova sessão,
  RF-04) e "Sair agora".
- Modal deve ser acessível via teclado e anunciado a leitor de tela no momento em
  que aparece (Seção 5, `role="alertdialog"`).

### TL-16 — Sessão Expirada
- Tela de retorno equivalente a TL-08, com uma linha adicional acima do
  formulário: "Sua sessão expirou por inatividade. Entre novamente." — nunca um
  erro genérico indistinguível de falha de credencial.

### TL-17 — Esqueci Minha Senha
- Campo único de e-mail, CTA "Enviar link de redefinição".

### TL-18 — Confirmação de Envio
- Mensagem genérica única, idêntica independentemente do e-mail existir ou não na
  base (mitigação de enumeração de conta, RF-02) — texto do tipo "Se este e-mail
  estiver cadastrado, você receberá um link de redefinição em instantes."

### TL-19 — Redefinir Senha
- Campo de nova senha + confirmação, mesma política/indicador de força de TL-06.
- CTA "Redefinir senha".

### TL-20 — Link Expirado ou Inválido (recuperação de senha)
- Bloco central: mensagem de expiração, CTA "Solicitar novo link" (retorna a
  TL-17 pré-preenchido, se tecnicamente viável).

### TL-21 — Meus Exames (lista + filtros)
- Barra de filtros no topo (categoria: laboratorial | anatomopatológico | imagem;
  período), sempre visível mesmo com lista vazia ou filtrada sem resultado —
  paciente nunca perde o filtro aplicado ao ver "nenhum resultado" (RF-05).
- Lista/tabela de exames ordenada por data (mais recente primeiro), cada item
  mostrando: data, tipo, categoria, status (disponível | em processamento).
- Cada item é clicável, leva a TL-22 ou TL-23 conforme categoria.

### TL-22 — Detalhe de Exame – Laudo (PDF/HTML)
- Cabeçalho da tela: metadados do exame (data, tipo, categoria).
- Corpo: visualizador de PDF/HTML embutido na página (sem exigir download prévio
  para leitura, RF-06).
- Ações: "Baixar" (RF-08, condicional à regra de segurança do hospital) e
  "Compartilhar" (RF-09, condicional à regra de segurança do hospital) — ambos os
  botões, quando indisponíveis pela regra do hospital, são **ocultos** (não
  apenas desabilitados sem explicação), com texto de apoio resumido do motivo,
  visível ao focar/hover no espaço onde a ação estaria (acessível também via
  leitor de tela).

### TL-23 — Detalhe de Exame – Imagem (JPEG/PNG convertida)
- Mesmo cabeçalho de metadados de TL-22.
- Corpo: imagem estática (`<img>` nativo do navegador, não um canvas/visualizador
  proprietário) — **sem controles de zoom/pan/window-level dedicados** nesta
  release (ADR-003/RF-S02 é Release 2). Zoom disponível apenas via recurso nativo
  do navegador/sistema operacional (Ctrl/pinch), não construído pela aplicação.
  Ver Seção 7 para o racional técnico completo desta limitação.
- Texto de apoio abaixo da imagem, sempre visível (não escondido em tooltip):
  "Esta é uma versão da imagem convertida para visualização no navegador.
  Ferramentas avançadas de zoom e ajuste de imagem estarão disponíveis em versão
  futura do portal." — gerencia expectativa em vez de deixar o paciente supor que
  a interação está quebrada.
- Mesmas ações "Baixar"/"Compartilhar" de TL-22, mesmo padrão de exibição
  condicional.

### TL-24 — Meu Histórico (auditoria do paciente)
- Lista cronológica (mais recente primeiro) de eventos: visualização, download,
  geração de link, acesso a link, revogação de link — cada linha com tipo de
  evento, exame relacionado, data/hora.
- Sem ação de edição/exclusão disponível em nenhuma linha (RN-08, log
  append-only) — a ausência de botão de ação aqui é deliberada, não uma lacuna.

### TL-25 — Compartilhar Exame (modal de geração)
- Modal sobre TL-22/TL-23: confirma qual exame será vinculado, exibe o prazo de
  expiração que será aplicado (valor de RN-06, hoje sugerido em 72h — **a
  confirmar**, ver Seção 7; a tela não deve hardcodar "72 horas" em texto fixo
  fora de variável de configuração).
- CTA "Gerar link" / "Cancelar".

### TL-26 — Link Gerado
- Exibe a URL gerada (texto selecionável + botão "Copiar link"), data/hora de
  expiração calculada e exibida em formato absoluto (não só relativo, para
  clareza), botão "Revogar link" sempre visível a partir daqui.
- Texto de apoio reforçando que o link deve ser enviado pelo paciente através do
  canal que ele escolher, fora da plataforma — a plataforma **não envia** o link
  por e-mail em nome do paciente (RN-05/Won't, distinção importante para não
  confundir com TL-18).

### TL-27 — Meus Links Compartilhados
- Lista de links gerados pelo paciente (ativos e expirados/revogados,
  diferenciados visualmente por status), cada um com exame vinculado, data de
  geração, prazo de expiração/status atual, e ação "Revogar" quando ainda ativo.

### TL-28 — Visualização do Destinatário (via link)
- Tela isolada, sem navegação principal do portal (destinatário não é usuário
  autenticado do sistema) — mostra **apenas** o exame vinculado ao link (RN-07):
  mesmo layout de visualização de TL-22/TL-23, sem acesso a "Meus Exames",
  histórico, ou qualquer outra área da conta do paciente.
- Cabeçalho simplificado: identifica que este é um resultado compartilhado, com
  branding do hospital de origem (RF-11) para dar contexto institucional ao
  destinatário, sem expor identidade completa do paciente titular além do
  estritamente necessário para o destinatário confirmar que é o exame certo.

### TL-29 — Link Expirado ou Inválido (destinatário)
- Bloco central único, sem qualquer dado do exame: mensagem "Este link expirou ou
  não é mais válido." — sem distinguir entre expiração natural e revogação manual
  pelo paciente (RN-06/RN-07 não expõem esse detalhe ao destinatário, mitigação de
  vazamento de informação sobre o comportamento do titular).

### TL-30 — Login Administrativo
- Reaproveita integralmente TL-08/TL-11 a TL-13 (mesmo componente de formulário,
  mesmo fluxo de MFA sem exceção por papel, RN-03) — não é uma tela nova, é o
  mesmo componente com o mesmo comportamento, diferindo apenas no destino pós-login
  (RBAC decide o redirecionamento para TL-31 em vez de TL-21).

### TL-31 — Painel de Gestão de Usuários
- Lista/tabela de pacientes do hospital do administrador (nunca de outro tenant,
  RNF-11): nome, CPF (mascarado parcialmente por padrão, com opção de revelar —
  minimização de exposição de dado sensível mesmo para admin), status da conta
  (ativa | bloqueada | desativada).
- Campo de busca/filtro por nome ou CPF.

### TL-32 — Detalhe de Usuário / Ações
- Dados cadastrais básicos + status da conta + histórico de tentativas de login
  relevante para decisão de desbloqueio.
- Ações disponíveis conforme status: "Desbloquear conta" (se bloqueada),
  "Desativar conta" (se ativa) — cada ação com modal de confirmação antes de
  aplicar (ação sensível, RF-13).

### TL-33 — Painel de Auditoria do Hospital
- Mesma estrutura de lista de TL-24, mas em escopo de hospital (todos os
  pacientes do tenant do administrador, RF-10), com filtro por paciente/tipo de
  evento/período.

### TL-34 — Central de Ajuda / Manual de Uso
- Estrutura de FAQ/acordeão (RNF-16, navegação clara): como consultar, baixar,
  compartilhar exames; como recuperar senha; como funciona o MFA.
- Link para TL-35 ao final, para dúvidas não cobertas pelo manual.

### TL-35 — Contato de Suporte
- Canal de contato (a definir tecnicamente pelo Software Architect/Tech Lead —
  e-mail, formulário, telefone) + horário de atendimento declarado (RN-13, dias
  úteis 8h-18h, sugestão a confirmar) exibido de forma explícita — nunca implícito
  ou omitido, para gerenciar expectativa de resposta (sem SLA formal nesta
  release).

---

## 3. Design System e Componentes

> Primeiro `UX-SPEC.md` do projeto — **todo** componente abaixo é novo, marcado
> explicitamente como tal. Nenhum componente reaproveita algo pré-existente porque
> nada existia antes deste documento.

### 3.1 Componentes estruturais (globais)

| Componente | Novo? | Descrição | Usado em |
|---|---|---|---|
| Header institucional | **Novo** | Logo + nome do hospital (fonte: `BRANDING_CONFIG`, SDD.md §5), aplicado dinamicamente por tenant — nunca hardcoded no componente. Altura fixa, contraste do texto sobre o header garantido independente da cor de marca (ver 3.3, regra de contraste). | Todas as telas |
| Navegação Principal (paciente) | **Novo** | Meus Exames \| Meu Histórico \| Ajuda \| Sair | TL-21 a TL-29, TL-34, TL-35 |
| Navegação Principal (administrador) | **Novo** | Gestão de Usuários \| Auditoria \| Ajuda \| Sair | TL-31 a TL-35 |
| Footer institucional | **Novo** | Links: Termos de Uso, Política de Privacidade, Ajuda | Todas as telas |
| Modal de confirmação de ação sensível | **Novo** | Padrão reutilizado em: revogar link (TL-27), desbloquear/desativar conta (TL-32) | TL-27, TL-32 |
| Banner de mensagem inline (erro/sucesso/informação) | **Novo** | Área reservada de layout (não desloca conteúdo ao aparecer) | TL-08, TL-17, TL-19, TL-21 (filtro sem resultado) |

### 3.2 Componentes de formulário

| Componente | Novo? | Descrição |
|---|---|---|
| Campo de texto com máscara (CPF) | **Novo** | Validação de formato inline, mensagem de erro específica |
| Seletor de data acessível (data de nascimento) | **Novo** | Navegável por teclado, não apenas `<input type=date>` sem fallback |
| Campo de senha com indicador de força | **Novo** | Usado em TL-06 e TL-19 |
| Checkbox de aceite padrão vs. Checkbox de consentimento destacado | **Novo** (dois variantes distintos, deliberadamente diferentes visualmente) | O consentimento de dado de saúde (RN-02) usa variante com contraste/moldura diferenciada — nunca o mesmo estilo visual do aceite geral de Termos, para reforçar que é um consentimento separado e específico (Art. 11, I) |
| Campo de código numérico (MFA/OTP) | **Novo** | 6 dígitos, teclado numérico em mobile, auto-avanço entre dígitos com fallback acessível (não depende só de comportamento de mouse) |

### 3.3 Tokens visuais

Divididos em duas camadas — separação deliberada para resolver a tensão entre
identidade de marca do hospital (RF-11, ADR-004) e acessibilidade WCAG 2.1 AA
(RNF-06, inegociável), sem esperar decisão do Software Architect para poder
avançar o design (ver Seção 7 para o detalhe do porquê essa separação existe):

**Camada 1 — Tokens de marca (dinâmicos por tenant, `BRANDING_CONFIG`)**
| Token | Uso permitido | Uso proibido |
|---|---|---|
| `--color-brand-primary` | Cor de fundo do header, cor de destaque em elementos não-textuais grandes (ex.: botão primário — com verificação de contraste de texto sobre ele, ver regra abaixo), logo | Nunca usado como cor de texto de corpo sobre fundo claro/escuro sem checagem de contraste — nunca usado sozinho para transmitir estado (erro/sucesso), que usa Camada 2 |
| `--brand-logo-url` | Header, tela de destinatário de link (TL-28) | — |

**Regra de contraste obrigatória sobre `--color-brand-primary`**: todo texto
renderizado sobre a cor de marca (ex.: texto do botão primário) deve ser calculado
dinamicamente entre branco e um tom de texto escuro fixo do sistema, escolhendo
automaticamente o que atinge relação de contraste ≥ 4.5:1 (WCAG 2.1 AA, texto
normal) contra a cor de marca configurada — nunca um valor de cor de texto
hardcoded assumindo que a marca será sempre clara ou sempre escura. Esta é uma
regra de componente, aplicável a qualquer paleta de hospital que entrar depois do
piloto, não um ajuste manual por tenant.

**Camada 2 — Tokens de sistema (fixos, independentes de tenant, já verificados
WCAG 2.1 AA)**
| Token | Valor de referência | Uso |
|---|---|---|
| `--color-text-primary` | Neutro escuro (contraste ≥ 4.5:1 sobre `--color-bg-default`) | Corpo de texto padrão |
| `--color-bg-default` | Neutro claro | Fundo padrão de página |
| `--color-success` | Verde acessível (não depende só de cor — sempre acompanhado de ícone/texto, ver Seção 5) | Confirmações (TL-07, TL-26) |
| `--color-error` | Vermelho acessível (idem, nunca só cor) | Erros (TL-09, TL-19 inválido) |
| `--color-warning` | Âmbar acessível (idem) | Avisos (TL-15, expiração de sessão) |
| `--color-info` | Azul neutro do sistema | Mensagens informativas (TL-18, TL-04) |
| `--font-family-base` | Fonte de sistema/web font com bom suporte a leitura prolongada | Todo texto |
| `--spacing-*` | Escala de 4/8/16/24/32px | Espaçamento consistente entre blocos |
| `--radius-*` | Escala de 4/8px | Cantos de botões/cards/modais |

### 3.4 Tabela de rastreabilidade — telas × componentes novos

Cada tela lista apenas os componentes **de formulário/interação específicos**
adicionais aos estruturais (Seção 3.1, presentes em toda tela autenticada) e de
formulário (Seção 3.2) já cobertos acima — evita repetir os mesmos componentes
genéricos em cada entrada de tela da Seção 2.

| Tela | Componente novo específico |
|---|---|
| TL-12 | Exibição de QR code + código alfanumérico alternativo |
| TL-15 | Modal de contagem regressiva com `role="alertdialog"` |
| TL-21 | Barra de filtros persistente + lista/tabela de exames com status |
| TL-22/TL-23 | Visualizador de documento embutido (PDF/HTML) e imagem estática (`<img>`), com botões de ação condicionalmente ocultos |
| TL-26/TL-27 | Componente de exibição/cópia de URL + status de link (ativo/expirado/revogado) |
| TL-31/TL-33 | Tabela com busca/filtro administrativo, CPF mascarado com opção de revelar |

---

## 4. Estados de Tela (vazio, carregando, erro, sucesso)

> Toda tela com dado dinâmico tem os 4 estados especificados. Telas puramente
> estáticas (ex.: TL-03, TL-04, TL-09, TL-10, TL-16, TL-18, TL-20, TL-29, TL-34) são
> elas mesmas um estado único de "resultado" (não têm um ciclo de carregamento de
> dado do próprio paciente) — marcadas abaixo como "não aplicável" com o porquê,
> conforme guardrail deste agente.

| Tela | Vazio | Carregando | Erro | Sucesso |
|---|---|---|---|---|
| TL-02 (Cadastro – dados) | N/A — formulário sempre começa vazio por natureza, não é um "estado vazio" de dado carregado | Spinner no botão "Continuar" durante validação de CPF via RF-14 | Erro de validação inline por campo (CPF inválido, e-mail mal formatado) | Avança para próxima etapa do fluxo (TL-03/TL-04/TL-05 conforme decisão) |
| TL-05 (Termos e consentimento) | N/A | Skeleton do bloco de texto enquanto `TERMS_VERSION` carrega | Falha ao carregar termos: mensagem de erro + botão "Tentar novamente", sem permitir prosseguir sem o texto carregado (não pode haver aceite sem conteúdo visível) | Avança para TL-06 |
| TL-06 (Definir senha) | N/A | Spinner no botão durante criação da conta | Erro de política de senha inline | Avança para TL-07 |
| TL-08 (Login) | N/A | Spinner no botão "Entrar" | TL-09 (erro genérico) ou TL-10 (bloqueio) conforme caso | Avança para MFA (TL-11 ou TL-13) |
| TL-12/TL-13 (MFA setup/verificação) | N/A | Spinner ao validar código | Código inválido/expirado: mensagem inline, permite nova tentativa dentro do limite (RN-04) | Sessão criada, redireciona a TL-21 (ou TL-31, se admin) |
| TL-17 (Esqueci senha) | N/A | Spinner no botão "Enviar" | Erro de formato de e-mail inline (validação de formato, não de existência — não revela se e-mail existe) | Avança para TL-18 |
| TL-19 (Redefinir senha) | N/A | Spinner no botão "Redefinir" | Política de senha não atendida (inline) ou link expirado durante a própria submissão (→ TL-20) | Redireciona a TL-08 com mensagem de sucesso |
| TL-21 (Meus Exames) | Estado vazio explicativo dedicado quando não há exames ("Você ainda não tem exames disponíveis no portal.") — nunca tratado como erro (RF-05) | Skeleton da lista enquanto consulta exames sincronizados | Falha ao carregar lista: mensagem de erro + "Tentar novamente" (RNF-10 registra o incidente, sem detalhe técnico exposto) | Lista renderizada, ordenada por data |
| TL-21 (filtro aplicado) | "Nenhum exame encontrado para este filtro", filtro permanece visível para ajuste (RF-05) | Skeleton da lista durante reaplicação do filtro | Mesmo tratamento de erro acima | Lista filtrada renderizada |
| TL-22 (Detalhe – Laudo) | N/A — exame já foi selecionado de uma lista não vazia | "Resultado em processamento" (estado dedicado, não erro genérico, RF-06) enquanto laudo ainda não foi recebido; skeleton do visualizador enquanto o PDF/HTML já disponível carrega | "Não foi possível exibir este laudo no momento" (renderização falhou — arquivo corrompido/formato inesperado), sem detalhe técnico exposto, incidente registrado (RNF-10) | Laudo renderizado dentro do portal |
| TL-23 (Detalhe – Imagem) | N/A | "Imagem em processamento" (estado dedicado, RF-07) enquanto conversão DICOM→JPEG/PNG não concluiu; skeleton enquanto imagem já convertida carrega | Falha de conversão: mensagem "Não foi possível carregar esta imagem no momento", incidente registrado e equipe de suporte notificada (RF-07/RNF-10), sem bloquear o restante da lista de exames do paciente | Imagem exibida |
| TL-24 (Meu Histórico) | Estado vazio ("Nenhum evento registrado ainda") quando conta é nova, sem eventos ainda | Skeleton da lista | Falha ao carregar histórico: mensagem de erro + "Tentar novamente" | Lista cronológica renderizada |
| TL-25 (Compartilhar – modal) | N/A | Spinner no botão "Gerar link" | Falha ao gerar link (ex.: regra de segurança recusa no momento da geração): mensagem inline, modal permanece aberto | Avança para TL-26 |
| TL-26 (Link gerado) | N/A | N/A — resultado imediato da ação anterior | Falha ao copiar link (raro, mas coberto): feedback textual alternativo (link selecionável manualmente) | Link exibido + confirmação visual ao copiar |
| TL-27 (Meus Links) | Estado vazio ("Você ainda não compartilhou nenhum exame") | Skeleton da lista | Falha ao carregar/revogar: mensagem de erro inline | Lista renderizada / revogação confirmada |
| TL-28 (Visualização destinatário) | N/A | Skeleton do visualizador de documento/imagem | Mesmo tratamento de TL-22/TL-23 (renderização), mais o caso específico de TL-29 (validade do token, tratado como tela própria) | Exame exibido ao destinatário |
| TL-31 (Gestão de usuários) | Estado vazio (hospital piloto sem pacientes cadastrados ainda — cenário real só no dia 1 pós-go-live) | Skeleton da tabela | Falha ao carregar lista: mensagem de erro + "Tentar novamente" | Tabela renderizada |
| TL-32 (Detalhe/ações admin) | N/A | Spinner no botão de ação (desbloquear/desativar) | Falha ao aplicar ação: mensagem inline, estado da conta não é alterado até confirmação de sucesso | Confirmação inline + evento em auditoria |
| TL-33 (Auditoria do hospital) | Estado vazio ("Nenhum evento registrado ainda para este hospital") | Skeleton da lista | Falha ao carregar: mensagem de erro + "Tentar novamente" | Lista renderizada |
| TL-03, TL-04, TL-09, TL-10, TL-16, TL-18, TL-20, TL-29, TL-34 | N/A — não aplicável | N/A — não aplicável | Justificativa única: estas são, cada uma, o próprio estado de "resultado" (bloqueio/erro/confirmação/informação) do fluxo que as antecede; não carregam dado dinâmico próprio além da mensagem fixa que já as define — não existe um "carregando" ou "vazio" intermediário porque a tela inteira é o desfecho de uma decisão já tomada na tela anterior | A "tela" em si é o estado de sucesso/confirmação/aviso correspondente ao seu propósito (ex.: TL-18 é o estado de sucesso do fluxo de recuperação de senha até aquele ponto) |

---

## 5. Requisitos de Acessibilidade (WCAG 2.1 AA)

> RNF-06 classifica WCAG 2.1 AA como Must-have, motivado por público que inclui
> pacientes idosos/com deficiência — tratado aqui como critério de aceite por tela,
> não como revisão posterior. Regras transversais primeiro, depois pontos
> específicos por tela onde há risco elevado de violação.

### 5.1 Regras transversais (aplicam-se a todas as 35 telas)

- **Contraste de texto**: mínimo 4.5:1 para texto normal, 3:1 para texto grande
  (≥ 18pt ou 14pt bold), conforme critério 1.4.3 — cobre tanto os tokens de sistema
  (Seção 3.3, Camada 2, já verificados) quanto qualquer uso de token de marca
  (Camada 1, com a regra de contraste dinâmico já descrita).
- **Navegação por teclado**: todo elemento interativo (botão, link, campo,
  checkbox, item de lista clicável) alcançável e operável via `Tab`/`Enter`/`Espaço`,
  com indicador de foco visível (critério 2.4.7) — nunca `outline: none` sem
  substituto visível equivalente.
- **Estado nunca comunicado só por cor**: erro, sucesso, aviso e status (ex.:
  "ativa"/"bloqueada" em TL-31, "expirado"/"ativo" em TL-27) sempre acompanhados de
  ícone e/ou texto, nunca só de uma cor (critério 1.4.1) — relevante em particular
  para os tokens `--color-error`/`--color-success`/`--color-warning` da Seção 3.3.
- **Rótulos de formulário**: todo campo com `<label>` associado de forma
  programática, não apenas `placeholder` como único identificador (critério 1.3.1,
  4.1.2) — cobre TL-02, TL-05 (checkboxes), TL-06, TL-08, TL-13, TL-17, TL-19,
  TL-25.
- **Mensagens de erro anunciadas**: erros inline (banners, validação de campo)
  usam `aria-live="polite"` (ou `assertive` para bloqueios como TL-10) para serem
  anunciados a leitor de tela sem exigir navegação manual até o erro (critério
  4.1.3).
- **Tamanho de alvo de toque**: botões e controles interativos com área mínima de
  toque adequada (critério 2.5.5, alvo AAA mas aplicado aqui como boa prática
  reforçada dado o público idoso citado no RNF-06) — relevante em especial para
  TL-13 (campo de código MFA) e TL-31/TL-32 (ações administrativas).
- **Texto redimensionável**: layout não quebra até 200% de zoom de texto do
  navegador (critério 1.4.4) — relevante em particular para TL-22 (visualizador de
  laudo) e TL-23 (imagem), que já dependem de zoom nativo do navegador em vez de
  controle proprietário (ver Seção 7), reforçando que o zoom nativo do navegador
  precisa funcionar sem quebra de layout ao redor da imagem/documento.

### 5.2 Pontos específicos de maior risco por tela

| Tela | Ponto de atenção WCAG | Tratamento definido |
|---|---|---|
| TL-05 (Termos e consentimento) | Dois checkboxes de aceite lado a lado podem confundir leitor de tela sobre qual é "o específico" (RN-02) | Cada checkbox tem `aria-label`/texto associado explícito e distinto, não apenas diferenciação visual — a distinção precisa existir também na árvore de acessibilidade, não só no CSS |
| TL-11/TL-12 (MFA setup) | QR code é inerentemente inacessível a leitor de tela | Código alfanumérico alternativo sempre exibido lado a lado com o QR code (não escondido atrás de "problemas para escanear?"), como caminho primário equivalente, não secundário escondido |
| TL-13 (Verificação de código MFA) | Campo de 6 dígitos com auto-avanço entre caixas é um padrão comum, mas frequentemente quebra leitor de tela/navegação por teclado se mal implementado | Auto-avanço é reforço opcional de UX, nunca a única forma de preencher — colar o código completo em qualquer uma das caixas deve funcionar; navegação por `Tab`/`Backspace` entre caixas testada explicitamente |
| TL-15 (Aviso de expiração de sessão) | Modal que aparece sem ação do usuário pode não ser percebido por leitor de tela se não for anunciado corretamente | `role="alertdialog"` + foco movido automaticamente para o modal ao aparecer + foco devolvido ao ponto de origem ao fechar (critério 2.4.3, ordem de foco) |
| TL-21 (Meus Exames — filtros) | Filtro aplicado via clique/toque precisa ser percebido também por quem usa leitor de tela | Resultado da lista filtrada anunciado via `aria-live="polite"` (ex.: "3 exames encontrados para o filtro Imagem") |
| TL-22 (Laudo PDF/HTML) | Documento embutido pode não ser navegável por teclado/leitor de tela dependendo do visualizador escolhido pelo Frontend | Requisito não-negociável a carregar para a fase de implementação: o componente de visualização de PDF/HTML escolhido pelo Frontend Developer deve suportar navegação por teclado e leitura por leitor de tela do conteúdo — critério de aceite a validar em `accessibility-review` novamente na fase de QA, não é decisão fechável só nesta especificação |
| TL-23 (Imagem JPEG/PNG) | Imagem médica sem texto alternativo descritivo é uma barreira de acessibilidade grave, mesmo sendo uma imagem clínica sem "descrição" textual óbvia | `alt` text padronizado com metadados do exame (tipo, data, categoria) — nunca `alt=""` ou vazio; texto de apoio visível (Seção 2, TL-23) também funciona como contexto textual complementar à imagem, não é decorativo |
| TL-25/TL-26 (Compartilhamento) | Data/hora de expiração comunicada só em formato relativo ("expira em 3 dias") pode ser ambígua para leitor de tela/usuário com deficiência cognitiva | Sempre exibir também o formato absoluto (data e hora completas), nunca só o relativo, reforçado na Seção 2 |
| TL-31/TL-32 (Painel admin) | Tabela densa de dados (lista de pacientes) é área comum de falha de acessibilidade se não usar semântica de tabela correta | `<table>` semântica com `<th scope="col">`, não `<div>` estilizada como tabela; ação de "revelar CPF" anunciada como toggle de estado (`aria-pressed`), não só troca visual |

---

## 6. Comportamento Responsivo

RNF-07 confirma: web responsiva (desktop + mobile via navegador), sem aplicativo
nativo (Won't, fora do escopo). Aplicável a **todas** as 35 telas — nenhuma exceção
"não aplicável" neste projeto, dado que o produto não é API-only.

### 6.1 Breakpoints (proposta do UX/UI — a validar tecnicamente com Tech Lead/Frontend na fase de implementação, RNF-14 também deixa compatibilidade de navegador como "a confirmar")

| Breakpoint | Largura | Uso |
|---|---|---|
| Mobile | até 599px | Layout de coluna única em todas as telas, navegação principal colapsada em menu (hambúrguer ou barra inferior — decisão de detalhe do Frontend Developer dentro deste princípio) |
| Tablet | 600px–1023px | Coluna única ou duas colunas conforme densidade de conteúdo da tela (ex.: TL-31 pode usar mais largura para a tabela) |
| Desktop | ≥ 1024px | Layout completo, navegação principal sempre visível (não colapsada) |

### 6.2 Regras específicas por grupo de tela

- **Formulários (TL-02, TL-05, TL-06, TL-08, TL-13, TL-17, TL-19, TL-25)**: sempre
  coluna única em qualquer breakpoint — formulário de múltiplas colunas em telas
  largas é decisão deliberadamente evitada aqui, reduz erro de preenchimento e
  favorece o público idoso citado no RNF-06, mesmo em desktop.
- **Listas/tabelas densas (TL-21, TL-24, TL-27, TL-31, TL-33)**: em mobile,
  colapsam de tabela para lista de cards (um "card" por linha, com os mesmos dados
  em formato empilhado) — nunca uma tabela com scroll horizontal forçado como
  única solução, que é uma barreira de usabilidade/acessibilidade comum em mobile.
- **Visualizador de documento/imagem (TL-22, TL-23, TL-28)**: em mobile, ocupa a
  largura total disponível da tela (menos padding mínimo), com ações
  ("Baixar"/"Compartilhar") reposicionadas para barra fixa inferior em vez de
  cabeçalho, para não exigir rolagem até o topo depois de ler o documento inteiro.
- **Modal de expiração de sessão (TL-15)** e **modais de confirmação (TL-27,
  TL-32)**: em mobile, ocupam a tela inteira (não um modal centralizado pequeno com
  fundo escurecido) — mais fácil de interagir em tela pequena, mesmo padrão de
  `role="alertdialog"` mantido.
- **QR code (TL-12)**: tamanho mínimo garantido mesmo em mobile (não encolhe
  proporcionalmente ao ponto de ficar ilegível para a câmera do celular escanear) —
  requisito funcional, não só estético, já que o próprio paciente normalmente
  escaneia o QR code com o mesmo celular em que está usando o portal (implica
  necessidade de o paciente ter dois dispositivos, ou usar um segundo navegador/
  aba — nota de usabilidade a validar com o hospital piloto quando P1 for
  resolvida, não um problema desta especificação resolver sozinha).

---

## 7. Restrições Técnicas Aplicadas e Conflitos Sinalizados ao Software Architect

### 7.1 Restrições do `SDD.md` já incorporadas ao desenho (checadas via
`technical-constraint-check`, sem conflito)

| Restrição (SDD.md) | Onde impacta o UX-SPEC | Tratamento |
|---|---|---|
| ADR-003 — imagens convertidas para JPEG/PNG no MVP, sem visualizador DICOM nativo (zoom/pan/window-level) | TL-23, TL-28 | Imagem exibida como `<img>` estático, zoom apenas via navegador/SO nativo, texto de apoio explícito gerenciando expectativa (Seção 2). Nenhuma promessa de interação que só existe em RF-S02 (Release 2) |
| ADR-004 — multi-tenancy lógica, branding por `BRANDING_CONFIG`, sem self-service (RN-10) | Header institucional (3.1), tokens de marca (3.3) | Branding tratado como dado de configuração consumido dinamicamente pelo frontend, nunca hardcoded por hospital; nenhuma tela de "configurar minha marca" desenhada nesta release, conforme RN-10 |
| ADR-007 — sessão server-side revogável via Redis, expiração por inatividade (RF-04) | TL-15, TL-16 | Aviso de expiração com opção de renovar (chamada de "manter sessão viva" é tecnicamente compatível com sessão revogável — só atualiza `ultima_atividade`, não contorna a revogabilidade); logout invalida token imediatamente, refletido como estado imediato, não otimista |
| ADR-008 — MFA via TOTP + OTP e-mail, sem SMS (RN-03) | TL-11, TL-12, TL-13 | Nenhuma tela desenhada para SMS. TOTP e e-mail apresentados com paridade visual (nenhum forçado como único caminho), mitigando parcialmente a fricção de onboarding que o próprio ADR-008 já reconhece como trade-off aceito |
| RNF-11/RN-09 — isolamento de dados entre hospitais | TL-31, TL-33 | Toda tela administrativa desenhada já pressupõe escopo de dado limitado ao tenant do administrador logado — nenhuma tela expõe seletor de "trocar de hospital" ou visão cross-tenant |
| RF-14 — modelo *pull*, sem notificação proativa de novo resultado (interpretação registrada do BA, PRD-TECNICO §7.3) | TL-21 | Nenhuma tela/estado de "notificação de novo exame" foi desenhado — paciente precisa acessar ativamente "Meus Exames"; consistente com a ausência de RF de notificação no MVP |
| Valores de parâmetro "a confirmar" (RN-04 tentativas, RF-04 timeout, RF-03 janela de código, RN-06 prazo de link) | TL-10, TL-13, TL-15, TL-25, TL-26 | Nenhuma tela hardcoda o valor numérico no texto fixo de UI — todos consumidos como variável de configuração exibida dinamicamente, para não exigir retrabalho de tela quando o Software Architect/DevSecOps confirmar os valores finais |
| ADR-011 (novo, pós-Gate 2) — gate obrigatório de validação de contraste WCAG 2.1 AA em `BRANDING_CONFIG` (`SDD.md` §7.7), checagem automatizada de `paleta_cores` + checklist manual de `logo_url`, ambos executados pela equipe interna via utilitário/script interno, nunca por um serviço exposto ou tela da SPA | Nenhuma — confirmado sem impacto de tela/componente | Gate roda inteiramente fora da aplicação voltada a paciente/administrador (RN-10 continua sem self-service). Nenhum estado novo de tela foi necessário — ver Seção 7.2 para o detalhamento de por que isso não gera tela nem estado de erro/pendência em nenhuma tela já especificada |

### 7.2 Ponto sinalizado — contraste de marca do hospital vs. WCAG 2.1 AA

**Natureza da tensão**: RF-11/ADR-004 estabelecem que a identidade visual do
hospital (logo, paleta de cores) é aplicada via configuração feita pela equipe
interna do projeto, sem painel self-service nesta release (RN-10) — ou seja, **não
existe hoje, no `SDD.md`, uma etapa de validação automática ou manual de que a
paleta de cores configurada para um hospital atenda ao contraste mínimo exigido
por RNF-06 (WCAG 2.1 AA)** antes de ir para produção.

**O que o UX/UI resolveu dentro da própria autoridade** (não é o conflito em si,
é a mitigação de design possível sem mudança de arquitetura): a separação de
tokens em Camada 1 (marca, dinâmica) e Camada 2 (sistema, fixa e já verificada
WCAG AA) descrita na Seção 3.3, combinada com a regra de contraste calculado
dinamicamente para texto sobre `--color-brand-primary`, garante que **o
componente em si** nunca produzirá uma combinação de contraste inválida,
independente da cor de marca configurada — o sistema escolhe automaticamente
texto claro ou escuro sobre a cor de marca recebida.

**O que permanece como lacuna de processo, fora da autoridade do UX/UI**: essa
regra de componente não impede, por si só, um cenário onde a **própria cor de
marca escolhida pelo hospital**, usada como fundo de área grande de texto de
identidade (ex.: nome do hospital sobre o logo, se o hospital fornecer um logo
com texto embutido de baixo contraste interno), viole WCAG de outra forma que a
regra de token não cobre — porque não há, hoje, nenhuma etapa formal no processo
de configuração de `BRANDING_CONFIG` (equipe interna, RN-10) que valide
contraste antes do go-live do piloto.

**Sinalização formal ao Software Architect** (via `technical-constraint-check`,
não decidido unilateralmente pelo UX/UI): recomenda-se que o processo operacional
de configuração de `BRANDING_CONFIG` pela equipe interna inclua uma checagem de
contraste (manual ou automatizada) do logo/paleta do hospital antes do go-live,
como pré-requisito de aceite daquela configuração — no momento da entrega inicial
deste documento, o `SDD.md` (§5, §7) não mencionava esse passo. Este ponto não
bloqueou a entrega deste `UX-SPEC.md` (a regra de token de design já mitiga o
risco no nível de componente), mas foi registrado formalmente. **Ação tomada**:
entrada aberta em `BLOCKERS.md` (Bloqueio 001), escalada a `software-architect`,
não resolvida unilateralmente pelo UX/UI.

**Resolução (Software Architect, 2026-09-02)** — `BLOCKERS.md` Bloqueio 001 marcado
`Resolvido`: o Software Architect formalizou a lacuna como decisão técnica em
**ADR-011**, com gate híbrido obrigatório em `SDD.md` §7.7 — checagem automatizada
(fórmula de contraste WCAG 2.1) sobre `paleta_cores` contra os tokens fixos do
sistema (esta Seção 3.3), **mais** checklist manual obrigatório de revisão visual
de `logo_url` (cobre o cenário que a checagem automática não alcança: texto de
baixo contraste embutido na própria imagem do logo). A entidade `BRANDING_CONFIG`
ganhou os campos `status_validacao_contraste`, `metodo_validacao`, `validado_por`,
`validado_em`, `observacoes_validacao` (rastreabilidade de quem validou, quando e
como). O gate bloqueia go-live de qualquer hospital com configuração não aprovada
(`status_validacao_contraste != 'aprovado'`).

**Avaliação do UX/UI sobre impacto neste `UX-SPEC.md`**: **nenhuma tela ou estado
novo é necessário.** Três motivos, todos verificados diretamente em `SDD.md` §7.7
e no próprio ADR-011:
1. A checagem automatizada de paleta roda como "utilitário determinístico
   (script/CLI interno, não um serviço novo exposto)" — nunca uma tela da SPA.
2. O checklist manual de logo é executado por "um membro da equipe interna"
   como revisão operacional — não há usuário do portal (paciente ou
   administrador operacional do hospital) envolvido nesse passo, e RN-10 permanece
   sem alteração (branding continua não-self-service nesta release). Não existe,
   portanto, nenhuma tela de "configuração de branding" no escopo deste
   `UX-SPEC.md` para receber um estado de "reprovado"/"pendente" — essa tela nunca
   existiu porque a experiência não é exposta a nenhum usuário final.
3. O gate é bloqueante *antes* do go-live (`status_validacao_contraste !=
   'aprovado'` impede a configuração de ir a produção) — por construção, nenhum
   paciente ou administrador jamais acessa o portal de um hospital com
   `BRANDING_CONFIG` reprovado ou pendente, porque esse hospital simplesmente
   ainda não está live. Não há, portanto, nenhum cenário em tempo de execução em
   que TL-01 (Header institucional) ou qualquer outra tela precise tratar um
   estado de branding inválido — a Camada 1 de tokens (Seção 3.3) sempre recebe,
   por definição do gate, uma configuração já aprovada.

Nenhum ajuste em telas, estados (Seção 4) ou componentes (Seção 3) foi necessário
em decorrência desta resolução. O único ajuste feito neste documento foi
documentar a resolução aqui e na tabela da Seção 7.1, para que o Tech Lead veja o
fechamento do ciclo, não apenas a tensão original.

### 7.3 Ponto sinalizado — QR code de MFA em dispositivo único

Registrado na Seção 6.2 (TL-12): se o paciente acessa o portal e configura o MFA
TOTP a partir do mesmo único celular em que instalaria o aplicativo autenticador,
o fluxo de "escanear QR code na própria tela" pressupõe dois dispositivos (ou duas
janelas/abas). Isso não é uma restrição do `SDD.md` em si (ADR-008 não entra
nesse nível de detalhe), mas é um risco de usabilidade real para parte do público
(paciente com um único dispositivo, sem acesso a desktop). **Não é tratado como
bloqueio nem como sinalização formal ao Software Architect neste momento** —
código alfanumérico alternativo (Seção 5.2) já mitiga parcialmente (paciente pode
digitar o código manualmente no app autenticador em vez de escanear), e o volume
real desse cenário só será conhecido com o hospital piloto real (Premissa P1,
ainda não resolvida). Registrado aqui para rastreabilidade, não como conflito
ativo.

---

## Checklist de Critérios de Pronto (UX/UI)

- [x] Todo fluxo do `PRD-TECNICO.md` (§4.1 a §4.5, §4.7) tem tela(s) correspondente(s)
      mapeada(s) — TL-01 a TL-35 (Seção 1, Índice de Telas). O fluxo §4.6 (ingestão
      via integração) é interno/técnico, sem tela, e está registrado explicitamente
      como tal, não como lacuna.
- [x] Todo fluxo de tela tem os 4 estados especificados (vazio, carregando, erro,
      sucesso), ou está marcado "não aplicável" com o porquê (Seção 4 — 9 telas
      estáticas de resultado/desfecho marcadas "N/A" com justificativa explícita,
      todas as demais com os 4 estados definidos)
- [x] Todo componente novo está sinalizado como tal (Seção 3) — neste caso, **todos**
      os componentes, por ser o primeiro `UX-SPEC.md` do projeto, sem design system
      prévio a reaproveitar
- [x] Toda tela passou por `accessibility-review` sem pendência crítica aberta
      (Seção 5) — regras transversais aplicadas às 35 telas, mais 9 pontos
      específicos de maior risco tratados individualmente; o único item deixado como
      critério de aceite a validar na implementação (componente de visualização de
      PDF/HTML acessível, TL-22) está marcado explicitamente como tal, não como
      pendência silenciosa
- [x] Comportamento responsivo definido para todo fluxo relevante (Seção 6) —
      aplicável a todas as 35 telas, produto não é API-only
- [x] Toda restrição técnica do `SDD.md` foi checada via `technical-constraint-check`
      (Seção 7.1, oito restrições mapeadas — sete sem conflito, uma delas o próprio
      ADR-011 pós-resolução, também sem conflito/impacto de tela) e todo conflito
      encontrado está sinalizado ao Software Architect, não resolvido por conta
      própria (Seção 7.2 — contraste de marca vs. WCAG, registrado em
      `BLOCKERS.md` Bloqueio 001, **hoje Resolvido**)
- [x] Nenhuma das 7 seções está vazia ou com placeholder

**Veredito do UX/UI**: `UX-SPEC.md` pronto e **liberado para o Tech Lead** como
especificação completa. Seções já eram consumíveis incrementalmente desde a
publicação inicial deste documento. O único bloqueio aberto durante este trabalho
(`BLOCKERS.md` Bloqueio 001, contraste de marca vs. WCAG 2.1 AA) foi resolvido
pelo Software Architect via ADR-011/`SDD.md` §7.7 — releitura confirmada nesta
atualização (Seção 7.2): a resolução é um gate inteiramente interno ao processo
de configuração de `BRANDING_CONFIG` (script determinístico + checklist manual da
equipe interna, antes do go-live), sem nenhuma superfície na SPA — **nenhuma
tela, estado ou componente deste documento precisou ser alterado** em decorrência
dela. Não há bloqueio aberto pendente. Nenhuma outra reabertura de escopo foi
necessária.

