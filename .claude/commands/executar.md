---
description: Orquestra a fase de execução (Backend/Frontend/Mobile em paralelo + QA/DevSecOps/Tech Lead por lote + DevOps) a partir do TASK.md aprovado no Gate 3. Por padrão processa um lote e para, mesmo limpo; --continuar [N] encadeia lotes automaticamente. Pausa sempre nos pontos definidos em EXECUTION-FLOW.md.
argument-hint: "[vazio: processa só o próximo lote (ou retoma o em andamento) e para; --continuar [N]: encadeia lotes automaticamente sem parar entre eles limpos, N opcional limita a quantidade processada nesta invocação; pode combinar com nome/id de lote ou tarefa para focar o ponto de partida, ex. 'Lote 3 --continuar 2']"
---

# Orquestrador da Fase de Execução

Você está entrando no **modo Orquestrador de Execução**, que persiste pelo resto desta
conversa até fechar o lote corrente (padrão) ou, com `--continuar`, até não haver mais
lote pendente, atingir o limite de N lotes pedido, ou uma pausa obrigatória. A lógica
deste fluxo está definida em `.claude/EXECUTION-FLOW.md` — leia esse arquivo agora,
antes de fazer qualquer outra coisa, se ainda não o tiver em contexto.

**Unidade de trabalho deste comando é o lote**, não a tarefa individual nem o
backlog inteiro — conjunto coerente de tarefas Backend/Frontend/Mobile do `TASK.md`
que implementam uma funcionalidade/módulo, definido pelo Tech Lead em "Lotes de
Entrega" (Seção 4 do `TASK.md`). QA, DevSecOps e Tech Lead fecham um lote de cada
vez; o comando processa um lote e, por padrão, **para ao final dele mesmo que tenha
fechado limpo** — encadear vários lotes numa só invocação é opt-in via
`--continuar` (ver Seção 8). Em qualquer um dos dois modos, o comando não retém o
detalhe de um lote já fechado ao abrir o próximo (ver Seção 7).

Argumento recebido: $ARGUMENTS — separe primeiro `--continuar`/`--continuar N` (se
presente) do restante; o que sobrar (se houver) é o foco de lote/tarefa, resolvido
na Seção 1. Vazio (sem `--continuar` e sem foco) é o caso mais comum: continua a
partir de onde o projeto está, processa um lote só.

## 0. Pré-requisitos bloqueantes

Antes de disparar qualquer agente, confirme, nesta ordem:

1. **Repositório git**: rode `git status`. Se não for um repositório git, **pare** e
   explique que este fluxo depende de `git diff` para a camada de revisão pós-tarefa —
   não há como prosseguir sem isso.
2. **Planejamento concluído**: verifique se `.md/TASK.md` e `.md/GUARDRAILS.md`
   existem. Se não existirem, **pare** e informe que a fase de planejamento (`/planejar`)
   precisa terminar primeiro (Gate 3 aprovado).
3. Leia `.md/CTO-REVIEW.md` e confirme que o Gate 3 está com veredito Aprovado ou
   Aprovado com ressalvas. Se estiver Reprovado ou ausente, **pare** e explique.

## 1. Determinar o ponto de retomada (lote a lote)

Nunca presuma que está começando do zero. A cada invocação deste comando:

1. Leia a Seção 4 do `TASK.md`, subseção **"Lotes de Entrega"** — cada lote nomeado,
   as tarefas (por ID) que o compõem entre Backend/Frontend/Mobile, e a dependência
   entre lotes quando existir.
2. **Caso de guarda**: se essa subseção não existir (formato de `TASK.md` anterior à
   revisão de 2026-09-03, sem agrupamento em lote), **pare** e explique que o
   `tech-lead` precisa ser re-acionado para agrupar as tarefas já decompostas em
   lotes antes deste comando poder prosseguir — não infira um agrupamento por conta
   própria.
3. Leia `.md/LOTE-LOG.md` (se existir) — cada entrada é um lote com aprovação do
   Tech Lead já registrada (ver Seção 5). Classifique cada lote de "Lotes de
   Entrega" em um dos três estados:
   - **Fechado**: tem entrada completa em `LOTE-LOG.md` (veredito do Tech Lead +
     resultado de deploy já registrado).
   - **Em andamento**: alguma tarefa do lote está `Concluída` ou `Em andamento`, mas
     ainda não há entrada de Tech Lead para ele (pode já ter QA/DevSecOps aprovados,
     aguardando a aprovação de lote, ou pode estar no meio da implementação).
   - **Não iniciado**: todas as tarefas do lote estão `A Fazer`.
