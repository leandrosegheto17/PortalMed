# EXECUTION-FLOW.md

Sequência lógica da **fase de execução** — parte de onde o planejamento termina
(`TASK.md` aprovado no Gate 3 + `GUARDRAILS.md` aprovado, ver `PLANNING-FLOW.md`) e
vai até o deploy em produção, fechando o ciclo de volta ao CTO.

Este documento não redefine nenhum dos 12 agentes nem os critérios internos de cada
um (o que QA considera bug bloqueante, o que DevSecOps considera achado crítico, o
que autoriza o DevOps a fazer deploy) — só ordena o que cada agente já declara, com
pontos de paralelismo, pausa e escalonamento. **Exceção, registrada aqui por
transparência**: a revisão de 2026-09-03 (motivo: revisão de granularidade de
tarefa individual para lote) exigiu duas edições reais de escopo — `qa.md` (trigger
de validação passa de "por tarefa" para "por lote") e `tech-lead.md` (nova
responsabilidade de aprovação de lote na execução + nova estrutura de "Lotes de
Entrega" na Seção 4 do `TASK.md`). `devsecops.md` e `devops.md` não precisaram de
edição — ver as seções correspondentes abaixo para o porquê.

**Técnica de implementação**: cada trilha usa ciclo TDD (teste falha → implementação
mínima → teste passa → refatora) dentro da própria skill `automated-testing` do
agente — é técnica interna de cada dispatch, não um passo separado do orquestrador.
Uma camada de revisão (spec-compliance + qualidade de código) roda depois de cada
tarefa implementada, antes do QA entrar — mecanismo próprio deste fluxo, não do
Superpowers (ver histórico de decisão: Superpowers foi avaliado e descartado como
motor deste fluxo por ser dimensionado para feature isolada em manutenção, não para
um pipeline de 12 papéis com gate de CTO — revisitar quando a fase de manutenção
pós-v1 for desenhada).

**Pré-requisito bloqueante**: este projeto precisa ser um repositório git antes deste
fluxo rodar de verdade — a camada de revisão depende de diff (`git diff`) entre o
estado antes e depois de cada tarefa.

---

## O que é um lote

**Lote** é a unidade de trabalho deste fluxo — não a tarefa individual, não o
backlog inteiro. Um lote agrupa o conjunto de tarefas do `TASK.md` (Backend +
Frontend + Mobile, quando aplicável) que juntas implementam uma
funcionalidade/módulo coerente (ex.: "Cadastro de Paciente", "Login e MFA",
"Compartilhamento de Exame") — do tamanho de uma feature, não de uma fase inteira
de semanas nem de uma tarefa isolada.

O lote é definido **pelo Tech Lead, no momento da decomposição**, como parte da
Seção 4 do `TASK.md` ("Lotes de Entrega", ver `tech-lead.md`) — o orquestrador
consome essa definição, nunca a infere por conta própria. Cada tarefa pertence a
exatamente um lote; dependência entre lotes é explícita (mesmo mecanismo já usado
para dependência entre tarefas, Seção 4.3 do `TASK.md`).

Dentro de um lote, as regras de paralelismo entre trilhas e sequência dentro da
trilha são exatamente as já definidas na seção seguinte — um lote não muda como
Backend/Frontend/Mobile trabalham entre si, só onde o QA/DevSecOps/Tech Lead
entram para fechar o conjunto.

---

## As 3 trilhas paralelas (Backend / Frontend / Mobile) — dentro de um lote

Cada trilha processa, em paralelo com as outras duas, as tarefas do lote corrente
atribuídas a ela (coluna "dono/time responsável", Seção 3 do `TASK.md`). **Dentro
de uma mesma trilha, as tarefas rodam em sequência** (uma por vez, respeitando as
dependências já mapeadas na Seção 4 do TASK.md) — só o paralelismo *entre* trilhas
é real. Uma trilha sem tarefa no lote corrente simplesmente não participa dele.

Por tarefa, dentro da trilha:

1. Dispara o agente da trilha (`backend`/`frontend`/`mobile`) para a tarefa
   específica — ele implementa em ciclo TDD via sua própria `automated-testing`.
2. Ao concluir, dispara uma revisão de spec-compliance (contra o critério de aceite
   da própria tarefa) + qualidade de código, usando `git diff` do que mudou.
3. **Achado da revisão: corrige e revisa de novo (fix-loop) — teto de 2 tentativas
   de correção** (3 rodadas de revisão no total: a original + 2 fix-loops). Se a
   3ª rodada ainda encontrar achado não resolvido: **pausa obrigatória** — não é
   reprovação do QA (QA ainda não rodou neste lote), é a própria camada de revisão
   do orquestrador sinalizando que não consegue fechar a tarefa sozinha. Registra
   em `BLOCKERS.md` (reportado pela camada de revisão, mecanismo deste fluxo, não
   um agente nomeado), escala para `tech-lead` — mesmo destino que
   `backend.md`/`frontend.md`/`mobile.md` já usam para "desvio grande de escopo",
   por analogia: duas tentativas de correção fracassadas na mesma tarefa é sinal
   equivalente de algo maior que detalhe de implementação. Retoma a trilha quando
   o Tech Lead resolver (reestimar, esclarecer diretriz, ou confirmar que é só
   questão de mais uma tentativa e devolver).
4. Marca a tarefa `Concluída` no `TASK.md` (mecanismo já definido nos três
   agentes) — mas **não dispara QA ainda**; QA só entra quando o lote inteiro
   fechar (próxima seção).

**Dependência de contrato de API (Frontend/Mobile ↔ Backend)**: não é orquestrada
aqui — `frontend.md`/`mobile.md` já resolvem sozinhos ("mock se o endpoint já está
em `API-CONTRACT.yaml`, aguarda se não está"). O orquestrador só precisa saber que
uma tarefa `Em andamento` com nota de mock ainda não está de fato pronta.

---

## QA — uma vez por lote fechado

Conforme `qa.md` revisado nesta data (trigger mudou de "por tarefa" para "por
lote" — edição real do agente, não só orquestração):

- `test-strategy-planning` já roda desde o Gate 3 (fim do planejamento), em
  paralelo — não é acionado de novo aqui, e não é afetado pela mudança de
  granularidade.
- As 5 skills de validação disparam **uma vez, quando todas as tarefas do lote
  corrente estiverem `Concluída`** por Backend/Frontend/Mobile — nunca por tarefa
  individual, nunca esperando o backlog inteiro.
- Aprovação (Aprovado ou Aprovado com ressalvas) do lote inteiro: segue sem
  pausa — libera a auditoria do DevSecOps (seção seguinte) e a aprovação do Tech
  Lead (mais abaixo).
- **Reprovação: pausa obrigatória.** Explica o motivo. Volta para a trilha
  responsável **só a(s) tarefa(s) reprovada(s) e o que depende delas** (Seção 4.3
  do `TASK.md`) — não o lote inteiro, não o projeto. A(s) tarefa(s) reprovada(s)
  voltam a `Em andamento`. Depois da correção, QA **retesta só esse subconjunto**
  (a tarefa corrigida + suas dependentes), não a bateria completa do lote de novo
  — a menos que a correção em si tenha mudado algo que outras tarefas já
  aprovadas do lote consumiam (nesse caso, QA nomeia explicitamente o que precisa
  ser reavaliado, não reabre tudo por precaução).

---

## DevSecOps — dois ritmos, sem alteração de trigger, com clarificação de mecanismo

Conforme `devsecops.md` (sem edição necessária — ver o porquê abaixo):

- `static-security-analysis` (SAST, dependências) continua **contínuo** — mas
  "contínuo" aqui significa: o agente DevSecOps é **disparado uma única vez, no
  início da execução do projeto** (não por lote, não por tarefa) para configurar
  scanning integrado ao pipeline de CI (secret-scan, SAST, dependency-scan
  rodando automaticamente a cada push). A partir daí, a continuidade é garantida
  pela automação de CI, não por redisparar o agente repetidamente — o mesmo
  padrão que já ocorreu na prática nesta execução. O agente só é re-acionado como
  revisor ativo quando: (a) o CI acusa um achado que precisa de triagem/decisão
  de severidade, ou (b) no gate de auditoria completa (próximo item). Isso não
  contradiz `devsecops.md` (que descreve o ritmo da *atividade*, não quantas
  vezes o agente é despachado) — é só a forma como o orquestrador cumpre esse
  ritmo sem gerar dispatch redundante a cada tarefa/lote.
- **Achado de severidade alta/crítica, a qualquer momento** (inclusive vindo do
  CI entre lotes): **pausa obrigatória**, escala para a trilha responsável
  (campo "Escala para" já definido em `devsecops.md`), retoma a trilha original
  após a correção.
- A auditoria completa (as outras 5 skills) dispara quando o QA tiver aprovado
  (Aprovado ou Aprovado com ressalvas) **o lote inteiro** — já era assim que
  `devsecops.md` descrevia ("um build"), só formalizado aqui como "um lote".
- Achado que bloqueia: pausa, explica, escala para a trilha de implementação
  responsável, retoma a trilha original após a correção.

---

## Aprovação do Tech Lead — fecha o lote

Nova etapa desta revisão, adicionada como responsabilidade de execução em
`tech-lead.md` (o agente antes só atuava pré-execução + reabertura reativa).

- Dispara quando QA aprovou o lote (Aprovado ou Aprovado com ressalvas) **e**
  DevSecOps aprovou o lote (Aprovado ou Aprovado com débito registrado) — as duas
  aprovações do mesmo lote, mesma lógica de "dupla aprovação" que o DevOps já usa
  para deploy, aplicada aqui um passo antes.
- Checklist objetivo (ver `tech-lead.md`, Critérios de Pronto — Aprovação de
  Lote): todas as tarefas do lote genuinamente `Concluída`, débitos de QA/
  DevSecOps com dono e prazo, nenhuma invalidação silenciosa da Seção 5 (Riscos
  de Prazo) do `TASK.md`, nenhuma dependência do próximo lote comprometida por
  decisão tomada durante a implementação deste.
- **Não é nova validação funcional nem de segurança** — QA e DevSecOps já
  fizeram isso. É uma checagem de integridade da decomposição: o lote fechado
  bate com o que o `TASK.md` prometia, e o que vem depois continua válido.
  Registrada como entrada em `.md/LOTE-LOG.md` (ver seção de reset de contexto).
- Aprovado (Aprovado ou Aprovado com ressalvas): o lote está **pronto para
  deploy** — libera a etapa seguinte (DevOps). Reprovado: pausa, o Tech Lead
  aponta exatamente o que falta (não é reabertura de QA/DevSecOps, é algo que
  ficou de fora do escopo checado por eles — ex.: uma dependência do próximo
  lote não sinalizada), volta para a trilha ou para o próprio Tech Lead conforme
  o caso.

**Isto não muda a regra própria do DevOps.** `devops.md` continua exigindo só a
dupla aprovação (QA + DevSecOps) como sua própria condição de disparo — não foi
editado. A aprovação do Tech Lead é um sequenciamento deste orquestrador *antes*
de despachar o DevOps para aquele lote, não uma nova regra que `devops.md`
precisa conhecer ou declarar.

---

## DevOps — prepara desde o início do projeto, deploya por lote fechado

Conforme já definido em `devops.md`, sem alteração de regra:

- `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration` disparam
  assim que o `SDD.md` está aprovado (Gate 2, já aconteceu no planejamento) — no
  instante zero do **projeto**, não de cada lote, em paralelo com as trilhas, sem
  pausa.
- O deploy em si (`deployment-execution` e seguintes) dispara **por lote
  fechado**: assim que QA aprovou o lote, DevSecOps aprovou o lote, **e** o Tech
  Lead aprovou o lote (seção anterior) — dupla aprovação técnica (QA +
  DevSecOps, regra própria do DevOps, inalterada) mais o sequenciamento deste
  orquestrador que só despacha o DevOps depois do sinal do Tech Lead.
- Se DevSecOps aprovou com débito de segurança registrado (severidade baixa,
  prazo definido): o deploy segue normalmente, mesma regra de sempre.
- Deploy em staging: sem pausa, a cada lote.
- **Deploy em produção: pausa obrigatória sempre** — mesmo com tudo limpo, a
  cada lote (não é condicional a haver problema, e não muda por lote ser
  "pequeno").

---

## Resumo e reset de contexto ao fechar um lote

A entrada de `.md/LOTE-LOG.md` daquele lote nasce no momento da aprovação do Tech
Lead (seção anterior — veredito de QA, veredito de DevSecOps, veredito do próprio
Tech Lead, débitos com dono/prazo, tarefas que compõem o lote). Uma única entrada
por lote, nunca recriada — só completada:

1. Depois do deploy (staging concluído, produção conforme validação do usuário),
   o orquestrador **acrescenta** o resultado do deploy à mesma entrada já criada
   pelo Tech Lead — não escreve uma entrada nova, não duplica.
2. Para o lote seguinte, o orquestrador **não relê** os relatórios detalhados de
   dispatch/revisão/fix-loop do lote fechado — consome só `TASK.md`/
   `GUARDRAILS.md`/`QA-REPORT.md`/`SECURITY-REVIEW.md`/`LOTE-LOG.md` (a entrada
   mais recente basta para contexto; entradas anteriores só se algo do lote
   novo depender explicitamente de uma decisão de um lote antigo).
3. Nota de honestidade sobre este mecanismo: o orquestrador não controla a poda
   literal de tokens da conversa — isso é do harness (que já comprime
   automaticamente conforme a conversa cresce). O que este mecanismo garante é
   disciplina procedural: um resumo durável escrito fora da conversa, e o
   compromisso de não reler histórico desnecessário do lote fechado ao
   raciocinar sobre o próximo.

---

## Bloqueio silencioso

Se uma tarefa ficar travada por dependência não resolvida (de outra tarefa, de um
endpoint que não existe, de um achado ainda não corrigido), o reporte inclui **há
quanto tempo está parada** — calculado a partir da data já registrada na entrada
correspondente de `BLOCKERS.md`, nunca deixado travado em silêncio.

---

## Resumo: quando pausa e quando não pausa

**Pausa obrigatória**:
- Fix-loop de revisão pós-implementação esgotando o teto de 2 tentativas numa
  mesma tarefa.
- Qualquer reprovação do QA num lote.
- Qualquer achado de severidade alta/crítica do DevSecOps, a qualquer momento.
- Reprovação do Tech Lead na aprovação de lote.
- Sempre antes do deploy em produção, a cada lote.
- Tarefa bloqueada por dependência não resolvida (reporta com tempo parado).

**Progride sem pausa**:
- Execução paralela normal das 3 trilhas, dentro de um lote.
- Preparação de infraestrutura e pipeline do DevOps (nível de projeto, não de
  lote).
- Fix-loop interno de revisão pós-implementação, dentro do teto de 2 tentativas.
- Aprovações limpas do QA, do DevSecOps e do Tech Lead sobre um lote.
- Deploy em staging, a cada lote.

---

## Onde o fluxo termina

**Gate 4**: depois do último lote planejado no `TASK.md` ter passado por todo o
ciclo (QA + DevSecOps + Tech Lead + deploy), o DevOps consolida o resultado em
`DEPLOY.md` (sucesso, rollback, incidente, por lote); o CTO fecha o ciclo em
`CTO-REVIEW.md` — só registro, sem poder de veto aqui, o(s) deploy(s) já
aconteceram (mesmo mecanismo já definido em `PLANNING-FLOW.md`/`cto.md`).

Ao final, apresentar a lista consolidada de todos os lotes implementados,
testados, auditados e deployados nesta execução (a partir de `.md/LOTE-LOG.md`),
com status de cada um.
