# QA-REPORT.md — Portal de Resultados de Exames

**Dono**: QA
**Data de criação**: 2026-09-02
**Convenção**: `PIPELINE-CONVENTIONS.md` §1 (artefato #9) — validação por tarefa
concluída (Aprovado / Aprovado com ressalvas / Reprovado), log de bugs com
severidade e evidência, veredito de release-readiness. Este arquivo é atualizado
tarefa a tarefa, nunca reescrito do zero — cada nova entrada é acrescentada à
tabela da Seção 1 e, se houver bug, à Seção 2.

---

## 1. Validação por Tarefa

| Tarefa | Dono | Validado em | Veredito | Evidência |
|---|---|---|---|---|
| FE-01 | Frontend | 2026-09-02 | **Aprovado com ressalvas** | Ver Seção 1.1 |
| BE-01 | Backend | 2026-09-02 | **Aprovado** | Ver Seção 1.2 |
| FE-02 | Frontend | 2026-09-02 | **Aprovado com ressalvas** | Ver Seção 1.3 |
| BE-02 | Backend | 2026-09-02 | **Aprovado com ressalvas** | Ver Seção 1.4 |
| FE-03 | Frontend | 2026-09-02 | **Aprovado com ressalvas** | Ver Seção 1.5 |
| BE-03 | Backend | 2026-09-02 (reprovado); revalidado 2026-09-03 (reprovado novamente); revalidado 2026-09-03, rodada 3 | **Aprovado com ressalvas** | Ver Seção 1.6, 1.6.1 e 1.6.2 |
| FE-04 | Frontend | 2026-09-03 | **Aprovado com ressalvas** | Ver Seção 1.7 |
| FE-05 | Frontend | 2026-09-03 | **Aprovado** | Ver Seção 1.8 |
| FE-06 | Frontend | 2026-09-03 | **Aprovado com ressalvas** | Ver Seção 1.9 |
| FE-07 | Frontend | 2026-09-03 | **Aprovado com ressalvas** | Ver Seção 1.10 |
| BE-04 | Backend | 2026-09-03 | **Aprovado** | Ver Seção 1.11 |

### 1.1 FE-01 — Design system: tokens Camada 1 (marca dinâmica) e Camada 2 (sistema fixo, WCAG AA)

**Critério de aceite validado** (`TASK.md` §3.10, linha FE-01): "Tokens de marca
consumidos de `BRANDING_CONFIG` via API, nunca hardcoded; regra de contraste
dinâmico sobre `--color-brand-primary` implementada (texto claro/escuro calculado
automaticamente, garantindo contraste ≥ 4.5:1 conforme WCAG 2.1 AA)."

**Referências de especificação usadas na validação**: `UX-SPEC.md` §3.3 (tokens
Camada 1/Camada 2 + regra de contraste dinâmico), `GUARDRAILS.md` §G (itens 29-31,
ADR-011) e §H (itens 32-33, WCAG 2.1 AA).

**Código revisado**: `frontend/src/design-system/` (`tokens/`, `contrast/`,
`branding/`).

#### Execução

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `frontend/`) | 49/49 testes passando, 7 arquivos de teste (`contrast.test.ts`, `applyBrandTokens.test.ts`, `brandingApi.test.ts`, `types.test.ts`, `useBrandingTokens.test.tsx`, `BrandTokensProvider.test.tsx`, `fixedTokenValues.sync.test.ts`) |
| `npm run build` (`tsc -b && vite build`) | Build limpo, sem erro de tipo, 25 módulos transformados |
| `npm run lint` (`oxlint`) | Sem apontamentos |

#### Checklist de critério de aceite (item a item)

1. **"Tokens de marca consumidos de `BRANDING_CONFIG` via API, nunca
   hardcoded"** — **Atendido estruturalmente**. `branding/brandingApi.ts` expõe
   `fetchBrandingConfig(): Promise<BrandingConfig>` como único ponto de consumo;
   `branding/types.ts::mapRawToBrandingConfig` valida e mapeia o DTO
   (`RawBrandingConfigDTO`, espelhando `SDD.md` §5/ADR-011 campo a campo,
   incluindo `status_validacao_contraste`) antes de expor o tipo interno.
   `useBrandingTokens`/`BrandTokensProvider` tratam os três estados esperados de
   uma chamada assíncrota real (`loading`/`ready`/`error`), com fallback visual
   acessível (`tokens.css`) enquanto a marca não chega ou falha ao carregar —
   comportamento correto tanto para o mock de hoje quanto para o endpoint real
   futuro.
   Confirmação por varredura de código: nenhuma cor de marca aparece hardcoded
   fora de `branding/brandingConfig.mock.ts` (fixture, explicitamente
   documentada como tal) e do fallback de pré-carregamento em `tokens.css`
   (`--color-brand-primary: var(--color-info)`, que referencia um **token de
   sistema**, não um hex de marca specific de tenant) — `grep` de padrão hex em
   `frontend/src/` não encontrou nenhuma cor de marca fora desses dois lugares
   e dos arquivos de teste.
   **Ver ressalva 1 abaixo** sobre a fonte de dado ser hoje um mock, não o
   endpoint real (BE-32).
2. **Regra de contraste dinâmico sobre `--color-brand-primary` (texto
   claro/escuro calculado automaticamente, ≥ 4.5:1 WCAG 2.1 AA)** — **Atendido**.
   `contrast/contrast.ts::pickAccessibleTextColor` implementa a fórmula de
   luminância relativa e razão de contraste do WCAG 2.1 (1.4.3) corretamente
   (validado por teste contra o valor de referência conhecido `#767676` sobre
   branco ≈ 4.54:1) e escolhe entre duas candidatas (clara/escura) a que atinge
   maior contraste contra a cor de marca recebida — nunca assume a priori que a
   marca é clara ou escura. Há uma rede de segurança (fallback preto/branco
   puro) para o caso teórico de nenhuma candidata configurada atingir 4.5:1,
   testada explicitamente. Suíte cobre uma amostra de 20 cores de marca
   distintas, todas atingindo ≥ 4.5:1.
3. **Camada 2 (tokens fixos, WCAG AA)** — reconferido de forma independente
   (não apenas aceito o relato): recalculei a razão de contraste de todos os
   tokens de Camada 2 contra `--color-bg-default` (#FFFFFF) — `--color-text-primary`
   15.20:1, `--color-success` 5.40:1, `--color-error` 6.54:1, `--color-warning`
   5.93:1, `--color-info` 6.42:1 — todos ≥ 4.5:1, confirma o comentário do
   código ("já verificados WCAG 2.1 AA"). `fixedTokenValues.sync.test.ts` evita
   divergência futura entre `fixedTokenValues.ts` (fonte usada pelo algoritmo)
   e `tokens.css` (fonte usada pela estilização) — boa prática de guarda
   automatizada, não presente no critério de aceite explícito mas reforça a
   robustez da Camada 2.
4. **Nenhum bug de severidade alta/crítica em aberto** — confirmado, nenhum
   encontrado.

#### Avaliação da decisão de não bloquear por BE-32 ainda não existir (mock local)

A pergunta levantada pelo orquestrador foi avaliada especificamente: o consumo
via `BRANDING_CONFIG` roda hoje contra `branding/brandingConfig.mock.ts` porque
BE-32 (Backend, Fase 3) ainda não existe. **Do ponto de vista de QA, essa
decisão é aceitável e não gera reprovação**, pelos seguintes motivos:

- O mecanismo de consumo é uma abstração real e testável (`fetchBrandingConfig`
  como função assíncrona única, com camada de validação/mapeamento de DTO
  separada do restante do design system) — não é um valor hardcoded disfarçado
  de "consumo via API". A troca pelo endpoint real é, de fato, um ajuste
  pontual e isolado em `brandingApi.ts`, como a nota de status de `TASK.md`
  descreve.
- `TASK.md` §4.4 já documenta, antes mesmo desta validação, que FE-01 (Frontend
  Fase 0) roda inteiramente em paralelo ao Backend Fase 0, sem dependência
  cruzada — não é uma reinterpretação de QA, é a decomposição original.
  Exigir integração real com um endpoint que **ainda não existe no backlog em
  execução** (BE-32 é Fase 3) não é um critério de aceite implícito razoável
  para uma tarefa fundacional de Fase 0.
- A regra de contraste dinâmico (o requisito de acessibilidade que mais importa
  neste critério de aceite) é matemática pura sobre o valor de
  `colorPrimary` recebido — indiferente à origem do dado (mock ou API real).
  Validar contra o mock já exercita a regra de forma equivalente ao que
  aconteceria com dado real.

**Ressalva 1 (débito registrado, severidade Baixa)**: `branding/brandingApi.ts`
contém um comentário afirmando textualmente que "a tarefa FE-01 não é
considerada Concluída enquanto esta função depender do mock" — isso **contradiz
diretamente** o status `Concluído` que consta hoje em `TASK.md` (decisão
documentada do orquestrador). Não é um bug funcional (não afeta build, teste ou
comportamento em runtime) — é uma inconsistência de rastreabilidade entre
código-fonte e o artefato de gestão (`TASK.md`), que pode confundir qualquer
leitor futuro do código (DevSecOps, CTO, o próprio Backend ao implementar
BE-32) sobre se a tarefa está de fato pronta. **Ação**: Frontend atualiza o
comentário em `brandingApi.ts` para refletir a decisão registrada em `TASK.md`
(mock aceito para Fase 0, troca mecânica quando BE-32 publicar o contrato) —
**prazo: próximo PR que tocar este arquivo, e no mais tardar até a publicação
de BE-32 em `API-CONTRACT.yaml`**, para não conviver indefinidamente com uma
autodeclaração de "não pronto" dentro do código de uma tarefa marcada pronta.

**Ressalva 2 (revalidação pendente, não é débito de código)**: o item do DoD
"testes de integração cruzada, quando a tarefa tem dependência entre
Backend/Frontend" **não pôde ser executado** para o par FE-01 ↔ BE-32, porque
BE-32 ainda não existe. Isto não é uma falha de FE-01 — é uma dependência ainda
não disponível. **Ação**: QA revalida especificamente o contrato de
`BRANDING_CONFIG` (formato real vs. `RawBrandingConfigDTO`, comportamento de
`mapRawToBrandingConfig` contra a resposta real, `status_validacao_contraste`
respeitado end-to-end conforme ADR-011/Guardrail G.29) assim que BE-32 publicar
o endpoint em `API-CONTRACT.yaml` e o Frontend trocar `brandingApi.ts` — este
item fica em aberto no backlog de QA (`cross-platform-integration-testing`),
não bloqueia FE-01 hoje.

#### Checklist de Pronto (DoD do agente QA) aplicado a FE-01

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Bug/débito de severidade baixa está registrado com prazo (Ressalva 1
      acima)
- [ ] Testes de integração cruzada — **não aplicável ainda** (BE-32 não existe;
      revalidação agendada, Ressalva 2, não é uma pendência que FE-01 possa
      resolver sozinha)
- [x] Requisito não funcional relevante validado (contraste WCAG 2.1 AA,
      Camada 1 e Camada 2, recalculado de forma independente nesta validação)

**Veredito**: **Aprovado com ressalvas.** Nenhum bug de severidade alta/crítica.
Duas ressalvas registradas (Seção acima), nenhuma bloqueante — status
`Concluído` em `TASK.md` **mantido** (guardrail deste agente: só reprovação
alta/crítica reverte o status para `Em andamento`).

### 1.2 BE-01 — Setup do monolito core (NestJS, estrutura modular por bounded context ADR-001, lint de fronteira de módulo, CI básico)

**Critério de aceite validado** (`TASK.md` §3.1, linha BE-01): "Projeto NestJS
inicializado com 1 módulo por bounded context do `SDD.md` §2.1 (mesmo vazio);
regra de lint impede import direto entre módulos fora da interface pública;
pipeline de CI roda lint+test em todo PR."

**Referências de especificação usadas na validação**: `SDD.md` §2.1 (lista
oficial dos 11 bounded contexts do monolito core), `GUARDRAILS.md` item 34
(ADR-001/ADR-005, fronteira de módulo obrigatória) e itens 36-39 (governança/
arquitetura correlatos), `TASK.md` §1.2 (ADR-005) e §4.2 (Fase 0).

**Código revisado**: `backend/src/app.module.ts`, `backend/src/modules/*`
(11 pastas), `backend/src/tooling/eslint-rules/module-boundary-rule.js` +
`module-boundary-rule.spec.ts`, `backend/eslint.config.mjs`,
`backend/src/app.module.spec.ts`, `backend/test/app.e2e-spec.ts`,
`.github/workflows/backend-ci.yml`.

#### Execução (reexecutada de forma independente por este agente, não apenas aceito o relato)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `backend/`) | 3 arquivos de teste, 25/25 testes passando |
| `npm run test:e2e` (`vitest run --config ./vitest.config.e2e.ts`) | 1/1 teste passando (`app.e2e-spec.ts`) |
| `npm run lint:boundaries` (`eslint src --max-warnings=0`) | Sem apontamentos |
| `npm run lint:oxlint` (`oxlint src/ test/`) | Sem apontamentos |
| `npm run build` (`nest build`) | Build limpo, sem erro |

#### Checklist de critério de aceite (item a item)

1. **"1 módulo por bounded context do `SDD.md` §2.1 (mesmo vazio)"** —
   **Atendido, verificado por contagem e nome, não só pelo relato**. `SDD.md`
   §2.1 lista exatamente 11 "Módulo de domínio" do monolito core (Identity &
   Access, Cadastro & Consentimento, Catálogo de Exames, Entrega de Laudo/
   Imagem, Compartilhamento, Auditoria, Config de Tenant/Branding, Gestão de
   Usuários, Ajuda/Suporte, Notificação, Fila de Exceção) — Web App/API-BFF/
   Integration Gateway/Imaging Gateway são explicitamente outros tipos de
   componente (Apresentação/Borda/serviço de borda comprado), não módulos do
   monolito, e corretamente **não** viraram módulo NestJS aqui. Conferido 1:1
   contra `backend/src/modules/` (11 pastas, exatamente esses nomes em
   kebab-case) e contra `app.module.ts` (11 imports, todos via barrel
   `index.ts`). Cada `*.module.ts` usa `@Module({})` vazio, com comentário
   rastreando o bounded context, os RFs/RNs cobertos e as tarefas de domínio
   futuras (BE-10 a BE-38) — "mesmo vazio" atendido literalmente, sem
   provider/controller prematuro (consistente com `TASK.md` §1.1,
   "implementar exatamente o que o critério de aceite exige"). Teste dedicado
   (`app.module.spec.ts`) automatiza essa checagem (lista os 11 módulos,
   confirma que todos estão em `imports` de `AppModule`, compila `AppModule`
   inteiro sem erro de wiring e cada módulo isoladamente) — reduz o risco de
   regressão silenciosa (módulo removido/renomeado sem atualizar a lista).
2. **"Regra de lint impede import direto entre módulos fora da interface
   pública"** — **Atendido, verificado por dois métodos independentes**: (a)
   `module-boundary-rule.spec.ts` usa `RuleTester` do ESLint cobrindo casos
   válidos (import dentro do próprio módulo, import via barrel de outro
   módulo, import de pacote externo, import relativo fora de `src/modules`) e
   inválidos (import direto de arquivo interno de outro módulo, import
   aninhado, re-export via `export * from`, `require()` legado, `AppModule`
   tentando pular o barrel, e um caso de regressão de mensagem quando o nome
   do módulo aparece duplicado no path) — todos passando; (b) **teste manual
   nesta validação**: criei um arquivo temporário dentro de
   `src/modules/identity-access/` importando diretamente
   `../cadastro-consentimento/cadastro-consentimento.module.js` (fora do
   barrel) e rodei `npm run lint:boundaries` — a regra pegou a violação
   corretamente (`boundary/no-deep-module-import`, mensagem apontando o
   módulo alvo e sugerindo o barrel correto); removido o arquivo em seguida e
   confirmado `lint:boundaries` limpo novamente, sem resíduo (`git status`
   confirmado sem alteração pendente em `backend/`). A regra está registrada
   em `eslint.config.mjs`, escopo `src/**/*.ts`, severidade `error`, alinhada
   a `GUARDRAILS.md` item 34.
3. **"Pipeline de CI roda lint+test em todo PR"** — **Atendido**.
   `.github/workflows/backend-ci.yml`, job `lint-and-test` (criado por BE-01,
   preservado pelo DevOps conforme comentário do próprio arquivo), disparado
   em `pull_request`/`push` com `paths: backend/**` (não roda em todo PR do
   repositório, roda em todo PR que toca `backend/**` — leitura correta do
   critério, já que o job vive dentro de um workflow com escopo de path
   explícito, comportamento equivalente a "todo PR" do ponto de vista do
   Backend). Passos: `lint:oxlint` → `lint:boundaries` → `test:cov` →
   `test:e2e` → `build` — cobre lint e test como exigido, com build como
   verificação adicional (não é um desvio do critério, é reforço). O job
   `tenant-isolation-test` (bloqueante, adicionado pelo DevOps para BE-04) e
   os estágios de deploy são adições posteriores fora do escopo de BE-01, não
   avaliados aqui — não interferem no veredito desta tarefa.
4. **"Nenhum bug de severidade alta/crítica em aberto"** — confirmado,
   nenhum encontrado.

#### Observações adicionais (não geram ressalva)

- Diferente de FE-01, BE-01 não tem dependência cruzada com nenhuma tarefa de
  outra frente ainda não implementada — é puramente infraestrutural
  (estrutura de módulo + lint + CI), então o item de DoD "testes de
  integração cruzada" é genuinamente não aplicável a esta tarefa específica
  (nenhuma tarefa consome contrato/API neste momento), não uma pendência em
  aberto como ocorreu em FE-01/BE-32.
- Nenhum código de domínio real existe ainda (todos os módulos
  intencionalmente vazios) — não há requisito não funcional de performance/
  usabilidade aplicável ao runtime do produto nesta tarefa; o "requisito não
  funcional" relevante aqui é a própria regra arquitetural (fronteira de
  módulo), validada em profundidade no item 2 acima (RuleTester + teste
  manual), o que este agente considera equivalente ao espírito do item do DoD
  para uma tarefa desta natureza.

#### Checklist de Pronto (DoD do agente QA) aplicado a BE-01

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Nenhum bug de severidade baixa/média identificado — nada a registrar
      como débito
- [x] Testes de integração cruzada — não aplicável a esta tarefa (ver
      observação acima), sem impacto no veredito
- [x] Requisito não funcional relevante validado (fronteira de módulo
      enforced por lint, verificada por teste automatizado e teste manual)

**Veredito**: **Aprovado.** Todos os três critérios de aceite verificados de
forma independente (não apenas revisão de relato) — contagem/nome dos 11
módulos conferida 1:1 contra `SDD.md` §2.1, regra de lint testada tanto via
suíte automatizada quanto manualmente nesta validação, pipeline de CI
confirmado com lint+test em todo PR de `backend/**`. Nenhum bug, nenhuma
ressalva. Status `Concluído` em `TASK.md` mantido.

### 1.3 FE-02 — Componentes estruturais globais (Header, Navegação, Footer, Modal de confirmação, Banner de mensagem)

**Critério de aceite validado** (`TASK.md` §3.10, linha FE-02): "Header renderiza
logo/nome/paleta dinamicamente por tenant; banner de mensagem não desloca layout
ao aparecer."

**Referências de especificação usadas na validação**: `UX-SPEC.md` §3.1
(componentes estruturais), §5.1 (regras transversais de acessibilidade WCAG 2.1
AA), §6.1/§6.2 (responsivo — colapso de navegação, modal em tela cheia no
mobile), `SDD.md` §5 (modelo de dados — entidades `TENANT`/`BRANDING_CONFIG`),
`GUARDRAILS.md` §H (itens 32-33, WCAG 2.1 AA).

**Código revisado**: `frontend/src/design-system/components/` (`Header`,
`Navigation`, `Footer`, `ConfirmationModal`, `MessageBanner`), reuso de
`frontend/src/design-system/branding/` (FE-01).

#### Execução (reexecutada de forma independente por este agente)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `frontend/`) | 87/87 testes passando, 12 arquivos de teste |
| `npm run test:coverage` (`vitest run --coverage`) | Confirmado por leitura do relatório HTML gerado (não apenas o texto resumido no terminal, que colapsa arquivos 100% cobertos): `Header` 100/100/100/100, `Footer` 100/100/100/100, `Navigation` 100/100/100/100, `MessageBanner` 100/100/100/100, `ConfirmationModal` 96.96% stmts / 93.33% branch / 100% funcs / 100% lines — números batem exatamente com o relato do Frontend em `TASK.md` |
| `npm run build` (`tsc -b && vite build`) | Build limpo, sem erro de tipo, 37 módulos transformados |
| `npm run lint` (`oxlint`) | Sem apontamentos |

#### Checklist de critério de aceite (item a item)