4. Leia a Seção 3 do `TASK.md` (tabela de tarefas) para o status de cada tarefa
   dentro do lote sendo processado, e a Seção 4 (Dependências) para o que bloqueia o
   quê dentro dele.
5. Resolva `$ARGUMENTS` em duas partes:
   - **Modo de encadeamento**: se `$ARGUMENTS` contiver `--continuar`, extraia-o
     (e o número N que o seguir, se houver — ex. `--continuar 3`). Guarde para a
     Seção 8. Sem `--continuar`, o modo é o padrão: um lote só, mesmo limpo.
   - **Foco de lote/tarefa** (o que sobrar de `$ARGUMENTS` depois de remover
     `--continuar [N]`): resolva contra a lista de lotes:
     - Vazio: o lote corrente é o primeiro lote **não fechado** (em andamento ou
       não iniciado), respeitando dependência entre lotes (não comece um lote que
       depende de outro ainda não fechado).
     - Nome/ID de um lote: o lote corrente é esse — se ele depender de outro lote
       ainda não fechado, avise e resolva a dependência primeiro (mesma regra de
       dependência entre tarefas, aplicada a lotes).
     - ID de uma tarefa específica: resolva para o lote que a contém, informe ao
       usuário que a unidade de trabalho é o lote (não só aquela tarefa), e trate
       como o caso anterior.
6. Leia `.md/BLOCKERS.md` (se existir) — qualquer entrada `Aberto` que afete uma
   tarefa do lote corrente bloqueia o início de trabalho novo nela (trabalho não
   relacionado ao bloqueio segue normalmente).
7. Leia `.md/QA-REPORT.md`, `.md/SECURITY-REVIEW.md` e `.md/LOTE-LOG.md` para saber
   se o lote corrente já tem aprovação parcial (QA aprovado mas DevSecOps não, por
   exemplo) — retome exatamente do que falta, nunca reprocesse uma aprovação já
   registrada.
8. Leia `.md/DEPLOY.md` (se existir) para saber se já houve deploy em staging/
   produção do lote corrente.

## 2. As 3 trilhas paralelas (Backend / Frontend / Mobile) — dentro do lote corrente

Para cada trilha com tarefa elegível **no lote corrente** (sem dependência
pendente, conforme Seção 4 do `TASK.md`) — nunca dispare tarefa de outro lote,
mesmo que ela não tenha dependência pendente:

1. **Anuncie** em uma frase qual lote está sendo processado, quais trilhas vão
   rodar nesta rodada e qual tarefa cada uma vai processar.
2. **Dispare os agentes das trilhas elegíveis em paralelo**, todos na mesma
   mensagem de ferramenta (`Agent`, `subagent_type` = `backend`/`frontend`/`mobile`,
   `run_in_background: true` — as trilhas não dependem umas das outras). Dentro de
   uma mesma trilha, nunca dispare a próxima tarefa antes da atual terminar todo o
   ciclo de implementação + revisão — só o paralelismo *entre* trilhas é real.
3. O agente da trilha implementa em ciclo TDD via sua própria skill
   `automated-testing` — isso é mecânica interna do dispatch, não um passo separado
   aqui.
4. Quando um dispatch de trilha retornar, dispare a camada de revisão
   (spec-compliance contra o critério de aceite da tarefa + qualidade de código,
   usando `git diff` do que mudou). Achado de revisão: corrige e revisa de novo
   (fix-loop) — **teto de 2 tentativas de correção** (3 rodadas de revisão no
   total: a original + 2 fix-loops). Se a 3ª rodada ainda encontrar achado não
   resolvido: **pausa obrigatória** — registre em `BLOCKERS.md`, escale para
   `tech-lead` (mesmo destino que "desvio grande de escopo" já usa), retome a
   trilha quando o Tech Lead resolver.
5. Marque a tarefa `Concluída` na Seção 3 do `TASK.md` — mas **não dispare QA
   ainda**. Verifique se essa era a última tarefa pendente do lote corrente:
   - Se não: continue processando as demais tarefas do lote nas trilhas.
   - Se sim: todas as tarefas do lote estão `Concluída` — avance para a Seção 3
     (QA).
6. **Dependência de contrato de API** (Frontend/Mobile ↔ Backend): não é
   orquestrada aqui — o próprio agente resolve (mock via `API-CONTRACT.yaml` se o
   endpoint já está publicado, aguarda se não está). Uma tarefa `Em andamento` com
   nota de mock ainda não está de fato pronta — não a conte como concluída, mesmo
   que isso atrase o fechamento do lote.

## 3. QA — uma vez por lote fechado

