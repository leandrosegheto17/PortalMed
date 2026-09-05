# UX-SPEC.md — Portal de Resultados de Exames (Aplicação White Label para Hospitais)

**Dono**: UX/UI
**Data**: 2026-09-02 (revisado em 2026-09-04)
**Status**: **Revisado — nova direção visual vigente ("Painel de Saúde")**, liberado
incrementalmente para o Tech Lead replanejar. Checklist de Critérios de Pronto ao
final deste documento reavaliado após a revisão (ver nota de revisão abaixo).
Publicado para o Tech Lead (replanejamento/reestimativa) e, como contexto futuro,
Frontend/Mobile/QA.
**Input**: `SDD.md` (aprovado no Gate 2 do CTO, **Aprovado com ressalvas**,
2026-09-02, `CTO-REVIEW.md`; releitura pós-resolução do Bloqueio 001 em
2026-09-02, com ADR-011 e nova §7.7) + `PRD-TECNICO.md` (Business Analyst,
2026-09-02) + `PRD.md` Seção 4.1 (PM, escopo do MVP) + decisão de produto do
stakeholder (2026-09-04, fora do pipeline formal — mockups visuais em ferramenta de
design, três direções exploradas, uma escolhida — ver nota de revisão abaixo)

> **Nota de revisão (2026-09-04) — mudança de direção visual ("Painel de Saúde"),
> decidida pelo stakeholder do produto**: o dono do produto pediu exploração de um
> layout "mais inovador e moderno", gerou 3 direções visuais fora deste pipeline
> formal (mockups, ferramenta de design externa) e **decidiu formalmente adotar**
> a direção apelidada "Painel de Saúde" e **retrabalhar** o que já foi implementado
> e aprovado por QA/DevSecOps (Lote 1 completo — FE-01 a FE-04 — e parte do Lote 4
> — FE-05 a FE-07), mesmo com conhecimento de que isso gera retrabalho sobre código
> já aprovado. Esta não é uma inconsistência encontrada por um agente durante
> implementação — é uma decisão de produto tomada pelo stakeholder, com o trade-off
> de retrabalho assumido conscientemente por ele.
>
> **O que esta revisão muda, e onde**: paradigma de layout autenticado (Seção 3.1 —
> `Header` + `Navegação Principal` horizontal são **substituídos** por barra de
> navegação lateral fixa + área de conteúdo com fundo neutro); paradigma de layout
> pré-autenticação (Seção 3.1 — fundo em degradê escuro + cartão de autenticação
> centralizado, novo componente); tokens de sistema (Seção 3.3 — cores, tipografia,
> raio de borda, todos recalculados e revalidados contra WCAG 2.1 AA nesta revisão,
> não copiados de valor sugerido sem checagem); Acessibilidade (Seção 5 — regras de
> navegação por teclado da barra lateral, comportamento em mobile, contraste dos
> novos tokens escuros, todas revalidadas); Comportamento Responsivo (Seção 6 —
> novo comportamento de colapso da barra lateral em mobile). O alvo de toque mínimo
> de 44px (Seção 5.1) **não muda** — mantido sem exceção.
>
> **O que esta revisão NÃO reescreve linha a linha**: as 35 entradas de wireframe
> da Seção 2 (TL-01 a TL-35) **não foram reescritas individualmente** — a mudança é
> inteiramente capturada pela atualização dos componentes estruturais transversais
> (Seção 3.1) e dos tokens (Seção 3.3), que toda tela já referenciava por
> composição, não por descrição própria de header/navegação. Isso é uma decisão
> deliberada, não uma omissão: onde uma tela precisa de leitura própria por causa
> da mudança de casca estrutural (ex.: qual paradigma — barra lateral ou cartão de
> autenticação — se aplica a cada tela), isso está mapeado explicitamente na nova
> Seção 3.1.1 (tabela de aplicação por tela), não deixado implícito.
>
> **Autoridade e limites desta revisão**: dentro da autoridade normal do UX/UI —
> nenhuma restrição técnica do `SDD.md` foi violada ou exigiu decisão do Software
> Architect (ver Seção 7.4, novo, para a checagem formal); ambiguidades do pedido
> do stakeholder (escopo exato de telas pré-autenticação, formato do colapso da
> barra lateral em mobile, se o cartão de indicador vira padrão formal) foram
> resolvidas por julgamento normal de UX/UI, documentadas explicitamente nos pontos
> em que a decisão foi tomada, não deixadas implícitas.
>
> **Encaminhamento**: cabe ao **Tech Lead** planejar o retrabalho (reestimativa de
> FE-01 a FE-07 e qualquer tarefa dependente, novos lotes se necessário) a partir
> desta versão do documento — UX/UI não decide `TASK.md`, esforço ou lotes.

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

Telas globais/persistentes (não amarradas a um único fluxo): a partir da revisão de
2026-09-04, a casca estrutural passa a ser **Barra de Navegação Lateral** (telas
autenticadas de paciente/administrador) ou **Cartão de Autenticação sobre fundo em
degradê** (telas pré-autenticação) — `Header` institucional de topo e `Navegação
Principal` horizontal, como componentes estruturais únicos de toda tela, estão
**substituídos**. Footer institucional permanece, reposicionado conforme casca
(ver Seção 3.1). Ver Seção 3.1 e 3.1.1 (tabela de aplicação de casca por tela).

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
> grid e breakpoint exatos ficam na Seção 6. Todas as telas compartilham a mesma
> casca estrutural do seu grupo (barra de navegação lateral + Footer, para telas
> autenticadas; fundo em degradê + Cartão de Autenticação, para telas
> pré-autenticação — Seção 3.1 e 3.1.1), omitida na descrição individual abaixo
> para não repetir. **Nota de revisão (2026-09-04)**: as descrições de layout
> abaixo (blocos internos de cada tela: formulário, lista, mensagens) não foram
> reescritas nesta revisão — a mudança de casca estrutural (Header/Navegação →
> barra lateral ou cartão de autenticação) é tratada de forma centralizada na
> Seção 3.1/3.1.1, não repetida tela a tela. Onde uma descrição abaixo ainda
> menciona "Header" explicitamente (ex.: TL-01), leia como a casca vigente da
> Seção 3.1 para o grupo daquela tela, não como o componente antigo.

### TL-01 — Landing Pública