1. **"Header renderiza logo/nome/paleta dinamicamente por tenant"**:
   - **Logo e paleta**: **Atendido, plenamente**. `Header.tsx` consome
     `useBrandingTokensStatus()` (infraestrutura de FE-01, sem recriação) — a
     `<img>` do logo só renderiza quando `status === 'ready'` (evita imagem
     quebrada durante o carregamento, testado), `src` vem 100% de
     `appliedTokens.logoUrl`. A cor de fundo/texto do header
     (`--color-brand-primary`/`--color-brand-primary-contrast-text`) vem
     inteiramente de `applyBrandTokens` (FE-01) — nenhuma cor hardcoded em
     `Header.module.css`, incluindo a regra de contraste dinâmico do texto
     sobre a cor de marca (reconferida nesta validação: `--color-error`
     #B3261E e `--color-info` #1D5DB3, usados como fundo dos botões do
     `ConfirmationModal` com texto branco, mantêm ≥ 4.5:1 pela propriedade de
     simetria da fórmula de contraste WCAG — mesma razão já auditada em FE-01
     para essas cores contra fundo branco). Testado com dois tenants
     diferentes (`Header.test.tsx`), inclusive cenário de falha de rede (nome
     do hospital permanece visível, logo simplesmente não aparece).
   - **Nome do hospital**: **Atendido, com ressalva de rastreabilidade (não
     bloqueante)**. Reconferi a alegação do Frontend diretamente no `SDD.md`
     §5 (linha 270): `nome_institucional` é de fato um campo de `TENANT`, e a
     entidade `BRANDING_CONFIG` (linha 352-362) só tem `logo_url`,
     `paleta_cores` e os campos de validação de contraste (ADR-011) — **a
     alegação do Frontend está correta**; é o `UX-SPEC.md` §3.1 (linha 590)
     que diverge, ao descrever a fonte do nome como `BRANDING_CONFIG`. Isto
     não é uma reinterpretação de QA do critério de aceite — é a confirmação
     de uma divergência real e pré-existente entre dois documentos de
     especificação, que o Frontend já havia identificado e documentado no
     próprio componente em vez de decidir silenciosamente por uma das duas
     leituras.
     Dada essa divergência, a decisão de receber `hospitalName` como prop
     explícita (em vez de estender `BrandingConfig`, que corretamente já
     reflete o `SDD.md`) é razoável e evita recriar/estender um módulo já
     pronto e testado fora do escopo desta tarefa (FE-02 é puramente
     estrutural/apresentacional). No nível do componente, o critério **é
     satisfeito**: `Header` nunca hardcoda um nome, renderiza dinamicamente
     qualquer string recebida (testado com "Hospital Piloto" e "Hospital
     Tenant X" produzindo saídas distintas) — o mecanismo é genuinamente
     dinâmico por tenant, apenas a *fonte* do valor passado fica fora do
     componente.
     O ponto de atenção real, que não é responsabilidade de FE-02 resolver
     mas precisa ficar rastreado: hoje **não existe nenhuma tarefa explícita
     em `TASK.md`** que amarre `hospitalName` ao dado real de
     `TENANT.nome_institucional` em tempo de execução (ex.: carregado junto da
     sessão/login). Sem esse item no backlog, o app shell futuro pode acabar
     não conectando esse dado, e o gap só seria descoberto tarde. **Ver
     QA-DEBT-003** abaixo — registrado como débito de rastreabilidade/
     integração pendente, não como bug de FE-02, e sinalizado para o Tech
     Lead avaliar se cabe um item de tarefa dedicado (ex.: no app shell de
     TL-01/FE-05) e para UX-UI/BA corrigirem a redação de `UX-SPEC.md` §3.1.
2. **"Banner de mensagem não desloca layout ao aparecer"** — **Atendido**.
   `MessageBanner.tsx` monta a região externa (`.region`, `data-testid=
   "message-banner-region"`) incondicionalmente, com `min-height` reservado
   via estilo inline (`var(--message-banner-min-height, 48px)`, independente
   de cascata CSS); o conteúdo da mensagem em si só entra/sai da árvore
   internamente a essa região, sem remontar o nó externo — testado
   explicitamente (mesmo nó de região antes/depois de a mensagem aparecer,
   `min-height` idêntico nos dois estados). Mecanismo correto e verificado
   para o caso comum (mensagem de uma linha, cabe nos 48px reservados).
   **Ressalva de baixo risco**: como `min-height` é um mínimo, não uma altura
   fixa, uma mensagem longa o suficiente para quebrar em 2+ linhas ainda
   pode, em tese, empurrar o conteúdo abaixo dela — nenhum teste cobre esse
   cenário de mensagem longa/quebra de linha. Não é uma falha do mecanismo
   (o mecanismo em si — região sempre montada — é a abordagem correta), é
   uma lacuna de verificação com texto realista. **Ver QA-DEBT-004** abaixo.

#### Checklist transversal de acessibilidade (`UX-SPEC.md` §5.1 / `GUARDRAILS.md` H.32)

Verificado por leitura de código + suíte de testes (RTL/`user-event`, que
simula interação real de teclado, não apenas chamada direta de função):

- **Navegação por teclado completa**: `Navigation` — todos os itens
  alcançáveis via Tab, na ordem visual (testado); `ConfirmationModal` — foco
  preso dentro do modal em ambas as direções (Tab e Shift+Tab cíclicos,
  testado), `Escape` equivale a cancelar (testado); `MessageBanner` — botão
  de fechar alcançável por Tab e acionável por Enter (testado).
- **Foco movido/devolvido**: `ConfirmationModal` move o foco para o botão
  "Cancelar" (opção segura por padrão) ao abrir e devolve ao elemento que
  originou a abertura em todos os três caminhos de fechamento — confirmar,
  cancelar, Escape (todos os três testados individualmente com um "trigger"
  real).
- **Estado nunca só por cor**: `MessageBanner` sempre inclui rótulo textual
  (`Erro:`/`Sucesso:`/`Aviso:`/`Informação:`) e ícone por variante (testado
  para as 4 variantes); `ConfirmationModal` sinaliza ação destrutiva com
  ícone além da cor do botão (testado).
- **Rótulos programáticos**: `ConfirmationModal` usa `aria-labelledby`/
  `aria-describedby` apontando para título/descrição (testado via
  `toHaveAccessibleName`/`toHaveAccessibleDescription`); `Navigation` usa
  `aria-label` no botão de menu hambúrguer, dependente do estado
  aberto/fechado (testado); `Header` nunca renderiza `alt` vazio no logo.
- **Mensagens de erro anunciadas (`aria-live`)**: `MessageBanner` usa
  `role="status"`/`aria-live="polite"` por padrão e `role="alert"`/
  `aria-live="assertive"` quando `assertive` (bloqueios), ambos os caminhos
  testados.
- **Alvo de toque mínimo (44px)**: confirmado por leitura de CSS em todos os
  controles interativos — `MessageBanner` (`.dismiss`), `Navigation`
  (`.menuToggle`, `.link`, `.signOutButton`), `ConfirmationModal` (`.button`)
  — todos com `min-width`/`min-height: 44px`.
- **Responsivo (§6.1/§6.2)**: `Navigation` colapsa em menu hambúrguer abaixo
  de 600px — decisão de detalhe explicitamente permitida pela spec (§6.1
  registra "hambúrguer ou barra inferior" como decisão do Frontend
  Developer); a lógica ARIA/foco do toggle é testada diretamente via DOM
  (o motor de CSS do jsdom não avalia `@media` de forma confiável, limitação
  documentada no próprio teste — a regra visual em si fica sujeita a revisão
  visual, não a teste unitário). `ConfirmationModal` ocupa a tela inteira
  abaixo de 600px conforme §6.2 (confirmado por leitura de CSS,
  `ConfirmationModal.module.css` linha 69-84).

**Achado adicional (não gera ressalva de FE-02, registrado como débito para
tarefa futura)**: a prop `isConfirming`/estado "Processando…" do
`ConfirmationModal` (usado por tarefas futuras que disparam ação assíncrona,
ex. TL-27 revogar link, TL-32 desativar conta) tem 0% de cobertura de teste —
são exatamente as duas linhas não cobertas do componente (83, 144). A linha 83
é uma branch defensiva legítima (nenhum foco preso é possível com 0 elementos
focáveis, cenário que não ocorre na prática — o modal sempre tem ao menos os
2 botões). A linha 144, porém, é o texto "Processando…" em si — um estado
real e documentado do componente, nunca exercitado por teste. Não bloqueia
FE-02 (não faz parte do critério de aceite desta tarefa nem do DoD — o
componente em si funciona, é só uma lacuna de verificação), mas deve ser
coberto pela primeira tarefa que efetivamente usar `isConfirming={true}` em
produção. **Ver QA-DEBT-005**.

#### Checklist de Pronto (DoD do agente QA) aplicado a FE-02

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Bugs/débitos de severidade baixa registrados com prazo (QA-DEBT-003,
      QA-DEBT-004, QA-DEBT-005 abaixo)
- [ ] Testes de integração cruzada — **não aplicável ainda**: FE-02 é
      puramente estrutural/apresentacional, sem chamada de rede própria e sem
      consumidor real ainda (nenhuma tela integra estes componentes nesta
      tarefa); o próprio `hospitalName`/dado de tenant real é o ponto que
      ficará para integração futura (QA-DEBT-003)
- [x] Requisito não funcional relevante validado (acessibilidade WCAG 2.1 AA
      — teclado, foco, `aria-live`, estado nunca só por cor, alvo de toque,
      contraste dinâmico reconferido; responsivo conforme §6.1/§6.2)

**Veredito**: **Aprovado com ressalvas.** Nenhum bug de severidade alta/
crítica. Três débitos de baixa severidade registrados (nenhum bloqueante) —
status `Concluído` em `TASK.md` **mantido**. A decisão de detalhe do Frontend
sobre a fonte de `hospitalName` está tecnicamente correta em relação ao
`SDD.md` §5 (reconferido nesta validação) e o mecanismo de renderização é
genuinamente dinâmico por tenant no nível do componente; o que falta é
garantia de que uma tarefa futura efetivamente amarre esse dado ao valor real
de `TENANT.nome_institucional` — ponto registrado, não uma falha desta
tarefa.

### 1.4 BE-02 — PostgreSQL gerenciado + schema base multi-tenant (migrations, `tenant_id` em toda entidade de domínio)

**Critério de aceite validado** (`TASK.md` §3.1, linha BE-02): "Todas as tabelas
do `SDD.md` §5 criadas via migration versionada, incluindo os campos de ADR-011
(`BRANDING_CONFIG`) e **ADR-012** (`EXAM_FILE.dicom_study_instance_uid`/
`dicom_series_instance_uid`/`dicom_sop_instance_uid`, nullable;
`INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`, com constraint `UNIQUE`
**por tenant** conforme ADR-012); toda tabela exceto `TENANT` tem coluna
`tenant_id` não nula; `pgcrypto` habilitado para CPF."

**Referências de especificação usadas na validação**: `SDD.md` §5 (modelo de
dados completo, fonte da verdade das entidades), `GUARDRAILS.md` §A (itens 1-5,
isolamento multi-tenant — "regra de maior severidade deste projeto"), §D (itens
16-17, persistência/`pgcrypto`), §J (itens 37-39, governança do próprio
`GUARDRAILS.md`), `ADR-011` (campos de `BRANDING_CONFIG`), `ADR-012` (rastreio
DICOM + resolução de `tenant_id` via AE Title, incluindo a seção "Negative
Consequences").

**Código revisado**: `backend/migrations/` (15 arquivos `.ts`),
`backend/docs/migrations.md`, `backend/src/database/domain-tables.ts`,
`backend/test/migrations/schema.e2e-spec.ts`.

#### Execução (reexecutada de forma independente por este agente, não apenas aceito o relato)

| Comando | Resultado |
|---|---|
| `docker info` (pré-checagem, exigida para o e2e via testcontainers) | Docker disponível no ambiente desta validação |
| `npm run test` (`vitest run`, `backend/`) | 3 arquivos de teste, 25/25 testes passando |
| `npm run test:e2e` (`vitest run --config ./vitest.config.e2e.ts`) | 2 arquivos de teste, 46/46 testes passando, incluindo `test/migrations/schema.e2e-spec.ts` contra PostgreSQL 16 real via `@testcontainers/postgresql` (não mock) |
| `npm run lint` (`lint:oxlint` + `lint:boundaries`) | Sem apontamentos |
| `npm run build` (`nest build`) | Build limpo, sem erro |

Números batem exatamente com o relato do Backend em `TASK.md` (25 unit + 46
e2e).

#### Checklist de critério de aceite (item a item)

1. **"Todas as tabelas do `SDD.md` §5 criadas via migration versionada"** —
   **Atendido**. `SDD.md` §5 lista 15 entidades; `SESSION` anota a própria PK
   como "chave Redis" e `TASK.md` §1.2/ADR-007 já definem sessão em Redis
   (BE-05), não Postgres — leitura literal do modelo, não uma omissão (mesma
   conclusão a que este agente chegaria lendo o `SDD.md` de forma
   independente). As 14 tabelas restantes (`tenants` + 13 de domínio) existem
   e são criadas por 15 migrations versionadas (`node-pg-migrate`, decisão de
   ferramenta documentada e razoável em `backend/docs/migrations.md` — BE-02 é
   só schema, não acopla a um ORM que BE-03 ainda vai escolher). Verificado por
   teste automatizado (`it.each(ALL_TABLES)`) rodando contra Postgres real —
   reexecutado nesta validação, 46/46 passando, incluindo os 15 casos de
   existência de tabela.
2. **"Campos de ADR-011 (`BRANDING_CONFIG`)"** — **Atendido**. Os 5 campos
   (`status_validacao_contraste` com `CHECK` de enum e default `pendente`,
   `metodo_validacao`, `validado_por`, `validado_em`,
   `observacoes_validacao`) existem em `branding_configs`
   (`1788336720000_create-branding-configs-table.ts`), nullability conferida
   linha a linha contra o texto de ADR-011 — `status_validacao_contraste` é o
   único `NOT NULL` (correto, é o campo que precisa nascer `pendente` para
   todo registro), os outros 4 são opcionais até a validação acontecer.
   Testado (positivo: default `pendente` em insert real; negativo: valor fora
   do enum rejeitado pelo `CHECK`) — ambos reexecutados, passando.
3. **"Campos de ADR-012 (`EXAM_FILE`, UIDs DICOM nullable)"** — **Atendido**.
   `dicom_study_instance_uid`/`dicom_series_instance_uid`/
   `dicom_sop_instance_uid` existem em `exam_files`, todos nullable (correto —
   ADR-012 é explícito que só se aplicam a origem DICOM), com `varchar(64)`
   (compatível com o tamanho máximo de UID DICOM, 64 caracteres pelo próprio
   padrão). Testado (nullability dos 3 campos) — passando. Achado adicional,
   não contido no critério de aceite mas coerente com a "Decision Outcome" de
   ADR-012 ("cada instância DICOM convertida gera um `EXAM_FILE`... o SOP
   Instance UID é o identificador mais específico"): `dicom_sop_instance_uid`
   recebe um índice único parcial (ignora `NULL`) — reforço correto e
   documentado, não avaliado como desvio porque não contradiz nenhum critério
   escrito nem nenhuma regra de `GUARDRAILS.md`.
4. **"`INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`, com constraint
   `UNIQUE` por tenant conforme ADR-012"** — **Ver análise dedicada abaixo**
   (Ponto de Atenção). Coluna existe, nullable, `varchar(16)` (limite real do
   protocolo DICOM para AE Title). Constraint de unicidade existe e está
   testada (positivo e negativo) — mas o **escopo** da unicidade implementada
   (global) diverge da leitura literal mais natural do texto "`UNIQUE` por
   tenant" (composta `(tenant_id, dicom_remote_ae_title)`).
5. **"Toda tabela exceto `TENANT` tem coluna `tenant_id` não nula"** —
   **Atendido, sem exceção**. As 13 tabelas de domínio (`DOMAIN_TABLES` em
   `src/database/domain-tables.ts`) têm `tenant_id uuid NOT NULL` com FK para
   `tenants(id)` — inclusive em tabelas onde o diagrama do `SDD.md` §5 não
   lista `tenant_id` explicitamente (`accounts`, `mfa_factors`,
   `consent_records`, `exam_results`, `exam_files`, `share_links`,
   `audit_events`). Este agente concorda com a leitura do Backend: o próprio
   `SDD.md` §5 diz que o diagrama "não é modelagem física detalhada — cabe ao
   Backend Developer depois", e `GUARDRAILS.md` regra A.1 exige a coluna "em
   toda entidade de domínio... sem exceção" — adicionar a coluna mesmo onde o
   diagrama simplificado não a desenhou é a leitura mais conservadora e
   correta da regra de maior severidade do projeto, não uma extrapolação de
   escopo. `tenants` (única exceção) confirmada sem a coluna. Verificado por
   `it.each(DOMAIN_TABLES)` (nullability, tipo `uuid`, FK) — 13 casos,
   reexecutados nesta validação, todos passando.
6. **"`pgcrypto` habilitado para CPF"** — **Atendido, verificado com dado
   real, não só a existência da coluna**. Extensão habilitada na primeira
   migration. `users.cpf_criptografado` (bytea, via `pgp_sym_encrypt`) +
   `users.cpf_hash` (sha-256 hex, para lookup/unicidade determinística, já que
   `pgp_sym_encrypt` usa IV aleatório e não é pesquisável por igualdade) — uso
   de duas colunas é uma decisão de detalhe razoável e documentada, não
   contradiz o critério (que só exige "habilitado para CPF", não prescreve o
   desenho de coluna). Testado com valor real de CPF (`12345678900`),
   criptografado e decifrado corretamente, hash com 64 caracteres — e teste
   negativo de duplicidade de CPF (hash) dentro do mesmo tenant rejeitado.
   Ambos reexecutados nesta validação, passando. `gen_random_uuid()` (também
   de `pgcrypto`) reaproveitado como default de toda PK — não fazia parte do
   critério de aceite, mas é um uso correto e sem custo adicional da mesma
   extensão já exigida.
7. **"Nenhum bug de severidade alta/crítica em aberto"** — nenhum bug
   funcional encontrado. Ver Ponto de Atenção abaixo para a única ressalva
   desta tarefa (não é um bug funcional).

#### Ponto de atenção específico — escopo da constraint `UNIQUE` de `dicom_remote_ae_title`

**Pergunta orientadora**: a unicidade **global** implementada pelo Backend
(em vez de composta `(tenant_id, dicom_remote_ae_title)`, leitura mais natural
de "`UNIQUE` por tenant") é uma correção justificada de ambiguidade no
critério de aceite, ou um desvio de escopo que deveria ter sido escalado antes
de implementar?

**Análise técnica** (concordância com o raciocínio do Backend): reli ADR-012
com atenção, especificamente a seção "Negative Consequences": *"Se dois
hospitais, por erro de configuração externa ao sistema, usarem o mesmo AE
Title de origem, a resolução de tenant falha silenciosamente atribuindo ao
tenant errado — mitigação: validação de unicidade de
`dicom_remote_ae_title` por tenant fica registrada aqui como requisito não
funcional... (constraint `UNIQUE`)."* O risco nomeado é exatamente colisão
**entre** tenants (hospital A e hospital B usando o mesmo AE Title). Uma
constraint composta `(tenant_id, dicom_remote_ae_title)` **não mitigaria esse
risco** — ela só impediria um único tenant de cadastrar o mesmo AE Title duas
vezes (cenário que a própria tabela, 1:1 com `TENANT`, já impede de outra
forma). Para efetivamente impedir dois tenants de colidirem no mesmo AE
Title — a falha de segurança que o próprio ADR-012 nomeia e que
`GUARDRAILS.md` regra A.5 proíbe ("PROIBIDO atribuir `tenant_id` de forma
implícita/hardcoded... nunca por qualquer... heurística implícita") — a
unicidade **precisa** ser sobre o valor da coluna através de todos os
tenants, ou seja, global. Do ponto de vista puramente técnico, a implementação
do Backend está correta e a leitura literal composta seria, na prática, uma
constraint que não cumpre o próprio objetivo de segurança que a motivou.

**Mas isto não encerra a questão para QA.** Por guardrail deste agente, não
cabe reinterpretar silenciosamente um critério de aceite — e aqui o texto
"`UNIQUE` por tenant" não está só em `TASK.md`: está **replicado literalmente
em `GUARDRAILS.md`, regra A.5** ("`dicom_remote_ae_title` tem constraint
`UNIQUE` por tenant"), dentro da **Seção A**, que o próprio documento
descreve como "a regra de maior severidade deste projeto". `GUARDRAILS.md`
tem processo de governança explícito para exatamente este tipo de situação:

- Regra 39: *"Toda inconsistência entre este documento e o `SDD.md`/ADRs é
  reportada via `BLOCKERS.md` (**nunca resolvida unilateralmente por quem a
  encontrar**) — escalada a `tech-lead`... ou `software-architect`..."*
- Regras 37-38: qualquer exceção pontual a uma regra de `GUARDRAILS.md` só
  entra em vigor registrada no "Log de Alterações" do próprio documento, com
  aprovação do CTO.

O Backend **identificou corretamente** a inconsistência entre a redação
literal ("por tenant") e o objetivo declarado de ADR-012 (impedir colisão
entre tenants) — e documentou essa análise de forma exemplar, tanto no
comentário da migration
(`1788336780000_create-integration-endpoint-configs-table.ts`) quanto em
`backend/docs/migrations.md`. Mas **resolveu essa inconsistência de forma
unilateral no código**, em vez de escalar via `BLOCKERS.md` como a regra 39 do
próprio `GUARDRAILS.md` exige para este exato cenário (inconsistência entre
`GUARDRAILS.md` e a intenção de um ADR) — e não há nenhuma entrada nova no
"Log de Alterações" de `GUARDRAILS.md` (regras 37-38) registrando isso como
exceção aprovada pelo CTO. Não é um bug de execução pontual (não é o tipo de
achado que se escala isolado ao Tech Lead, por guardrail deste agente) — é uma
lacuna de processo/governança sobre a seção mais sensível do projeto, que
merece resolução formal (não porque o resultado técnico esteja errado, mas
porque a Seção A não deveria ter exceção sem rastro de aprovação, inclusive
para não criar precedente para BE-03/BE-04/BE-38, que dependem diretamente
desta mesma área).

**Conclusão de QA**: dado o critério de aceite escrito, este item **não está
literalmente atendido como composto por tenant** — mas a implementação global
é, com alta confiança técnica, a leitura correta do objetivo real de ADR-012 e
a que efetivamente protege contra o risco que a própria regra A.5 de
`GUARDRAILS.md` proíbe. Registrado como **débito de severidade Média** (não
Alta/Crítica — não há falha de segurança na implementação atual, ao
contrário: a leitura literal teria sido a opção menos segura), não bloqueante
para BE-02, mas com prazo curto porque toca a Seção A de `GUARDRAILS.md`. Ver
**QA-DEBT-006**.

#### Checklist de Pronto (DoD do agente QA) aplicado a BE-02

- [x] Todo critério de aceite da tarefa foi testado e está passando (com a
      ressalva de escopo/redação registrada acima, sem impacto funcional)
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Débito de severidade média está registrado com prazo (QA-DEBT-006
      abaixo)
- [x] Testes de integração cruzada — não aplicável a esta tarefa (schema puro,
      sem guard de aplicação/RLS ainda — isso é BE-03/BE-04, por desenho
      explícito do próprio `TASK.md`); a suíte contra Postgres real via
      testcontainers cumpre o papel de "integração" possível nesta camada
- [x] Requisito não funcional relevante validado (reversibilidade completa das
      15 migrations testada e reexecutada; `pgcrypto` validado com dado real,
      não só schema)

**Veredito**: **Aprovado com ressalvas.** Todos os critérios de aceite
funcionais verificados de forma independente (25 unit + 46 e2e reexecutados
contra Postgres real via testcontainers, lint e build limpos). Nenhum bug de
severidade alta/crítica. Uma ressalva de severidade Média registrada (escopo
da constraint `UNIQUE` de `dicom_remote_ae_title` implementado como global em
vez de composto por tenant, tecnicamente justificado mas resolvido sem passar
pelo processo de escalonamento que `GUARDRAILS.md` regra 39 exige para
inconsistências na Seção A) — não bloqueante, status `Concluído` em `TASK.md`
**mantido** (guardrail deste agente: só reprovação alta/crítica reverte o
status para `Em andamento`). **Recomendação ao Tech Lead**: formalizar a
resolução — atualizar a redação de `TASK.md` (BE-02) e `GUARDRAILS.md` (regra
A.5) para "`UNIQUE` global (todo o universo de tenants), não composta com
`tenant_id`", com uma linha nova no "Log de Alterações" de `GUARDRAILS.md`
(regras 37-38), fechando formalmente a ambiguidade antes de BE-38 (que
consome esta mesma coluna) ser implementada.

### 1.5 FE-03 — Componentes de formulário (máscara CPF, seletor de data acessível, indicador de força de senha, campo de código MFA, checkboxes de aceite padrão vs. destacado)

**Critério de aceite validado** (`TASK.md` §3.10, linha FE-03): "Todos
navegáveis por teclado; checkbox de consentimento de dado de saúde visual e
programaticamente distinto do aceite geral (RN-02); campo de código MFA aceita
colar código completo, não só digitação célula a célula."

**Referências de especificação usadas na validação**: `UX-SPEC.md` §3.2
(componentes de formulário, inclusive a nota "dois variantes distintos,
deliberadamente diferentes visualmente" para os checkboxes e "auto-avanço com
fallback acessível" para o MFA), §5.1 (regras transversais de acessibilidade),
§5.2 (ponto de risco específico de TL-05 — distinção precisa existir na árvore
de acessibilidade, não só no CSS — e de TL-13 — colar o código em qualquer
caixa é obrigatório, auto-avanço é reforço opcional), `PRD-TECNICO.md` RN-01
(maioridade, contexto do `DateOfBirthField`) e RN-02 (consentimento específico
e destacado, Art. 11, I), `GUARDRAILS.md` item 25 (Seção F — **proibido**
implementar o consentimento de dado de saúde como checkbox único combinado com
o aceite geral, em qualquer tela ou versão futura) e itens 32-33 (Seção H,
WCAG 2.1 AA como critério de aceite por tela, proibição de hardcode de
parâmetro "a confirmar").

**Código revisado**: `frontend/src/design-system/components/{CpfField,
DateOfBirthField,PasswordField,MfaCodeField,TermsAcceptanceCheckbox,
HealthDataConsentCheckbox}/` (implementação + `*.test.tsx` de cada um).

#### Execução (reexecutada de forma independente por este agente, não apenas aceito o relato)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `frontend/`) | 18 arquivos de teste, 152/152 testes passando — bate com o número relatado em `TASK.md` |
| `npm run build` (`tsc -b && vite build`) | Build limpo, sem erro de tipo, 51 módulos transformados |
| `npm run lint` (`oxlint`) | Sem apontamentos |

#### Checklist de critério de aceite (item a item)

1. **"Todos navegáveis por teclado"** — **Atendido**, verificado por leitura
   de código + suíte (`user-event`, que simula interação real de teclado, não
   apenas chamada direta de função) nos 6 componentes: `CpfField` (`Tab`,
   digitação com máscara progressiva), `DateOfBirthField` (`Tab` entre os três
   `<select>` nativos, dentro de `<fieldset>/<legend>`, cada um com `<label>`
   próprio visualmente oculto mas presente na árvore de acessibilidade),
   `PasswordField` (`Tab` alcança o campo e o botão "Mostrar/Ocultar", este
   com `aria-pressed`), `MfaCodeField` (`Tab`/`Shift+Tab` nativo entre as 6
   caixas, `Backspace` e setas `←`/`→` tratados explicitamente em
   `handleKeyDown`), `TermsAcceptanceCheckbox`/`HealthDataConsentCheckbox`
   (`Tab` + `Espaço`, testado individualmente). Nenhum dos 6 depende de mouse
   em nenhum teste.
2. **"Checkbox de consentimento de dado de saúde visual e programaticamente
   distinto do aceite geral (RN-02)"** — **Atendido, e a decisão de dois
   componentes separados (em vez de um único componente com prop de
   variante) não é apenas uma interpretação razoável — é a única opção
   permitida.** `GUARDRAILS.md` item 25 (Seção F) é textual: "**PROIBIDO**
   implementar como checkbox único combinado, em qualquer tela ou versão
   futura." Isso não decide sozinho a questão de "dois componentes React vs.
   uma prop de variante", mas a leitura mais robusta do espírito da regra —
   reforçada por `UX-SPEC.md` §5.2/TL-05 ("a distinção precisa existir também
   na árvore de acessibilidade, não só no CSS") — é exatamente a que o
   Frontend escolheu: dois componentes fisicamente distintos garantem que a
   distinção nunca dependa de quem compõe a tela lembrar de passar a prop
   correta; uma variante configurável de um único componente deixaria aberta
   a possibilidade de alguém usar o componente "genérico" sem perceber que
   precisava da variante destacada, o que reintroduziria por acidente o
   risco que a Seção F do `GUARDRAILS.md` nomeia como proibido.
   Verificado em profundidade, não apenas aceito o relato: `TermsAcceptanceCheckbox`
   é deliberadamente simples (label + input, sem agrupamento). `HealthDataConsentCheckbox`
   está dentro de `role="group"` com `aria-label="Consentimento específico
   para dado de saúde"` (nome acessível de grupo próprio, testado via
   `getByRole('group', { name: ... })`), moldura/fundo tingido/ícone
   (`aria-hidden`)/selo textual (nunca só cor — confirmado em CSS e teste), e
   o `aria-label` do próprio `<input>` **combina** o rótulo do grupo com o
   texto de consentimento (`"Consentimento específico para dado de saúde:
   Autorizo especificamente..."`) — testado tanto isoladamente quanto em um
   teste de integração dedicado com os dois componentes lado a lado
   (`HealthDataConsentCheckbox.test.tsx`, describe "distinção em relação a
   TermsAcceptanceCheckbox"), que confirma nomes acessíveis distintos, só um
   dos dois dentro de um `role="group"` nomeado, e que marcar um não afeta o
   estado do outro. A alegação de "accessible name nunca colide, com teste de
   integração dos dois lado a lado" no relato do Frontend **é precisa**, não
   inflada.
3. **"Campo de código MFA aceita colar código completo, não só digitação
   célula a célula"** — **Atendido, verificado em profundidade nos dois
   pontos de atenção pedidos**:
   - **Colar em célula do meio**: `MfaCodeField.tsx::fillFrom` sempre
     preenche a partir do índice 0, independentemente de qual caixa recebeu o
     evento — tanto `handlePaste` (evento `onPaste` nativo) quanto o fallback
     de `handleChange` chamam `fillFrom(0, digits)`. Testado explicitamente
     colando na primeira caixa **e** na caixa de índice 3 de 6
     (`'cola o código completo em uma caixa do meio e ainda assim preenche
     tudo'`), ambos preenchendo todas as 6 caixas corretamente e disparando
     `onComplete`. Também testado: paste com caracteres não numéricos
     (filtrados antes de distribuir) e paste parcial (preenche a partir da
     primeira caixa, sem chamar `onComplete` prematuramente).
   - **Fallback de `onChange` multi-caractere** (navegadores que não disparam
     `onPaste` corretamente, ex. autofill/IME): `handleChange` detecta
     `event.target.value` com mais de um dígito e delega para o mesmo
     `fillFrom(0, digits)` — **não é apenas código defensivo não exercitado**,
     há teste dedicado que simula exatamente esse cenário via
     `fireEvent.change` (que dispara só o evento de mudança, sem o evento de
     paste do navegador) na caixa de índice 2 com valor `'789'`, confirmando
     que as 3 primeiras caixas são preenchidas a partir do índice 0 mesmo sem
     `onPaste` ter disparado. Este é exatamente o comportamento pedido no
     ponto de atenção e está coberto, não é uma alegação não verificável.
   - `role="group"` com dica textual visível ("Você pode colar o código
     completo em qualquer um dos campos abaixo.") reforça a UX-SPEC §5.2/TL-13
     de que colar em qualquer caixa é o caminho primário, auto-avanço é
     reforço opcional (também testado, digitação célula a célula funciona
     independentemente de paste).
4. **"Nenhum bug de severidade alta/crítica em aberto"** — confirmado,
   nenhum encontrado.

#### Checklist transversal de acessibilidade (`UX-SPEC.md` §5.1 / `GUARDRAILS.md` H.32)

- **Estado nunca só por cor**: `PasswordField` — cada item da checklist de
  política tem ícone (`✓`/`○`, `aria-hidden`) + texto + status textual
  adicional só para leitor de tela (`.srOnly`, "— atendido"/"— pendente");
  rótulo de força ("Fraca"/"Média"/"Forte") é sempre texto explícito, nunca
  só a cor da barra (barra em si marcada `aria-hidden`, redundante com o
  texto). `MfaCodeField`/demais campos — erro sempre com `role="alert"` +
  texto, nunca só borda vermelha.
- **Alvo de toque mínimo (44px)**: confirmado por leitura de CSS —
  `MfaCodeField` (`.cell`, 44×44px), `TermsAcceptanceCheckbox`/
  `HealthDataConsentCheckbox` (`.row`/wrapper, `min-height: 44px`).
- **Mensagens de erro anunciadas**: `externalError` de `CpfField`,
  `MfaCodeField`, `PasswordField`, `DateOfBirthField` todos renderizam
  `role="alert"` associado via `aria-describedby`/`aria-invalid`, testado.
- **`DateOfBirthField`** — decisão de três `<select>` em vez de
  `<input type="date">` é a leitura correta de `UX-SPEC.md` §3.2 ("não apenas
  `<input type=date>` sem fallback"); recálculo dinâmico de dias por mês/ano
  (incluindo fevereiro em ano não informado tratado como 28 dias, ano de
  referência não-bissexto) e preservação de dia/ano ao trocar só o mês
  conferidos por leitura de código — corretos.
- **`CpfField`** — `cpf.ts::isValidCpf` implementa o algoritmo padrão de
  dígito verificador (módulo 11) e rejeita sequências repetidas (ex.:
  `000.000.000-00`, que passam no cálculo do DV mas nunca são CPF real) —
  reconferido lendo o algoritmo, correto.

#### Ponto de atenção específico — `PasswordField`, política de senha configurável (default 8 caracteres + maiúscula/minúscula/número)

**Pergunta orientadora**: é aceitável o Frontend decidir esse default
sozinho, ou deveria ter sido escalado?

**Análise**: `PRD-TECNICO.md` de fato não fixa nenhum valor numérico para
"política mínima" (linha 659, nó de decisão do fluxograma de recuperação de
senha, sem detalhamento em nenhum RN/RF). A implementação segue o princípio
correto de `GUARDRAILS.md` item 33 (nunca hardcodar parâmetro "a confirmar" —
sempre consumido de configuração): `PasswordPolicy` é uma prop, não um valor
fixo no componente, e o default está documentado no próprio código com a
justificativa. Neste sentido, a decisão **não viola nenhum guardrail** e o
componente em si está correto e bem testado.

Mas há uma diferença relevante em relação ao precedente citado
(`TASK.md` §1.7): todos os parâmetros ali listados (tentativas de login,
timeout de sessão, janela de MFA, prazo de link) são parâmetros de
**responsabilidade única** — cada um pertence inteiramente a um agente
(majoritariamente Backend) que também é quem valida a regra em runtime.
Política de senha é diferente: é um parâmetro que precisa ser **idêntico**
nos dois lados — o indicador visual do Frontend (o que este critério de
aceite de FE-03 pede) só tem valor real se o Backend validar exatamente a
mesma regra ao criar/redefinir a senha (RF-15/cadastro, RF-02/recuperação,
`TASK.md` FE-11/BE-18). Hoje, nenhuma tarefa de Backend em `TASK.md` (BE-18,
nem nenhuma outra) menciona política de senha explicitamente — não há ainda
um "dono" formal do valor no lado servidor. Se Backend, ao implementar,
adotar um valor diferente do default do Frontend (ex.: exigir caractere
especial, que aqui está `false`), o paciente veria a checklist do Frontend
como "atendida" (100%, "Forte") e ainda assim teria a senha rejeitada pelo
servidor — divergência de UX, não uma falha de segurança (o servidor sempre
revalida, então não há bypass), mas evitável.

Isto não é, na visão deste agente, motivo de reprovação — a implementação
está correta, testada e não contradiz nenhum guardrail (diferente do caso de
`BE-02`/QA-DEBT-006, onde havia texto literal de `GUARDRAILS.md` Seção A
contradito sem passar por escalonamento formal). É um **débito de
coordenação de baixa severidade**, semelhante em natureza a QA-DEBT-003:
registrado para o Tech Lead consolidar um valor único de política de senha
(usando o default do Frontend como proposta razoável, ou ajustando-o) antes
que Backend implemente a validação server-side equivalente. **Ver
QA-DEBT-007.**

#### Checklist de Pronto (DoD do agente QA) aplicado a FE-03

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Débito de severidade baixa está registrado com prazo (QA-DEBT-007
      abaixo)
- [ ] Testes de integração cruzada — **não aplicável ainda**: os 6
      componentes são puros (sem chamada de rede própria) e ainda não têm
      tela consumidora nesta tarefa (FE-06/FE-07/FE-11 etc. seguem `A Fazer`)
      — não é uma pendência que FE-03 possa resolver sozinha
- [x] Requisito não funcional relevante validado (acessibilidade WCAG 2.1 AA
      — teclado, estado nunca só por cor, rótulos programáticos, `aria-live`/
      `role="alert"`, alvo de toque 44px — todos reconferidos nesta validação)

**Veredito**: **Aprovado com ressalvas.** Os três critérios de aceite
explícitos (navegação por teclado, distinção de RN-02, colar código MFA em
qualquer caixa incluindo fallback sem `onPaste`) estão implementados e
testados corretamente, reexecutados de forma independente nesta validação
(152/152 testes, lint e build limpos). Nenhum bug de severidade alta/crítica.
Um débito de baixa severidade registrado (coordenação de política de senha
entre Frontend e Backend, QA-DEBT-007), não bloqueante — status `Concluído`
em `TASK.md` **mantido** (guardrail deste agente: só reprovação alta/crítica
reverte o status para `Em andamento`).

### 1.6 BE-03 — Guard de aplicação obrigatório de `tenant_id` + políticas RLS por tabela

**Regra de maior severidade do projeto (`GUARDRAILS.md` Seção A) — validado com
atenção redobrada**, conforme instrução explícita de acionamento desta
validação.

**Critério de aceite validado** (`TASK.md` §3.1, linha BE-03): "Nenhuma query de
repositório executa sem `tenant_id` do contexto (guard testado); RLS habilitado
e testado em toda tabela de domínio."

**Referências de especificação usadas na validação**: `GUARDRAILS.md` Seção A
(itens 1-5, "a regra de maior severidade deste projeto") e item 34 (fronteira de
módulo/lint de arquitetura), `SDD.md` §7.4 (isolamento multi-tenant), ADR-004,
ADR-006 (risco nomeado explicitamente: "RLS mal configurado gera falso senso de
segurança"), `TASK.md` §1.3.

**Código revisado**: `backend/src/database/tenant-scoped.repository.ts`,
`backend/src/database/tenant-context.ts`, `backend/src/database/database.module.ts`,
`backend/src/tooling/eslint-rules/no-raw-kysely-outside-database-rule.js`,
`backend/migrations/1788336900000_create-app-database-role.ts`,
`backend/migrations/1788336960000_enable-row-level-security.ts`,
`backend/test/database/tenant-guard-and-rls.e2e-spec.ts`,
`backend/docs/tenant-guard-and-rls.md`.

#### Execução (reexecutada de forma independente por este agente, não apenas aceito o relato)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `backend/`) | 5 arquivos de teste, 41/41 testes passando — bate com o número relatado em `TASK.md` |
| `npm run test:e2e` (`vitest run --config ./vitest.config.e2e.ts`) | 3 arquivos de teste, 71/71 testes passando, contra PostgreSQL 16 real via `@testcontainers/postgresql` (não mock) — bate com o número relatado |
| `npm run lint` (`lint:oxlint` + `lint:boundaries`) | Sem apontamentos |
| `npm run build` (`nest build`) | Build limpo, sem erro |

#### Checklist de critério de aceite, item a item — com verificação manual adversarial (não só leitura de código)

1. **"RLS habilitado e testado em toda tabela de domínio"** — **Atendido,
   confirmado por leitura estrutural E por ataque manual independente** (não
   apenas rodando a suíte do Backend). Além de reexecutar
   `tenant-guard-and-rls.e2e-spec.ts` (que confirma `relrowsecurity`/
   `relforcerowsecurity`/política em todas as 13 tabelas via `pg_class`/
   `pg_policies`), este agente subiu um container PostgreSQL 16 **avulso**
   (`docker run`, independente do testcontainers usado pela suíte automatizada),
   rodou as migrations reais (`npm run migrate:up`) e atacou manualmente via
   `psql`, conectado como a role de runtime real `portalmed_app`:
   - Sem `app.tenant_id` definido, `SELECT` sem `WHERE` → **0 linhas** (falha
     fechada confirmada).
   - `SET app.tenant_id = ''` (string vazia) → erro de cast (`invalid input
     syntax for type uuid`), nunca abre para todas as linhas — falha fechada
     mesmo neste caso de borda.
   - Com `app.tenant_id` = tenant A, `SELECT` sem `WHERE` → só linhas do
     tenant A; tentativa explícita de `SELECT ... WHERE tenant_id = <tenant B>`
     estando "logado" como tenant A → **0 linhas** (RLS sobrepõe até uma
     tentativa deliberada de filtrar pelo outro tenant no `WHERE`).
   - **`INSERT` com `tenant_id` do tenant B enquanto a sessão está com
     `app.tenant_id` = tenant A → rejeitado** (`new row violates row-level
     security policy`) — `WITH CHECK` confirmado nesta validação, não só
     aceito o relato do Backend.
   - **`UPDATE` tentando reatribuir `tenant_id` de uma linha do tenant A para o
     tenant B → rejeitado** pelo mesmo motivo — `WITH CHECK` também bloqueia
     reatribuição via `UPDATE`, confirmado manualmente.
   - `DELETE` cross-tenant por `id` direto (tenant A tentando apagar uma linha
     do tenant B pelo identificador) → 0 linhas afetadas, linha do tenant B
     preservada.
   - `portalmed_app` confirmado com `rolsuper = false` e `rolbypassrls = false`
     (via `pg_roles`) — a role de runtime realmente está sujeita a RLS, não é
     uma exceção disfarçada.
   - Confirmado, como a documentação do Backend afirma, que a role
     dona/superusuário das migrations **não** é restringida pela política
     mesmo com `FORCE` — reforça por que `DatabaseModule` nunca pode conectar
     com essa role (`database.module.ts` falha explicitamente, com erro claro,
     se `APP_DATABASE_URL` não estiver configurada — não há fallback silencioso
     para `DATABASE_URL`, verificado por leitura de código).
   RLS está genuinamente implementada, falha fechada de forma robusta
   (inclusive em caso de borda não coberto pela suíte automatizada, a string
   vazia) e `WITH CHECK` bloqueia reatribuição — **este item específico do
   critério de aceite está solidamente atendido e verificado de forma
   independente**, além do que a suíte do Backend já demonstrava.
2. **"Nenhuma query de repositório executa sem `tenant_id` do contexto (guard
   testado)"** — **NÃO atendido de forma estrutural — ver achado de severidade
   Alta abaixo.** A suíte automatizada do Backend testa corretamente o caminho
   feliz e o caminho de esquecimento óbvio (chamar um método do repositório sem
   `TenantContext.run()` ativo lança `MissingTenantContextError`), mas não
   testa o cenário adversarial que a própria classe promete impedir por
   construção — ver análise completa abaixo.

#### Achado de severidade Alta — o guard de aplicação não é genuinamente estrutural; é estrutural apenas contra um dos dois vetores de bypass previstos

**O que a documentação afirma** (`tenant-scoped.repository.ts` e
`backend/docs/tenant-guard-and-rls.md`): que nenhuma subclasse consegue
acessar `this.db` diretamente porque (a) o campo é `private`, e (b) mesmo que
alguém tentasse, a regra de lint `no-raw-kysely-outside-database` impede
qualquer arquivo fora de `src/database/` de sequer importar `kysely`/`pg` —
"então nem o import necessário para escrever um cast indevido está disponível
fora deste diretório", e "isso exigiria primeiro violar esta regra de lint
(visível em CI), não só 'esquecer' de usar o guard".

**Verificação manual pedida pelo orquestrador** (item 1: "tente identificar
algum caminho que um desenvolvedor futuro descuidado poderia usar para
bypassar... escrever query sem passar por `TenantScopedRepository`"):

1. Testei primeiro os três vetores que a regra de lint realmente cobre —
   todos corretamente bloqueados, confirmando que a regra funciona bem para o
   que se propõe: criei três arquivos temporários dentro de
   `src/modules/catalogo-exames/` (removidos logo em seguida, `git status`
   confirmado limpo depois): (a) `import { Kysely } from 'kysely'`, (b)
   `import { Client } from 'pg'`, (c) `await import('kysely')` (import
   dinâmico). Rodei `npm run lint:boundaries` para cada um — a regra pegou os
   três, com mensagem clara apontando `GUARDRAILS.md` regra A.2.
2. **Mas identifiquei um quarto vetor, que não importa `kysely` nem `pg` em
   lugar nenhum e por isso não é visto pela regra de lint**: criei uma
   subclasse de `TenantScopedRepository` (mesmo padrão de uso legítimo que
   qualquer tarefa de domínio futura, BE-10+, vai seguir) e, dentro dela,
   acessei o campo "privado" via cast:
   ```ts
   const rawConnection = (this as unknown as { db: unknown }).db as any;
   return rawConnection.selectFrom('exception_queue_items').selectAll().execute();
   ```
   Este arquivo **não importa `kysely` nem `pg`** — usa o objeto já recebido
   pela classe-base, disponível em `this` de qualquer subclasse. `private` do
   TypeScript é apagado na compilação (não é o `#campo` nativo do
   JavaScript/ES2022+) — é uma checagem só do compilador, não uma barreira em
   tempo de execução. `npm run lint:boundaries`, `npm run lint:oxlint` e
   `npm run build` (`nest build`, `tsconfig.json` já usa `target: ES2023`,
   compatível com campos privados nativos) — **todos passaram limpos** com
   este arquivo presente. A afirmação da documentação de que bypassar "exigiria
   primeiro violar a regra de lint" está **factualmente incorreta** para este
   vetor específico.
3. **Testei o efeito real, não só a compilação**: subi um container
   PostgreSQL efêmero via `@testcontainers/postgresql` (mesmo padrão da suíte
   do Backend), rodei as migrations reais, instanciei o repositório malicioso
   conectado com a `APP_DATABASE_URL`/role `portalmed_app` real (a mesma que a
   aplicação usaria em produção) e chamei o método acima **sem nenhum
   `TenantContext.run()` ativo**. Resultado: a query **executou** (nenhum
   `MissingTenantContextError`, nenhuma exceção) e retornou `[]` (lista
   vazia) — não os dados de nenhum tenant. **A query de repositório executou
   sem `tenant_id` do contexto** — o critério de aceite, lido literalmente
   ("Nenhuma query de repositório executa sem `tenant_id` do contexto"), **não
   foi cumprido neste caminho**. O motivo de não ter havido vazamento de dado
   real é que a RLS (segunda camada, independente) barrou a query por
   `app.tenant_id` nunca ter sido definido nessa conexão — exatamente o
   comportamento de falha fechada já confirmado no item 1 acima. **Ou seja: a
   defesa em profundidade que `ADR-004`/`ADR-006`/`GUARDRAILS.md` exigem
   funcionou na prática e evitou vazamento de dado real neste teste
   específico** — mas funcionou apesar do guard de aplicação ter sido
   inteiramente contornado, não porque o guard tenha barrado a tentativa. Se
   um desenvolvedor futuro, usando este mesmo padrão de acesso direto, também
   reproduzisse (mesmo que por engano, copiando o próprio trecho de
   `runOnTable` como referência, já visível no mesmo arquivo) a chamada
   `set_config('app.tenant_id', ...)` com um valor forjado/errado — cenário
   bem mais provável do que pode parecer, já que o próprio código de
   `TenantScopedRepository` usa esse padrão como exemplo de referência a poucas
   linhas do campo que acabou de ser acessado indevidamente — a RLS validaria
   exatamente esse valor forjado, e aí sim haveria vazamento real de dado
   cross-tenant, sem o guard de aplicação ter interceptado nada em momento
   algum.
4. Todos os arquivos e testes temporários criados para esta verificação foram
   removidos ao final (`rm`), `dist/` reconstruído do zero, e a suíte
   completa (41 unit + 71 e2e + lint + build) reexecutada para confirmar que o
   repositório voltou ao estado limpo original antes de este relatório ser
   escrito.

**Causa raiz**: `private readonly db: Kysely<Database>` em
`tenant-scoped.repository.ts` usa a palavra-chave `private` do TypeScript
(apagada em tempo de compilação), não o campo privado nativo do JavaScript
(`#db`, suportado desde ES2022 — o `tsconfig.json` do projeto já usa
`target: ES2023`, plenamente compatível). A regra de lint
`no-raw-kysely-outside-database` cobre corretamente o vetor "importar
`kysely`/`pg` diretamente", mas esse não é o único caminho para se obter uma
referência à conexão real — qualquer subclasse já tem `this.db` "ao alcance"
de um simples cast `as any`, sem precisar de nenhum import adicional.

**Por que isto é severidade Alta, não Média/Baixa**: este projeto tem a
condição explícita do CTO/Gate 2 (`GUARDRAILS.md` regra A.4, `TASK.md` §1.3)
de que a camada de acesso a dado não pode depender de um único ponto de
falha, e o próprio `ADR-006` nomeia nominalmente o risco de "falso senso de
segurança" quando uma camada não é o que a documentação alega que é. Aqui, a
alegação central de BE-03 — "guard de aplicação obrigatório... estrutural, não
convenção" — está incompleta: é estrutural contra um vetor de bypass
(import direto), mas não contra outro (acesso ao campo "privado" via
subclasse + cast), que não exige violar nenhuma regra de lint visível em CI.
Por instrução explícita desta validação ("se encontrar qualquer forma real de
bypass, trate como severidade alta e reprove") e por se tratar da Seção A do
`GUARDRAILS.md`, este agente trata o achado como bloqueante.

**Correção recomendada ao Backend** (não prescritiva sobre a implementação
exata, mas a mais direta disponível): trocar `private readonly db` por um
campo privado nativo (`#db`) em `TenantScopedRepository` — torna o campo
genuinamente inacessível em tempo de execução para qualquer código fora do
corpo da própria classe, inclusive de dentro de uma subclasse com `as any`,
fechando este vetor por completo (o `tsconfig.json` do projeto já é
compatível, `target: ES2023`). Recomenda-se também um teste de regressão
permanente cobrindo especificamente este vetor (uma subclasse tentando o
mesmo acesso, confirmando que não há mais nenhuma forma de obter a conexão
crua sem passar pelos métodos protegidos) — este agente sugere que esse teste
seja incorporado à própria suíte de BE-03 (ou, no mínimo, referenciado
explicitamente no escopo de BE-04, já que BE-04 é a tarefa formalmente
responsável pela suíte adversarial exaustiva de vazamento cruzado, mas hoje
seu escopo descrito em `TASK.md` fala de "ID guessing", não de escape de
encapsulamento — vale o Backend/Tech Lead confirmar que este vetor específico
fica coberto por alguma das duas tarefas, não apenas assumido implicitamente).

#### Ponto de atenção específico — decisão de escopo de não fazer o wiring de middleware HTTP nesta tarefa

**Pergunta orientadora**: a decisão do Backend de não popular `TenantContext`
a partir da sessão HTTP real nesta tarefa, deixando para BE-14 (sessão)/BE-16
(RBAC), é aceitável para fechar BE-03?

**Análise**: **Sim, aceitável, sem ressalva.** O critério de aceite de BE-03,
lido literalmente, é sobre a existência e o teste do mecanismo do guard e da
RLS ("guard testado"; "RLS... testada"), não sobre a integração ponta a ponta
com a sessão autenticada — que depende de BE-14/BE-16, ainda `A Fazer` e
fora do escopo desta tarefa por desenho do próprio `TASK.md` (Seção 3.1 vs.
3.2). Este é o mesmo padrão de deferimento explícito e documentado já usado
por BE-02 (deferir guard/RLS para BE-03) e pela própria BE-03 (deferir a
suíte exaustiva de ID guessing para BE-04, e a restrição de privilégio de
`audit_events` para BE-29) — um padrão consistente de escopo incremental
neste projeto, sempre com a lacuna registrada explicitamente (não uma omissão
silenciosa). Não gera ressalva nem contribui para o veredito de reprovação
abaixo, que é motivado inteiramente pelo achado de severidade Alta.

#### Checklist de Pronto (DoD do agente QA) aplicado a BE-03

- [ ] Todo critério de aceite da tarefa foi testado e está passando — **RLS
      sim; guard de aplicação, não** (achado de severidade Alta acima)
- [ ] Nenhum bug de severidade alta/crítica em aberto — **1 bug de severidade
      Alta em aberto** (ver Seção 2, `QA-BUG-001`)
- [x] Nenhum bug de severidade baixa/média identificado nesta tarefa
      específica além do já registrado acima
- [x] Testes de integração cruzada — não aplicável ainda (não há tarefa de
      domínio, BE-10+, consumindo `TenantScopedRepository` nesta fase;
      BE-04, próxima tarefa, é quem formaliza a suíte adversarial completa —
      recomenda-se que o vetor encontrado aqui seja incorporado ao escopo de
      BE-04 ou corrigido antes dela, ver recomendação acima)
- [x] Requisito não funcional relevante validado (RLS como camada
      independente, falha fechada, `WITH CHECK`, tudo confirmado por ataque
      manual nesta validação, não só aceito o relato)

**Veredito**: **Reprovado.** RLS está corretamente implementada, testada e
confirmada de forma independente por ataque manual nesta validação (fail
closed robusto, inclusive em caso de borda; `WITH CHECK` bloqueia
reatribuição via `UPDATE` e inserção cross-tenant via `INSERT`; role de
runtime sem `bypassrls`/`superuser`). **Mas o guard de aplicação não é
genuinamente estrutural** — existe um caminho real, verificado nesta
validação (não hipotético), que permite a uma subclasse de
`TenantScopedRepository` executar uma query de repositório sem
`tenant_id` do contexto, sem violar a regra de lint que a documentação
descreve como a barreira que tornaria isso impossível. A RLS evitou
vazamento de dado real neste teste específico (defesa em profundidade
funcionando), mas o guard de aplicação — a primeira camada, e a camada que o
próprio critério de aceite nomeia explicitamente ("guard testado") — não
cumpre a garantia que alega cumprir. Por se tratar da Seção A de
`GUARDRAILS.md` ("regra de maior severidade deste projeto") e por instrução
explícita desta validação de tratar qualquer forma real de bypass como
severidade Alta, o status de BE-03 em `TASK.md` **volta de `Concluído` para
`Em andamento`**, retornando ao Backend (não ao Tech Lead — não há aqui um
padrão recorrente de decomposição, é um achado de execução pontual desta
tarefa). Ver `QA-BUG-001` (Seção 2) para a reprodução completa e a correção
recomendada.

### 1.6.1 BE-03 — Revalidação de `QA-BUG-001` (2026-09-03) e novo achado (`QA-BUG-002`)

**Gatilho**: Backend aplicou a correção recomendada em 1.6 (`private readonly db`
→ `#db`, mais `runOnTable` → `#runOnTable`, campos privados nativos do
JavaScript), adicionou teste de regressão adversarial replicando o vetor
original, e o orquestrador confirmou a correção e voltou o status de BE-03
para `Concluído` em `TASK.md`. Esta seção revalida **empiricamente** — não
apenas por leitura do código/relato — o vetor original, reexecuta a suíte
completa, rechecagem manual de RLS, e (por instrução explícita desta
validação) investiga se algum vetor de bypass novo passou a existir.

#### Revalidação do vetor original de `QA-BUG-001` — CONFIRMADO FECHADO

Não bastou ler os comentários do código nem confiar no teste de regressão que
o próprio Backend escreveu — este agente escreveu um spec e2e temporário
próprio (`backend/test/database/qa-revalidation-temp.e2e-spec.ts`, removido
ao final, `git status`/`ls` confirmados limpos depois), com uma subclasse de
`TenantScopedRepository` replicando **literalmente** o cast original:

```ts
const exposed = (this as unknown as { db: unknown }).db;        // agora undefined
const exposed2 = (this as unknown as { runOnTable: unknown }).runOnTable; // agora undefined
```

Resultado, contra Postgres real via `@testcontainers/postgresql` (não mock):
ambos os casts resolvem para `undefined` (não mais a conexão real nem a
função). Adicionalmente, verificado que `Reflect.ownKeys(repo)`,
`Object.getOwnPropertyNames(repo)` e `for...in` **não expõem** `db`/
`runOnTable` de nenhuma forma — confirma que campos privados nativos do
JavaScript (`#db`/`#runOnTable`) não aparecem em nenhum mecanismo de
introspecção de propriedade comum, diferente de `private` do TypeScript
(que é só checagem de compilador). O vetor descrito em `QA-BUG-001` está
**genuinamente fechado**, não apenas "difícil" — é uma barreira de runtime
real da linguagem, não uma convenção.

Suíte completa reexecutada de forma independente por este agente após a
correção: `npm run test` (5 arquivos, 41/41 passando), `npm run test:e2e`
(3 arquivos, 72/72 passando, Postgres real via testcontainers), `npm run
lint` (`lint:oxlint` + `lint:boundaries`, sem apontamentos), `npm run build`
(`nest build`, limpo) — todos os números batem exatamente com o relato do
Backend/orquestrador em `TASK.md`.

#### Releitura da RLS — confirmada correta, não afetada pela correção

A correção de `QA-BUG-001` tocou exclusivamente
`tenant-scoped.repository.ts` (modificador de campo/método); nenhuma
migration foi alterada. Ainda assim, este agente não assumiu isso só pela
leitura — subiu **um segundo container Postgres avulso**, independente do
testcontainers da suíte (mesmo padrão da validação original em 1.6), rodou
`npm run migrate:up` com as migrations reais e reatacou manualmente via
`psql`, conectado como a role de runtime `portalmed_app`:

- Sem `app.tenant_id`, `SELECT` sem `WHERE` → **0 linhas** (falha fechada).
- `app.tenant_id = ''` (string vazia) → `ERROR: invalid input syntax for
  type uuid` (mesmo caso de borda já confirmado em 1.6, comportamento
  idêntico).
- `app.tenant_id` = tenant A → só linhas do tenant A.
- `INSERT` com `tenant_id` do tenant B enquanto a sessão está com
  `app.tenant_id` = tenant A → **rejeitado** (`new row violates row-level
  security policy`).
- `UPDATE` tentando reatribuir `tenant_id` de A para B → **rejeitado** pelo
  mesmo motivo.
- `portalmed_app`: `rolsuper = false`, `rolbypassrls = false` — confirmado
  novamente.

Comportamento **idêntico**, item a item, ao que já havia sido confirmado na
validação original (Seção 1.6) — a correção de `QA-BUG-001` não afetou a
RLS, como esperado (nenhuma migration tocada). Container e role temporários
removidos ao final (`docker rm -f`).

#### Achado novo — `QA-BUG-002`: token de DI `KYSELY_CONNECTION` injetável fora de `TenantScopedRepository`

Por instrução explícita desta revalidação ("se encontrar qualquer novo vetor
de bypass, trate como severidade Alta e reprove"), este agente não se limitou
a confirmar o vetor original — testou também se a *arquitetura* do guard
(não só o campo `#db`) resiste a um ataque análogo por outro caminho.

**O que a documentação afirma** (`kysely-connection.ts`,
`tenant-guard-and-rls.md`): que `KYSELY_CONNECTION` só é reexportado pelo
barrel público de `src/database/index.ts` para que repositórios concretos de
domínio (BE-10+) possam `@Inject(KYSELY_CONNECTION)` no próprio construtor e
repassar a `super(...)` — e que a regra de lint
`no-raw-kysely-outside-database` mais o encapsulamento de `#db` tornam
impossível o acesso à conexão real fora do padrão sancionado.

**O que este agente verificou, empiricamente, contra Postgres real (mesmo
spec temporário citado acima, Parte 2)**: `KYSELY_CONNECTION` é um token de
injeção de dependência do NestJS **exportado por `DatabaseModule`**
(`exports: [KYSELY_CONNECTION]`, `database.module.ts`) e **reexportado pelo
barrel público** `src/database/index.ts`. Nada impede que **qualquer**
provider comum do NestJS — não uma subclasse de `TenantScopedRepository`,
sem nenhuma relação com ela — declare `@Inject(KYSELY_CONNECTION)` no
próprio construtor e receba a mesma instância real da conexão, desde que o
módulo que o contém importe `DatabaseModule` (algo que qualquer módulo de
domínio legítimo **precisa** fazer de qualquer forma, para poder repassar a
conexão ao `super()` do seu repositório concreto real):

```ts
// Nenhum import de 'kysely'/'pg' — não aciona no-raw-kysely-outside-database.
// Nenhuma extensão de TenantScopedRepository — o campo #db é irrelevante aqui.
import { Inject, Injectable } from '@nestjs/common';
import { KYSELY_CONNECTION } from '../../database/index.js';

@Injectable()
class NotARepositoryService {
  constructor(@Inject(KYSELY_CONNECTION) private readonly rawConnection: unknown) {}
  runRawQuery() {
    return (this.rawConnection as any).selectFrom('exception_queue_items').selectAll().execute();
  }
}
```

Testado com um módulo NestJS real (`@nestjs/testing`, `Test.
createTestingModule`) importando `DatabaseModule` + este provider, contra
Postgres real via testcontainers, **sem nenhum `TenantContext.run()` ativo
em nenhum momento**: a chamada `runRawQuery()` **executou sem lançar
nenhuma exceção** (nenhum `MissingTenantContextError`, nenhum `TypeError`) e
retornou um array (vazio, `0` linhas, confirmado por log explícito no
teste). O array vazio não é o guard de aplicação funcionando — é,
exatamente como em `QA-BUG-001`, a RLS (segunda camada, independente)
negando a query por `app.tenant_id` nunca ter sido definida nessa conexão.
**A query de repositório executou sem `tenant_id` do contexto**, passando
limpo por `lint:oxlint`, `lint:boundaries` e `build` — nem a regra de lint
que bloqueia `import kysely/pg` nem o encapsulamento de `#db` têm qualquer
efeito sobre este caminho, porque ele não usa nenhum dos dois: usa
diretamente o token de DI que a própria arquitetura precisa expor para o uso
legítimo funcionar.

**Por que isto é severidade Alta, mesma régua de `QA-BUG-001`**: é um vetor
real, não hipotético, verificado empiricamente contra banco real, que viola
a mesma garantia nomeada pelo critério de aceite de BE-03 ("nenhuma query de
repositório executa sem `tenant_id` do contexto") e toca a Seção A do
`GUARDRAILS.md`. É plausível que um desenvolvedor futuro (BE-10+) precisando
de uma consulta ad hoc/projeção/relatório dentro de um serviço de domínio
comum — não um repositório — opte por injetar `KYSELY_CONNECTION`
diretamente em vez de criar um repositório completo, exatamente porque o
token está exportado e documentado como disponível para esse propósito
(ainda que o propósito pretendido seja só repassar ao `super()`) — nenhum
lint, nenhum tipo e nenhum encapsulamento de classe intercepta esse uso.
Defesa em profundidade (RLS) evitou vazamento real neste teste específico,
mas o guard de aplicação foi genuinamente contornado, do mesmo jeito
estrutural que `QA-BUG-001` descreveu.

**Correção recomendada ao Backend** (não prescritiva): `KYSELY_CONNECTION`
não deveria ser reexportado pelo barrel público `src/database/index.ts` (nem
diretamente injetável por módulos de domínio) — em vez disso,
`src/database/` pode expor uma função fábrica (ex.:
`provideTenantScopedRepository(ConcreteRepositoryClass)`) que os módulos de
domínio usam para registrar seu repositório concreto como provider, sem
nunca precisarem de `@Inject(KYSELY_CONNECTION)` no próprio código — a
injeção do token continuaria acontecendo, mas inteiramente dentro de
`src/database/`, nunca exposta a um arquivo de domínio. Alternativa
complementar: nova regra de lint (mesmo padrão de
`no-raw-kysely-outside-database`) proibindo `@Inject(KYSELY_CONNECTION)`/
uso do identificador `KYSELY_CONNECTION` fora de `src/database/` e fora do
próprio construtor de uma subclasse de `TenantScopedRepository` — tornando o
uso indevido visível em CI, mesmo que a exportação do token continue
existindo.

#### Checklist de Pronto (DoD do agente QA) aplicado a esta revalidação de BE-03

- [x] `QA-BUG-001` revalidado de forma empírica independente — confirmado
      corrigido
- [x] Suíte completa reexecutada (41 unit + 72 e2e + lint + build, limpos)
- [x] RLS relida e reatacada manualmente — confirmada correta e não afetada
      pela correção
- [ ] Nenhum bug de severidade alta/crítica em aberto — **novo bug de
      severidade Alta encontrado** (`QA-BUG-002`, acima)

**Veredito**: **Reprovado (novamente).** `QA-BUG-001` está genuinamente
corrigido — reconhecido aqui de forma explícita, com evidência própria, não
apenas aceitando a correção do Backend. Mas esta revalidação, seguindo a
mesma exigência de rigor adversarial que motivou o achado original, expôs
um segundo vetor de bypass do guard de aplicação (`QA-BUG-002`, severidade
Alta), estruturalmente análogo ao primeiro (RLS conteve o impacto real,
guard de aplicação não interceptou a tentativa). Por se tratar novamente da
Seção A do `GUARDRAILS.md` e por instrução explícita desta validação, o
status de BE-03 em `TASK.md` **permanece/volta para `Em andamento`**,
retornando ao Backend (não ao Tech Lead — ainda não configura padrão
recorrente entre tarefas distintas; é o mesmo tipo de achado dentro da
mesma tarefa, tratado como reprovação normal, não escalonamento). Ver
`QA-BUG-002` (Seção 2) para a reprodução completa e a correção recomendada.

### 1.6.2 BE-03 — Revalidação final (rodada 3, 2026-09-03): `QA-BUG-002` fechado, BE-03 aprovado

**Gatilho**: Backend aplicou a correção recomendada em 1.6.1 (`KYSELY_CONNECTION`
deixou de ser reexportado pelo barrel público `src/database/index.ts`; nova
função fábrica `provideTenantScopedRepository(RepositoryClass)` como único
jeito sancionado de um módulo de domínio registrar seu repositório concreto,
injeção do token inteiramente dentro de `src/database/`; nova regra de lint
`boundary/no-kysely-connection-token-outside-database` proibindo qualquer
referência ao identificador fora de `src/database/`, incluindo deep-import
por fora do barrel; teste de regressão e2e `[QA-BUG-002]` replicando o
`NotARepositoryService` original), e o orquestrador confirmou/revisou a
correção e voltou o status de BE-03 para `Concluído` em `TASK.md`. Esta
revalidação repete a mesma exigência de rigor empírico das duas rodadas
anteriores — não aceita o relato do Backend nem do orquestrador por leitura,
reproduz o vetor original com um spec próprio e independente
(`backend/test/database/qa-be03-revalidation-r3-temp.e2e-spec.ts`, removido
ao final, `ls`/`git status` confirmados limpos depois) e testa
explicitamente as duas variações pedidas (deep-import direto para
`kysely-connection.ts`, import renomeado).

#### Leitura de código antes do ataque — confirma a descrição da correção

`backend/src/database/index.ts` revisado linha a linha: `KYSELY_CONNECTION`
não consta mais entre os símbolos exportados (só `DatabaseModule`,
`provideTenantScopedRepository`, `TenantScopedRepository`, `TenantContext`/
`MissingTenantContextError`, `DOMAIN_TABLES`/`TENANT_TABLE`).
`provide-tenant-scoped-repository.ts` confirmado como o único arquivo de
`src/database/` (além de `kysely-connection.ts` e `database.module.ts`) que
referencia o identificador — via `inject: [KYSELY_CONNECTION]` dentro de um
`useFactory`, nunca exposto ao construtor de um repositório concreto de
domínio. `tenant-scoped.repository.ts` confirmado sem `@Inject` no próprio
construtor (recebe `connection: unknown` como parâmetro comum) — os campos
`#db`/`#runOnTable` de `QA-BUG-001` seguem privados nativos, inalterados por
esta correção.

#### Ataque 1 — reprodução literal do vetor original de `QA-BUG-002` (via barrel)

Reconfirmado, de forma independente do teste de regressão do próprio
Backend: `barrel.KYSELY_CONNECTION` (import dinâmico do barrel, de dentro do
spec temporário deste agente) é `undefined`,
`Object.prototype.hasOwnProperty.call(barrel, 'KYSELY_CONNECTION')` é
`false`. Um `@Inject(KYSELY_CONNECTION)` obtendo o token por este caminho
nunca resolveria um provider real — o vetor literal do relato original
(`NotARepositoryService` importando o token do barrel público) está
**genuinamente fechado**, e de forma mais forte que `QA-BUG-001`: aqui nem
um `import` estático de fora de `src/database/` apontando para o barrel
compilaria mais (`tsc` rejeitaria "has no exported member"), não é apenas
uma barreira de runtime.

#### Ataque 2 — variação pedida: deep-import direto para `kysely-connection.ts` (por fora do barrel)

Este é o ponto que exigiu o maior rigor desta rodada, porque o resultado
**não é** um fechamento estrutural equivalente ao de `QA-BUG-001`/ao do
próprio barrel — é importante que este relatório seja preciso sobre isso,
não apenas repetir "fechado".

Verificado com um provider real do NestJS (`@nestjs/testing`,
`Test.createTestingModule`), contra Postgres real via testcontainers,
**sem nenhum `TenantContext.run()` ativo**, importando o token por um
`import` **estático**, de dentro deste próprio spec de teste, apontando
direto para o arquivo interno:

```ts
const { KYSELY_CONNECTION } = await import('../../src/database/kysely-connection.js');
// KYSELY_CONNECTION está definido — o mesmo Symbol real usado por DatabaseModule.
```

- **Em runtime/compilação, nada impede este caminho.** Verificado
  explicitamente nesta validação: criei dois arquivos reais (não hipotéticos,
  não apenas casos de `RuleTester`) dentro de
  `src/modules/catalogo-exames/` — um com `import { KYSELY_CONNECTION } from
  '../../database/kysely-connection.js'` (deep-import) e outro com
  `import { KYSELY_CONNECTION as RenamedToken } from
  '../../database/kysely-connection.js'` (renomeado) — e rodei `npm run
  build` (`nest build`) com ambos presentes: **compilou limpo, sem nenhum
  erro**. O sistema de módulos do TypeScript/Node não tem noção de
  "diretório interno/privado" — só a regra de lint dedicada intercepta isso.
- **A regra de lint intercepta, confirmado de forma independente do
  `RuleTester` do próprio Backend**: rodei `npm run lint:boundaries` contra
  os mesmos dois arquivos reais (não apenas o `RuleTester` que o Backend
  escreveu) — ambos reportados por `boundary/no-kysely-connection-token-
  outside-database`, mensagem apontando corretamente para `GUARDRAILS.md`
  regra A.2/`QA-BUG-002` e sugerindo `provideTenantScopedRepository`.
  Arquivos removidos em seguida, `npm run lint:boundaries` e `npm run build`
  reexecutados limpos, `git status` confirmado sem resíduo.
- **Testado o efeito real caso o lint fosse ignorado/pulado** (cenário
  adversarial pedido nesta rodada — não hipotético, testado): montei um
  módulo NestJS real (`Test.createTestingModule({ imports: [DatabaseModule],
  providers: [ServiçoComOToken] })`) com um provider replicando
  `NotARepositoryService`, mas obtendo o token via este deep-import em vez
  do barrel. O módulo **compilou e montou normalmente** (nenhum erro de
  injeção, diferente do Ataque 1) e `runRawQuery()` **executou** sem lançar
  `MissingTenantContextError`, retornando `[]` (0 linhas) — de novo, não
  porque o guard de aplicação interceptou, mas porque a RLS negou o acesso
  por `app.tenant_id` nunca ter sido definida nessa conexão (mesmo padrão de
  defesa em profundidade de `QA-BUG-001`/`QA-BUG-002`). Contagem de linhas
  antes/depois idêntica — nenhuma escrita ocorreu.

**Conclusão sobre este vetor**: diferente do vetor primário de `QA-BUG-002`
(reexportação pelo barrel, agora fechado em tempo de compilação) e diferente
de `QA-BUG-001` (agora uma barreira real de linguagem via `#db`), o vetor de
deep-import é fechado **apenas** por uma barreira de CI (lint), não por uma
barreira estrutural de compilador/runtime — um desenvolvedor que
commitasse esse código e cujo PR não rodasse `lint:boundaries` (ou que
ignorasse o erro) ainda conseguiria, em tese, contornar o guard de
aplicação por este caminho específico, contido apenas pela RLS como última
linha de defesa. **Isto não é, por si, um novo bug de severidade Alta**: é
exatamente a "alternativa complementar" que este próprio agente recomendou
em 1.6.1 como fechamento razoável do vetor residual, e é o mesmo padrão de
defesa (identificador/import proibido por regra de lint dedicada,
`--max-warnings=0` em `eslint.config.mjs`, bloqueante em CI) já usado e já
validado como aceitável por este agente para `no-raw-kysely-outside-database`
(Seção 1.6, item 1) e para `no-deep-module-import` (Seção 1.2/BE-01) — não é
um padrão novo nem mais fraco do que o resto da arquitetura deste projeto já
aceita. Registrado como **débito de severidade Baixa**, não bloqueante — ver
`QA-DEBT-012` abaixo.

#### Ataque 3 — variação pedida: import renomeado

Testado nos dois níveis: (a) lint, via o arquivo real descrito acima
(`KYSELY_CONNECTION as RenamedToken`) — reportado normalmente, o `imported.
name` (nome original antes do alias) é o que a regra inspeciona, não o nome
local; (b) runtime, no spec temporário — o alias não muda o valor resolvido
(`RenamedToken === mod.KYSELY_CONNECTION`, o mesmo `Symbol`), então não abre
nenhum caminho adicional além do já coberto pelo Ataque 2. Nenhum achado novo.

#### Reconfirmação de `QA-BUG-001` nesta rodada

Não assumido apenas porque a correção de `QA-BUG-002` não tocou
`tenant-scoped.repository.ts` (confirmado por leitura, mas não só por
leitura) — o spec temporário desta rodada replica de novo o cast original
(`(this as unknown as { db: unknown }).db`, `runOnTable`) contra uma nova
instância de conexão real via testcontainers: ambos resolvem `undefined`,
como nas duas rodadas anteriores. Vetor permanece fechado.

#### Padrão sancionado — confirmado íntegro

`provideTenantScopedRepository` testado ponta a ponta nesta rodada (spec
próprio, não o do Backend): resolve o repositório concreto via DI real do
NestJS, `MissingTenantContextError` sem `TenantContext.run()` ativo,
round-trip correto com contexto — nenhuma linha do código de domínio
referencia `KYSELY_CONNECTION`.

#### Execução (reexecutada de forma independente por este agente, após remoção de todos os arquivos temporários)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `backend/`) | 6 arquivos de teste, 50/50 passando — bate com o relato do Backend/orquestrador em `TASK.md` |
| `npm run test:e2e` (`vitest run --config ./vitest.config.e2e.ts`) | 3 arquivos de teste, 75/75 passando, Postgres real via `@testcontainers/postgresql` — bate com o relato |
| `npm run lint` (`lint:oxlint` + `lint:boundaries`) | Sem apontamentos |
| `npm run build` (`nest build`) | Build limpo, sem erro |

Todos os arquivos temporários desta rodada (2 arquivos reais de lint em
`src/modules/catalogo-exames/`, 1 spec e2e em `backend/test/database/`)
removidos ao final; suíte acima reexecutada depois da remoção para confirmar
que os números batem com o estado permanente do repositório, sem resíduo.

#### Checklist de Pronto (DoD do agente QA) aplicado a esta revalidação de BE-03

- [x] `QA-BUG-001` revalidado de forma empírica independente pela terceira
      vez — confirmado corrigido
- [x] `QA-BUG-002` (vetor literal via barrel) revalidado de forma empírica
      independente — confirmado corrigido, inclusive em tempo de compilação
- [x] Variações pedidas nesta rodada (deep-import, import renomeado)
      testadas empiricamente, nos dois níveis (lint real contra arquivo
      real, não só `RuleTester`; runtime contra Postgres real) — vetor
      residual identificado e caracterizado com precisão (defesa só em CI,
      não em runtime/compilador), mas não configura novo bug de severidade
      Alta/Crítica pelos motivos acima
- [x] Suíte completa reexecutada (50 unit + 75 e2e + lint + build, limpos,
      bate com o relato)
- [x] Nenhum bug de severidade Alta/Crítica em aberto

**Veredito de `QA-BUG-002`**: **Corrigido/Fechado.** Vetor literal do relato
original (via barrel público) fechado em tempo de compilação, não apenas em
runtime. Variação residual de deep-import/import renomeado fechada por
regra de lint dedicada, testada de forma independente contra arquivos reais
(não só a suíte do próprio Backend) e nos dois níveis (detecção em CI e
comportamento em runtime caso o lint fosse ignorado, com RLS como contenção
final) — mesmo padrão de defesa já aceito neste projeto para os outros dois
vetores de import direto (`no-raw-kysely-outside-database`,
`no-deep-module-import`). Não bloqueante; registrado como débito de baixa
severidade (`QA-DEBT-012`), não como bug.

**Veredito final de BE-03 (rodada 3)**: **Aprovado com ressalvas.** Os dois
bugs de severidade Alta encontrados nas rodadas anteriores (`QA-BUG-001`,
`QA-BUG-002`) estão ambos genuinamente corrigidos, cada um revalidado de
forma empírica e independente por este agente nesta e nas rodadas
anteriores — nenhum aceito só pelo relato do Backend/orquestrador. Nenhum
bug de severidade Alta/Crítica em aberto. Uma ressalva de severidade Baixa
registrada (`QA-DEBT-012`, acima) sobre a natureza da defesa do vetor
residual de deep-import (CI/lint, não runtime/compilador) — não bloqueante,
consistente com o padrão de defesa já aceito no restante do projeto. Status
`Concluído` em `TASK.md` **mantido** (já estava `Concluído` por decisão do
orquestrador antes desta revalidação; nenhuma reversão necessária). **Isto
libera BE-04** (suíte automatizada de vazamento cruzado entre tenants,
condição do Gate 2 do CTO) para começar — recomenda-se que o escopo de BE-04
inclua, além do "ID guessing" já descrito em `TASK.md`, um caso de
regressão permanente para exatamente o vetor de deep-import caracterizado
acima (import apontando direto para arquivos internos de `src/database/`
por fora do barrel), garantindo que a suíte de vazamento cruzado detectaria
uma futura regressão desta regra de lint específica, não apenas confiar no
CI de lint isoladamente.

### 1.7 FE-04 — Framework responsivo (breakpoints mobile/tablet/desktop, colapso lista→card em mobile)

**Última tarefa de Fase 0 do Frontend** (fecha FE-01 a FE-04).

**Critério de aceite validado** (`TASK.md` §3.10, linha FE-04): "Formulários
sempre coluna única em qualquer breakpoint; listas/tabelas densas colapsam
para cards em mobile, nunca scroll horizontal forçado."

**Referências de especificação usadas na validação**: `UX-SPEC.md` §6.1
(breakpoints — mobile ≤599px, tablet 600–1023px, desktop ≥1024px) e §6.2
(regras específicas de formulário sempre coluna única e colapso lista→card
em mobile, "nunca uma tabela com scroll horizontal forçado como única
solução").

**Código revisado**: `frontend/src/design-system/responsive/`
(`breakpoints.ts`, `useMediaQuery.ts`, `useBreakpoint.ts` + testes) e
`frontend/src/design-system/components/{FormLayout,ResponsiveDataList}/`
(implementação + CSS + testes).

#### Execução (reexecutada de forma independente por este agente, não apenas aceito o relato)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `frontend/`) | 23 arquivos de teste, 181/181 testes passando — bate com o número relatado em `TASK.md` |
| `npm run test:coverage` (`vitest run --coverage`) | Confirmado por leitura direta do relatório HTML gerado (mesma técnica de FE-02, o texto resumido no terminal colapsa arquivos 100% cobertos): `breakpoints.ts`, `useMediaQuery.ts`, `useBreakpoint.ts`, `ResponsiveDataList.tsx` e `FormLayout.tsx` todos 100% statements/branches/funcs/lines — bate exatamente com o relato do Frontend em `TASK.md` |
| `npm run build` (`tsc -b && vite build`) | Build limpo, sem erro de tipo, 58 módulos transformados |
| `npm run lint` (`oxlint`) | Sem apontamentos |

#### Checklist de critério de aceite (item a item)

1. **"Formulários sempre coluna única em qualquer breakpoint"** —
   **Atendido, verificado por três métodos independentes**: (a) leitura
   direta de `FormLayout.module.css` — `display: flex; flex-direction:
   column`, nenhuma regra `@media` no arquivo inteiro; (b) `FormLayout.test.tsx`
   lê o CSS bruto via `?raw` (mesma técnica de `fixedTokenValues.sync.test.ts`,
   FE-01) e afirma programaticamente a ausência de `@media`/
   `grid-template-columns` e a presença de `flex-direction: column` sem
   `flex-direction: row` — reexecutado nesta validação, passando; (c) teste de
   composição confirma que a ordem dos filhos (campos) é preservada sem
   nenhum wrapper que pudesse reordenar visualmente por coluna. `max-width:
   480px` reforça coluna única mesmo em telas largas — consistente com
   `UX-SPEC.md` §6.2 ("não é 'mobile first que expande', é sempre única,
   inclusive em desktop"), não uma extrapolação do Frontend.
2. **"Listas/tabelas densas colapsam para cards em mobile, nunca scroll
   horizontal forçado"** — **Atendido**. `ResponsiveDataList` renderiza
   `<table>` semântica (`<th scope="col">`) em tablet/desktop e uma lista de
   cards (`<ul>/<li>` com `<dl>` de pares rótulo/valor) em mobile — nunca as
   duas estruturas simultâneas no DOM (confirmado por teste: `queryByRole
   ('table')` ausente em mobile, `queryByRole('list')` ausente em
   tablet/desktop). `ResponsiveDataList.module.css` não define nenhuma regra
   `overflow-x`/`overflow: auto` na `.table` — não há tentativa de resolver
   densidade via scroll horizontal em nenhum breakpoint, atendendo à cláusula
   "nunca" do critério de aceite de forma literal, não apenas pela
   preferência de design. Breakpoint de corte (mobile ≤599px) reconferido
   contra `UX-SPEC.md` §6.1 em `breakpoints.test.ts` e por leitura direta do
   código-fonte de `breakpoints.ts` — valores exatos (599/600/1023/1024),
   sem lacuna nem sobreposição entre as três faixas (testado
   explicitamente).
3. **"Nenhum bug de severidade alta/crítica em aberto"** — confirmado,
   nenhum encontrado.

#### Ponto de atenção específico — colapso decidido em JS (`useBreakpoint`/`matchMedia`) em vez de CSS puro

**Pergunta orientadora**: a decisão é sólida? Há risco de depender de
`matchMedia`/JS em vez de CSS puro (ex.: flash de conteúdo incorreto antes do
JS hidratar, em cenário de SSR futuro)?

**Avaliação da decisão em si**: **sólida, dentro da autoridade do Frontend**.
A justificativa documentada no próprio `ResponsiveDataList.tsx` é
tecnicamente correta e verificável: uma solução CSS pura (montar `<table>` e
`<ul>` simultaneamente no DOM, escondendo uma via `display:none` por
`@media`) de fato arrisca leitor de tela em modo de navegação por
tabela/elemento encontrar e anunciar a estrutura escondida — comportamento
inconsistente entre leitores de tela, e um risco real, não hipotético, para
um produto cujo público inclui usuário idoso/RNF-06. Trocar a árvore inteira
via JS, condicionada a um valor booleano único (`isMobile`), evita esse
problema por construção: **nunca há duas estruturas no DOM ao mesmo tempo**
(confirmado pelos testes citados no item 2 acima). O segundo motivo
(testabilidade sem depender do motor de CSS do jsdom avaliar `@media`) é o
mesmo já documentado e aceito em FE-02 (`Navigation.test.tsx`) — aqui o
Frontend eliminou a limitação por completo em vez de apenas documentá-la,
o que é uma melhoria, não um novo risco.

**Risco real identificado: sim, um — mas de baixa severidade e não aplicável
hoje**. `useMediaQuery.ts::getMatchesNow` retorna `false` quando
`typeof window === 'undefined'`. Isso significa que, em um cenário de SSR
(o `matchMedia` do navegador não existe no servidor), o primeiro render
calculado no servidor assumiria `isDesktop=false` e `isTabletUp=false` para
qualquer media query — ou seja, `useBreakpoint()` sempre resolveria
`'mobile'` no HTML gerado no servidor, **independentemente do dispositivo
real do usuário**. Ao hidratar no cliente, `useMediaQuery` recalcula
corretamente (`getMatchesNow` síncrono na inicialização do `useState`) e o
componente re-renderiza com o breakpoint real — em um desktop, isso
produziria exatamente o "flash de conteúdo incorreto" citado na pergunta
orientadora (lista de cards renderizada primeiro, substituída pela tabela
logo após a hidratação), e pior: como a árvore DOM do servidor (`<ul>/<li>`)
seria estruturalmente diferente da árvore que o cliente esperaria hidratar
em qualquer breakpoint que não seja mobile, isso causaria um **hydration
mismatch** real do React (não apenas um flash visual, um erro de console e
possível remontagem completa do componente pelo React). O mesmo raciocínio
se aplica a `FormLayout` de forma mais branda (o componente já é sempre
coluna única via CSS puro — sem `useBreakpoint` — então `FormLayout` **não
tem esse risco**; só `ResponsiveDataList` depende de JS para a decisão
estrutural).
Duas ressalvas que reduzem a severidade a Baixa, não Média/Alta: (a)
`RNF-07`/`UX-SPEC.md` §6 confirmam explicitamente que este produto é "web
responsiva via navegador, sem aplicativo nativo" e **não há, hoje, nenhuma
decisão arquitetural registrada em `SDD.md`/ADR para adotar SSR/SSG** — o
risco é hipotético/futuro, não uma falha presente; (b) o próprio comentário
de `useMediaQuery.ts` já reconhece o guard `typeof window === 'undefined'`,
mostrando que o autor já considerou ambientes sem `window`, apenas não
documentou a implicação específica de SSR (o guard foi escrito pensando em
"não quebrar", não em "qual o valor de fallback ideal"). Registrado como
débito de arquitetura, não bug — **ver QA-DEBT-008**.

**Achado adicional, também de baixa severidade** (não fazia parte da
pergunta orientadora, mas surgiu da mesma análise): como o colapso troca a
árvore DOM inteira ao cruzar o breakpoint de 599px (não é uma mudança
puramente visual), redimensionar a janela através desse limiar enquanto o
foco do teclado está em um elemento interno da tabela/card (ex.: um link de
"Baixar" dentro de uma célula) perde o foco — comportamento padrão do
navegador quando um nó focado é desmontado, sem nenhum tratamento explícito
de devolução de foco no componente. Nenhum teste cobre esse cenário. Risco
de usabilidade baixo (cruzar o breakpoint exatamente durante uma interação
de teclado ativa é um cenário raro, mais comum em teste manual via DevTools
do que em uso real), e nenhuma tela ainda consome este componente para
avaliar o impacto real. **Ver QA-DEBT-009**.

#### Checklist de Pronto (DoD do agente QA) aplicado a FE-04

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Débitos de severidade baixa registrados com prazo (QA-DEBT-008,
      QA-DEBT-009 abaixo)
- [ ] Testes de integração cruzada — **não aplicável ainda**: `ResponsiveDataList`/
      `FormLayout` são infraestrutura pura, sem chamada de rede própria e sem
      nenhuma tela consumidora nesta tarefa (telas reais chegam a partir de
      FE-06/FE-12, conforme a própria ordem de `TASK.md`) — não é uma
      pendência que FE-04 possa resolver sozinha, mesmo padrão de FE-02/FE-03
- [x] Requisito não funcional relevante validado (breakpoints reconferidos
      contra `UX-SPEC.md` §6.1 sem lacuna/sobreposição; ausência de scroll
      horizontal forçado confirmada por leitura de CSS; risco de
      acessibilidade de leitor de tela por estrutura duplicada,
      explicitamente evitado pela decisão de arquitetura avaliada acima)

**Veredito**: **Aprovado com ressalvas.** Os dois critérios de aceite
explícitos (formulário sempre coluna única; colapso lista→card em mobile sem
scroll horizontal forçado) estão implementados e testados corretamente,
reexecutados de forma independente nesta validação (181/181 testes, 100% de
cobertura confirmada nos 5 arquivos novos via relatório HTML, lint e build
limpos). A decisão de decidir o colapso estrutural em JS (`matchMedia`) em
vez de CSS puro é tecnicamente sólida e bem justificada para o risco que
resolve (leitor de tela anunciando conteúdo duplicado). Dois débitos de baixa
severidade registrados (risco de flash/hydration mismatch em um cenário de
SSR hoje inexistente no projeto; perda de foco ao cruzar o breakpoint durante
interação de teclado ativa) — nenhum bloqueante. Status `Concluído` em
`TASK.md` **mantido** (guardrail deste agente: só reprovação alta/crítica
reverte o status para `Em andamento`).

### 1.8 FE-05 — Landing pública (TL-01)

**Critério de aceite validado** (`TASK.md` §3.11, linha FE-05): "CTAs
'Entrar'/'Criar conta' funcionais, branding dinâmico aplicado."

**Referências de especificação usadas na validação**: `UX-SPEC.md` §2 (TL-01,
"Header: logo do hospital (branding dinâmico, RF-11)... Bloco central: mensagem
de boas-vindas curta, dois CTAs primários — 'Entrar' e 'Criar conta'... Footer:
links institucionais"), §5.1 (regras transversais de acessibilidade — teclado,
foco visível, alvo de toque 44px), §6.1 (responsivo, breakpoint 599px),
`SDD.md` §5 (`TENANT.nome_institucional` vs. `BRANDING_CONFIG`, mesma
divergência já registrada em QA-DEBT-003/FE-02), `GUARDRAILS.md` §H (itens
32-33, WCAG 2.1 AA).

**Código revisado**: `frontend/src/pages/LandingPage/`,
`frontend/src/pages/PlaceholderPage/`, `frontend/src/routes.tsx`,
`frontend/src/App.tsx`, `frontend/src/main.tsx` (efeito colateral de limpeza).

#### Execução (reexecutada de forma independente por este agente)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `frontend/`) | 26 arquivos de teste, 199/199 testes passando — bate exatamente com o número relatado em `TASK.md` |
| `npm run test:coverage` (`vitest run --coverage`) | 98.78% stmts / 93.37% branch / 100% funcs / 100% lines agregado. O reporter `text` (config em `vite.config.ts`) omite da tabela qualquer arquivo 100% cobrindo todos os quatro eixos — nenhum dos quatro arquivos novos de FE-05 (`App.tsx`, `routes.tsx`, `LandingPage.tsx`, `PlaceholderPage.tsx`) aparece na lista de arquivos com linha não coberta, e todos os arquivos que aparecem (`branding`, `ConfirmationModal`, `CpfField`, `DateOfBirthField`, `MfaCodeField`, `PasswordField`, `contrast.ts`) são pré-existentes de FE-01/FE-02/FE-03 — consistente com a alegação de 100% de cobertura nos 4 arquivos novos desta tarefa |
| `npm run build` (`tsc -b && vite build`) | Build limpo, sem erro de tipo, 71 módulos transformados |
| `npm run lint` (`oxlint`) | Sem apontamentos (exit code 0) |

#### Checklist de critério de aceite (item a item)

1. **"CTAs 'Entrar'/'Criar conta' funcionais"** — **Atendido, verificado por
   dois métodos independentes**: (a) `LandingPage.test.tsx` confirma `href`
   correto (`/entrar`, `/criar-conta`) e navegação por teclado só (`Tab`/
   `Enter`, sem mouse) até cada CTA; (b) `App.test.tsx` monta a árvore de
   rotas real duas vezes — uma com `App.tsx` de produção literal (mesma
   composição de `main.tsx`, `BrowserRouter` real) e outra com
   `MemoryRouter`/`appRoutes` controlando a URL — e clica em cada CTA via
   `user-event`, confirmando a troca real de tela (`h1` muda de "Bem-vindo(a)
   ao Portal..." para "Entrar"/"Criar conta"), incluindo o caminho de volta
   ("Voltar à página inicial" do placeholder). Reexecutado nesta validação,
   passando. Nenhum teste depende só de inspecionar a lista de rotas em
   isolado sem montar componente real — reduz o risco de "passa no teste, mas
   quebra em produção" que listas de rota isoladas costumam ter.
2. **"Branding dinâmico aplicado"** — **Atendido**. `Header` de FE-02
   reutilizado integralmente (nenhuma duplicação de lógica de branding);
   `LandingPage.test.tsx` cobre o logo trocando dinamicamente quando
   `BRANDING_CONFIG` resolve para um tenant específico (`waitFor` +
   `getByRole('img')`), reaproveitando o mesmo mecanismo já auditado em FE-01/
   FE-02. Cor dos CTAs verificada estruturalmente (`landingPageCss` via `?raw`,
   mesma técnica de `FormLayout.test.tsx`/FE-04) usando
   `var(--color-brand-primary)`/`var(--color-brand-primary-contrast-text)` —
   nenhuma cor hardcoded, reconfirmado por leitura direta de
   `LandingPage.module.css`.
3. **"Nenhum bug de severidade alta/crítica em aberto"** — confirmado, nenhum
   encontrado.

#### Ponto de atenção 1 — `react-router-dom` v7 como primeira introdução de roteamento

**Pergunta orientadora**: é uma escolha razoável, dentro da autoridade do
Frontend, e a estrutura de `routes.tsx` é sólida o suficiente para as ~30
telas restantes do backlog (`UX-SPEC.md` TL-01 a TL-35)?

**Avaliação**: **sim, em ambos os pontos**. Confirmado por leitura de
`SDD.md`, todos os 12 ADRs em `.md/adr/` e `GUARDRAILS.md` que nenhum desses
artefatos fixa biblioteca de roteamento — a decisão está genuinamente dentro
da autoridade de detalhe do Frontend Developer (mesmo padrão já aceito em
FE-02/hamburger menu e FE-04/`matchMedia`, decisões de implementação sem
artefato de arquitetura correspondente). `react-router-dom` é a biblioteca de
roteamento de fato-padrão do ecossistema React (confirmado como dependência
real em `package.json`, v7.18.3, não um placeholder) — escolha de baixo risco
técnico e de contratação (qualquer novo Frontend Developer já a conhece).
Estrutural: `routes.tsx` exporta `appRoutes: RouteObject[]` como única fonte
de verdade, reutilizada tanto por `App.tsx` (produção, `BrowserRouter`) quanto
por `App.test.tsx`/`LandingPage.test.tsx` (`MemoryRouter`), sem duplicar a
lista — evita o padrão comum de rotas de teste divergindo silenciosamente das
rotas de produção. `RouteObject` (tipo nativo da própria biblioteca) já
suporta `children`/rotas aninhadas, então a estrutura plana de hoje (3 rotas)
não vai exigir uma reescrita quando o volume crescer — apenas crescimento
aditivo (novas entradas no array, ou agrupamento em `children` quando um
layout autenticado compartilhado for necessário, decisão natural de uma
tarefa futura de app shell autenticado, não desta). **Nenhum débito
registrado** — decisão sólida e nem geradora de risco de retrabalho
identificável para as ~30 telas restantes.

#### Ponto de atenção 2 — rotas `/entrar`/`/criar-conta` apontando para `PlaceholderPage` até FE-06/FE-08

**Pergunta orientadora**: isso quebra algo, e a troca futura é de fato
pontual?

**Avaliação**: **não quebra nada, e a troca é genuinamente pontual**.
`PlaceholderPage` está claramente documentada em código como não sendo uma
tela do `UX-SPEC.md` (comentário explícito no componente e em `routes.tsx`),
renderiza o mesmo `Header`/`Footer` institucionais (não é uma tela "nua" fora
do padrão visual do produto) e oferece caminho de volta funcional
(testado). A troca futura, verificada por leitura direta de `routes.tsx`, é
de fato só o campo `element` de cada `RouteObject` (`{ path: '/entrar',
element: <PlaceholderPage title="Entrar" /> }` → `{ path: '/entrar', element:
<LoginPage /> }`, por exemplo) — nenhuma outra parte de `LandingPage.tsx`,
`App.tsx` ou do próprio `routes.tsx` precisa mudar. Nenhum teste de FE-05
depende do conteúdo interno do placeholder além do texto "Esta tela ainda não
foi implementada." e do link de volta — não há acoplamento que quebraria
quando FE-06/FE-08 substituírem o `element`.

#### Ponto de atenção 3 — remoção da duplicação de `BrandTokensProvider` (`main.tsx`/`App.tsx`)

**Pergunta orientadora**: essa limpeza colateral introduziu regressão em
FE-01/FE-02?

**Avaliação**: **não, confirmado por dois caminhos independentes**. (a)
Leitura direta: `main.tsx` hoje tem uma única instância de
`BrandTokensProvider` envolvendo `<App />`; `App.tsx` não a duplica mais
(antes, a "demo estrutural" de FE-02 tinha sua própria instância dentro de
`App.tsx`, redundante com a de `main.tsx` — provider duplo não causava bug
funcional visível, mas expunha `App.tsx` de produção a dois contextos de
branding potencialmente divergentes, risco eliminado por esta limpeza). (b)
Os testes próprios de cada componente estrutural de FE-02 (`Header.test.tsx`,
`Footer.test.tsx`, `Navigation.test.tsx`, `ConfirmationModal.test.tsx`,
`MessageBanner.test.tsx`) já envolvem cada um em sua própria instância de
`BrandTokensProvider` de teste (confirmado por leitura de código) — nenhum
depende do provider que existia em `App.tsx`, então a remoção não poderia
quebrá-los por construção. Confirmado empiricamente: as 199 execuções da
suíte completa (`npm run test`, reexecutada nesta validação) passam,
incluindo todos os arquivos de teste de FE-01/FE-02. Nenhuma regressão.

#### Checklist de Pronto (DoD do agente QA) aplicado a FE-05

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Nenhum bug de severidade baixa/média identificado — nada a registrar
      como débito
- [ ] Testes de integração cruzada — **não aplicável**: FE-05 não depende de
      mock/API própria (o único dado dinâmico, `BRANDING_CONFIG`, já é
      integração resolvida e validada em FE-01/FE-02, não reaberta aqui); não
      há dependência cruzada com Backend nesta tarefa especificamente
- [x] Requisito não funcional relevante validado (WCAG 2.1 AA — `h1` único,
      CTAs como `<a>` nativo focável/ativável por teclado, alvo de toque
      44px, `:focus-visible`, `nav aria-label` do Footer herdado e
      reconfirmado; responsivo — CTAs empilham abaixo de 599px, mesmo
      breakpoint de FE-04)

**Veredito**: **Aprovado.** Os dois critérios de aceite explícitos (CTAs
funcionais; branding dinâmico aplicado) estão implementados e testados
corretamente, reexecutados de forma independente nesta validação (199/199
testes, cobertura 100% confirmada nos 4 arquivos novos por ausência na tabela
de arquivos não-100%, lint e build limpos). Os três pontos de atenção
levantados (escolha de `react-router-dom`, rotas placeholder, remoção de
`BrandTokensProvider` duplicado) foram avaliados individualmente e nenhum
gerou débito ou ressalva — decisões sólidas, sem risco de retrabalho
identificado, sem regressão em FE-01/FE-02. Nenhum bug, nenhuma ressalva.
Status `Concluído` em `TASK.md` **mantido**.

### 1.9 FE-06 — Cadastro: dados pessoais + bloqueios (TL-02, TL-03, TL-04)

**Critério de aceite validado** (`TASK.md` §3.11, linha FE-06): "Bloqueio de
menor de idade (TL-03) sem opção de tentar novamente com outra data (RN-01);
erro de CPF não localizado (TL-04) orienta recepção do hospital."

**Referências de especificação usadas na validação**: `UX-SPEC.md` §2 (TL-02/
TL-03/TL-04), `PRD-TECNICO.md` §3 RN-01 ("Maioridade obrigatória para
autoatendimento digital", RULE/RATIONALE/EXCEPTION — "Nenhuma exceção nesta
release"), RF-15 (RF-14/BE-18 match de CPF via Integration Gateway),
`GUARDRAILS.md` §H (WCAG 2.1 AA), `TASK.md` §3.4 linha BE-18 (status "A
Fazer" nesta data).

**Código revisado**: `frontend/src/pages/{CadastroDadosPessoaisPage,
CadastroBloqueioMenorIdadePage,CadastroCpfNaoLocalizadoPage}/` (todos os
arquivos, incluindo `ageValidation.ts`/`.test.ts`, `patientLookupApi.ts`/
`.test.ts`, `phone.ts`, `TextField.tsx`), `frontend/src/routes.tsx`.

#### Execução (reexecutada de forma independente por este agente)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `frontend/`) | 32 arquivos de teste, 248/248 testes passando — bate exatamente com o número relatado em `TASK.md` |
| `npm run build` (`tsc -b && vite build`) | Build limpo, sem erro de tipo, 82 módulos transformados |
| `npm run lint` (`oxlint`) | Sem apontamentos (exit code 0) |

#### Ponto de atenção 1 — RN-01: confirmação empírica de que não existe caminho de volta a partir de TL-03

**Pergunta orientadora**: confirmar por execução real, não só leitura de
código, que não existe nenhum caminho para um usuário bloqueado em TL-03
tentar outra data de nascimento.

**Método usado** (nota de transparência: nenhuma ferramenta de automação de
navegador — Playwright — estava disponível nesta sessão de validação; a
confirmação empírica abaixo se apoia em dois métodos independentes que não
dependem de "confiar no relato do Frontend"):

1. **Execução real da suíte** (não apenas leitura): reexecutei
   `CadastroBloqueioMenorIdadePage.test.tsx` e
   `CadastroDadosPessoaisPage.test.tsx` como parte dos 248/248 acima — ambos
   fazem `render()` real (RTL/jsdom, DOM de verdade, não simulação de
   função isolada) e usam `userEvent` para simular `Tab`/clique reais, não
   chamada direta de handler. O teste `'a tela de bloqueio (TL-03) não
   oferece nenhum caminho de volta ao formulário...'`
   (`CadastroDadosPessoaisPage.test.tsx`) preenche o formulário real com uma
   data de menor de idade, clica em "Continuar" de verdade, aguarda a
   navegação real do `react-router-dom` acontecer, e só então inspeciona a
   árvore de links renderizada — confirmando exatamente 1 link (`href="/"`)
   dentro de `<main>`. Passou.
2. **Varredura estática exaustiva, independente do relato do Frontend**:
   `grep -rn "criar-conta" frontend/src` — o único arquivo de produção (não
   teste) que referencia `/criar-conta` como **destino de navegação** é
   `CadastroDadosPessoaisPage.tsx` (a própria TL-02, `navigate` para
   `/criar-conta/bloqueio-idade` e `/criar-conta/cpf-nao-localizado`, nunca
   o inverso) e `LandingPage.tsx` (TL-01 → TL-02, fluxo de entrada normal).
   `CadastroBloqueioMenorIdadePage.tsx` menciona `/criar-conta` só dentro de
   um comentário JSDoc explicando por que **não** há link de volta — nenhum
   `navigate(`, `<Link to="/criar-conta"`, `window.location`, `history.` ou
   `setTimeout` em todo o diretório do componente (confirmado por grep
   dedicado, zero ocorrências). O único CTA renderizado é
   `<Link to="/" ...>Voltar à página inicial</Link>`.
3. **Casos de borda de `ageValidation.ts` conferidos manualmente** (Ponto de
   atenção 3, RN-01 é a regra que decide se o usuário chega a TL-03 em
   primeiro lugar): reconferi a aritmética de `calculateAge`/`isAdult` linha
   a linha, não apenas os `expect` do teste — aniversário exatamente hoje
   (`referenceMonth === month && referenceDay >= day`, `>=` inclusive,
   correto: 18 anos completos hoje já é maioridade, sem exigir "18 anos e 1
   dia"), 29 de fevereiro contra ano de referência não bissexto (tratado de
   forma determinística e documentada — o "aniversário" é considerado
   passado a partir de 1º de março em ano não bissexto, nunca lança exceção
   nem normaliza silenciosamente a data), data de nascimento futura (idade
   negativa, deliberado, nunca teria `>= 18`), e datas de calendário
   inexistentes (31 de abril, 29/fev em ano não bissexto) rejeitadas com
   erro explícito em vez de normalizadas por `new Date(...)` (o bug clássico
   de "31 de abril vira 1º de maio" está genuinamente evitado — a
   implementação usa aritmética inteira sobre ano/mês/dia, nunca constrói um
   `Date` a partir da string de nascimento). Todos os 12 testes de
   `ageValidation.test.ts` reexecutados, passando.

**Conclusão**: RN-01 está **corretamente implementada, sem exceção e sem
caminho de bypass encontrado** — nem por interação real simulada (teste),
nem por varredura estática de todo o código de produção. Ressalva de método
registrada acima (ausência de Playwright nesta sessão) não é tratada como
lacuna que reduz a confiança da conclusão, dado que os dois métodos usados
(execução real de DOM + varredura exaustiva de todo o diretório/rota) são
mutuamente reforçantes e não dependem um do outro.

#### Ponto de atenção 2 — decisão de marcar `Concluído` apesar do mock otimista de CPF, e uma contradição encontrada no próprio `TASK.md`

**Pergunta orientadora**: a decisão de não bloquear FE-06 pela ausência de um
endpoint real de match de CPF (mesmo princípio de FE-01/`QA-DEBT-002`) é
sólida, dado que aqui a causa raiz é uma premissa de negócio não resolvida
(P1, hospital piloto), não apenas sequenciamento de backlog?

**Achado principal — a pergunta pressupõe algo que o próprio `TASK.md` não
sustenta de forma consistente**: a linha FE-06 de `TASK.md` §3.11 **começa**
a nota de status com `Concluído — ...`, mas o próprio corpo dessa mesma nota
contém a frase, em negrito: **"Por causa exclusivamente desta pendência, a
tarefa permanece `Em Andamento`, não `Concluída`"** — referindo-se
exatamente a esta pendência do mock de CPF. Ou seja, **o campo de Status de
`TASK.md` se contradiz dentro da própria célula**: o primeiro token é
`Concluído`, e a última frase relevante do mesmo texto afirma o oposto.
Reconferido três vezes por leitura direta do arquivo (não é erro de
renderização de tabela) — ver também o comentário idêntico, replicado
palavra por palavra, em `patientLookupApi.ts` linhas 39-43: **"Esta tarefa
(FE-06) não fecha como `Concluída` por causa desta pendência — permanece `Em
Andamento` até BE-18 publicar o endpoint real..."**. As duas fontes
(`TASK.md` e o código) concordam entre si que a tarefa deveria estar `Em
Andamento` — é só o campo de Status de `TASK.md` que diz o contrário do
resto do próprio texto.

Isto é uma variação, mais grave, de um padrão já observado nesta validação:
em FE-01 (`QA-DEBT-001`), um comentário de código contradizia o status
`Concluído` de `TASK.md`, mas o texto de `TASK.md` em si era consistente.
Aqui, a contradição está **dentro do próprio `TASK.md`**, o artefato de
gestão que Tech Lead/CTO/DevSecOps/DevOps consultam para saber o que está
pronto — um leitor que parasse no primeiro token da célula ("Concluído")
chegaria a uma conclusão oposta à de um leitor que lesse a nota inteira.

**Avaliação da decisão de fundo (mock otimista aceito, sem exigir endpoint
real)**: no mérito, concordo com a analogia a FE-01/`QA-DEBT-002` e com a
distinção adicional feita na pergunta orientadora. O mecanismo de consumo
(`lookupPatientByCpf`) é uma abstração real e testável via injeção de
dependência (mesmo padrão de `fetchFn` de `useBrandingTokens`/FE-01, já
auditado), com ponto único de troca documentado; e a causa raiz aqui é
genuinamente mais profunda que em FE-01 — não é "o Backend ainda não chegou
nesta tarefa do backlog" (BE-32, Fase 3, contrato já estável em `SDD.md`/
ADR-011), é "não existe hoje nenhuma fonte de dado plausível para simular
CPFs reais de pacientes de um hospital piloto que sequer foi escolhido"
(Premissa P1). Inventar uma lista fixa de CPFs "válidos" seria pior que o
mock atual — criaria falsa cobertura de uma regra de negócio real sem
nenhum lastro, mascarando exatamente o tipo de lacuna que este ponto de
atenção pede para não mascarar. **O critério de aceite, lido literalmente**
("erro de CPF não localizado (TL-04) orienta recepção do hospital") não
exige que TL-04 seja alcançável hoje por um backend real em produção — exige
que a tela exista, oriente corretamente e esteja testada; isso está
cumprido, verificado nesta validação (ver checklist abaixo). Não vejo motivo
para reprovar a tarefa nem para exigir um endpoint real como pré-condição
não escrita no critério — isso seria reinterpretar o critério de aceite, que
este agente não faz.

**Porém, isto não resolve a contradição do Status.** Diferente de FE-01 (onde
a decisão registrada — manter `Concluído` — era consistente ao longo de todo
`TASK.md`, e só o código "discordava"), aqui **o próprio `TASK.md` nunca
chegou a uma decisão única**: a nota descreve uma linha de raciocínio que
soa como justificativa para fechar a tarefa (parágrafo de abertura, "mesmo
princípio de FE-01... não fica bloqueada") e, na mesma respiração, uma
conclusão textual oposta ("permanece Em Andamento, não Concluída"). Isso não
é uma decisão de julgamento que QA possa simplesmente endossar ou reverter
— é uma inconsistência de redação que precisa ser resolvida por quem edita
`TASK.md` (Tech Lead/orquestrador), não por QA reescrevendo o critério.

**Registrado como QA-DEBT-010 (severidade Média — ver Seção 2)**: mais grave
que `QA-DEBT-001`/FE-01 (que era só código-vs-`TASK.md`) porque a
inconsistência está dentro do próprio `TASK.md`, o artefato do qual
DevSecOps/DevOps/CTO derivam release-readiness — não é um bug funcional (não
afeta build/teste/comportamento em runtime, confirmado pela execução acima),
mas é um risco real de leitura equivocada por qualquer consumidor deste
documento que não leia a célula inteira. **Não bloqueia a aprovação desta
validação** (severidade Média, não Alta/Crítica — guardrail deste agente),
mas **recomendo fortemente ao Tech Lead/orquestrador** que a célula de FE-06
seja reescrita para um único veredito consistente antes da próxima leitura
formal de `TASK.md` (ex.: pelo CTO) — duas saídas possíveis, ambas
aceitáveis do ponto de vista de QA: (a) manter `Concluído`, removendo a
frase final contraditória e deixando só o registro do débito de integração
pendente (equivalente ao que este relatório já faz na Seção 2 abaixo); ou
(b) reverter para `Em Andamento` genuinamente, se a intenção real for essa.
QA não decide qual das duas — apenas garante que as duas não continuem
coexistindo na mesma célula.

#### Checklist de critério de aceite (item a item)

1. **"Bloqueio de menor de idade (TL-03) sem opção de tentar novamente com
   outra data (RN-01)"** — **Atendido, sem exceção**, confirmado empiricamente
   (Ponto de atenção 1 acima). `handleSubmit` verifica `isAdult(dob)` **antes**
   de qualquer chamada a `lookupPatientByCpf` — testado que, para um menor de
   idade, `lookup` nunca é chamado (`lookup).not.toHaveBeenCalled()`,
   reexecutado). TL-03 é tela de resultado sem formulário/campo de
   data/link de volta, tom `MessageBanner variant="info"` (regra de negócio,
   não culpa do paciente, conforme `UX-SPEC.md`).
2. **"Erro de CPF não localizado (TL-04) orienta recepção do hospital"** —
   **Atendido, com a ressalva de alcançabilidade real registrada em
   `QA-DEBT-011` (Seção 2)**. A tela existe, testada via RTL (renderiza
   mensagem, orienta "Procure a recepção do hospital...", oferece link
   secundário "Já tenho cadastro, entrar" → `/entrar`), tom
   `MessageBanner variant="warning"` (ação necessária, não culpa/falha,
   corretamente distinto de TL-03 conforme `UX-SPEC.md`). Confirmado por
   leitura de `patientLookupApi.ts` e ausência de `API-CONTRACT.yaml` no
   repositório (verificado nesta validação, arquivo não existe) que a tela
   não pode ser alcançada por um usuário real via fluxo completo hoje — o
   mock sempre resolve `found: true`. Isto não falha o critério **como
   escrito** (não exige alcançabilidade via backend real), mas é uma lacuna
   de integração cruzada real e rastreada (não confundir com bug de FE-06).
3. **Sem submissão parcial** — `handleSubmit` marca todos os campos como
   "tentativa de envio" simultaneamente; testado que "Continuar" com
   formulário vazio revela erro nos 5 campos de uma vez, sem navegar
   (`lookup).not.toHaveBeenCalled()`).
4. **Acessibilidade (`UX-SPEC.md` §5.1)** — rótulo programático em todo
   campo; erro nunca só por cor (`role="alert"`); foco movido
   programaticamente para o `<h1>` ao entrar em TL-03/TL-04 (testado
   indiretamente pela suíte, que usa `findByRole('heading', ...)` após
   navegação real); spinner textual + `aria-busy`/`disabled` durante
   validação assíncrona (testado, incluindo o estado "Validando…" via
   `Promise` controlada manualmente no teste); formulário inteiro
   preenchível/submetível só por teclado (`Tab` + digitação + `Enter`,
   testado ponta a ponta).
5. **Texto de apoio explicando o motivo da coleta da data de nascimento**
   (`UX-SPEC.md` TL-02, transparência) — presente (herdado do default de
   `DateOfBirthField`/FE-03, já auditado), testado
   (`/confirmar que você tem 18 anos ou mais/i`).
6. **Nenhum bug de severidade alta/crítica em aberto** — confirmado, nenhum
   encontrado.

#### Checklist de Pronto (DoD do agente QA) aplicado a FE-06

- [x] Todo critério de aceite da tarefa foi testado e está passando (RN-01
      sem exceção, confirmado empiricamente; TL-04 atendido como escrito)
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Débitos de severidade Média/Baixa registrados com prazo (QA-DEBT-010,
      QA-DEBT-011 abaixo)
- [ ] Testes de integração cruzada — **não aplicável ainda**: `API-CONTRACT.yaml`
      não existe no repositório (confirmado nesta validação) e BE-18 segue
      `A Fazer` — mesma situação estrutural de FE-01/`QA-DEBT-002`, revalidação
      agendada, não é pendência que FE-06 possa resolver sozinha
- [x] Requisito não funcional relevante validado (acessibilidade WCAG 2.1 AA
      reconfirmada por execução real de teclado/foco; tom visual info vs.
      warning distinto conforme `UX-SPEC.md`)

**Veredito**: **Aprovado com ressalvas.** Os dois critérios de aceite
explícitos estão implementados e verificados de forma independente e
empírica nesta validação (248/248 testes reexecutados, incluindo simulação
real de teclado/clique/navegação; build e lint limpos; varredura estática
exaustiva confirmando ausência de qualquer caminho de código de volta a
`/criar-conta` a partir de TL-03; casos de borda de cálculo de idade
reconferidos manualmente). Nenhum bug de severidade alta/crítica. A decisão
de aceitar o mock otimista de CPF sem exigir endpoint real é, no mérito,
sólida e bem fundamentada (mesmo princípio de FE-01, com a distinção
correta de que a causa raiz aqui é uma premissa de negócio não resolvida).
**Mas a linha FE-06 de `TASK.md` contém uma contradição interna real** entre
o campo de Status (`Concluído`) e o texto da própria nota
("permanece `Em Andamento`, não `Concluída`") — registrada como
**QA-DEBT-010 (Média)**, não bloqueante para este veredito, mas com
recomendação explícita ao Tech Lead/orquestrador de correção de redação
antes da próxima leitura formal de `TASK.md`. Status `Concluído` em
`TASK.md` **mantido** (guardrail deste agente: só reprovação alta/crítica
reverte o status para `Em andamento`; a contradição em si não é motivo de
reprovação, é motivo de correção de redação).

### 1.10 FE-07 — Termos/consentimento, definir senha, confirmação (TL-05, TL-06, TL-07)

**Critério de aceite validado** (`TASK.md` §3.11, linha FE-07): "Dois controles
de aceite visual e semanticamente distintos (RN-02); CTA 'Concluir cadastro'
desabilitado até ambos os aceites; login não automático após cadastro."

**Referências de especificação usadas na validação**: `UX-SPEC.md` TL-05/TL-06/
TL-07 (§2), `PRD-TECNICO.md` RN-02 (consentimento específico e destacado para
dado de saúde, Art. 11 I LGPD) e o fluxo `4.1 Cadastro de Paciente`,
`GUARDRAILS.md` item 25 (Seção F, proibição de checkbox único combinado) e
itens 32-33 (Seção H, WCAG 2.1 AA), `TASK.md` §1.2/ADR-007 (sessão
server-side via cookie `HttpOnly`, nunca criada pelo cliente).

**Código revisado**: `frontend/src/pages/{CadastroTermosConsentimentoPage,
CadastroDefinirSenhaPage,CadastroConfirmacaoPage}/` (todos os arquivos,
incluindo `termsApi.ts`/`.test.ts`, `registrationApi.ts`/`.test.ts`,
`passwordValidation.ts`/`.test.ts`), `frontend/src/pages/
CadastroDadosPessoaisPage/cadastroPersonalData.ts`, `frontend/src/routes.tsx`.

#### Execução (reexecutada de forma independente por este agente)

| Comando | Resultado |
|---|---|
| `npm run test` (`vitest run`, `frontend/`) | 38 arquivos de teste, 279/279 testes passando — bate exatamente com o número relatado em `TASK.md` |
| `npm run build` (`tsc -b && vite build`) | Build limpo, sem erro de tipo, 91 módulos transformados |
| `npm run lint` (`oxlint`) | Sem apontamentos (exit code 0) |
| `npm run test:coverage` (`vitest run --coverage`) | Confirmado por leitura do relatório HTML gerado (não apenas o texto resumido no terminal, que colapsa arquivos 100% cobertos e reporta faixas de linha enganosamente amplas para cadeias de `.then()/.catch()`): `CadastroTermosConsentimentoPage.tsx` 86.84% stmts — os únicos `cstat-no` reais são as 4 guardas `if (!isMountedRef.current) return` (fetch inicial + retry, sucesso + erro) e o `if (!bothAccepted \|\| !content) return` redundante em `handleSubmit`; `CadastroDefinirSenhaPage.tsx` 94.11% stmts — os únicos `cstat-no` são as 2 guardas `isMountedRef.current`; `CadastroConfirmacaoPage.tsx` não aparece na tabela colapsada = 100%. Mesmo padrão de guarda defensiva já aceito em `useBrandingTokens.ts`/FE-01 e `CadastroDadosPessoaisPage.tsx`/FE-06 — números batem com o relato do Frontend em `TASK.md`, gap confirmado como não-substantivo |

#### Ponto de atenção 1 — confirmação empírica de "login não automático" (não apenas leitura de código/teste)

**Método**: executei o fluxo completo TL-02 → TL-05 → TL-06 → TL-07 em um
navegador real (Chromium via Playwright, `npx playwright`, servidor `vite dev`
local), inspecionando `localStorage`/`sessionStorage`/`document.cookie` e
também `context.cookies()` (que captura cookies `HttpOnly`, não visíveis via
`document.cookie`, cobrindo o cenário real de ADR-007) em 4 pontos: antes do
envio de TL-02, com os dois aceites marcados em TL-05, na chegada em TL-06, e
na chegada em TL-07 pós-submissão.

**Resultado**: em todos os 4 pontos, `localStorage.length === 0`,
`sessionStorage.length === 0`, `document.cookie === ''` e
`context.cookies()` retornou array vazio — nenhum estado de sessão é criado em
nenhum momento do fluxo. O único caminho para a área autenticada permanece o
CTA "Ir para o login" (`<Link>` para `/entrar`, `href` confirmado). **RN-01/
critério "login não automático" confirmado empiricamente, não apenas aceito o
relato do Frontend ou a leitura do teste automatizado** (que já existia e
também passou, mas o guardrail deste agente pedia confirmação própria).

#### Ponto de atenção 2 — confirmação empírica de que o CTA "Concluir cadastro" é bloqueio real de `disabled`, não apenas indicação visual

**Método**: no mesmo navegador real, antes de marcar qualquer checkbox,
verifiquei a propriedade DOM `button.disabled` (não só o atributo textual) —
`true`. Tentei um clique forçado (`click({ force: true })`, que ignora
`pointer-events`/sobreposição visual mas não o comportamento nativo de
`<button disabled>`) — a navegação **não ocorreu**, a URL permaneceu em
`/criar-conta/termos`. Marquei só o checkbox de termos gerais — `disabled`
continuou `true`. Marquei também o checkbox de consentimento de dado de
saúde — `disabled` passou a `false`, e um clique real navegou corretamente
para TL-06. Desmarcar um dos dois de volta reverteu `disabled` para `true`
(mesmo teste já cobria isso via RTL; reconfirmado em navegador real).

**Conclusão**: é bloqueio real do atributo HTML nativo `disabled`, não uma
indicação visual que ainda permitiria clique/submit — critério de aceite
atendido de forma verificável, não apenas alegada.

#### Ponto de atenção 3 — captura de tela confirmando a distinção visual dos dois controles de aceite (RN-02)

Capturei TL-05 renderizada (screenshot real do navegador, não apenas
inspeção de DOM): o checkbox de termos gerais é um item de lista simples;
o checkbox de consentimento de dado de saúde está dentro de um bloco com
moldura própria, ícone e selo em caixa alta "CONSENTIMENTO ESPECÍFICO PARA
DADO DE SAÚDE" com uma linha de explicação adicional ("Consentimento exigido
separadamente do aceite geral dos Termos de Uso, conforme LGPD Art. 11, I") —
distinção visual clara, não "mais um item da lista", conforme `UX-SPEC.md`
TL-05. Nomes acessíveis dos dois checkboxes confirmados distintos (herdado de
FE-03, já auditado, reconfirmado na composição real da tela).

#### Ponto de atenção 4 — avaliação da decisão de propagar dados via `location.state` sem store global (pergunta orientadora do orquestrador)

**Pergunta**: a decisão é sólida para o volume atual de dados, ou introduz
risco de perda de dados em refresh de página no meio do fluxo?

**Testes empíricos realizados** (além da leitura de código):

1. **Refresh real (F5) em TL-06 (meio do fluxo)**: preenchi TL-02, avancei
   até TL-06, disparei um reload real de página (`page.reload()`,
   equivalente a F5) e só então preenchi a senha e enviei. **Resultado
   inesperado, mas correto**: o `nome` do paciente ainda apareceu
   corretamente personalizado em TL-07 ("Conta criada, Refresh QA!") mesmo
   após o F5. Motivo: `location.state` do `react-router-dom` é implementado
   sobre `history.pushState`, e o navegador **preserva `history.state` através
   de um reload de página dentro da mesma entrada de histórico** (verificado
   empiricamente, comportamento padrão do Chromium, não peculiaridade deste
   app) — a suposição comum de que "SPA perde tudo no F5" não se confirma
   neste caso específico, porque o dado não vive só em memória JS, vive na
   entrada de histórico do navegador. **A decisão do Frontend é mais robusta
   a F5 do que o texto de `TASK.md` presume ao justificá-la apenas por
   "desproporcional ao escopo"** — vale registrar esse reforço positivo.
2. **Navegação direta para TL-06 sem passar por TL-02/TL-05 (nova aba,
   favorito, ou qualquer cenário em que não exista entrada de histórico
   prévia com o `state`)**: `location.state` chega `null`,
   `personalData`/`termsVersion` ficam `undefined` (tratados como
   `Partial`/opcional pelo próprio design, documentado em
   `cadastroPersonalData.ts`). **Aqui o risco é real**: o formulário de TL-06
   não tem nenhuma guarda que detecte a ausência desses dados e redirecione o
   paciente de volta a TL-02 — preenchendo só senha+confirmação, o CTA
   "Criar conta" segue habilitado e a submissão **prossegue normalmente**,
   chegando a TL-07 com a mensagem genérica "Conta criada com sucesso!" (sem
   nome, porque não há), como se o cadastro tivesse sido concluído com êxito
   — confirmado empiricamente navegando direto para `/criar-conta/senha` e
   completando o fluxo até TL-07 sem nunca ter passado por TL-02/TL-05.
   Com o mock atual (que sempre retorna `{ success: true }`,
   `registrationApi.ts`), isso não quebra a UI nem lança erro — mas é uma
   lacuna de robustez real: em produção, contra o endpoint real de
   BE-18/BE-19, esse payload chegaria ao backend sem nome/CPF/e-mail/celular/
   versão de termos, e o desfecho mais provável (backend rejeita por campo
   obrigatório ausente) cairia no branch de erro genérico já implementado
   ("Não foi possível concluir seu cadastro agora. Tente novamente em
   instantes.") — uma mensagem que não orienta o paciente a **voltar para o
   início do cadastro**, a única ação que resolveria a causa real, criando um
   potencial loop de tentativas fadadas ao mesmo erro.

**Conclusão de QA sobre a decisão arquitetural**: `location.state` sem store
global é proporcional ao escopo de 4 dp e, ao contrário da premissa mais
pessimista, **resiste bem a um refresh de página real** dentro do mesmo fluxo
de navegação (Ponto 1). O risco genuíno não é "perda de dados no F5" — é
**ausência de uma guarda de entrada** em TL-06/TL-07 para o caso de o
paciente alcançar essas rotas sem os dados de etapas anteriores (Ponto 2),
cenário de baixa probabilidade no caminho feliz (exige URL direta/aba nova/
favorito no meio de um fluxo transacional), mas sem tratamento hoje.
**Registrado como QA-DEBT-015 (Baixa/Média — ver Seção 2)**, não bloqueante:
não é uma falha do critério de aceite escrito (que não exige essa guarda), é
uma lacuna de robustez a ser fechada com uma verificação simples (`if
(!personalData) navigate('/criar-conta', { replace: true })` no mount de
TL-06, mesmo padrão já usado no projeto para outras verificações de guarda).

#### Ponto de atenção 5 — recorrência do padrão de contradição de status já visto em FE-06 (`QA-DEBT-010`)

A célula de status de FE-07 em `TASK.md` §3.11 apresenta exatamente o mesmo
padrão já registrado em `QA-DEBT-010`/FE-06: **começa** com "Concluído —
revisão do orquestrador reexecutou `test`/`build`/`lint` de forma
independente (279/279, limpo)..." mas o corpo da própria nota (texto herdado,
aparentemente escrito pelo Frontend antes da revisão do orquestrador) **ainda
termina** com "Por essa pendência real de endpoint, esta tarefa permanece `Em
Andamento` (não `Concluída`) mesmo com as três telas totalmente
implementadas/testadas — mesmo critério já aplicado a FE-06... Não marcada
para revisão de conclusão por este agente — aguarda o orquestrador." — a
mesma célula afirma simultaneamente `Concluído` (primeiro token) e "permanece
Em Andamento, não Concluída" (frase final). Isto **não é um achado isolado**:
é a segunda vez consecutiva (FE-06 → FE-07) que a nota de status de uma
tarefa fechada pelo orquestrador preserva, sem edição, a frase de
"permanece Em Andamento" escrita pelo agente de implementação antes da
revisão — sugerindo que o processo de fechamento de tarefa (prependar a nota
do orquestrador sem revisar/podar o texto anterior) é sistemático, não um
lapso pontual. **Por guardrail deste agente, um bug isolado não é escalado ao
Tech Lead — mas um padrão recorrente do mesmo tipo é.** Como esta é a segunda
ocorrência do mesmo padrão exato (mesma frase, mesma estrutura, dois agentes
de implementação diferentes: Frontend em ambos os casos, mas dentro do mesmo
mecanismo de fechamento do orquestrador), este agente sinaliza que, se uma
terceira ocorrência acontecer em uma tarefa futura, o achado deixa de ser
tratado apenas como débito local e deve ser escalado formalmente ao Tech
Lead/orquestrador via `BLOCKERS.md` como problema de processo de fechamento
de tarefas em `TASK.md` (não de decomposição de tarefas em si, mas de
diretriz operacional de como o orquestrador edita a célula de Status).
**Registrado como QA-DEBT-013 (Média)** — mesma severidade e mesma
recomendação de `QA-DEBT-010` (Tech Lead/orquestrador reescreve a célula para
um único veredito consistente), com a nota adicional de recorrência acima.

#### Checklist de critério de aceite (item a item)

1. **"Dois controles de aceite visual e semanticamente distintos (RN-02)"** —
   **Atendido, confirmado empiricamente** (Ponto de atenção 3). Reuso direto
   de `TermsAcceptanceCheckbox`/`HealthDataConsentCheckbox` (FE-03, já
   auditados) na composição real da tela, sem alteração — distinção visual
   (moldura, ícone, selo textual) e programática (`role="group"` próprio +
   nomes acessíveis que nunca colidem, testado) preservada ponta a ponta.
2. **"CTA 'Concluir cadastro' desabilitado até ambos os aceites"** —
   **Atendido, confirmado empiricamente como bloqueio real de `disabled`**
   (Ponto de atenção 2), não apenas indicação visual. Testado marcando um
   checkbox por vez, os dois, e desmarcando de volta.
3. **"Login não automático após cadastro"** — **Atendido, confirmado
   empiricamente em navegador real** (Ponto de atenção 1) — nenhum
   `localStorage`/`sessionStorage`/cookie (incluindo `HttpOnly`) criado em
   nenhum ponto do fluxo TL-02→TL-07; único caminho para autenticação é o
   CTA "Ir para o login" (`/entrar`), exigindo credenciais + MFA explícitos.
4. **Estados de tela de TL-05** (`UX-SPEC.md` §4: skeleton, erro com
   "Tentar novamente" sem caminho de aceite disponível enquanto o texto não
   carregar) — **Atendido**, testado e confirmado por leitura de código:
   nenhum checkbox/CTA renderiza fora do estado `ready` com `content`
   carregado.
5. **TL-06 — política mínima visível antes da tentativa de submissão**
   (`UX-SPEC.md`) — **Atendido**, confirmado por captura de tela real:
   checklist de política (4 itens) e indicador de força ("Forte") visíveis
   enquanto o paciente ainda digita, não só após erro de submissão.
6. **Nenhum bug de severidade alta/crítica em aberto** — confirmado, nenhum
   encontrado.

#### Checklist de Pronto (DoD do agente QA) aplicado a FE-07

- [x] Todo critério de aceite da tarefa foi testado e está passando
      (confirmado empiricamente em navegador real para os 3 pontos mais
      sensíveis do critério — login não automático, `disabled` real, RN-02 —
      não apenas por leitura de código/teste automatizado)
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Débitos de severidade Média/Baixa registrados com prazo (QA-DEBT-013,
      QA-DEBT-014, QA-DEBT-015 abaixo)
- [ ] Testes de integração cruzada — **não aplicável ainda**:
      `API-CONTRACT.yaml` não existe no repositório (confirmado nesta
      validação) e BE-18/BE-19 seguem `A Fazer` — mesma situação estrutural
      de FE-01/FE-06 (`QA-DEBT-002`/`QA-DEBT-011`), revalidação agendada
      (`QA-DEBT-014`), não é pendência que FE-07 possa resolver sozinha
- [x] Requisito não funcional relevante validado (acessibilidade herdada de
      FE-03 reconfirmada na composição real; usabilidade conforme
      `UX-SPEC.md` TL-05/TL-06/TL-07 verificada por captura de tela real;
      cenário de erro de TL-05 — falha ao carregar termos — testado)

**Veredito**: **Aprovado com ressalvas.** Os três critérios de aceite
explícitos (dois controles distintos RN-02, CTA `disabled` real, login não
automático) foram confirmados **empiricamente em navegador real** (Playwright
contra `vite dev` local), não apenas por leitura de código ou aceite do
relato/teste do Frontend, atendendo à exigência específica do orquestrador
para esta validação. 279/279 testes reexecutados, build e lint limpos,
cobertura reconferida via relatório HTML (gaps residuais são guardas
defensivas já aceitas no padrão do projeto). Nenhum bug de severidade
alta/crítica. Três débitos não bloqueantes registrados: (a) `QA-DEBT-013`
(Média) — recorrência da contradição de status dentro da própria célula de
`TASK.md` (segunda ocorrência do mesmo padrão de FE-06/`QA-DEBT-010`, com
recomendação de escalonamento formal se ocorrer uma terceira vez); (b)
`QA-DEBT-014` — integração cruzada com BE-18/BE-19 pendente de endpoint real,
mesmo padrão estrutural já aceito em outras tarefas de Frontend; (c)
`QA-DEBT-015` (Baixa/Média) — ausência de guarda de entrada em TL-06/TL-07
para o caso de o paciente alcançar essas rotas sem os dados de TL-02/TL-05
(navegação direta, sem passar pelo fluxo), com recomendação de correção
pontual. A decisão de propagar dados via `location.state` sem store global é
avaliada como **sólida e proporcional ao escopo**, inclusive mais resistente
a refresh de página (F5) do que a premissa mais pessimista sugeriria
(confirmado empiricamente, Ponto de atenção 4) — a lacuna real está em
navegação direta sem histórico prévio, não em perda de dado por reload.
Status `Concluído` em `TASK.md` **mantido** (guardrail deste agente: só
reprovação alta/crítica reverte o status para `Em andamento`).

### 1.11 BE-04 — Teste automatizado de vazamento cruzado entre tenants (condição do Gate 2 do CTO)

**Critério de aceite validado** (`TASK.md` §3.1, linha BE-04): "Suíte de teste
no CI cria 2+ tenants com dados equivalentes e comprova, para toda entidade de
domínio, que uma sessão do tenant A nunca retorna dado do tenant B, mesmo via
manipulação direta de identificador (ID guessing); suíte roda em todo PR que
toque camada de acesso a dado (bloqueante, não opcional)."

**Referências de especificação usadas na validação**: `GUARDRAILS.md` §A,
regra A.4 (texto praticamente idêntico ao critério de aceite acima — condição
explícita do Gate 2 do CTO) e regras A.1-A.3/A.5 (isolamento multi-tenant,
"regra de maior severidade deste projeto"); `QA-REPORT.md` Seção 1.6/1.6.1/
1.6.2 (histórico de BE-03 — dois bugs de severidade Alta corrigidos,
`QA-DEBT-012` pendente de cobertura de regressão permanente); `SDD.md` §5
(modelo de dados, fonte da lista de entidades de domínio).

**Código revisado**: `backend/test/database/tenant-cross-leak-exhaustive.e2e-spec.ts`,
`backend/src/database/domain-tables.ts`, `backend/src/database/tenant-scoped.repository.ts`,
`backend/src/database/kysely-connection.ts`, `backend/src/database/database.module.ts`,
`backend/migrations/1788336900000_create-app-database-role.ts`,
`backend/migrations/1788336960000_enable-row-level-security.ts`,
`backend/package.json` (script `test:tenant-isolation`),
`.github/workflows/backend-ci.yml` (job `tenant-isolation-test`).

Esta validação foi conduzida com o rigor adicional pedido explicitamente pelo
orquestrador (mesmo nível de BE-03): nenhum dos cinco pontos abaixo foi aceito
só pelo relato de `TASK.md` — cada um foi reconferido de forma independente.

#### Ponto 1 — as 13 tabelas de `DOMAIN_TABLES` estão todas cobertas (contadas, não amostradas)

**Confirmado.** `backend/src/database/domain-tables.ts` lista exatamente 13
tabelas (`users`, `accounts`, `mfa_factors`, `terms_versions`,
`consent_records`, `exams`, `exam_results`, `exam_files`, `share_links`,
`audit_events`, `branding_configs`, `integration_endpoint_configs`,
`exception_queue_items`) — contadas manualmente nesta validação, uma a uma,
não aceito o número "13" do relato. A suíte de BE-04 não reescreve essa lista
— importa `DOMAIN_TABLES` diretamente (`import { DOMAIN_TABLES, ... } from
'../../src/database/domain-tables.js'`) e usa `it.each(DOMAIN_TABLES)` em
cada um dos 12 blocos de cenário (4 operações × 3 camadas, ver Ponto 2) —
mesma fonte única de verdade já reaproveitada por BE-02/BE-03, então uma
tabela nova adicionada ao schema no futuro não pode ficar de fora por
divergência de lista entre arquivos (a mesma proteção que o comentário do
próprio `domain-tables.ts` já documenta). `seedTenantFixture` semeia
explicitamente as 13 tabelas por tenant, respeitando a cadeia real de FKs do
schema de BE-02 (`users` → `accounts` → `mfa_factors`; `terms_versions` →
`consent_records`; `exams` → `exam_results` → `exam_files`; `exams` →
`share_links`/`audit_events`; `branding_configs`/
`integration_endpoint_configs`/`exception_queue_items` direto de `tenants`) —
conferido linha a linha contra o schema, sem nenhuma tabela pulada.
Contagem de execução: 13 × 4 × 3 = 156, + 2 testes de `QA-DEBT-012` = 158 —
reexecutado nesta validação (ver Execução abaixo), bate exatamente.

#### Ponto 2 — as 3 camadas são genuinamente independentes (nenhuma depende ocultamente da outra)

**Confirmado, por leitura de código da infraestrutura de defesa, não só do
teste em si** — a pergunta certa não é "o teste está estruturado em 3
blocos", é "cada bloco provaria isolamento mesmo que as outras duas camadas
estivessem quebradas". Reli `tenant-scoped.repository.ts`,
`create-app-database-role.ts` e `enable-row-level-security.ts` para verificar
isso, não apenas o spec:

- **Camada 1 (guard + RLS)**: `TenantScopedRepository` sobre a conexão da
  role `portalmed_app`. Caminho real da aplicação — as duas defesas atuam
  juntas, não prova nada isoladamente por si só (é o "caminho feliz
  combinado" que o critério de aceite de BE-03/ADR-006 já alertava não ser
  suficiente sozinho).
- **Camada 2 (guard sozinho)**: mesma classe `TenantScopedRepository` (mesmo
  filtro explícito `.where('tenant_id', ...)`, aplicado em `#runOnTable`),
  mas sobre a conexão **superusuário** do container (`adminClient`/
  `superuserConnection`, o mesmo usuário que roda as migrations via
  `container.getConnectionUri()`). Isto é genuinamente independente da RLS
  porque é um fato estrutural do PostgreSQL, não uma escolha do teste: a
  migration `enable-row-level-security.ts` habilita `FORCE ROW LEVEL
  SECURITY`, mas por semântica documentada do próprio Postgres, `FORCE`
  nunca afasta a isenção de superusuário (só afasta a isenção do dono da
  tabela quando o dono não é superusuário) — então qualquer isolamento
  observado nesta camada só pode vir do filtro explícito do guard, RLS está
  estruturalmente fora de jogo aqui, não apenas "não teria efeito na
  prática". Confirmei isso é real e não um comentário otimista: a migration
  `create-app-database-role.ts` cria `portalmed_app` **sem** `bypassrls`
  (comentado explicitamente no código como decisão deliberada,
  `GUARDRAILS.md` regra A.3), e o `adminClient`/`superuserConnection` usam a
  string de conexão bruta do container (`container.getConnectionUri()`), que
  o `testcontainers`/`postgres:16-alpine` cria com o usuário inicial do
  `initdb` — superusuário por padrão. Não testei isto isoladamente com uma
  query manual adicional (seria redundante: a Camada 3 abaixo já isola RLS
  para o lado oposto, e o comportamento de `FORCE`/superusuário é
  comportamento documentado do PostgreSQL, não uma hipótese implementada
  neste projeto).
- **Camada 3 (RLS sozinha)**: `pg.Client` **cru** (`withAppRoleClient`),
  conectado como `portalmed_app`, executando SQL direto (`SELECT`/`UPDATE`/
  `DELETE ... WHERE id = $1`, sem `WHERE tenant_id = ...`) — nenhuma
  instância de `Kysely`/`TenantScopedRepository` é tocada neste bloco,
  confirmado por leitura: a função nunca importa nem invoca nenhum código de
  `tenant-scoped.repository.ts`. Isolamento aqui só pode vir da política
  `tenant_isolation_policy` (`USING`/`WITH CHECK` sobre
  `current_setting('app.tenant_id', true)`), nunca do guard de aplicação —
  código do guard está genuinamente fora do caminho de execução deste bloco.

**Conclusão**: as três camadas não formam um círculo de dependência oculta —
cada uma isola um componente real e documentado da defesa em profundidade
(guard de aplicação vs. política RLS vs. privilégio de role), confirmado por
leitura da infraestrutura subjacente, não apenas da estrutura do teste.

#### Ponto 3 — `QA-DEBT-012` tem cobertura de regressão permanente e genuína (reproduzido manualmente por este agente)

**Confirmado, reproduzido eu mesmo o vetor, não apenas lido o teste do
Backend.** Antes de aceitar o bloco `[QA-DEBT-012]` da suíte, refiz o ataque
de forma independente:

1. Criei um arquivo real e temporário,
   `backend/src/modules/catalogo-exames/__qa-be04-manual-deepimport.ts`, com
   `import { KYSELY_CONNECTION } from '../../database/kysely-connection.js';`
   (deep-import direto, por fora do barrel — o vetor caracterizado em
   `QA-REPORT.md` Seção 1.6.2).
2. Rodei `npm run lint:boundaries` — a regra
   `boundary/no-kysely-connection-token-outside-database` reportou 2 erros
   (import e uso do identificador), mensagem apontando corretamente para
   `GUARDRAILS.md` regra A.2/`QA-BUG-002` e sugerindo
   `provideTenantScopedRepository`.
3. Removi o arquivo (`rm`) e reexecutei `npm run lint:boundaries` — limpo de
   novo, confirmado por `ls`/listagem de diretório que `src/modules/catalogo-exames/`
   voltou a ter só os 2 arquivos originais (`catalogo-exames.module.ts`,
   `index.ts`), sem resíduo.

Com o vetor reconfirmado manualmente, avaliei o bloco `[QA-DEBT-012]` da
própria suíte de BE-04 (linhas 547-698 de
`tenant-cross-leak-exhaustive.e2e-spec.ts`): ele faz exatamente o mesmo tipo
de reprodução, mas como regressão permanente automatizada, com dois testes:
(a) escreve dois arquivos reais dentro de `src/modules/catalogo-exames/`
(deep-import direto + import renomeado) e roda o `ESLint` real via API Node
(`new ESLint({ cwd: BACKEND_ROOT })`, a mesma config de `lint:boundaries`,
não apenas o `RuleTester` unitário que já existe separadamente) — confirmando
que a regra continua reportando os dois; (b) importa dinamicamente o Symbol
real obtido pelo deep-import, injeta num provider comum do NestJS (réplica
literal do vetor original) e confirma que, mesmo que o lint fosse ignorado, a
query executa mas retorna `[]` — a RLS contém o impacto, sem
`TenantContext.run()` ativo. `beforeAll`/`afterAll` limpam os dois arquivos de
fixture (`fs.rm(..., { force: true })`, com limpeza defensiva também no
início) — confirmei por `git status`/listagem de diretório após rodar
`npm run test:tenant-isolation` nesta validação (ver Execução abaixo) que
nenhum resíduo ficou em `src/modules/catalogo-exames/`.

**Isto é cobertura de regressão genuína**, não apenas mais uma alegação: um
desenvolvedor futuro que remover/enfraquecer a regra de lint
`boundary/no-kysely-connection-token-outside-database` faria o teste (a)
falhar dentro do próprio gate bloqueante de BE-04 (`tenant-isolation-test`),
não apenas silenciosamente perder cobertura de um job de lint isolado — o que
era exatamente a lacuna que motivou `QA-DEBT-012` em primeiro lugar
("garantindo que a suíte de vazamento cruzado detectaria uma futura regressão
desta regra de lint específica, não apenas confiar no CI de lint
isoladamente"). `QA-DEBT-012` está fechado — ver atualização na Seção 2
abaixo.

#### Ponto 4 — o job `tenant-isolation-test` do CI aponta para o script correto e é bloqueante

**Confirmado o apontamento; bloqueante confirmado até o limite do que é
verificável a partir do repositório.** `backend/package.json` define
`"test:tenant-isolation": "vitest run --config ./vitest.config.e2e.ts
test/database/tenant-cross-leak-exhaustive.e2e-spec.ts"` — aponta exatamente
para o arquivo desta suíte, não para a suíte e2e inteira nem para outro
arquivo. `.github/workflows/backend-ci.yml`, job `tenant-isolation-test`:
disparado nos mesmos gatilhos do job `lint-and-test`
(`pull_request`/`push` com `paths: backend/**` e
`.github/workflows/backend-ci.yml`, escopo amplo o suficiente para cobrir
qualquer PR que toque query/repositório/guard/migration — a mesma leitura de
"todo PR" já aceita por este agente para `lint-and-test` em BE-01, Seção
1.2), `needs: lint-and-test`, roda `npm run test:tenant-isolation` (comando
exato, conferido linha a linha) em um job **separado** de `lint-and-test`
(decisão documentada no próprio workflow: "para o motivo da falha ficar
inequívoco no Checks do PR") — não é apenas mais um step informativo
misturado a outro job, é um Check distinto do GitHub por PR. `build-and-push`
declara `needs: [lint-and-test, tenant-isolation-test]`, então a falha deste
job também impede o pipeline de build/deploy de avançar, reforçando a leitura
de "bloqueante" dentro do próprio workflow.

**Limite desta verificação, registrado por transparência**: se
`tenant-isolation-test` está de fato configurado como **required status
check** nas regras de proteção de branch do GitHub (o mecanismo que
efetivamente impede o botão "Merge" de PR de ficar habilitado com o check
vermelho) é uma configuração que vive nas configurações do repositório no
GitHub, não no arquivo YAML do workflow em si — não verificável a partir do
sistema de arquivos deste ambiente (sem `gh` CLI disponível nesta sessão).
Isto não é um achado específico de BE-04: a mesma limitação já existiria para
`lint-and-test` (BE-01) e não foi levantada naquela validação. Não gera
reprovação (o critério de aceite fala em "roda em todo PR", que está
confirmado; a garantia adicional de "bloqueia o merge mesmo que alguém
tente ignorar o check" é uma configuração de governança do GitHub, fora do
escopo de código que BE-04 entrega) — mas fica registrado como item de
acompanhamento para DevOps/DevSecOps confirmarem a configuração de branch
protection do repositório real.

#### Ponto 5 — execução completa da suíte

**Execução (reexecutada de forma independente por este agente)**

| Comando | Resultado |
|---|---|
| `docker info` (pré-checagem, testcontainers) | Docker disponível no ambiente desta validação |
| `npm run lint` (`lint:oxlint` + `lint:boundaries`) | Sem apontamentos |
| `npm run build` (`nest build`) | Build limpo, sem erro |
| `npm run test` (`vitest run`, `backend/`) | 6 arquivos de teste, 50/50 passando — bate com o relato |
| `npm run test:e2e` (`vitest run --config ./vitest.config.e2e.ts`) | 4 arquivos de teste, 233/233 passando (Postgres real via `@testcontainers/postgresql`) — bate com o relato (75 pré-existentes de BE-02/BE-03 + 158 novos de BE-04) |
| `npm run test:tenant-isolation` (script dedicado) | 1 arquivo, 158/158 passando — bate exatamente com 13 tabelas × 4 operações × 3 camadas + 2 de `QA-DEBT-012` |

Todos os números batem exatamente com o relato do Backend em `TASK.md`.
Reprodução manual do vetor de `QA-DEBT-012` (Ponto 3 acima) executada e
revertida sem deixar resíduo — `ls`/listagem de diretório confirmada limpa
após a suíte completa rodar.

#### Checklist de critério de aceite (item a item)

1. **"Suíte de teste no CI cria 2+ tenants com dados equivalentes"** —
   **Atendido**. 3 tenants (`tenantA`, `tenantB`, `tenantC` — o terceiro
   dedicado aos cenários de `deleteById`, decisão correta e documentada
   porque `branding_configs`/`integration_endpoint_configs` são 1:1 com
   `tenants`), dados equivalentes semeados nas 13 tabelas via
   `seedTenantFixture` reutilizável.
2. **"Comprova, para toda entidade de domínio, que uma sessão do tenant A
   nunca retorna dado do tenant B"** — **Atendido**, ver Ponto 1.
3. **"Mesmo via manipulação direta de identificador (ID guessing)"** —
   **Atendido**. Todo bloco de `findById`/`updateById`/`deleteById` usa
   literalmente `fixtureB[table]`/`deleteFixtureC[table]` (o ID real de uma
   linha de outro tenant) sob o `TenantContext`/`app.tenant_id` do tenant A —
   é ID guessing explícito, não um cenário indireto.
4. **"Suíte roda em todo PR que toque camada de acesso a dado (bloqueante,
   não opcional)"** — **Atendido**, com a ressalva de escopo de verificação
   registrada no Ponto 4 (configuração de branch protection fora do
   filesystem, não específica de BE-04).
5. **"Nenhum bug de severidade alta/crítica em aberto"** — confirmado,
   nenhum encontrado. Nenhum bug novo identificado nesta validação.

#### Checklist de Pronto (DoD do agente QA) aplicado a BE-04

- [x] Todo critério de aceite da tarefa foi testado e está passando
- [x] Nenhum bug de severidade alta/crítica em aberto
- [x] Nenhum bug de severidade baixa/média novo identificado nesta tarefa —
      `QA-DEBT-012` (herdado de BE-03) fechado por esta tarefa, não aberto
      por ela
- [x] Testes de integração cruzada — não aplicável no sentido de
      Backend↔Frontend/Mobile (BE-04 é infraestrutura pura de acesso a
      dado); a "integração cruzada entre camadas" relevante para esta
      tarefa (guard × RLS × privilégio de role) foi validada em profundidade
      no Ponto 2
- [x] Requisito não funcional relevante validado (a própria regra de maior
      severidade do projeto, `GUARDRAILS.md` §A — validada de forma
      sistemática e exaustiva, não amostral)

**Veredito**: **Aprovado.** As 13 tabelas de `DOMAIN_TABLES` contadas e
confirmadas cobertas de forma exaustiva (não amostral); as 3 camadas
confirmadas genuinamente independentes por leitura da infraestrutura
subjacente (semântica de `FORCE ROW LEVEL SECURITY`/superusuário do
PostgreSQL, não apenas estrutura do teste); `QA-DEBT-012` fechado com
cobertura de regressão permanente genuína, vetor reproduzido manualmente por
este agente antes e depois da suíte automatizada confirmando o mesmo
resultado; job de CI `tenant-isolation-test` aponta para o script correto e
está estruturado como Check bloqueante separado (limite de verificação sobre
configuração de branch protection do GitHub registrado, não específico desta
tarefa); suíte completa (lint, build, unit, e2e, script dedicado)
reexecutada de forma independente, todos os números batendo com o relato.
Nenhum bug, nenhuma ressalva nova. Status `Concluído` em `TASK.md`
**mantido**. **Esta é a condição não negociável do Gate 2 do CTO
(`GUARDRAILS.md` regra A.4) — com esta aprovação, ela está genuinamente
cumprida por implementação verificada, não apenas declarada.**

---

## 2. Log de Bugs e Débitos

| ID | Tarefa | Severidade | Descrição | Status | Prazo |
|---|---|---|---|---|---|
| QA-DEBT-001 | FE-01 | Baixa | Comentário em `branding/brandingApi.ts` afirma que FE-01 "não é considerada Concluída" enquanto depender do mock — contradiz o status `Concluído` já registrado em `TASK.md` pelo orquestrador. Não afeta comportamento/build/teste; é inconsistência de documentação/rastreabilidade dentro do código. | Aberto (débito, não bloqueia) | Próximo PR que tocar `brandingApi.ts`; no mais tardar, na troca pelo endpoint real de BE-32 |
| QA-DEBT-002 | FE-01 | — (não é bug, é item de revalidação agendada) | `cross-platform-integration-testing` do contrato `BRANDING_CONFIG` (FE-01 ↔ BE-32) não pôde ser executado — BE-32 ainda não implementado/publicado em `API-CONTRACT.yaml`. | Aguardando dependência (BE-32) | Assim que BE-32 publicar o endpoint e Frontend trocar `brandingApi.ts` |
| QA-DEBT-003 | FE-02 | Baixa | `Header.hospitalName` é recebido como prop explícita (decisão correta frente ao `SDD.md` §5, que diverge de `UX-SPEC.md` §3.1 quanto à fonte do nome — divergência confirmada nesta validação, não é bug de FE-02), mas não há hoje tarefa em `TASK.md` que amarre esse valor a `TENANT.nome_institucional` real em runtime, nem correção da redação de `UX-SPEC.md` §3.1. Risco de o dado ficar sem integração real por falta de rastreamento. | Aberto (débito, não bloqueia) | Tech Lead avalia inclusão de item de integração (ex.: app shell de TL-01/FE-05); UX-UI/BA corrige `UX-SPEC.md` §3.1 para refletir `TENANT` — antes do início da implementação do app shell autenticado |
| QA-DEBT-004 | FE-02 | Baixa | `MessageBanner` reserva `min-height` (não altura fixa) para evitar deslocamento de layout — funciona para o caso comum (mensagem de 1 linha), mas nenhum teste cobre mensagem longa o suficiente para quebrar em 2+ linhas, cenário em que ainda poderia haver deslocamento. | Aberto (débito, não bloqueia) | Primeira tarefa que integrar `MessageBanner` com copy real de mensagens de erro (ex.: FE-08, FE-11) valida com texto realista/pior caso |
| QA-DEBT-005 | FE-02 | Baixa | Estado `isConfirming`/"Processando…" do `ConfirmationModal` (0% de cobertura de teste) nunca foi exercitado — funcionalidade presente no código mas não verificada. | Aberto (débito, não bloqueia) | Primeira tarefa que usar `isConfirming={true}` em produção (ex.: TL-27 revogar link, TL-32 desativar conta) adiciona o teste faltante |
| QA-DEBT-006 | BE-02 | Média | `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title` foi implementado com constraint `UNIQUE` **global** (índice único parcial sobre a coluna, ignorando `NULL`), não composta `(tenant_id, dicom_remote_ae_title)` como a leitura literal de `TASK.md` (BE-02) e `GUARDRAILS.md` (regra A.5) sugere ("`UNIQUE` por tenant"). Tecnicamente correto e melhor alinhado ao objetivo de ADR-012 (impedir colisão de AE Title *entre* tenants, risco nomeado nas "Negative Consequences" do próprio ADR) do que a leitura composta seria — mas resolvido unilateralmente no código, sem passar pelo processo de escalonamento via `BLOCKERS.md` que `GUARDRAILS.md` regra 39 exige para inconsistência entre `GUARDRAILS.md`/ADR, e sem registro de exceção aprovada pelo CTO no "Log de Alterações" de `GUARDRAILS.md` (regras 37-38). Sem falha de segurança na implementação atual (o oposto: a leitura literal teria sido menos segura). | Aberto (débito, não bloqueia) — recomendação: Tech Lead formaliza a correção de redação de `TASK.md`/`GUARDRAILS.md` regra A.5 | Antes de BE-38 (Backend) ser implementada — consome diretamente esta mesma coluna/constraint |
| QA-DEBT-007 | FE-03 | Baixa | `PasswordField` usa política de senha configurável (prop, não hardcoded — correto por `GUARDRAILS.md` item 33) com default de 8 caracteres + maiúscula/minúscula/número, decisão de detalhe do Frontend porque `PRD-TECNICO.md` não fixa o valor. Diferente do precedente citado em `TASK.md` §1.7 (parâmetros de responsabilidade única, geralmente só Backend), política de senha precisa ser **idêntica** entre o indicador do Frontend e a validação server-side (RF-15/cadastro, RF-02/recuperação) para ter valor real — hoje nenhuma tarefa de Backend (`BE-18` ou outra) fixa/menciona esse valor. Sem falha de segurança (servidor sempre revalida de forma independente), mas risco de divergência de UX (checklist do Frontend mostra "Forte"/100% e o servidor ainda assim rejeitar, ou vice-versa) se os dois lados adotarem valores diferentes sem coordenação. | Aberto (débito, não bloqueia) — recomendação: Tech Lead consolida um valor único de política de senha (default do Frontend é uma proposta razoável) | Antes de Backend implementar a validação server-side equivalente (RF-15/BE-18 ou tarefa dedicada) e antes de FE-11 (redefinir senha) reutilizar este componente |
| QA-BUG-001 | BE-03 | **Alta** | O guard de aplicação de `tenant_id` (`TenantScopedRepository`, `src/database/tenant-scoped.repository.ts`) não é estrutural contra todos os vetores de bypass razoáveis — apenas contra importar `kysely`/`pg` diretamente (bloqueado pela regra de lint `no-raw-kysely-outside-database`, confirmado nesta validação). Existe um segundo vetor, verificado empiricamente: uma subclasse de `TenantScopedRepository` acessando o campo `private readonly db` via um cast `(this as unknown as { db: unknown }).db as any` — sem importar `kysely`/`pg` em lugar nenhum — consegue construir e **executar** uma query de repositório contra o banco real sem passar por `runOnTable()`, sem `TenantContext.run()` ativo e sem lançar `MissingTenantContextError`. Isso passa limpo em `lint:boundaries`, `lint:oxlint` e `build` (`nest build`, TS `private` é apenas checagem de compilador, não `#campo` nativo). Testado contra Postgres real via testcontainers: a query executa e retorna `[]` (não vaza dado de nenhum tenant neste caso específico) porque a RLS — segunda camada, independente — nega o acesso por `app.tenant_id` nunca ter sido definido nessa conexão (falha fechada, confirmada). Ou seja: a RLS evitou vazamento de dado real desta vez, mas o guard de aplicação (a garantia que o próprio critério de aceite de BE-03 nomeia, "guard testado") foi genuinamente contornado, não apenas "quase" contornado — violando a leitura literal do critério de aceite ("Nenhuma query de repositório executa sem `tenant_id` do contexto") e a alegação de `backend/docs/tenant-guard-and-rls.md`/comentários do código de que bypassar "exigiria primeiro violar [a] regra de lint". Se um desenvolvedor futuro usasse este mesmo padrão de acesso e também chamasse `set_config('app.tenant_id', ...)` com um valor forjado (o próprio `runOnTable`, a poucas linhas do campo acessado indevidamente, já mostra esse padrão como referência), haveria vazamento cross-tenant real, sem o guard interceptar nada. **Causa raiz**: `private` do TypeScript é apagado na compilação, não é o campo privado nativo do JavaScript (`#db`, suportado desde ES2022 — `tsconfig.json` já usa `target: ES2023`, compatível). **Correção recomendada**: trocar `private readonly db` por `#db` (campo privado nativo) em `TenantScopedRepository`, fechando o vetor por completo; adicionar teste de regressão adversarial cobrindo especificamente este vetor (não só o caminho feliz/esquecimento óbvio já coberto pela suíte atual). | **Corrigido/Fechado** — revalidado empiricamente por este agente em 2026-09-03 (spec e2e próprio, independente do teste de regressão do Backend): o mesmo cast agora resolve `db`/`runOnTable` para `undefined` (campos privados nativos `#db`/`#runOnTable`), confirmado contra Postgres real; `Reflect.ownKeys`/`Object.getOwnPropertyNames`/`for...in` também não expõem os campos. Ver `QA-REPORT.md` Seção 1.6.1. | Backend corrigiu conforme recomendação (2026-09-03); revalidação fechou o item — nenhum prazo pendente |
| QA-BUG-002 | BE-03 | **Alta** | Achado nesta revalidação de `QA-BUG-001` (2026-09-03, ver Seção 1.6.1), não presente na correção original que motivou a reprovação de `QA-BUG-001`: o token de injeção de dependência `KYSELY_CONNECTION` (`src/database/kysely-connection.ts`) é exportado por `DatabaseModule` (`exports: [KYSELY_CONNECTION]`) e reexportado pelo barrel público `src/database/index.ts` — intencionalmente, para que repositórios concretos de domínio (BE-10+) possam `@Inject(KYSELY_CONNECTION)` no próprio construtor e repassar a conexão a `super(...)`. Nada impede que **qualquer outro provider comum do NestJS** (não uma subclasse de `TenantScopedRepository`, sem relação alguma com ela) declare o mesmo `@Inject(KYSELY_CONNECTION)` e receba a mesma instância real da conexão, desde que o módulo que o contém importe `DatabaseModule` — algo que qualquer módulo de domínio legítimo precisa fazer de qualquer forma. Verificado empiricamente com um módulo NestJS real (`@nestjs/testing`) contra Postgres via testcontainers: um provider criado para o teste, sem estender `TenantScopedRepository`, sem importar `kysely`/`pg` (não aciona `no-raw-kysely-outside-database`) e sem nenhum `TenantContext.run()` ativo, executou uma query real (`selectFrom(...).selectAll().execute()`) sem lançar `MissingTenantContextError` nem `TypeError` — passou limpo por `lint:oxlint`, `lint:boundaries` e `build`. A query retornou `[]` (0 linhas) porque a RLS (segunda camada, independente) negou o acesso por `app.tenant_id` nunca ter sido definida nessa conexão — mesmo padrão de `QA-BUG-001`: defesa em profundidade conteve o impacto real, mas o guard de aplicação foi genuinamente contornado, por um caminho que não depende do campo `#db`/`#runOnTable` corrigido em `QA-BUG-001` nem da regra de lint existente. **Causa raiz**: a arquitetura precisa expor `KYSELY_CONNECTION` para módulos de domínio poderem instanciar seus próprios repositórios concretos, mas nada restringe esse token a ser usado exclusivamente dentro do construtor de uma subclasse de `TenantScopedRepository`. **Correção recomendada**: não reexportar `KYSELY_CONNECTION` pelo barrel público `src/database/index.ts`; expor em vez disso uma função fábrica (ex. `provideTenantScopedRepository(ConcreteRepositoryClass)`) que os módulos de domínio usam para registrar o próprio repositório como provider, mantendo a injeção do token inteiramente dentro de `src/database/`; alternativa complementar, nova regra de lint proibindo `@Inject(KYSELY_CONNECTION)`/uso do identificador fora de `src/database/`. | **Corrigido/Fechado** — revalidado empiricamente por este agente em 2026-09-03 (rodada 3, spec e2e próprio, independente do teste de regressão do Backend): (a) reprodução literal do vetor original (via barrel) confirmada fechada, agora em tempo de compilação (barrel não exporta mais o símbolo, `tsc` rejeitaria um import estático); (b) as duas variações pedidas nesta rodada (deep-import direto para `kysely-connection.ts`, import renomeado) testadas com arquivos reais dentro de `src/modules/catalogo-exames/` + `npm run lint:boundaries` (não só o `RuleTester` do Backend) — ambas reportadas pela nova regra `boundary/no-kysely-connection-token-outside-database`; (c) efeito em runtime caso o lint fosse ignorado também testado (módulo NestJS real via testcontainers) — a query executa mas a RLS nega (0 linhas, nenhuma escrita), mesma defesa em profundidade de sempre. Ver `QA-REPORT.md` Seção 1.6.2. Ressalva de baixa severidade sobre a natureza CI-only da defesa do vetor de deep-import registrada em `QA-DEBT-012` (não bloqueante). | Backend corrigiu conforme recomendação (2026-09-03); revalidação (rodada 3) fechou o item — nenhum prazo pendente. BE-04 liberada para começar. |
| QA-DEBT-008 | FE-04 | Baixa | `ResponsiveDataList` decide a estrutura DOM (tabela vs. lista de cards) em JS via `useBreakpoint`/`matchMedia` — decisão sólida para evitar leitor de tela anunciar conteúdo duplicado (ver Seção 1.7). Mas `useMediaQuery.ts::getMatchesNow` retorna `false` quando `window` é `undefined`, então `useBreakpoint()` sempre resolveria `'mobile'` em um eventual primeiro render de servidor (SSR) — em qualquer breakpoint que não seja mobile, isso causaria flash de conteúdo incorreto e um hydration mismatch real do React ao hidratar no cliente. `FormLayout` não tem esse risco (coluna única via CSS puro, sem `useBreakpoint`). Hoje inaplicável: `RNF-07`/`UX-SPEC.md` §6 confirmam produto SPA "web responsiva via navegador", sem nenhuma decisão de SSR/SSG registrada em `SDD.md`/ADR. | Aberto (débito, não bloqueia) | Se/quando o projeto adotar SSR/SSG (nenhuma tarefa prevista hoje), revisar `getMatchesNow`/`useBreakpoint` antes de usar `ResponsiveDataList` em contexto renderizado no servidor — documentar a limitação no próprio `useMediaQuery.ts` enquanto isso não ocorre |
| QA-DEBT-009 | FE-04 | Baixa | `ResponsiveDataList` remonta a árvore DOM inteira (tabela ↔ lista de cards) ao cruzar o breakpoint de 599px — se o foco do teclado estiver em um elemento interno (ex.: link de ação numa célula) durante o cruzamento, o foco é perdido (comportamento padrão do navegador ao desmontar um nó focado), sem devolução de foco tratada pelo componente. Nenhum teste cobre o cenário; nenhuma tela consome o componente ainda para medir o impacto real. | Aberto (débito, não bloqueia) | Primeira tela que efetivamente consumir `ResponsiveDataList` com elementos focáveis nas células (TL-21/TL-24/TL-27/TL-31/TL-33, a partir de FE-12) valida o cenário de resize durante interação de teclado e adiciona tratamento/teste se necessário |
| QA-DEBT-010 | FE-06 | Média | A linha FE-06 de `TASK.md` §3.11 se contradiz dentro da própria célula de Status: começa com `Concluído — ...` e termina com a frase "Por causa exclusivamente desta pendência, a tarefa permanece `Em Andamento`, não `Concluída`" (referindo-se à pendência do mock otimista de CPF). O mesmo texto está replicado em `patientLookupApi.ts` (linhas 39-43). Diferente de `QA-DEBT-001`/FE-01 (onde só o código "discordava" de um `TASK.md` internamente consistente), aqui a inconsistência está dentro do próprio artefato de gestão que Tech Lead/CTO/DevSecOps/DevOps consultam para release-readiness. Não é bug funcional (build/teste/comportamento em runtime não afetados, confirmado nesta validação). | Aberto (débito, não bloqueia) — recomendação: Tech Lead/orquestrador reescreve a célula para um único veredito consistente | Antes da próxima leitura formal de `TASK.md` por CTO/DevSecOps/DevOps |
| QA-DEBT-011 | FE-06 | — (não é bug, é item de revalidação agendada) | `cross-platform-integration-testing` do fluxo TL-04 (CPF não localizado) não pôde ser executado ponta a ponta — `lookupPatientByCpf` é um mock deliberadamente otimista (sempre `{ found: true }`), sem nenhum `API-CONTRACT.yaml` publicado no repositório (confirmado nesta validação) e BE-18 ainda `A Fazer`. TL-04 está implementada e testada via injeção de dependência, mas não é alcançável por um usuário real na aplicação hoje. Mesmo padrão estrutural de `QA-DEBT-002`/FE-01. | Aguardando dependência (BE-18 + `API-CONTRACT.yaml` + Premissa P1 do hospital piloto resolvida) | Assim que BE-18 publicar o endpoint real e Frontend trocar `patientLookupApi.ts` |
| QA-DEBT-012 | BE-03 | Baixa | Correção de `QA-BUG-002` (rodada 3, ver Seção 1.6.2) fecha o vetor literal do relato original (reexportação de `KYSELY_CONNECTION` pelo barrel público) em tempo de compilação — mas a variação de deep-import direto para `src/database/kysely-connection.ts` (por fora do barrel) só é fechada por uma regra de lint dedicada (`boundary/no-kysely-connection-token-outside-database`), não por uma barreira estrutural de compilador/runtime (confirmado nesta validação: `npm run build` compila limpo com um deep-import real presente; só `npm run lint:boundaries` reporta). Se um PR contornasse ou ignorasse o gate de lint em CI, o token ainda seria alcançável por este caminho específico — contido, nesse cenário, apenas pela RLS (defesa em profundidade), não pelo guard de aplicação. Mesmo padrão de defesa já aceito neste projeto para `no-raw-kysely-outside-database` (Seção 1.6/BE-03) e `no-deep-module-import` (Seção 1.2/BE-01) — não é uma fraqueza nova, é a natureza desse tipo de defesa (fronteira de diretório, que TypeScript/Node não modelam nativamente). | **Fechado (regressão permanente adicionada)** — BE-04 incorporou o caso de regressão recomendado (`test/database/tenant-cross-leak-exhaustive.e2e-spec.ts`, bloco `[QA-DEBT-012]`), revalidado empiricamente por este agente nesta validação (Seção 1.11): reproduzi o próprio vetor manualmente (arquivo real de deep-import criado fora de `src/database/`, `npm run lint:boundaries` pegou a violação, arquivo removido, lint limpo de novo) e confirmei que a suíte agora detectaria uma regressão futura da regra de lint via ESLint real (não só `RuleTester`), com a RLS confirmada como contenção final caso o lint fosse ignorado. Continua sendo uma defesa de fronteira de diretório (CI/lint), não estrutural de compilador/runtime — natureza aceita, não é mais um débito sem cobertura de regressão. | Encerrado — BE-04 `Concluído` e aprovado (Seção 1.11) |
| QA-DEBT-013 | FE-07 | Média | A linha FE-07 de `TASK.md` §3.11 se contradiz dentro da própria célula de Status, mesmo padrão de `QA-DEBT-010`/FE-06: começa com `Concluído — revisão do orquestrador reexecutou test/build/lint...` mas termina com "Por essa pendência real de endpoint, esta tarefa permanece `Em Andamento` (não `Concluída`)... Não marcada para revisão de conclusão por este agente — aguarda o orquestrador" (texto herdado do Frontend, aparentemente não podado ao prependar a nota do orquestrador). **Segunda ocorrência consecutiva** do mesmo padrão exato (FE-06 → FE-07), sugerindo que o processo de fechamento de tarefa é sistemático, não um lapso pontual. Não é bug funcional (build/teste/comportamento em runtime não afetados). | Aberto (débito, não bloqueia) — recomendação: Tech Lead/orquestrador reescreve a célula para um único veredito consistente; se uma **terceira** ocorrência do mesmo padrão acontecer em tarefa futura, este agente escala formalmente via `BLOCKERS.md` como problema de processo de fechamento de tarefas (não de decomposição) | Antes da próxima leitura formal de `TASK.md` por CTO/DevSecOps/DevOps |
| QA-DEBT-014 | FE-07 | — (não é bug, é item de revalidação agendada) | `cross-platform-integration-testing` do fluxo TL-05→TL-06 (submissão final de cadastro + registro de consentimento) não pôde ser executado ponta a ponta — `termsApi.ts`/`registrationApi.ts` são mocks (conteúdo placeholder de termos; `registrationApi` sempre retorna `{ success: true }`), sem nenhum `API-CONTRACT.yaml` publicado no repositório (confirmado nesta validação) e BE-18/BE-19 ainda `A Fazer`. As três telas estão implementadas e testadas via injeção de dependência, mas o payload real (possivelmente duas chamadas separadas, por RN-02) não foi validado contra um contrato real. Mesmo padrão estrutural de `QA-DEBT-002`/FE-01 e `QA-DEBT-011`/FE-06. | Aguardando dependência (BE-18 + BE-19 + `API-CONTRACT.yaml`) | Assim que BE-18/BE-19 publicarem o endpoint real e Frontend trocar `termsApi.ts`/`registrationApi.ts` |
| QA-DEBT-015 | FE-07 | Baixa/Média | Nenhuma guarda de entrada em `CadastroDefinirSenhaPage` (TL-06)/`CadastroConfirmacaoPage` (TL-07) detecta a ausência de `personalData`/`termsVersion` em `location.state` quando o paciente alcança essas rotas sem passar por TL-02/TL-05 (URL direta, nova aba, favorito). Confirmado empiricamente (navegação real via Playwright direto para `/criar-conta/senha`): o formulário permanece funcional, o CTA "Criar conta" segue habilitado, e a submissão prossegue normalmente até TL-07 com mensagem genérica de sucesso, sem nome — como se o cadastro tivesse sido concluído com êxito, mesmo sem nome/CPF/e-mail/celular/versão dos termos. Com o mock atual (sempre `success: true`) isso não quebra a UI; contra o endpoint real, o desfecho mais provável é rejeição por campo obrigatório ausente, caindo no branch de erro genérico já implementado — que não orienta o paciente a voltar ao início do cadastro (a única ação que resolveria a causa raiz), criando risco de loop de tentativas fadadas ao mesmo erro. Refresh real (F5) mid-fluxo **não** apresenta este risco (`history.state` do navegador preserva o dado através de reload, confirmado empiricamente) — o risco é específico de navegação direta sem histórico prévio. | Aberto (débito, não bloqueia) | Antes de BE-18/BE-19 publicarem o endpoint real (quando o mock otimista deixar de mascarar o cenário) — adicionar guarda simples (`if (!personalData) navigate('/criar-conta', { replace: true })`) no mount de TL-06 |
| QA-DEBT-016 | BE-08 | Baixa | Achado nesta validação de Lote 1 (Seção 4.4). O teste e2e de expiração de URL assinada (`object-storage-infrastructure.e2e-spec.ts`, "um override de expiração curto...") não afirma "GET depois do prazo falha" — limitação documentada e aceita do próprio LocalStack (bug conhecido de longa data, `X-Amz-Expires` não é enforced pelo S3 simulado; issues públicas `localstack/localstack#7840`/`#9538`/`#2493`/`#1685`). O teste prova que o override é corretamente embutido na assinatura e funciona dentro do prazo; a garantia de expiração real de fato acontecer no servidor fica inteiramente delegada à implementação SigV4 de `@aws-sdk/s3-request-presigner` contra o S3 real da AWS, nunca reimplementada por este projeto — decisão de escopo razoável, não uma falha de teste. Ainda assim, o comportamento de expiração real (URL assinada rejeitada pela AWS após o TTL) nunca foi observado empiricamente neste projeto, nem contra LocalStack nem contra AWS real. | Aberto (débito, não bloqueia) | Antes do primeiro deploy em `staging` com tráfego real de laudo/imagem (a partir do fechamento do Lote 5, RF-06/RF-07/RF-08) — validação manual pontual (`curl` a uma URL assinada de TTL curto, antes e depois de expirar, contra o bucket real de `staging`) para confirmar o comportamento de expiração fora do ambiente de teste, sem exigir reabertura de BE-08 |

---

## 3. Veredito de Release-Readiness (parcial)

Este relatório cobre, até o momento, **FE-01, BE-01, FE-02, BE-02, FE-03,
BE-03, FE-04, FE-05, FE-06 e FE-07** — as tarefas marcadas `Concluído` em
`TASK.md` até esta validação (FE-01, FE-02, BE-02, FE-03, FE-04, FE-06 e
FE-07 aprovados com ressalvas não bloqueantes; BE-01 e FE-05 aprovados sem
ressalvas; **BE-03 reprovado**, status revertido para `Em andamento` — ver
Seções 1.1 a 1.10). Não há veredito
de release-readiness geral a declarar ainda: a maior parte do backlog (BE-04
a BE-38, FE-08 a FE-22) segue `A Fazer`, e BE-03 (infraestrutura de
isolamento multi-tenant, Seção A do `GUARDRAILS.md`) precisa ser corrigida e
revalidada antes de qualquer tarefa de domínio (BE-10+) que dependa de
`TenantScopedRepository` poder ser considerada segura para produção —
**release não está pronta enquanto BE-03 estiver em aberto**, dado que se
trata da regra de maior severidade do projeto. Este documento será
atualizado tarefa a tarefa, conforme Backend/Frontend/Mobile forem marcando
itens como `Concluído` no `TASK.md`, seguindo o ponto de sincronização
descrito no `AGENT-TEMPLATE.md` deste agente.

**Atualização de 2026-09-03 (revalidação, ver Seção 1.6.1)**: `QA-BUG-001`
foi confirmado **corrigido/fechado** por verificação empírica independente
deste agente (não apenas aceito o relato de correção do Backend) — RLS
também relida e reatacada manualmente, confirmada correta e não afetada
pela correção. Porém, a mesma revalidação, seguindo a mesma exigência de
rigor adversarial que motivou o achado original, expôs um **segundo** vetor
de bypass do guard de aplicação (`QA-BUG-002`, severidade Alta, via injeção
direta do token `KYSELY_CONNECTION` fora de `TenantScopedRepository`) — BE-03
**permanece reprovado**, status em `TASK.md` mantido/revertido para `Em
andamento`. A release continua não pronta enquanto BE-03 tiver qualquer bug
de severidade Alta/Crítica em aberto na Seção A do `GUARDRAILS.md`.

**Nota específica sobre FE-05**: aprovação sem ressalvas não altera o estado
de bloqueio geral de release acima — FE-05 é uma tela pública isolada
(landing), sem dependência do isolamento multi-tenant reprovado em BE-03 (que
é sobre leitura/escrita de dado real por repositório, camada que FE-05 não
toca). O backlog de Frontend segue normalmente para FE-06 em diante.

**Nota específica sobre FE-06** (ver Seção 1.9 para o detalhamento completo):
aprovação com ressalvas não altera o estado de bloqueio geral de release
acima pelo mesmo motivo de FE-05 (TL-02/TL-03/TL-04 não leem/escrevem dado
real via repositório de domínio, camada reprovada em BE-03). RN-01
(maioridade, sem exceção) foi confirmada empiricamente sem nenhum caminho de
bypass — ponto de maior risco desta tarefa, tratado com rigor adversarial
equivalente ao usado em `QA-BUG-001`/`QA-BUG-002` (BE-03), com resultado
positivo. Dois débitos não bloqueantes registrados: (a) `QA-DEBT-010` (Média)
— a própria linha FE-06 de `TASK.md` se contradiz entre o campo de Status
(`Concluído`) e o texto da nota ("permanece Em Andamento, não Concluída"),
recomendação explícita de correção de redação ao Tech Lead/orquestrador,
antes da próxima leitura formal deste documento por CTO/DevSecOps/DevOps; (b)
`QA-DEBT-011` — mesmo padrão de `QA-DEBT-002`/FE-01, TL-04 implementada e
testada mas não alcançável por usuário real até BE-18 publicar o endpoint de
match de CPF (`API-CONTRACT.yaml` ainda não existe no repositório, confirmado
nesta validação).

**Atualização de 2026-09-03 (revalidação, rodada 3, ver Seção 1.6.2)**: com a
correção de `QA-BUG-002` aplicada pelo Backend, este agente reproduziu o
vetor de ataque original contra o código corrigido, de forma empírica e
independente (spec e2e próprio, não o do Backend), incluindo as duas
variações adicionais pedidas nesta rodada (deep-import direto para
`kysely-connection.ts` por fora do barrel, import renomeado) e reconfirmou
`QA-BUG-001` fechado pela terceira vez. Ambos os bugs de severidade Alta
abertos nas rodadas anteriores estão **corrigidos/fechados**. **BE-03 está
`Aprovado com ressalvas`** — uma ressalva de severidade Baixa registrada
(`QA-DEBT-012`) sobre a natureza CI-only (não estrutural/runtime) da defesa
do vetor residual de deep-import, não bloqueante e consistente com o padrão
de defesa já aceito no restante do projeto (`no-raw-kysely-outside-database`,
`no-deep-module-import`). **A infraestrutura de isolamento multi-tenant
(Seção A do `GUARDRAILS.md`) está, do ponto de vista de QA, segura para que
tarefas de domínio (BE-10+) comecem a depender de `TenantScopedRepository`/
`provideTenantScopedRepository`.** O bloqueio geral de release descrito acima
(originado por `QA-BUG-001`/`QA-BUG-002`) está **removido**. `BE-04` (suíte
automatizada de vazamento cruzado entre tenants, condição do Gate 2 do CTO)
está liberada para começar — recomenda-se que seu escopo incorpore um caso
de regressão permanente para o vetor de deep-import caracterizado em
`QA-DEBT-012`, complementando o CI de lint isolado.

**Nota específica sobre FE-07** (ver Seção 1.10 para o detalhamento
completo): aprovação com ressalvas não altera o estado de bloqueio geral de
release — TL-05/TL-06/TL-07 não leem/escrevem dado real via repositório de
domínio (mesmo motivo de FE-05/FE-06). Esta validação foi a primeira a
utilizar automação de navegador real (Playwright, indisponível na sessão de
FE-06) para os três pontos mais sensíveis do critério de aceite: confirmado
empiricamente, não apenas por leitura de código/teste, que (a) nenhum estado
de sessão (`localStorage`/`sessionStorage`/cookie, incluindo `HttpOnly`) é
criado em nenhum ponto do fluxo TL-02→TL-07; (b) o CTA "Concluir cadastro" é
bloqueado pelo atributo `disabled` real (clique forçado não navega enquanto
desabilitado); (c) os dois controles de aceite de RN-02 são visual e
programaticamente distintos (captura de tela real confirmando moldura/ícone/
selo do consentimento de dado de saúde). Fecha, com FE-06, o fluxo completo
de cadastro (TL-02 a TL-07) do ponto de vista de QA — ambas as tarefas
aprovadas com ressalvas não bloqueantes. Três débitos registrados nesta
tarefa: `QA-DEBT-013` (Média) — segunda ocorrência consecutiva (FE-06 →
FE-07) da mesma contradição de status dentro da célula de `TASK.md`, com
aviso explícito de escalonamento formal ao Tech Lead via `BLOCKERS.md` se
ocorrer uma terceira vez (padrão recorrente, não mais bug isolado);
`QA-DEBT-014` — integração cruzada com BE-18/BE-19 pendente (mesmo padrão de
`QA-DEBT-002`/`QA-DEBT-011`); `QA-DEBT-015` (Baixa/Média) — ausência de
guarda de entrada em TL-06/TL-07 contra navegação direta sem os dados de
TL-02/TL-05, achado próprio desta validação (não presente no relato do
Frontend), com recomendação de correção pontual antes da integração real com
BE-18/BE-19.

### 3.1 Nota de consolidação — Fase 0 do Frontend concluída (FE-01 a FE-04)

Com FE-04 validado (Seção 1.7), **a Fase 0 completa do Frontend (design
system, componentes estruturais/formulário, framework responsivo) está
integralmente validada por QA**: 4 de 4 tarefas aprovadas, todas "Aprovado
com ressalvas" (nenhuma reprovação, nenhum bug de severidade alta/crítica em
nenhuma das quatro). Nenhuma ressalva registrada nas quatro tarefas é
bloqueante — todos os débitos (QA-DEBT-001 a QA-DEBT-005, QA-DEBT-007,
QA-DEBT-008, QA-DEBT-009) têm prazo associado a uma tarefa futura específica
(majoritariamente a primeira tela real que consumir cada componente, a
partir de FE-05/FE-06/FE-12), não uma data fixa — consistente com o guardrail
deste agente de tratar severidade baixa/média como débito registrado, não
bloqueio.

**Padrão observado ao longo da Fase 0, sem configurar escalonamento ao Tech
Lead** (guardrail deste agente: só padrão recorrente que aponte problema de
decomposição/diretriz é escalado, não a soma de achados pontuais de baixa
severidade): em três das quatro tarefas (FE-01/QA-DEBT-002, FE-02/QA-DEBT-003,
FE-04/DoD "integração cruzada") a infraestrutura de design system foi
construída e validada **antes** de qualquer tela real consumi-la — decisão
correta e documentada da decomposição de `TASK.md` (Fase 0 do Frontend
declarada "sem dependência cruzada", §4.4), mas que sistematicamente empurra
a validação de integração real (dado de tenant de verdade em vez de mock/prop
explícita, comportamento sob resize real em vez de mock de `matchMedia`,
mensagem de erro com texto realista em vez de placeholder curto) para as
primeiras tarefas de tela (FE-05 em diante). Isso não é um problema de
decomposição — é o efeito esperado de qualquer fundação construída em
paralelo à implementação de tela — mas fica registrado aqui para que este
agente (e o Tech Lead, se necessário) acompanhe se essas validações
diferidas de fato acontecem quando FE-05/FE-06/FE-12 forem marcadas
`Concluída`, em vez de serem esquecidas silenciosamente por não fazerem
parte do critério de aceite explícito daquelas tarefas futuras.

**Estado da Fase 0 como um todo** (Frontend + Backend, mesma fase de
`TASK.md` §4.2): Frontend Fase 0 está pronta do ponto de vista de QA (nenhum
bloqueio). **Atualização de 2026-09-03 (rodada 3, ver Seção 1.6.2 e a nota de
release-readiness acima)**: Backend Fase 0 também está pronta do ponto de
vista de QA — `QA-BUG-001` e `QA-BUG-002` (ambos BE-03, severidade Alta)
estão corrigidos/fechados, revalidados de forma empírica e independente por
este agente. BE-03 aprovado com ressalvas (`QA-DEBT-012`, baixa severidade,
não bloqueante). A infraestrutura de isolamento multi-tenant está liberada
para uso por tarefas de domínio (BE-10+), e `BE-04` (condição do Gate 2 do
CTO) está liberada para começar.

### 3.2 Atualização de 2026-09-03 — BE-04 aprovado: condição do Gate 2 do CTO genuinamente cumprida (ver Seção 1.11)

**BE-04 (suíte automatizada de vazamento cruzado entre tenants — condição não
negociável do Gate 2 do CTO, `GUARDRAILS.md` regra A.4) está `Aprovado`, sem
ressalvas.** Validado com o mesmo rigor adversarial de BE-03, com os cinco
pontos de atenção pedidos explicitamente confirmados de forma independente
(Seção 1.11 para o detalhamento completo):

1. As 13 tabelas de `DOMAIN_TABLES` contadas manualmente por este agente
   (não aceito o número do relato) e confirmadas cobertas de forma exaustiva
   — nenhuma amostragem, `it.each(DOMAIN_TABLES)` em cada um dos 12 blocos de
   cenário (4 operações × 3 camadas).
2. As 3 camadas (guard+RLS, guard sozinho via superusuário, RLS sozinha via
   `pg.Client` cru) confirmadas genuinamente independentes por leitura da
   infraestrutura subjacente (`tenant-scoped.repository.ts`,
   `create-app-database-role.ts`, `enable-row-level-security.ts`) — a
   independência da Camada 2 se apoia em semântica documentada do próprio
   PostgreSQL (superusuário nunca afastado por `FORCE ROW LEVEL SECURITY`),
   não em uma hipótese implementada pelo projeto; a Camada 3 nunca invoca
   nenhum código do guard, confirmado por leitura.
3. `QA-DEBT-012` (vetor de deep-import de `KYSELY_CONNECTION`, aberto desde a
   revalidação final de BE-03, Seção 1.6.2) recebeu cobertura de regressão
   permanente **genuína** — este agente reproduziu o vetor manualmente
   (arquivo real de deep-import criado fora de `src/database/`, pego por
   `npm run lint:boundaries`, removido, lint limpo de novo) antes de aceitar
   o bloco de teste automatizado equivalente da suíte. `QA-DEBT-012` está
   **fechado** (Seção 2, log de bugs e débitos, atualizado).
4. O job `tenant-isolation-test` (`.github/workflows/backend-ci.yml`) aponta
   para o script correto (`npm run test:tenant-isolation`, conferido linha a
   linha) e está estruturado como Check bloqueante separado, com
   `build-and-push` dependendo dele. Uma ressalva de transparência (não
   bloqueante, não específica de BE-04): se `tenant-isolation-test` está de
   fato marcado como *required status check* na configuração de proteção de
   branch do GitHub não é verificável a partir do sistema de arquivos deste
   ambiente — item de acompanhamento para DevOps/DevSecOps confirmarem na
   configuração real do repositório.
5. Suíte completa reexecutada de forma independente por este agente:
   `npm run lint` (limpo), `npm run build` (limpo), `npm run test` (50/50),
   `npm run test:e2e` (233/233), `npm run test:tenant-isolation` (158/158) —
   todos os números batendo exatamente com o relato do Backend em `TASK.md`.

Nenhum bug novo encontrado. Status `Concluído` em `TASK.md` **mantido**.

**Isto encerra, do ponto de vista de QA, a validação da condição de maior
severidade do Gate 2 do CTO**: a suíte de vazamento cruzado entre tenants
(`GUARDRAILS.md` §A) está implementada, exaustiva (não amostral), com as
três camadas de defesa provadas independentes umas das outras, e com
cobertura de regressão permanente para o único débito residual conhecido
(`QA-DEBT-012`). Combinado com a aprovação de BE-01, BE-02 e BE-03 (Seções
1.2, 1.4 e 1.6-1.6.2), **a Fase 0 do Backend está integralmente validada por
QA, sem nenhum bug de severidade Alta/Crítica em aberto em nenhuma tarefa**.
Por instrução explícita do orquestrador, esta validação encerra o lote de
trabalho atual — nenhuma sinalização de próxima tarefa a iniciar é feita por
este agente; a execução pausa aqui.

**Nota de transição (2026-09-03)**: a partir daqui, a convenção de
`EXECUTION-FLOW.md` (adotada em 2026-09-03, ver `TASK.md` nota de revisão no
topo do documento e §4.1 "Lotes de Entrega") muda o ritmo de validação deste
agente — passa a validar **por lote fechado**, não mais tarefa a tarefa. As
entradas acima (Seções 1.1 a 1.11 e 3, 3.1, 3.2), todas anteriores a essa
convenção, permanecem como histórico e não são reabertas ou reescritas por
essa mudança de processo. A primeira validação sob a nova convenção é o
**Lote 1**, Seção 4 abaixo.

---

## 4. Validação por Lote — Lote 1: Fundação de Infraestrutura e Design System

**Lote** (`TASK.md` §4.1.1): BE-01, BE-02, BE-05, BE-08 (Backend) + FE-01,
FE-02, FE-03, FE-04 (Frontend) — 34 dp, Fase 0. Gatilho de validação: todas as
8 tarefas do lote marcadas `Concluído` em `TASK.md` (confirmado por leitura
direta da Seção 3 em 2026-09-03 — última a fechar foi BE-08, cuja própria
célula de status registra "Última tarefa pendente do Lote 1 ... com esta
conclusão, todas as tarefas do lote ... estão `Concluído`, fechando o Lote
1"). **Fora de escopo desta validação, por instrução explícita**: BE-03 e
BE-04, embora referenciados na Seção 4.1.1 de `TASK.md` como parte de um lote
adjacente (Lote 3), pertencem a esse lote, não a este — não revalidados
aqui, mesmo já tendo histórico de QA anterior (Seções 1.6-1.6.2, 1.11) de
antes da convenção de lote.

**Método**: quatro das oito tarefas (BE-01, BE-02, FE-01 a FE-04) já têm
validação individual detalhada, registrada antes da convenção de lote
(Seções 1.1 a 1.7) — não repetidas linha a linha aqui; em vez disso, esta
seção **reconfirma empiricamente** os números daquelas validações (suíte
reexecutada de novo, de forma independente, nesta data) e verifica se algo
mudou desde então. BE-05 e BE-08 nunca tiveram uma entrada individual própria
neste relatório (concluídas depois que BE-04 fechou a última validação
tarefa-a-tarefa, Seção 1.11) — são validadas aqui pela primeira vez, com o
mesmo rigor das seções anteriores.

### 4.1 Execução da suíte completa (reexecutada de forma independente, 2026-09-03)

| Comando | Escopo | Resultado |
|---|---|---|
| `npm run lint` (`backend/`) | `lint:oxlint` + `lint:boundaries` | Limpo |
| `npm run build` (`backend/`) | `nest build` | Limpo |
| `npm run test` (`backend/`) | Unit/integração (vitest) | **119/119 passando** — bate exatamente com o último número relatado por BE-08 (`TASK.md`) |
| `npm run test:e2e` (`backend/`) | E2E via testcontainers (Postgres/Redis/LocalStack reais) | **245/245 passando** — bate exatamente com o último número relatado por BE-08 |
| `npm run lint` (`frontend/`) | `oxlint` | Limpo |
| `npm run build` (`frontend/`) | `tsc -b && vite build` | Limpo, 91 módulos transformados |
| `npm run test` (`frontend/`) | Suíte completa do frontend | **279/279 passando** (inclui FE-05/FE-06/FE-07, já adiantadas do Lote 4 — ver nota de escopo em 4.6) |
| `npx vitest run src/design-system` (`frontend/`) | Escopo isolado de FE-01 a FE-04 | **181/181 passando** — bate exatamente com o total acumulado relatado por FE-04, confirmando que nenhuma tarefa posterior quebrou o design system |

Nenhuma divergência entre o que `TASK.md` relata e o que a suíte real produz,
em nenhuma das 8 tarefas. Docker disponível no ambiente de validação —
testcontainers (Postgres, Redis, LocalStack) executados de ponta a ponta, sem
mock substituindo infraestrutura real em nenhum dos três.

### 4.2 BE-01 — Setup do monolito core (reconfirmação)

**Veredito**: **Aprovado** (mantido, sem ressalvas — Seção 1.2 tem o
detalhamento original). Reconfirmado nesta validação: 11 módulos NestJS em
`backend/src/modules/`, 1:1 com os bounded contexts de `SDD.md` §2.1, todos
importados só via barrel (`app.module.ts` lido diretamente). Regra de lint de
fronteira (`backend/src/tooling/eslint-rules/module-boundary-rule.js`) ativa
e limpa. CI (`.github/workflows/backend-ci.yml`, lido diretamente) roda
`lint:oxlint` + `lint:boundaries` + `test:cov` + `test:e2e` + `build` em todo
PR que toque `backend/**`, confirmado nesta validação — nenhuma regressão de
escopo desde a validação original.

### 4.3 BE-02 — PostgreSQL + schema base multi-tenant (reconfirmação)

**Veredito**: **Aprovado com ressalvas** (mantido — `QA-DEBT-006`, severidade
Média, ainda aberto; Seção 1.4 tem o detalhamento original). Reconfirmado
nesta validação por leitura direta das 15 migrations de `backend/migrations/`
(não só a contagem): as 14 tabelas de `SDD.md` §5 existem, `tenant_id uuid
NOT NULL` + FK em toda tabela de domínio (`exam_files`,
`integration_endpoint_configs`, `branding_configs` lidas integralmente nesta
validação), os 5 campos de ADR-011 em `branding_configs`
(`status_validacao_contraste` com `CHECK` de enum e default `pendente`) e os
3 UIDs DICOM nullable + `dicom_remote_ae_title` com índice único parcial
global (não composto) em `exam_files`/`integration_endpoint_configs`,
exatamente como ADR-012 exige. `pgcrypto` habilitado e `users.cpf_hash`/
`cpf_criptografado` confirmados na migration correspondente.
`QA-DEBT-006` (constraint de AE Title implementada como única global, não
composta com `tenant_id` — leitura correta do ADR-012, mas fora do processo
formal de exceção a `GUARDRAILS.md` regra A.5) segue aberto, prazo inalterado
("antes de BE-38", Lote 5, ainda não iniciado — sem violação de prazo).

### 4.4 BE-05 — Setup Redis (sessão + filas BullMQ) — primeira validação

**Critério de aceite validado** (`TASK.md` §3.1, linha BE-05): "Instância
Redis acessível pela aplicação; estrutura de chave de sessão definida; fila
BullMQ operacional para jobs assíncronos (conversão de imagem, ingestão)."

**Código revisado**: `backend/src/redis/` (`redis-config.ts`,
`redis-connection.ts`, `redis-health.service.ts`, `redis.module.ts`,
`session-key.ts`, `index.ts`) e `backend/src/queue/`
(`queue-registry.service.ts`, `queue-connection.ts`, `queue.module.ts`,
`index.ts`).

**Checklist item a item**:

1. **"Instância Redis acessível pela aplicação"** — **Atendido**.
   `RedisHealthService.ping()` testado contra Redis real via testcontainers
   (`redis:7-alpine`), tanto chamando `createRedisConnection` diretamente
   quanto via DI do NestJS (`RedisModule` → `RedisHealthService`,
   configurado só por env). Toda configuração vem de env
   (`REDIS_HOST`/`PORT`/`PASSWORD`/`TLS`/`KEY_PREFIX`), nenhum valor
   hardcoded — `REDIS_TLS` usa `parseStrictBoolean` (só aceita
   `"true"`/`"false"` literal), lê corretamente em `.env.example`.
2. **"Estrutura de chave de sessão definida"** — **Atendido**.
   `buildSessionRedisKey` implementa `{prefixo}:session:{tenantId}:{sessionId}`,
   com `tenantId` obrigatório (nunca opcional) — testado contra Redis real
   que a mesma `sessionId` sob dois `tenantId` diferentes nunca colide (chave
   física distinta, valor de um tenant nunca lido pela chave do outro).
   Nenhuma lógica de criação/TTL deslizante/logout implementada aqui —
   corretamente deferida a BE-14 (tarefa futura, fora deste lote), conforme o
   próprio critério de aceite.
3. **"Fila BullMQ operacional para jobs assíncronos"** — **Atendido**.
   `test/queue/bullmq-infrastructure.e2e-spec.ts` prova, contra Redis real,
   um ciclo completo produtor→worker→job `completed` tanto instanciando
   `Queue`/`Worker` diretamente quanto via `QueueRegistryService.getQueue()`
   (incluindo cache de instância por nome e fechamento em
   `onModuleDestroy`). Nenhum nome de fila de negócio reservado nesta tarefa
   — correto, é infraestrutura genérica.
4. **Abstrações usáveis por tarefas futuras** (verificação de integração
   cruzada pedida para este lote, já que BE-05 não tem consumidor ainda):
   `QueueRegistryService.getQueue(name: string): Queue` e
   `buildSessionRedisKey(keyPrefix, { tenantId, sessionId })` são assinaturas
   simples, sem acoplamento a nenhuma lógica de negócio específica —
   coerentes e diretamente utilizáveis por BE-07 (fila de conversão de
   imagem), BE-14 (sessão) e BE-24 (fila de ingestão) sem necessidade de
   refatoração. `REDIS_CONNECTION` deliberadamente não é reexportado pelo
   barrel público (`src/redis/index.ts`, confirmado por leitura + teste
   e2e), mesma disciplina já aplicada a `KYSELY_CONNECTION` — reduz risco de
   um módulo de domínio futuro acessar Redis por fora do padrão sancionado.
5. **Requisito não funcional (nenhum hardcode que deveria ser config)** —
   Verificado: `SESSION_INACTIVITY_TTL_SECONDS` (900s, RF-04/`TASK.md` §1.7)
   e `BULLMQ_PREFIX` configuráveis via env, documentados em `.env.example`,
   nenhum valor numérico ou string de infraestrutura fixado no código.

**Veredito**: **Aprovado**, sem ressalvas. Nenhum bug encontrado.

### 4.5 BE-08 — Setup Object Storage (bucket SSE-KMS, região Brasil, URL assinada) — primeira validação

**Critério de aceite validado** (`TASK.md` §3.1, linha BE-08): "Bucket
provisionado em região Brasil (ADR-010); toda leitura de arquivo de
laudo/imagem passa por URL assinada com expiração curta, nunca URL pública
permanente."

**Código revisado**: `backend/src/object-storage/` (`object-storage.service.ts`,
`object-storage-config.ts`, `s3-client.ts`, `object-storage.module.ts`,
`index.ts`) e `infra/modules/object-storage/` (referência, provisionamento
real é do DevOps).

**Checklist item a item** (requisito de maior severidade deste lote —
GUARDRAILS.md itens 23/24, ADR-010):

1. **"Nunca URL pública permanente"** — **Atendido, verificado
   estruturalmente e empiricamente**. `ObjectStorageService` não expõe
   nenhum método de URL pública — `getReadSignedUrl` é o único caminho de
   leitura, sempre via `getSignedUrl` (SigV4) do SDK oficial da AWS. Teste
   e2e contra LocalStack real prova que (a) a URL sempre contém
   `X-Amz-Signature`/`X-Amz-Expires`, e (b) remover a assinatura da URL faz o
   `GET` falhar (`status >= 400`) — não é "tecnicamente assinada mas
   funcionalmente pública". Teto de expiração **não configurável por env**
   (`MAX_SIGNED_URL_TTL_SECONDS = 900`, 15 min) aplicado tanto ao default
   quanto a qualquer override do chamador, antes de qualquer chamada ao SDK —
   testado (unitário) que um override acima do teto lança erro sem tocar o
   SDK.
2. **"Bucket provisionado em região Brasil"** — **Atendido, com defesa em
   profundidade**. `loadObjectStorageConfig` rejeita qualquer
   `OBJECT_STORAGE_REGION` fora de `KNOWN_BRAZIL_REGIONS` (hoje só
   `sa-east-1`). Achado de segurança relevante **já corrigido pelo próprio
   Backend antes desta validação** (2 rodadas de fix-loop, documentadas na
   célula de status de BE-08 em `TASK.md`): `OBJECT_STORAGE_ENDPOINT`
   sobrescrevia silenciosamente o destino real do tráfego S3 e tinha
   prioridade sobre `region`, contornando a validação de região — confirmado
   nesta validação que a correção (`assertEndpointOverrideAllowed`, bloqueia
   `OBJECT_STORAGE_ENDPOINT` quando `NODE_ENV` é `production`/`staging`)
   está presente e testada (`object-storage-config.spec.ts`). Nenhuma
   variável de ambiente desativa essa checagem, confirmado por leitura do
   código.
3. **Abstração usável por tarefas futuras** (BE-07, BE-21, BE-22, BE-23):
   `getReadSignedUrl(key, expirySecondsOverride?)` e `putObject(key, body,
   contentType?)` são assinaturas simples e agnósticas de convenção de nome
   de chave — corretamente deferida ao chamador, sem lógica de negócio
   prematura. Barrel público não exporta o cliente S3 bruto nem a config
   resolvida, mesma disciplina de `REDIS_CONNECTION`/`KYSELY_CONNECTION`,
   confirmada por teste e2e dedicado.
4. **Requisito não funcional (sem hardcode)**: bucket, região, endpoint,
   credenciais e TTL default — todos via env, nenhum valor hardcoded;
   `parseStrictBoolean`/`parsePositiveInt` compartilhados com BE-05
   (`src/config/parse-env.ts`), evitando divergência de validação entre os
   dois módulos de infraestrutura.

**Achado desta validação (não presente no relato do Backend)**: registrado
como `QA-DEBT-016` (Seção 2, severidade Baixa, não bloqueante) — o teste e2e
de expiração de URL (`object-storage-infrastructure.e2e-spec.ts`) não afirma
"GET depois do prazo falha" contra o LocalStack, por uma limitação conhecida
e documentada do próprio LocalStack (não enforce real de `X-Amz-Expires`).
A aplicação delega a garantia de expiração real inteiramente à implementação
SigV4 do SDK oficial da AWS (mesma biblioteca usada em produção) — decisão de
escopo razoável, mas o comportamento de expiração real nunca foi observado
empiricamente neste projeto contra um S3 de verdade. Recomendação: validação
manual pontual contra o bucket real de `staging` antes do primeiro tráfego
real de laudo/imagem (a partir do fechamento do Lote 5) — não bloqueia o
fechamento deste lote, já que RF-06/RF-07/RF-08 (consumidores reais desta
tarefa) ainda nem começaram.

**Veredito**: **Aprovado com ressalvas** (`QA-DEBT-016`, Baixa, não
bloqueante).

### 4.6 FE-01 a FE-04 (reconfirmação) e nota de escopo sobre FE-05/FE-06/FE-07

**Veredito de cada tarefa**: mantido em relação à validação original —
FE-01 **Aprovado com ressalvas** (`QA-DEBT-001`, `QA-DEBT-002`, ambos
abertos, sem violação de prazo — BE-32/Lote 9 ainda não iniciado), FE-02
**Aprovado com ressalvas** (`QA-DEBT-003`, `QA-DEBT-004`, `QA-DEBT-005`,
abertos), FE-03 **Aprovado com ressalvas** (`QA-DEBT-007`, aberto, prazo
ligado a BE-18/Lote 4, ainda `A Fazer`), FE-04 **Aprovado com ressalvas**
(`QA-DEBT-008`, `QA-DEBT-009`, abertos). Detalhamento original nas Seções
1.1, 1.3, 1.5, 1.7 — não refeito aqui; reconfirmado nesta validação que os
181 testes do design system (Seção 4.1) continuam passando sem alteração de
comportamento desde a validação individual de cada tarefa, e que nenhum dos
achados originais foi silenciosamente corrigido ou re-emergiu de forma
diferente.

**Verificação transversal de acessibilidade (WCAG 2.1 AA) pedida para o
fechamento deste lote**: revisão dirigida a lacunas *entre* componentes (não
dentro de um componente isolado, já coberto pelas validações individuais).
Nenhuma lacuna transversal nova encontrada: rótulo programático, estado nunca
só por cor, `aria-live`, alvo de toque ≥44px e indicador de foco visível são
tratados de forma consistente em todos os componentes de FE-02/FE-03 (mesmo
padrão repetido, não uma implementação divergente por componente); `FormLayout`
(FE-04) é o único ponto de composição de layout de formulário e não introduz
nenhuma exceção ao padrão de coluna única. Os únicos gaps de acessibilidade
conhecidos permanecem os já registrados como débito (`QA-DEBT-004`, mensagem
longa sem teste de quebra de linha; `QA-DEBT-009`, perda de foco ao cruzar
breakpoint) — nenhum novo.

**Nota de escopo (não é achado de Lote 1, é contexto para leitura correta
deste relatório)**: a suíte completa do frontend (Seção 4.1) mostra 279
testes, não 181 — a diferença (98 testes) vem de FE-05, FE-06 e FE-07
(Lote 4), já implementadas e marcadas `Concluído` em `TASK.md`, com validação
individual própria já registrada neste relatório (Seções 1.8 a 1.10, antes da
convenção de lote). Isso é esperado e consistente com a diretriz de
paralelização de `TASK.md` §4.2 (ex-4.1) — Frontend pôde avançar em tarefas de
outro lote em paralelo, já que FE-05/06/07 não têm dependência de nenhuma
tarefa ainda em aberto do Lote 1. Não afeta o fechamento do Lote 1 (todas as
suas 8 tarefas, e só elas, foram usadas para o veredito desta Seção 4) e não
é revalidado aqui — permanece como está registrado nas Seções 1.8-1.10, a
ser formalmente incorporado quando o Lote 4 fechar por completo.

### 4.7 Testes de integração cruzada (Backend ↔ tarefas futuras)

Não há, dentro do próprio Lote 1, nenhuma dependência cruzada Backend↔Frontend
executável hoje (FE-01 consome `BRANDING_CONFIG` de um mock local, não de
BE-32 — BE-32 é Lote 9, ainda não iniciado; nenhuma tela do Lote 1 chama
nenhum endpoint de BE-01/02/05/08 diretamente, já que nenhum deles expõe rota
HTTP de negócio). A integração relevante a este lote é **Backend
infraestrutura → Backend domínio futuro** (BE-05/BE-08 consumidos por BE-07,
BE-14, BE-21 a BE-24) — verificada por inspeção de contrato/assinatura
(Seções 4.4 e 4.5 acima), já que os consumidores reais ainda não existem para
um teste ponta a ponta de verdade. Nenhuma incoerência de contrato
encontrada.

### 4.8 Veredito do Lote 1

**Lote 1 — Fundação de Infraestrutura e Design System: Aprovado com
ressalvas.**

- **Nenhum bug de severidade Alta/Crítica em aberto** em nenhuma das 8
  tarefas do lote — todos os itens do checklist de Definition of Done
  (`AGENT-TEMPLATE.md` deste agente) aplicáveis a este lote estão
  satisfeitos.
- 6 débitos de severidade Baixa/Média seguem abertos, todos já registrados
  antes desta validação exceto um novo (`QA-DEBT-016`, BE-08): `QA-DEBT-001`,
  `QA-DEBT-002` (FE-01), `QA-DEBT-003`, `QA-DEBT-004`, `QA-DEBT-005` (FE-02),
  `QA-DEBT-006` (BE-02), `QA-DEBT-007` (FE-03), `QA-DEBT-008`, `QA-DEBT-009`
  (FE-04), `QA-DEBT-016` (BE-08, novo) — todos com prazo associado a uma
  tarefa/marco futuro específico (Seção 2), nenhum com prazo vencido nesta
  data.
- Nenhuma tarefa do lote precisou ser revertida de `Concluída` para `Em
  andamento` em `TASK.md` — nenhuma reprovação nesta validação.
- Nenhum padrão recorrente que aponte problema de decomposição/diretriz foi
  identificado nesta validação (os achados são específicos de cada tarefa,
  com causas distintas) — nenhum escalonamento ao Tech Lead via
  `BLOCKERS.md`.
- **BE-05 e BE-08, sem consumidor real ainda dentro do próprio lote, expõem
  abstrações (`QueueRegistryService.getQueue`, `ObjectStorageService.
  getReadSignedUrl`, `buildSessionRedisKey`) coerentes e diretamente
  utilizáveis pelas tarefas futuras que delas dependem** (BE-07, BE-14,
  BE-21 a BE-24), sem necessidade de refatoração — verificado por inspeção
  de contrato, não por execução ponta a ponta (consumidores reais ainda não
  existem).
- Requisito não funcional crítico deste lote — **nenhuma URL pública
  permanente de Object Storage** (ADR-010/GUARDRAILS.md itens 23-24) —
  confirmado estrutural e empiricamente, sem exceção.

**Liberação**: as tarefas do Lote 2 e do Lote 3, que dependem do Lote 1
(`TASK.md` §4.1.2), estão liberadas para começar do ponto de vista de QA —
nenhum bloqueio originado nesta validação. BE-03/BE-04 (Lote 3) já em
andamento/concluídas antes mesmo deste fechamento formal do Lote 1 não são
afetadas por esta validação (fora de escopo, ver introdução desta Seção 4).

---

## 5. Validação por Lote — Lote 3: Segurança de Multi-tenancy (Guard de Aplicação + RLS + Teste de Vazamento)

**Lote** (`TASK.md` §4.1.1): BE-03, BE-04 (Backend) — 10 dp, Fase 1. Sem
tarefas de Frontend neste lote. Gatilho de validação: as 2 tarefas do lote
marcadas `Concluído` em `TASK.md` (confirmado por leitura direta da Seção
3.1 nesta data — BE-03 linha 224, BE-04 linha 225).

**Nota de processo (contexto, não achado deste lote)**: BE-03 e BE-04 têm
histórico de validação individual completo, produzido **antes** da convenção
de fechamento por lote (`EXECUTION-FLOW.md`, revisão de 2026-09-03) —
Seções 1.6, 1.6.1, 1.6.2 (BE-03: `QA-BUG-001` e `QA-BUG-002`, ambos
severidade Alta, corrigidos e revalidados empiricamente em 3 rodadas; BE-03
aprovado com ressalvas na rodada 3) e Seção 1.11 (BE-04: aprovado sem
ressalvas, condição do Gate 2 do CTO cumprida por implementação verificada).
Essa validação individual **não é refeita aqui** — é tratada como dada,
conforme instrução. O objeto desta Seção 5 é exclusivamente a camada de
lote: confirmar, contra o estado **atual** do repositório (não um snapshot
antigo), que nenhuma regressão foi introduzida por trabalho posterior (Lote
1: BE-05, BE-08, mais o próprio fechamento formal do Lote 1), que o
fechamento formal por lote — que nunca aconteceu para BE-03/BE-04, registrado
como pendência de rastreabilidade em `LOTE-LOG.md` "Observação registrada"
— agora ocorre, e que o débito herdado (`QA-DEBT-012`) permanece
corretamente fechado.

### 5.1 Execução da suíte completa (reexecutada de forma independente, 2026-09-03)

| Comando | Escopo | Resultado |
|---|---|---|
| `npm run lint` (`backend/`) | `lint:oxlint` + `lint:boundaries` | Limpo |
| `npm run build` (`backend/`) | `nest build` | Limpo |
| `npm run test` (`backend/`) | Unit/integração (vitest) | **119/119 passando** — bate exatamente com o número já confirmado no fechamento do Lote 1 (Seção 4.1); nenhum teste unitário novo/removido desde então que afete BE-03/BE-04 |
| `npm run test:e2e` (`backend/`) | E2E via testcontainers (Postgres real) | **245/245 passando** — mesma contagem do fechamento do Lote 1; inclui as suítes de BE-02/BE-03 (`tenant-guard-and-rls.e2e-spec.ts`) e BE-04 (`tenant-cross-leak-exhaustive.e2e-spec.ts`, 158 destes 245) |
| `npm run test:tenant-isolation` (`backend/`) | Script dedicado — só `tenant-cross-leak-exhaustive.e2e-spec.ts` (BE-04) | **158/158 passando**, isolado do resto da suíte e2e — bate exatamente com a contagem original (13 tabelas × 4 operações × 3 camadas + 2 testes de `QA-DEBT-012`) |

Docker disponível no ambiente de validação — testcontainers (PostgreSQL real)
executado de ponta a ponta, sem mock substituindo infraestrutura real. Nenhuma
divergência entre o que `TASK.md`/`QA-REPORT.md` (Seções 1.6.2/1.11) relatam
e o que a suíte real produz agora, confirmando ausência de regressão
introduzida por BE-05, BE-08 ou qualquer trabalho do Lote 1 sobre a camada de
acesso a dado.

### 5.2 BE-03 — Guard de aplicação obrigatório de `tenant_id` + políticas RLS por tabela (confirmação de não regressão)

**Veredito da tarefa**: **mantido — Aprovado com ressalvas** (`QA-DEBT-012`,
histórico — ver nota abaixo sobre o status atual desse débito). Detalhamento
original da aprovação, incluindo as três rodadas de revalidação empírica de
`QA-BUG-001`/`QA-BUG-002`, nas Seções 1.6-1.6.2 — não repetido aqui.

Verificação de não regressão feita por leitura direta do código atual (não
apenas confiança no relato histórico):

- `backend/src/database/tenant-scoped.repository.ts` lido linha a linha
  nesta validação: `#db` e `#runOnTable` continuam campos/métodos privados
  **nativos** do JavaScript (não `private` do TypeScript) — a correção de
  `QA-BUG-001` está presente e intacta no estado atual do repositório, não
  apenas num commit passado.
- `backend/src/database/index.ts` (barrel público) lido nesta validação:
  `KYSELY_CONNECTION` continua **não** reexportado — só `DatabaseModule`,
  `provideTenantScopedRepository`, `TenantScopedRepository`, `TenantContext`/
  `MissingTenantContextError`, `DOMAIN_TABLES`/`TENANT_TABLE`. A correção de
  `QA-BUG-002` está presente e intacta.
- `git log --oneline -- backend/src/database backend/test/database` confirma
  um único commit tocando esses caminhos desde o início do projeto — nenhuma
  alteração posterior às três rodadas de revalidação já registradas poderia
  ter reintroduzido qualquer um dos dois vetores. Consistente com a suíte
  100% verde acima.

**Veredito confirmado**: nenhum bug de severidade Alta/Crítica em aberto.

### 5.3 BE-04 — Teste automatizado de vazamento cruzado entre tenants (confirmação de não regressão)

**Veredito da tarefa**: **mantido — Aprovado**, sem ressalvas (Seção 1.11).

Verificação de não regressão:

- `backend/test/database/tenant-cross-leak-exhaustive.e2e-spec.ts` lido
  nesta validação: as 13 tabelas de `DOMAIN_TABLES`, as 4 operações
  (`findAll`/`findById`/`updateById`/`deleteById`) e as 3 camadas (guard+RLS,
  guard sozinho via superusuário, RLS sozinha via `pg.Client` cru)
  continuam presentes e inalteradas — 158 testes, mesma contagem desde a
  implementação original.
- `.github/workflows/backend-ci.yml` lido nesta validação: job
  `tenant-isolation-test` continua bloqueante ("Teste de vazamento cruzado
  entre tenants (BLOQUEANTE — Gate 2 CTO)"), aponta para
  `npm run test:tenant-isolation`, é pré-requisito (`needs`) de
  `lint-and-test` e é ele próprio pré-requisito de `build-and-push` — a
  condição não negociável do Gate 2 do CTO (`TASK.md` §1.3, "nenhum PR que
  toque a camada de acesso a dado é aprovado/mergeado sem o teste... passando
  no CI") continua estruturalmente cumprida no estado atual do pipeline, não
  apenas declarada em texto.

**Veredito confirmado**: nenhum bug de severidade Alta/Crítica em aberto.

### 5.4 Teste de integração cruzada entre as tarefas do lote (BE-04 exercita a implementação atual de BE-03, não uma versão anterior)

Verificação dirigida, pedida explicitamente para este fechamento de lote: BE-04
depende estruturalmente do guard/RLS que BE-03 implementa — a suíte de BE-04
precisa exercitar o `TenantScopedRepository` **atual**, já com as duas
correções de `QA-BUG-001`/`QA-BUG-002` aplicadas, não uma cópia própria ou uma
versão anterior à correção.

Confirmado por leitura direta de
`tenant-cross-leak-exhaustive.e2e-spec.ts` (linhas 15-19 e 258): o arquivo
importa `TenantScopedRepository` diretamente de
`../../src/database/tenant-scoped.repository.js` (o arquivo de produção, não
um fixture duplicado) e declara `class DomainTableTestRepository<Table>
extends TenantScopedRepository<Table>` — ou seja, toda a suíte de 158 testes
roda **sobre a classe real de BE-03**, com `#db`/`#runOnTable` privados
nativos e sem `KYSELY_CONNECTION` exposto pelo barrel. Não há absorção de uma
cópia estática do comportamento de BE-03 dentro de BE-04 que pudesse
mascarar uma regressão futura em `tenant-scoped.repository.ts` — qualquer
alteração futura na classe real seria automaticamente exercitada pela
suíte de BE-04 na próxima execução. O bloco `[QA-DEBT-012]` (linhas 577+)
também importa `kysely-connection.ts` e o barrel diretamente, exercitando a
mesma superfície real de `src/database/` usada pela correção de
`QA-BUG-002`, não uma reimplementação isolada. Nenhuma incoerência de
contrato entre as duas tarefas encontrada.

### 5.5 Débito técnico herdado (`QA-DEBT-012`) — status confirmado

`QA-DEBT-012` (BE-03, severidade Baixa — natureza CI-only, não
estrutural/runtime, da defesa contra deep-import de `KYSELY_CONNECTION` por
fora do barrel) já está registrado como **Fechado** no Log de Bugs e Débitos
(Seção 2) desde a validação de BE-04 (Seção 1.11) — BE-04 incorporou o caso
de regressão permanente recomendado
(`[QA-DEBT-012]` em `tenant-cross-leak-exhaustive.e2e-spec.ts`). Reconfirmado
nesta validação de lote: o bloco de teste continua presente (Seção 5.4
acima) e passando (dentro dos 158/158 de `test:tenant-isolation`, Seção
5.1). **Nenhum débito de severidade Baixa/Média aberto neste lote** — não há
dono/prazo pendente a reportar para BE-03/BE-04.

### 5.6 Veredito do Lote 3

**Lote 3 — Segurança de Multi-tenancy (Guard de Aplicação + RLS + Teste de
Vazamento): Aprovado.**

- **Nenhum bug de severidade Alta/Crítica em aberto** em nenhuma das 2
  tarefas do lote — os dois únicos bugs Alta encontrados neste lote
  (`QA-BUG-001`, `QA-BUG-002`, ambos em BE-03) foram corrigidos e revalidados
  empiricamente em rodadas anteriores (Seções 1.6.1/1.6.2), e reconfirmados
  sem regressão nesta validação (Seções 5.2/5.4).
- **Nenhum débito de severidade Baixa/Média aberto** — `QA-DEBT-012`, o único
  débito herdado deste lote, já está fechado com cobertura de regressão
  permanente (Seção 5.5).
- Nenhuma tarefa do lote precisou ser revertida de `Concluída` para `Em
  andamento` em `TASK.md` nesta validação — nenhuma reprovação.
- Teste de integração cruzada entre as duas tarefas do lote (BE-04 exercita
  estruturalmente a implementação atual de BE-03) executado e passando
  (Seção 5.4) — não é apenas "as duas tarefas passam separadamente", é
  confirmado que uma depende genuinamente da outra no estado atual do
  código.
- Requisito não funcional de maior severidade deste projeto (`GUARDRAILS.md`
  §A / `TASK.md` §1.3, isolamento multi-tenant) validado de forma sistemática
  e exaustiva, não amostral — 3 camadas de defesa (guard de aplicação, RLS,
  privilégio de role de runtime) confirmadas independentes entre si.
- Condição não negociável do Gate 2 do CTO (teste automatizado de vazamento
  cruzado, BE-04, bloqueante no CI) confirmada estruturalmente cumprida no
  pipeline atual (Seção 5.3), não apenas declarada.
- Nenhum padrão recorrente que aponte problema de decomposição/diretriz foi
  identificado nesta validação — os dois bugs de BE-03 já foram tratados, nas
  rodadas originais, como achados de execução pontual desta mesma tarefa, não
  como padrão entre tarefas distintas; nenhum fato novo nesta validação de
  lote muda essa leitura. Nenhum escalonamento ao Tech Lead via
  `BLOCKERS.md`.

**Liberação**: com este fechamento formal, a "Observação registrada" de
`LOTE-LOG.md` (Lote 1) sobre BE-03/BE-04 estarem pendentes de fechamento
formal pela convenção de lote está resolvida. Do ponto de vista de QA, **a
condição de maior severidade do projeto (`GUARDRAILS.md` §A, isolamento
multi-tenant) está agora validada tanto tarefa a tarefa quanto como lote
fechado**, liberando qualquer tarefa de módulo de domínio (BE-10+) que
dependa de `TenantScopedRepository`/RLS (`TASK.md` §4.4, "BE-03, BE-04 |
Qualquer PR que acesse dado de domínio") para prosseguir sem bloqueio
originado nesta validação — sujeito à liberação independente de DevSecOps
(auditoria completa do Lote 3 ainda não realizada; `SECURITY-REVIEW.md`
registra BE-03/BE-04 como fora de escopo da auditoria do Lote 1) e do Tech
Lead (checklist de integridade da decomposição, `LOTE-LOG.md`).