Conforme já definido em `qa.md` (revisado): não redispare `test-strategy-planning`
— já roda desde o Gate 3.

- Assim que **todas** as tarefas do lote corrente estiverem `Concluída` (passo 2.5
  acima), dispare o `qa` para validar o lote inteiro contra o critério de aceite de
  cada tarefa que o compõe. Nunca dispare por tarefa individual, nunca antes do
  lote inteiro fechar.
- **Aprovado / Aprovado com ressalvas**: registre em `QA-REPORT.md`, sem pausa,
  avance para a Seção 4 (DevSecOps).
- **Reprovado**: **pause obrigatoriamente**. Explique o motivo. Reverta para
  `Em andamento` **só a(s) tarefa(s) reprovada(s) e o que depende delas** (Seção 4
  do `TASK.md`) — não o lote inteiro. Retome a(s) trilha(s) responsável(is) quando
  o usuário validar a correção. Depois de corrigida, dispare o QA de novo, mas
  **só sobre esse subconjunto** (a menos que a correção tenha alterado algo que
  outra tarefa já aprovada do lote consumia — nesse caso, valide também o que o QA
  apontar explicitamente).

## 4. DevSecOps — dois ritmos

Conforme já definido em `devsecops.md`:

- No **início do projeto** (uma vez, não por lote, não por tarefa), dispare
  `static-security-analysis` em background — configura scanning integrado ao CI
  (secret-scan, SAST, dependency-scan rodando automaticamente a cada push). A
  continuidade depois disso é garantida pela automação de CI, não por redisparar o
  agente. Só re-acione o agente DevSecOps fora do gate abaixo quando o CI acusar um
  achado que precise de triagem.
- **Achado de severidade alta/crítica, a qualquer momento**: **pause
  obrigatoriamente**, explique o achado, escale para a trilha responsável (campo
  "Escala para" de `devsecops.md`), e retome a trilha original só após a correção.
- Quando o QA tiver aprovado (Aprovado ou Aprovado com ressalvas) **o lote
  inteiro**, dispare a auditoria completa (as outras 5 skills do DevSecOps) sobre
  esse lote.
- Achado que bloqueia deploy nessa auditoria: pause, explique, escale, retome após
  a correção. Aprovado (Aprovado ou Aprovado com débito registrado): sem pausa,
  avance para a Seção 5 (Aprovação do Tech Lead).

## 5. Aprovação do Tech Lead — fecha o lote

Conforme já definido em `tech-lead.md` (revisado — nova responsabilidade de
execução):

- Dispara quando QA **e** DevSecOps já aprovaram o mesmo lote (Seções 3 e 4
  acima).
- O Tech Lead roda o checklist de "Critérios de Pronto — Aprovação de Lote":
  todas as tarefas do lote genuinamente `Concluída`, débitos de QA/DevSecOps com
  dono e prazo, Seção 5 (Riscos de Prazo) do `TASK.md` não invalidada em silêncio,
  nenhuma dependência do próximo lote comprometida por decisão tomada durante a
  implementação deste. **Não é nova validação funcional nem de segurança.**
- Aprovado (Aprovado ou Aprovado com ressalvas): cria a entrada do lote em
  `.md/LOTE-LOG.md` (tarefas, veredito de QA, veredito de DevSecOps, veredito do
  Tech Lead, débitos com dono/prazo). Sem pausa, avance para a Seção 6 (DevOps) —
  o lote está pronto para deploy.
- Reprovado: **pause obrigatoriamente**. O Tech Lead aponta exatamente o que falta
  (não é reabertura de QA/DevSecOps — é algo fora do escopo que eles já checaram).
  Volta para a trilha responsável ou para o próprio Tech Lead ajustar o `TASK.md`,
  conforme o caso.

## 6. DevOps — prepara desde o início do projeto, deploya por lote fechado

Conforme já definido em `devops.md` (regra de deploy inalterada):

- No **início do projeto** (uma vez, não por lote), dispare
  `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration` em
  background, em paralelo às trilhas, sem pausa — o `SDD.md` já está aprovado
  desde o planejamento.
- O deploy em si só dispara quando o lote corrente tem **dupla aprovação do mesmo
  build** (`QA-REPORT.md` Aprovado/Aprovado com ressalvas **e**
  `SECURITY-REVIEW.md` Aprovado/Aprovado com débito registrado — regra própria do
  DevOps, inalterada) **e** já foi aprovado pelo Tech Lead (Seção 5 acima —
  sequenciamento deste orquestrador, não uma regra nova do DevOps).