**Atualizado nesta revisão (2026-09-04)** — casca pré-autenticação (Seção 3.1.1):
- Fundo: degradê escuro derivado da cor de marca do hospital (Seção 3.3, fórmula
  determinística), ocupando toda a viewport.
- Marca do hospital (logo + nome institucional, RF-11, branding dinâmico) pequena,
  no topo, **fora** do cartão, sobre o fundo escuro — texto em cor clara fixa do
  sistema (não a regra de contraste dinâmico da Camada 1, ver Seção 3.3, já que o
  fundo é garantido escuro por construção).
- Cartão de Autenticação (novo, Seção 3.1) centralizado: mensagem de boas-vindas
  curta, dois CTAs primários — "Entrar" e "Criar conta" — dentro do cartão.
- Footer institucional (Termos de Uso, Política de Privacidade, Ajuda): reposicionado
  para abaixo do cartão, ainda sobre o fundo escuro — sem alteração de conteúdo.

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
- **Atualizado nesta revisão (2026-09-04)**: bloco de Cartões de Indicador (KPI
  card, novo, Seção 3.1) no topo do conteúdo, antes da barra de filtros —
  "Disponíveis", "Em processamento", "Links compartilhados ativos" (contagens
  reais, nunca placeholder estático).
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

> **Revisão de 2026-09-04 ("Painel de Saúde")**: `Header institucional` (topo, cor
> de marca) e `Navegação Principal` horizontal **deixam de existir como
> componentes estruturais únicos de toda tela**. São substituídos por dois pares
> casca/componente, conforme o grupo da tela (mapeamento completo em 3.1.1):
> **Barra de Navegação Lateral** (telas autenticadas de paciente/administrador) e
> **Cartão de Autenticação sobre fundo em degradê** (telas pré-autenticação).
> Componentes marcados abaixo como **Substituído** permanecem documentados (não
> apagados da história do documento) exatamente para que o Tech Lead veja o que
> mudou e reestime o que já foi estimado/implementado em cima deles (Lote 1,
> parte do Lote 4) — não é silêncio sobre a mudança.

| Componente | Status | Descrição | Usado em |
|---|---|---|---|
| Header institucional (topo, cor de marca) | **Substituído nesta revisão** (ver Barra de Navegação Lateral e Cartão de Autenticação, abaixo) | Logo + nome do hospital no topo da página, fundo na cor de marca. Existia como componente estrutural único de toda tela. | Era usado em: todas as telas (versão anterior a 2026-09-04) |
| Navegação Principal horizontal (paciente/administrador) | **Substituído nesta revisão** (ver Barra de Navegação Lateral, abaixo) | Itens de navegação dispostos horizontalmente, abaixo/dentro do Header. | Era usado em: TL-21 a TL-29, TL-34, TL-35 (paciente); TL-31 a TL-35 (administrador) |
| **Barra de Navegação Lateral** | **Novo** (substitui Header + Navegação Principal para telas autenticadas) | Barra fixa, escura (`--color-sidebar-bg`), largura de referência 240px. Do topo para a base: (1) marca do hospital (logo + nome, `BRANDING_CONFIG`, RF-11) — cor de texto fixa clara do sistema, não a regra de contraste dinâmico da Camada 1 (fundo já garantido escuro por token fixo, não por marca); (2) itens de navegação do perfil — paciente: Meus Exames \| Meu Histórico \| Ajuda; administrador: Gestão de Usuários \| Auditoria \| Ajuda (mesmos itens de antes, só a forma de apresentação muda); item ativo com fundo `--color-sidebar-active` **mais** indicador de borda lateral (ver Seção 5, achado de contraste) e peso de fonte 700, nunca só a cor de fundo; (3) "Sair" fixo na base, sempre visível, nunca dentro de um menu colapsado adicional. Em mobile (< 600px), colapsa para gaveta lateral (drawer) acionada por botão — nunca desaparece (Seção 6.1.1). | Todas as telas autenticadas de paciente (TL-21 a TL-29) e administrador (TL-31 a TL-33); TL-34/TL-35 quando acessadas em sessão autenticada (Seção 3.1.1) |
| **Cartão de Autenticação** | **Novo** (substitui Header para telas pré-autenticação) | Fundo de página: degradê escuro derivado deterministicamente de `--color-brand-primary` (fórmula em 3.3) ocupando toda a viewport. Marca do hospital (logo + nome) pequena, no topo, fora do cartão, sobre o fundo escuro, em cor de texto fixa clara do sistema. Cartão claro centralizado (`--radius-lg`, sombra pronunciada — ver token de elevação em 3.3) contendo o conteúdo real da tela (formulário ou bloco de boas-vindas da Landing). Footer institucional abaixo do cartão, sobre o fundo escuro. | Telas pré-autenticação: TL-01 a TL-20, TL-30 (reaproveita TL-08); TL-34/TL-35 quando acessadas sem sessão autenticada (Seção 3.1.1) |
| **Menu de Navegação Mobile (gaveta/drawer)** | **Novo** | Versão colapsada da Barra de Navegação Lateral para telas < 600px: barra superior fina com botão de menu (hambúrguer, alvo de toque ≥ 44px) + marca do hospital pequena; ao acionar, abre gaveta em tela cheia com o mesmo conteúdo da barra lateral (marca, itens de navegação, Sair). Ver Seção 5 (foco/teclado) e Seção 6.1.1 (comportamento responsivo completo). | Mesmas telas da Barra de Navegação Lateral, em viewport < 600px |
| **Cartão de Indicador (KPI card)** | **Novo** — padrão formal do design system (decisão do UX/UI: formalizado como componente reutilizável, não deixado como decisão ad hoc por tela, para não violar `design-system-consistency-check`) | Pequeno cartão com rótulo + valor numérico (ex.: "Disponíveis: 12", "Em processamento: 2", "Links compartilhados ativos: 3"), em linha no topo do conteúdo, antes do bloco principal. Empilha em coluna única em mobile (Seção 6). Uso restrito a telas de lista com contagens relevantes ao paciente/administrador — não é decoração; todo uso deve refletir dado real, nunca um placeholder estático. | TL-21 (Meus Exames — Disponíveis, Em processamento, Links compartilhados ativos); disponível como padrão para uso futuro em outras telas de lista, a critério do Frontend dentro deste mesmo formato visual (não uma variação livre) |
| Footer institucional | Mantido, reposicionado | Links: Termos de Uso, Política de Privacidade, Ajuda. Antes: rodapé de página inteira em toda tela. Agora: abaixo do cartão de autenticação (telas pré-autenticação, sobre o fundo escuro) ou abaixo do conteúdo dentro da área de canvas (telas autenticadas) — sem mudança de conteúdo/links. | Todas as telas |
| Modal de confirmação de ação sensível | Mantido, tokens visuais atualizados (raio, cor) | Padrão reutilizado em: revogar link (TL-27), desbloquear/desativar conta (TL-32) | TL-27, TL-32 |
| Banner de mensagem inline (erro/sucesso/informação) | Mantido, tokens visuais atualizados (cor, tint de fundo — Seção 3.3) | Área reservada de layout (não desloca conteúdo ao aparecer) | TL-08, TL-17, TL-19, TL-21 (filtro sem resultado) |