- **Deploy em staging**: dispare sem pausa assim que as condições acima forem
  satisfeitas.
- **Deploy em produção**: **pause obrigatoriamente sempre**, mesmo com tudo
  limpo — apresente o que vai para produção e aguarde a validação explícita do
  usuário antes de disparar o `devops` para o deploy final. Isso se repete a cada
  lote — um lote "pequeno" não dispensa a pausa.
- Depois do deploy (staging concluído, produção conforme validação do usuário),
  **acrescente** o resultado à entrada já criada pelo Tech Lead em
  `.md/LOTE-LOG.md` (Seção 5) — não crie uma entrada nova.

## 7. Reset de contexto ao fechar um lote

Depois do passo 6 concluído (lote com deploy registrado em `LOTE-LOG.md`):

1. **Produza um resumo compacto do lote** para o usuário, na mesma resposta que
   fecha o lote: o que foi implementado (tarefas), veredito de QA, veredito de
   DevSecOps, veredito do Tech Lead, débitos registrados com dono/prazo, resultado
   do deploy. Este resumo é o mesmo conteúdo que já está em `.md/LOTE-LOG.md`.
2. **A partir daqui, trate esse resumo (e os artefatos duráveis) como o único
   contexto do lote fechado ao processar o próximo.** Ao abrir o lote seguinte
   (passo 8), apoie-se só em `TASK.md`/`GUARDRAILS.md`/`QA-REPORT.md`/
   `SECURITY-REVIEW.md`/`LOTE-LOG.md` — não relia os relatórios detalhados de
   dispatch, revisão e fix-loop do lote fechado para raciocinar sobre o próximo,
   mesmo que ainda estejam na conversa. O `LOTE-LOG.md` já resume o que importa
   reter; entradas de lotes anteriores só voltam a ser relevantes se o lote novo
   depender explicitamente de uma decisão registrada lá.
3. **Nota de honestidade**: isto é disciplina procedural, não poda literal de
   tokens da conversa (isso é do harness, que já comprime automaticamente conforme
   a conversa cresce). O compromisso é não reler/re-derivar do histórico detalhado
   quando o resumo já basta.

## 8. Continuar para o próximo lote (ou parar)

O que acontece aqui depende do modo de encadeamento resolvido na Seção 1:

**Padrão (sem `--continuar`)**: pare aqui — **mesmo que o lote tenha fechado
limpo, sem nenhuma pausa obrigatória ao longo do processamento**. Não avance para
o próximo lote nesta invocação, mesmo que ele já esteja com dependências
satisfeitas. Apresente:
- O resumo compacto do lote que acabou de fechar (já produzido na Seção 7 — não
  repita, referencie).
- Uma linha avisando que o projeto tem mais lote(s) pendente(s), **sem listar o
  detalhe de cada um** — isso é papel do `/listar`, não deste comando.
- Se não houver mais nenhum lote pendente (este era o último), pule esta parada e
  avance direto para a Seção 12 (Encerramento) — não há "próximo lote" para
  justificar parar aqui.

**Com `--continuar` (sem N)**: se houver outro lote **não fechado** cujas
dependências (Seção 4 do `TASK.md`) já estão satisfeitas, e nenhuma pausa
obrigatória foi acionada durante o processamento deste lote: **continue
automaticamente** para esse lote (volte à Seção 2), sem parar na transição — sem
limite de quantidade. Se não houver mais lote pendente, avance para a Seção 12
(Encerramento).

**Com `--continuar N`**: mesma lógica de encadeamento acima, mas conte quantos
lotes você já fechou nesta invocação (comece a contar a partir do primeiro lote
processado neste `/executar`, inclusive). Ao fechar o N-ésimo lote:
- Pare aqui, mesmo que haja mais lotes pendentes e nenhuma pausa obrigatória tenha
  ocorrido.
- Apresente o resumo de cada um dos N lotes processados nesta invocação (não só o
  último) e avise que o limite pedido (`--continuar N`) foi atingido — deixe claro
  que isso não é uma pausa obrigatória (nada precisa de decisão), é o limite que o
  usuário pediu.
- Se restarem menos de N lotes no projeto e todos fecharem antes de atingir o
  limite, trate como "não há mais lote pendente" e avance para a Seção 12.

Em qualquer modo, uma **pausa obrigatória** (Seção 10) sempre interrompe o
processamento do lote corrente e encerra o turno ali, independente de
`--continuar` — o modo de encadeamento só decide o que acontece depois que um lote
fecha **sem** pendência de decisão do usuário.

## 9. Bloqueio silencioso

Ao reportar qualquer tarefa ou lote travado (dependência não resolvida, endpoint
que não existe, achado ainda não corrigido), calcule e informe **há quanto tempo
está parado** a partir da data já registrada na entrada correspondente de
`BLOCKERS.md` — nunca reporte um bloqueio sem esse tempo.

## 10. Regras de pausa — resumo

Duas coisas terminam o turno neste comando, e é importante não confundir uma com a
outra: **pausa obrigatória** (algo precisa de decisão do usuário antes de
prosseguir) e a **parada padrão de fim de lote** (Seção 8, modo sem `--continuar`
— um checkpoint deliberado, não um problema; nada precisa de correção). Ambas
encerram o turno, mas só a primeira é reportada como bloqueio/pendência.

**Pausa obrigatória** (pare a resposta, aguarde validação/correção do usuário
antes de continuar):
- Fix-loop de revisão pós-implementação esgotando o teto de 2 tentativas numa
  mesma tarefa.
- Qualquer reprovação do QA num lote.
- Qualquer achado de severidade alta/crítica do DevSecOps, a qualquer momento.
- Reprovação do Tech Lead na aprovação de lote.
- Sempre antes do deploy em produção, a cada lote fechado.
- Tarefa ou lote bloqueado por dependência não resolvida (reporte com tempo
  parado, Seção 9).

**Parada padrão de fim de lote** (não é pausa obrigatória, não precisa de decisão
— só ocorre no modo padrão, sem `--continuar`, ou ao atingir o limite de
`--continuar N`):
- Lote fechou (Seção 7 concluída) sem nenhuma pausa obrigatória pendente, e o modo
  de encadeamento não pede para continuar (ver Seção 8).

**Progride sem pausa** (continue para o próximo passo na mesma resposta ou na
próxima rodada de dispatch):
- Execução paralela normal das 3 trilhas, dentro de um lote.
- Preparação de infraestrutura e pipeline do DevOps (nível de projeto, não de
  lote).
- Fix-loop interno de revisão pós-implementação, dentro do teto de 2 tentativas.
- Aprovações limpas do QA, do DevSecOps e do Tech Lead sobre um lote.
- Deploy em staging.
- Transição de um lote fechado para o próximo lote elegível — **só com
  `--continuar`** (dentro do limite de N, se houver); no modo padrão, essa
  transição não acontece automaticamente (ver Seção 8).

## 11. Como reagir à resposta do usuário após uma pausa (ou após a parada padrão)

- **Aprovação/correção validada** (pausa obrigatória): retome exatamente a
  trilha, o gate (QA/DevSecOps/Tech Lead) ou o passo de deploy que gerou a pausa
  (nunca reinicie o lote inteiro, nunca reinicie o projeto).
- **Pedido de ajuste**: redisparar o agente responsável pelo ponto pausado, com o
  feedback do usuário incluído no prompt de dispatch.
- **Bloqueio entre pares sem dono claro**: escale para o `cto`, conforme
  `PIPELINE-CONVENTIONS.md` seção 4.
- **Mensagem do usuário depois de uma parada padrão de fim de lote** (não uma
  pausa obrigatória — nada estava pendente de correção): trate como uma nova
  invocação deste comando com o conteúdo da mensagem como `$ARGUMENTS`. Se o
  usuário só disser algo como "continua"/"segue", interprete como equivalente a
  rodar `/executar --continuar 1` a partir daqui (processa o próximo lote e para
  de novo, mesmo comportamento padrão) — não assuma `--continuar` sem limite a
  menos que o usuário peça explicitamente para encadear vários.

## 12. Encerramento (Gate 4)

Depois que o **último lote** planejado em "Lotes de Entrega" (Seção 4 do
`TASK.md`) tiver passado por todo o ciclo (QA + DevSecOps + Tech Lead + deploy em
produção validado pelo usuário):

1. Confirme que todas as entradas de `.md/LOTE-LOG.md` têm resultado de deploy
   registrado (sucesso, rollback ou incidente, por lote).
2. Dispare o `cto` para fechar o ciclo em `CTO-REVIEW.md` (Gate 4 — só registro,
   sem poder de veto aqui, os deploys já aconteceram).
3. **Apresente a lista consolidada de todos os lotes** implementados, testados,
   auditados e deployados ao longo desta execução, a partir de `.md/LOTE-LOG.md`
   — cada lote com seu status final (tarefas, QA, DevSecOps, Tech Lead, deploy) —
   e informe que a execução do `TASK.md` está fechada. Não é necessário reler o
   detalhe de dispatch de cada lote — `LOTE-LOG.md` já é a fonte consolidada.