### 3.1.1 Tabela de aplicação de casca estrutural por tela (nova nesta revisão)

> Resolve a ambiguidade do pedido do stakeholder sobre exatamente quais telas
> pertencem a cada paradigma — decisão do UX/UI, documentada explicitamente para
> não ficar implícita. Critério aplicado: "pré-autenticação" cobre toda tela
> alcançável **antes** de existir uma sessão autenticada (paciente ou
> administrador), incluindo o fluxo completo de Cadastro (TL-01 a TL-07) — a
> Landing (TL-01) já pertence ao fluxo 4.1 do PRD-TECNICO (Seção 1, Índice de
> Telas), então incluí-la na nova casca sem incluir o restante do mesmo fluxo
> quebraria a continuidade visual do próprio fluxo de cadastro.

| Grupo | Telas | Casca aplicada |
|---|---|---|
| Cadastro de Paciente | TL-01 a TL-07 | Cartão de Autenticação sobre fundo em degradê |
| Login com MFA | TL-08 a TL-14, TL-16 (sessão expirada — equivalente a um novo login) | Cartão de Autenticação sobre fundo em degradê |
| Recuperação de Senha | TL-17 a TL-20 | Cartão de Autenticação sobre fundo em degradê |
| Login Administrativo | TL-30 (reaproveita TL-08 integralmente) | Cartão de Autenticação sobre fundo em degradê |
| Aviso de Expiração de Sessão | TL-15 | Modal sobreposto **dentro** da casca autenticada (Barra de Navegação Lateral permanece visível ao fundo, esmaecida) — não é uma tela de casca própria |
| Consulta e Download de Exame | TL-21 a TL-24 | Barra de Navegação Lateral + canvas |
| Compartilhamento por Link (paciente) | TL-25, TL-26, TL-27 | Barra de Navegação Lateral + canvas (TL-25/TL-26 como modal sobre essa casca) |
| Visualização do Destinatário (link) | TL-28, TL-29 | **Fora de escopo desta revisão, deliberadamente** — mantido o tratamento atual ("cabeçalho simplificado", Seção 2), sem barra lateral nem cartão de autenticação: o destinatário não é usuário autenticado do portal nem está em um fluxo de acesso/onboarding de conta (RN-07 já isola essa tela de qualquer navegação do portal). Decisão do UX/UI, sinalizada aqui explicitamente para o stakeholder/Tech Lead confirmarem se concordam, não uma omissão |
| Gestão de Usuários (Administrador) | TL-31, TL-32, TL-33 | Barra de Navegação Lateral + canvas |
| Ajuda e Suporte | TL-34, TL-35 | **Condicional ao estado de sessão no momento do acesso**: se autenticado, Barra de Navegação Lateral + canvas (mesma casca da sessão em curso); se não autenticado (acesso a partir da Landing/rodapé), Cartão de Autenticação sobre fundo em degradê. Conteúdo (FAQ, contato) inalterado em ambos os casos — só a casca muda |

---

### 3.2 Componentes de formulário

| Componente | Novo? | Descrição |
|---|---|---|
| Campo de texto com máscara (CPF) | **Novo** | Validação de formato inline, mensagem de erro específica |
| Seletor de data acessível (data de nascimento) | **Novo** | Navegável por teclado, não apenas `<input type=date>` sem fallback |
| Campo de senha com indicador de força | **Novo** | Usado em TL-06 e TL-19 |
| Checkbox de aceite padrão vs. Checkbox de consentimento destacado | **Novo** (dois variantes distintos, deliberadamente diferentes visualmente) | O consentimento de dado de saúde (RN-02) usa variante com contraste/moldura diferenciada — nunca o mesmo estilo visual do aceite geral de Termos, para reforçar que é um consentimento separado e específico (Art. 11, I) |
| Campo de código numérico (MFA/OTP) | **Novo** | 6 dígitos, teclado numérico em mobile, auto-avanço entre dígitos com fallback acessível (não depende só de comportamento de mouse) |

### 3.3 Tokens visuais

> **Revisão de 2026-09-04**: a Camada 2 (tokens de sistema, fixos) é
> **substituída** pelos valores abaixo, a pedido do stakeholder ("Painel de
> Saúde"). Todos os pares texto/fundo relevantes foram **recalculados e
> confirmados** nesta revisão pela fórmula de luminância relativa do WCAG 2.1
> (não copiados como já validados) — razões de contraste exatas na tabela 3.3.2.
> A Camada 1 (marca dinâmica por tenant) **não muda de regra** — a única adição é
> a fórmula determinística de derivação do fundo em degradê escuro para telas
> pré-autenticação (3.3.3), que consome `--color-brand-primary` como entrada sem
> alterar a regra de contraste dinâmico já existente para texto sobre a marca.

**Camada 1 — Tokens de marca (dinâmicos por tenant, `BRANDING_CONFIG`) — inalterada**
| Token | Uso permitido | Uso proibido |
|---|---|---|
| `--color-brand-primary` | Cor de destaque em elementos não-textuais grandes (ex.: botão primário — com verificação de contraste de texto sobre ele, ver regra abaixo), logo, **entrada da fórmula de derivação do fundo em degradê pré-autenticação (3.3.3)** | Nunca usado como cor de texto de corpo sobre fundo claro/escuro sem checagem de contraste — nunca usado sozinho para transmitir estado (erro/sucesso), que usa Camada 2. Nesta revisão, deixa de ser cor de fundo do Header (componente substituído, 3.1) |
| `--brand-logo-url` | Marca no topo da Barra de Navegação Lateral e no topo do fundo em degradê (Cartão de Autenticação), tela de destinatário de link (TL-28) | — |

**Regra de contraste obrigatória sobre `--color-brand-primary`**: todo texto
renderizado sobre a cor de marca (ex.: texto do botão primário) deve ser calculado
dinamicamente entre branco e um tom de texto escuro fixo do sistema, escolhendo
automaticamente o que atinge relação de contraste ≥ 4.5:1 (WCAG 2.1 AA, texto
normal) contra a cor de marca configurada — nunca um valor de cor de texto
hardcoded assumindo que a marca será sempre clara ou sempre escura. Esta é uma
regra de componente, aplicável a qualquer paleta de hospital que entrar depois do
piloto, não um ajuste manual por tenant. **Inalterada nesta revisão.**

#### 3.3.1 Camada 2 — Tokens de sistema (fixos, independentes de tenant) — valores vigentes desta revisão

| Token | Valor | Uso | Observação desta revisão |
|---|---|---|---|
| `--color-ink` (texto primário) | `#17201B` | Corpo de texto padrão sobre fundo claro (canvas ou cartão) | Antes `#1A2733`. Contraste recalculado — ver 3.3.2 |
| `--color-ink-soft` (texto secundário/esmaecido) | `#647065` | Legendas, metadados secundários (datas, rótulos auxiliares), texto de apoio | **Token novo** — não existia antes. Contraste recalculado — ver 3.3.2, com restrição de uso documentada |
| `--color-line` (borda neutra) | `#E3E7E1` | Divisores decorativos/estruturais de baixa ênfase (linhas entre itens de lista, regras internas de cartão) | **Token novo**. **Não usar como única indicação de borda de componente interativo** (input, select) — ver 3.3.2, achado de contraste insuficiente para esse uso |
| `--color-canvas` (fundo da área de conteúdo autenticada) | `#F3F5F2` | Fundo da área de conteúdo ao lado da Barra de Navegação Lateral | Antes branco puro. Cartões de conteúdo continuam brancos sobre este fundo |
| `--color-card-bg` (fundo de cartão) | `#FFFFFF` | Cartões de conteúdo, Cartão de Autenticação | Mantido |
| `--color-sidebar-bg` (fundo da navegação lateral) | `#10261A` | Fundo da Barra de Navegação Lateral | **Token novo**. Contraste de texto claro sobre este fundo confirmado — ver 3.3.2 |
| `--color-sidebar-active` (item ativo da navegação lateral) | `#1B3B27` | Fundo do item ativo dentro da Barra de Navegação Lateral | **Token novo**. Ver 3.3.2 para o achado de contraste entre este tom e `--color-sidebar-bg` e o tratamento definido (Seção 5) |
| `--color-success` | `#1E7A34` | Confirmações (TL-07, TL-26) — nunca só cor, sempre com ícone/texto (Seção 5) | Valor exato definido nesta revisão (documento anterior deixava "verde acessível" sem hex fechado); escolhido deliberadamente distinto dos tons de verde da navegação lateral, para não confundir "marca/navegação" com "estado de sucesso". Contraste confirmado — ver 3.3.2 |
| `--color-error` | `#B3261E` | Erros (TL-09, TL-19 inválido) | Mantido. Contraste reconfirmado — ver 3.3.2 |
| `--color-error-tint` | `#FBE2E0` | Fundo suave de banner/alerta de erro, atrás do texto/ícone em `--color-error` | **Token novo** |
| `--color-warning` | `#8A5A00` | Avisos (TL-15, expiração de sessão) | Mantido. Contraste reconfirmado — ver 3.3.2 |
| `--color-warning-tint` | `#FCEFD9` | Fundo suave de banner/alerta de aviso | **Token novo** |
| `--color-info` | `#1D5DB3` | Mensagens informativas (TL-18, TL-04) | Mantido. Contraste reconfirmado — ver 3.3.2 |
| `--color-info-tint` | `#DDEAF8` | Fundo suave de banner/mensagem informativa | **Token novo** |
| `--font-family-base` | `"Lexend", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`, pesos 500/700/800 | Títulos e corpo de texto | Fonte trocada nesta revisão — ver 3.3.4 para a justificativa (legibilidade, RNF-06) |
| `--spacing-*` | Escala de 4/8/16/24/32px | Espaçamento consistente entre blocos | Mantido, sem mudança |
| `--radius-sm` (input, botão pequeno) | `12px` | Campos de formulário, botões de ação padrão | Antes 4px — escala mais arredondada, ver 3.3.5 |
| `--radius-md` (cartão) | `20px` | Cartões de conteúdo (área de canvas), Cartão de Indicador | Antes 8px |
| `--radius-lg` (modal / cartão grande) | `28px` | Cartão de Autenticação, modais de confirmação, modal de expiração de sessão | Novo nível — não existia distinção própria antes |

#### 3.3.2 Verificação de contraste WCAG 2.1 AA — pares recalculados nesta revisão

> Fórmula aplicada: luminância relativa `L = 0.2126·R + 0.7152·G + 0.0722·B` sobre
> componentes linearizados de sRGB, contraste `(L1+0.05)/(L2+0.05)` com `L1 ≥ L2`.
> Critério: ≥ 4.5:1 para texto normal / componentes de texto (1.4.3), ≥ 3:1 para
> elementos gráficos/estado de componente de UI (1.4.11). Calculado ponto a ponto
> abaixo, não presumido.

| Par (texto/fundo ou elemento/fundo) | Razão calculada | Resultado |
|---|---|---|
| `--color-ink` (#17201B) sobre `--color-card-bg` (#FFFFFF) | 16.68:1 | Passa (muito acima de 4.5:1) |
| `--color-ink` (#17201B) sobre `--color-canvas` (#F3F5F2) | 15.21:1 | Passa |
| `--color-ink-soft` (#647065) sobre `--color-card-bg` (#FFFFFF) | 5.19:1 | Passa 4.5:1 (texto normal), sem margem para AAA (7:1) |
| `--color-ink-soft` (#647065) sobre `--color-canvas` (#F3F5F2) | 4.73:1 | Passa 4.5:1, **margem estreita** — restrição de uso definida: preferir `--color-ink-soft` sobre `--color-card-bg` (cartões); quando usado diretamente sobre `--color-canvas`, reservar para texto grande (≥ 18pt/14pt bold) sempre que o conteúdo permitir, dado o público idoso do RNF-06 |
| `--color-line` (#E3E7E1) como borda, contra `--color-card-bg` (#FFFFFF) | 1.25:1 | **Não atinge 3:1** (1.4.11) — `--color-line` **não deve ser usado sozinho** como indicação de borda de componente interativo (input, select, checkbox); uso restrito a divisores decorativos onde a identificação do componente não depende da borda (reforçado por espaçamento/sombra). Bordas de campo de formulário no estado padrão usam `--color-ink-soft` (5.19:1 sobre branco, acima de 3:1) |
| `--color-card-bg` (#FFFFFF) contra `--color-canvas` (#F3F5F2), como delimitação de cartão | 1.10:1 | **Não atinge 3:1** por cor isolada — por isso a especificação exige sombra pronunciada (elevação) como pista não dependente de cor para todo cartão sobre o canvas (critério 1.4.11 satisfeito por deixar de depender só de contraste cromático) |
| Texto claro fixo do sistema sobre `--color-sidebar-bg` (#10261A) | 15.97:1 (calculado com branco `#FFFFFF`) | Passa, larga margem |
| Texto claro fixo do sistema sobre `--color-sidebar-active` (#1B3B27) | 12.34:1 | Passa, larga margem |
| `--color-sidebar-active` (#1B3B27) contra `--color-sidebar-bg` (#10261A), como único indicador do item ativo | 1.29:1 | **Não atinge 3:1** (1.4.11) — mudança de fundo sozinha é insuficiente para comunicar o estado ativo. Tratamento definido (Seção 5): item ativo soma (a) mudança de fundo, (b) borda/indicador lateral em cor clara de alto contraste, (c) peso de fonte 700, (d) `aria-current="page"` — nunca apenas a mudança de cor de fundo |
| `--color-success` (#1E7A34) sobre `--color-card-bg` (#FFFFFF) | 5.40:1 | Passa |
| `--color-success` (#1E7A34) sobre `--color-canvas` (#F3F5F2) | 4.93:1 | Passa |
| `--color-error` (#B3261E) sobre `--color-card-bg` (#FFFFFF) | 6.54:1 | Passa (reconfirmado, valor mantido) |
| `--color-error` (#B3261E) sobre `--color-error-tint` (#FBE2E0) | 5.31:1 | Passa |
| `--color-warning` (#8A5A00) sobre `--color-card-bg` (#FFFFFF) | 5.93:1 | Passa (reconfirmado, valor mantido) |
| `--color-warning` (#8A5A00) sobre `--color-warning-tint` (#FCEFD9) | 5.22:1 | Passa |
| `--color-info` (#1D5DB3) sobre `--color-card-bg` (#FFFFFF) | 6.42:1 | Passa (reconfirmado, valor mantido) |
| `--color-info` (#1D5DB3) sobre `--color-info-tint` (#DDEAF8) | 5.26:1 | Passa |

**Achados que exigiram tratamento adicional (documentados, não escondidos)**:
1. `--color-line` sozinho não serve como borda de componente interativo — regra de
   uso definida acima.
2. `--color-card-bg` sobre `--color-canvas` não se distingue por cor — sombra
   pronunciada é obrigatória em todo cartão, não apenas estética.
3. `--color-sidebar-active` sobre `--color-sidebar-bg` não se distingue apenas por
   cor — item ativo da navegação lateral usa reforço multi-sinal (Seção 5).
4. `--color-ink-soft` sobre `--color-canvas` tem margem estreita (4.73:1, mínimo
   exigido 4.5:1) — restrição de uso preferencial documentada.
Nenhum desses achados é um conflito com o `SDD.md` (não há restrição técnica
envolvida) — são decisões de token/uso resolvidas dentro da autoridade normal do
UX/UI, registradas para rastreabilidade e para a Seção 5 (Acessibilidade).

#### 3.3.3 Derivação determinística do fundo em degradê (telas pré-autenticação)

A cor de marca dinâmica (`--color-brand-primary`) segue sendo a única entrada de
marca — não há uma segunda cor arbitrária configurada por hospital. O fundo em
degradê escuro das telas pré-autenticação é **calculado**, não escolhido à mão,
pela seguinte regra determinística (mesmo espírito da regra de contraste dinâmico
já existente para texto sobre a marca):

1. Converter `--color-brand-primary` de sRGB para HSL, obtendo matiz (H), saturação
   (S) e luminosidade (L) originais.
2. Aplicar um piso mínimo de saturação: `S' = max(S, 40%)` — evita um degradê
   acinzentado/sem identidade quando a marca do hospital for muito dessaturada.
3. Gerar dois pontos de parada, mesmo matiz H, luminosidade reduzida:
   - Parada 1 (canto superior): `HSL(H, S', 14%)`
   - Parada 2 (canto inferior): `HSL(H, S', 6%)`
4. Aplicar como `linear-gradient(135deg, Parada 1, Parada 2)` cobrindo toda a
   viewport.

Como a luminosidade fica limitada entre 6% e 14% por construção, o fundo é sempre
escuro o suficiente para que texto claro fixo do sistema (branco/quase-branco)
atinja contraste ≥ 4.5:1 independentemente da cor de marca configurada — por isso
a marca do hospital (logo + nome) sobre este fundo usa **cor de texto fixa clara
do sistema**, não a regra de contraste dinâmico da Camada 1 (que existe para
quando o próprio `--color-brand-primary` é o fundo, não uma versão escurecida
dele). Regra de componente, válida para qualquer hospital que entrar depois do
piloto — não um ajuste manual por tenant, mesmo racional já aplicado à regra de
contraste sobre `--color-brand-primary`.

#### 3.3.4 Tipografia — troca de fonte

Fonte escolhida: **Lexend** (Google Fonts), pesos 500 (texto de apoio/corpo com
ênfase), 700 (subtítulos, item de navegação ativo) e 800 (títulos/display). Pilha
de fallback: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial,
sans-serif`.

**Justificativa (RNF-06 é inegociável, público inclui pacientes idosos)**: Lexend
foi desenvolvida especificamente a partir de pesquisa de legibilidade/desempenho de
leitura (variável de eixo ajustada para reduzir tempo de leitura e erros de
reconhecimento de caractere), com x-height generoso e formas de letra bem
diferenciadas entre caracteres frequentemente confundidos (ex.: "I"/"l"/"1") — vai
na mesma direção do requisito já existente de legibilidade para público idoso, não
o contradiz. Carregamento via Google Fonts (`fonts.googleapis.com`/
`fonts.gstatic.com`) exige entrada correspondente em `style-src`/`font-src` do
cabeçalho CSP já previsto no `SDD.md` (§8, "cabeçalhos de segurança") — ver Seção
7.4 (checagem técnica, sem conflito, apenas item a configurar).

#### 3.3.5 Escala de raio de borda — nova escala

| Categoria | Valor | Uso |
|---|---|---|
| `--radius-sm` | 12px | Inputs, botões pequenos/padrão |
| `--radius-md` | 20px | Cartões de conteúdo, Cartão de Indicador |
| `--radius-lg` | 28px | Cartão de Autenticação, modais, cartões grandes de destaque |

Escala substituída (antes: 4px/8px, dois níveis) por três níveis mais arredondados,
consistentes com a direção visual "Painel de Saúde". **Alvo de toque mínimo de
44px não é afetado por esta mudança** — raio de borda é estético/de forma, não
altera a área de toque do elemento (Seção 5.1, regra inalterada).

### 3.4 Tabela de rastreabilidade — telas × componentes novos

Cada tela lista apenas os componentes **de formulário/interação específicos**
adicionais aos estruturais (Seção 3.1, presentes em toda tela autenticada) e de
formulário (Seção 3.2) já cobertos acima — evita repetir os mesmos componentes
genéricos em cada entrada de tela da Seção 2.

| Tela | Componente novo específico |
|---|---|
| TL-12 | Exibição de QR code + código alfanumérico alternativo |
| TL-15 | Modal de contagem regressiva com `role="alertdialog"` |
| TL-21 | Barra de filtros persistente + lista/tabela de exames com status + **Cartão de Indicador (KPI card, novo nesta revisão, Seção 3.1)** — Disponíveis / Em processamento / Links compartilhados ativos |
| TL-22/TL-23 | Visualizador de documento embutido (PDF/HTML) e imagem estática (`<img>`), com botões de ação condicionalmente ocultos |
| TL-26/TL-27 | Componente de exibição/cópia de URL + status de link (ativo/expirado/revogado) |
| TL-31/TL-33 | Tabela com busca/filtro administrativo, CPF mascarado com opção de revelar |

**Nesta revisão (2026-09-04)**, adicionalmente, toda tela autenticada (TL-21 a
TL-29, TL-31 a TL-33) ganha a Barra de Navegação Lateral (Seção 3.1) no lugar do
par Header + Navegação Principal; toda tela pré-autenticação (TL-01 a TL-20,
TL-30) ganha o Cartão de Autenticação sobre fundo em degradê (Seção 3.1). Ver
Seção 3.1.1 para o mapeamento completo — não repetido aqui tela a tela.

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
>
> **Revisão de 2026-09-04**: toda regra desta seção foi revalidada contra a nova
> casca estrutural (Barra de Navegação Lateral, Cartão de Autenticação, Menu de
> Navegação Mobile) e os novos tokens de cor (Seção 3.3). Nenhuma regra
> transversal foi enfraquecida — o alvo de toque mínimo de 44px permanece sem
> exceção. Três subseções novas foram adicionadas (5.1.1 navegação por teclado da
> barra lateral, 5.1.2 skip link, 5.1.3 menu mobile) e um achado de contraste do
> item ativo da navegação (Seção 3.3.2) recebeu tratamento explícito abaixo.

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

#### 5.1.1 Navegação por teclado — Barra de Navegação Lateral (nova nesta revisão)

- Ordem de tabulação lógica: skip link (5.1.2) → marca/logo do topo (se for link,
  ex. volta para a tela inicial da área logada) → itens de navegação, em ordem
  visual (topo→base) → "Sair" → conteúdo principal.
- Item ativo marcado com `aria-current="page"`, além do reforço visual
  multi-sinal definido a seguir (não apenas cor) — decorre diretamente do achado
  de contraste da Seção 3.3.2 (fundo do item ativo vs. fundo da barra, 1.29:1,
  insuficiente por si só para o critério 1.4.11): o item ativo soma (a) fundo
  `--color-sidebar-active`, (b) borda/indicador lateral de alto contraste (cor
  clara sólida, não depende de `--color-brand-primary` para não reintroduzir risco
  de contraste variável), (c) peso de fonte 700, (d) `aria-current="page"` — nunca
  apenas a mudança de fundo.
- Indicador de foco visível sobre fundo escuro: anel de foco em cor clara
  (contraste ≥ 3:1 confirmado contra `--color-sidebar-bg`/`--color-sidebar-active`
  — larga margem, Seção 3.3.2), nunca `outline: none` sem substituto.
- "Sair" é sempre um item de navegação alcançável por teclado como qualquer outro,
  nunca escondido atrás de um menu adicional (mesma regra do Menu de Navegação
  Mobile, 5.1.3).

#### 5.1.2 Skip link (reforçado nesta revisão)

Com a Barra de Navegação Lateral presente em toda tela autenticada (antes do
conteúdo principal na ordem de leitura/tabulação), o link "Pular para o conteúdo
principal" — primeiro elemento focável da árvore, visível ao receber foco — passa
de boa prática recomendada a requisito verificado explicitamente nesta revisão:
sem ele, todo paciente/administrador que navega por teclado precisaria tabular por
toda a barra lateral a cada troca de tela para alcançar o conteúdo, o que não
acontecia da mesma forma com a Navegação Principal horizontal anterior (mais curta
antes do conteúdo).

#### 5.1.3 Menu de Navegação Mobile (gaveta/drawer) — acessibilidade (novo)

- Botão de acionamento (hambúrguer): alvo de toque ≥ 44px (regra inalterada),
  `aria-expanded` refletindo estado aberto/fechado, `aria-controls` apontando para
  a gaveta, rótulo acessível "Abrir menu de navegação"/"Fechar menu de navegação".
- Gaveta: `role="navigation"` com `aria-label`, foco movido para o primeiro item
  ao abrir, **foco preso dentro da gaveta** enquanto aberta (critério 2.4.3), tecla
  `Esc` fecha e devolve o foco ao botão de acionamento, clique fora da gaveta
  também fecha.
- Mesmo conteúdo e ordem da Barra de Navegação Lateral (marca, itens de navegação,
  "Sair") — a mudança é de forma (gaveta em vez de barra fixa), nunca de conteúdo
  ou de alcançabilidade, conforme já estabelecido na Seção 6.

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
| TL-01 a TL-20, TL-30 (Cartão de Autenticação sobre fundo em degradê, novo nesta revisão) | Marca do hospital (logo + nome) pequena sobre fundo escuro fora do cartão — risco de baixo contraste se implementada com a regra de contraste dinâmico da Camada 1 em vez da regra específica desta casca | Texto da marca sobre o fundo em degradê usa cor de texto fixa clara do sistema (não a Camada 1) — contraste garantido por construção pela fórmula de derivação do fundo (Seção 3.3.3, luminosidade sempre entre 6% e 14%), confirmado ≥ 4.5:1 |
| TL-21 a TL-33 (Barra de Navegação Lateral, novo nesta revisão) | Item ativo indicado só por mudança de cor de fundo (`--color-sidebar-active`) não atinge 3:1 contra `--color-sidebar-bg` (Seção 3.3.2) | Reforço multi-sinal obrigatório — ver 5.1.1 (borda/indicador lateral, peso de fonte, `aria-current`) |

---

## 6. Comportamento Responsivo

RNF-07 confirma: web responsiva (desktop + mobile via navegador), sem aplicativo
nativo (Won't, fora do escopo). Aplicável a **todas** as 35 telas — nenhuma exceção
"não aplicável" neste projeto, dado que o produto não é API-only.

> **Revisão de 2026-09-04**: o comportamento da Barra de Navegação Lateral em
> mobile, deixado como decisão aberta do Frontend na versão anterior deste
> documento ("hambúrguer ou barra inferior"), é **fechado nesta revisão** — ver
> 6.1.1. Continua valendo a regra já existente de que áreas de navegação nunca
> desaparecem, apenas mudam de forma.

### 6.1 Breakpoints (proposta do UX/UI — a validar tecnicamente com Tech Lead/Frontend na fase de implementação, RNF-14 também deixa compatibilidade de navegador como "a confirmar")

| Breakpoint | Largura | Uso |
|---|---|---|
| Mobile | até 599px | Layout de coluna única em todas as telas. Barra de Navegação Lateral colapsa para Menu de Navegação Mobile (gaveta/drawer) — decisão fechada nesta revisão, ver 6.1.1. Cartão de Autenticação ocupa praticamente a largura total da viewport (menos padding mínimo), fundo em degradê preenchendo o restante |
| Tablet | 600px–1023px | Coluna única ou duas colunas conforme densidade de conteúdo da tela (ex.: TL-31 pode usar mais largura para a tabela). Barra de Navegação Lateral fixa, mesma apresentação do desktop |
| Desktop | ≥ 1024px | Layout completo, Barra de Navegação Lateral sempre visível (não colapsada), largura de referência 240px |

### 6.1.1 Barra de Navegação Lateral em mobile — decisão fechada nesta revisão

Abaixo de 600px, a Barra de Navegação Lateral **não é cortada nem escondida sem
alternativa** — colapsa para o **Menu de Navegação Mobile (gaveta/drawer)**
definido na Seção 3.1:

- Uma barra superior fina e fixa substitui a barra lateral fixa: contém o botão de
  menu (ícone hambúrguer, alvo de toque ≥ 44px) à esquerda e a marca do hospital
  (logo pequeno) centralizada ou à direita.
- Ao acionar o botão, uma gaveta em tela cheia desliza sobre o conteúdo,
  reproduzindo o mesmo conteúdo e ordem da barra lateral de desktop: marca no
  topo, itens de navegação do perfil, "Sair" na base — nada é omitido nem movido
  para um submenu adicional.
- Escolha de gaveta em tela cheia (em vez de barra de abas inferior) motivada por:
  paridade de conteúdo mais simples com a barra lateral de desktop (mesmos itens,
  mesma ordem, sem precisar redistribuir "Sair" para um local separado como uma
  barra de abas de 3-4 posições exigiria) e por já existir um padrão equivalente
  de "modal em tela cheia" no restante da especificação para mobile (6.2, modais
  de confirmação), mantendo consistência de padrão de interação em vez de
  introduzir um terceiro paradigma (barra de abas) só para a navegação.
- Fechamento: toque fora da gaveta, botão de fechar explícito, ou tecla `Esc`
  (teclado externo/acessibilidade) — foco devolvido ao botão de menu ao fechar
  (Seção 5.1.3).

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
- **Cartão de Autenticação (TL-01 a TL-20, TL-30 — novo nesta revisão)**: em
  mobile, o cartão ocupa a largura total disponível (menos padding mínimo, mesmo
  princípio do visualizador de documento/imagem acima) em vez de manter uma largura
  fixa centralizada pequena — o fundo em degradê preenche o espaço restante acima/
  abaixo do cartão. Raio de borda (`--radius-lg`) e sombra mantidos mesmo em
  mobile, sem redução — parte da identidade visual da direção "Painel de Saúde",
  não apenas um detalhe de desktop.
- **Cartão de Indicador / KPI card (TL-21 — novo nesta revisão)**: em mobile,
  empilha em coluna única (um indicador por linha) em vez da disposição em linha
  usada em tablet/desktop — mesmo princípio de não forçar rolagem horizontal já
  aplicado às listas/tabelas densas acima.

---

## 7. Restrições Técnicas Aplicadas e Conflitos Sinalizados ao Software Architect

### 7.1 Restrições do `SDD.md` já incorporadas ao desenho (checadas via
`technical-constraint-check`, sem conflito)

| Restrição (SDD.md) | Onde impacta o UX-SPEC | Tratamento |
|---|---|---|
| ADR-003 — imagens convertidas para JPEG/PNG no MVP, sem visualizador DICOM nativo (zoom/pan/window-level) | TL-23, TL-28 | Imagem exibida como `<img>` estático, zoom apenas via navegador/SO nativo, texto de apoio explícito gerenciando expectativa (Seção 2). Nenhuma promessa de interação que só existe em RF-S02 (Release 2) |
| ADR-004 — multi-tenancy lógica, branding por `BRANDING_CONFIG`, sem self-service (RN-10) | Marca do hospital na Barra de Navegação Lateral e no Cartão de Autenticação (3.1, componentes que substituem o antigo Header institucional nesta revisão — ver 7.4), tokens de marca (3.3) | Branding tratado como dado de configuração consumido dinamicamente pelo frontend, nunca hardcoded por hospital; nenhuma tela de "configurar minha marca" desenhada nesta release, conforme RN-10 |
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

### 7.4 Checagem técnica da revisão "Painel de Saúde" (2026-09-04) — sem conflito

`technical-constraint-check` reaplicado sobre a nova direção visual contra o
`SDD.md`, antes de considerar esta revisão pronta para o Tech Lead:

| Elemento novo/alterado | Restrição técnica verificada | Resultado |
|---|---|---|
| Fonte Lexend via Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`) | `SDD.md` §8 prevê cabeçalhos de segurança (CSP, HSTS) na SPA, sem detalhar diretivas exatas de `font-src`/`style-src` | **Sem conflito** — nenhuma restrição do `SDD.md` proíbe fonte externa (a versão anterior deste documento já previa "fonte de sistema/web font" como possibilidade em aberto). Item de configuração a incluir no CSP pelo Frontend/DevSecOps na implementação — sinalizado aqui para visibilidade, não é um bloqueio nem uma decisão do UX/UI resolver sozinho o texto exato da diretiva |
| Fundo em degradê derivado de `--color-brand-primary` (Seção 3.3.3) | ADR-004 (multi-tenancy lógica, branding por `BRANDING_CONFIG`, RN-10 sem self-service) | **Sem conflito** — a derivação consome a mesma e única cor de marca já configurada por tenant, calculada em tempo de execução no frontend (mesmo padrão já usado pela regra de contraste dinâmico existente); nenhum campo novo exigido em `BRANDING_CONFIG` |
| Gate de contraste de `BRANDING_CONFIG` (ADR-011, `SDD.md` §7.7) | A troca de tokens de sistema (Camada 2) não altera a Camada 1 nem a regra de contraste dinâmico validada pelo gate | **Sem conflito** — o gate valida a paleta do hospital (Camada 1) contra os tokens fixos do sistema; os tokens fixos mudaram de valor, mas a fórmula/gate em si (executado pela equipe interna, `SDD.md` §7.7) não precisa de alteração, só passa a comparar contra os novos valores desta revisão |
| Barra de Navegação Lateral / gaveta mobile (React SPA) | RNF-07 (web responsiva), stack React + TypeScript (`SDD.md` §3) | **Sem conflito** — padrão de UI implementável com o ecossistema de componentes React já assumido no `SDD.md` (mesma base técnica que já suportaria Header/Navegação horizontal) |

Nenhum item acima exigiu escalonamento a `software-architect` — nenhuma tensão
real entre experiência desejada e restrição técnica foi encontrada nesta revisão,
diferente do que ocorreu no Bloqueio 001 original (Seção 7.2). O único item de
acompanhamento (diretiva exata de CSP para Google Fonts) é uma tarefa de
configuração de implementação, não uma divergência de arquitetura.

---

## Checklist de Critérios de Pronto (UX/UI)

> Reavaliado em 2026-09-04 após a revisão "Painel de Saúde" — checklist binário,
> não é uma reaprovação de gate (essa escala é exclusiva do CTO).

- [x] Todo fluxo do `PRD-TECNICO.md` (§4.1 a §4.5, §4.7) tem tela(s) correspondente(s)
      mapeada(s) — TL-01 a TL-35 (Seção 1, Índice de Telas), inalterado por esta
      revisão (mudança é de casca/tokens visuais, não de fluxo). O fluxo §4.6
      (ingestão via integração) é interno/técnico, sem tela, registrado como tal.
- [x] Todo fluxo de tela tem os 4 estados especificados (vazio, carregando, erro,
      sucesso), ou está marcado "não aplicável" com o porquê (Seção 4 — inalterado
      por esta revisão, os 4 estados não dependem de casca visual)
- [x] Todo componente novo está sinalizado como tal (Seção 3) — nesta revisão:
      Barra de Navegação Lateral, Cartão de Autenticação, Menu de Navegação
      Mobile e Cartão de Indicador marcados **Novo**; Header institucional e
      Navegação Principal horizontal marcados **Substituído** (não apagados,
      Seção 3.1) para que o Tech Lead veja exatamente o que reestimar
- [x] Toda tela passou por `accessibility-review` sem pendência crítica aberta
      (Seção 5) — regras transversais revalidadas contra a nova casca nesta
      revisão (5.1.1 a 5.1.3, novas), incluindo um achado de contraste do item
      ativo da navegação lateral (Seção 3.3.2) com tratamento definido, não
      deixado como pendência. O item pré-existente de PDF/HTML acessível (TL-22)
      permanece marcado como critério de aceite a validar na implementação
- [x] Comportamento responsivo definido para todo fluxo relevante (Seção 6) —
      decisão de colapso da Barra de Navegação Lateral em mobile fechada nesta
      revisão (6.1.1), antes deixada em aberto para o Frontend
- [x] Toda restrição técnica do `SDD.md` foi checada via `technical-constraint-check`
      (Seção 7.1, restrições originais; Seção 7.4, nova, quatro elementos da
      revisão "Painel de Saúde" checados, todos sem conflito) e todo conflito
      encontrado está sinalizado ao Software Architect, não resolvido por conta
      própria (Seção 7.2 — contraste de marca vs. WCAG, Bloqueio 001, **Resolvido**;
      nenhum novo bloqueio aberto nesta revisão)
- [x] Nenhuma das 7 seções está vazia ou com placeholder

**Veredito do UX/UI**: `UX-SPEC.md` **revisado e liberado incrementalmente para o
Tech Lead** replanejar o retrabalho decidido pelo stakeholder do produto
(mudança de direção visual "Painel de Saúde", impactando Lote 1 completo e parte
do Lote 4 já implementados e aprovados por QA/DevSecOps). Nenhuma restrição
técnica do `SDD.md` foi violada pela nova direção (Seção 7.4) — nenhum
escalonamento ao Software Architect foi necessário nesta revisão. Os quatro
achados de contraste/uso identificados durante a verificação WCAG 2.1 AA desta
revisão (Seção 3.3.2) foram resolvidos dentro da autoridade normal do UX/UI, com
tratamento explícito, não deixados como pendência silenciosa. O bloqueio histórico
do documento (`BLOCKERS.md` Bloqueio 001, contraste de marca vs. WCAG 2.1 AA)
continua Resolvido, sem relação com esta revisão. **Decisão de esforço, lotes e
`TASK.md` cabe ao Tech Lead — não é decidida por este agente.**

