---
description: Orquestra a fase de execução (Backend/Frontend/Mobile em paralelo + QA contínuo + DevSecOps + DevOps) a partir do TASK.md aprovado no Gate 3, até o deploy em produção e o fechamento do Gate 4. Pausa só nos pontos definidos em EXECUTION-FLOW.md.
argument-hint: [opcional: vazio para rodar o lote inteiro de tarefas pendentes, ou o id/nome de uma tarefa específica do TASK.md para focar nela]
---

# Orquestrador da Fase de Execução

Você está entrando no **modo Orquestrador de Execução**, que persiste pelo resto desta
conversa até o lote de tarefas terminar (ou você decidir interrompê-lo). A lógica deste
fluxo está definida em `.claude/EXECUTION-FLOW.md` — leia esse arquivo agora, antes de
fazer qualquer outra coisa, se ainda não o tiver em contexto.

Foco recebido (pode estar vazio, roda o lote inteiro): $ARGUMENTS

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

## 1. Determinar o ponto de retomada

Nunca presuma que está começando do zero. A cada invocação deste comando:

1. Leia a Seção 3 do `TASK.md` (tabela de tarefas) e a Seção 4 (dependências) — monte a
   lista de tarefas por trilha (Backend/Frontend/Mobile) com status `Pendente`, `Em
   andamento` ou `Concluída`.
2. Se `$ARGUMENTS` citar uma tarefa específica, restrinja o lote a ela (e ao que ela
   depende, se ainda pendente); caso contrário, o lote é todas as tarefas ainda não
   `Concluída`.
3. Leia `.md/BLOCKERS.md` (se existir) — qualquer entrada `Aberto` que afete uma tarefa
   do lote bloqueia o início de trabalho novo nela (trabalho não relacionado ao bloqueio
   segue normalmente).
4. Leia `.md/QA-REPORT.md` e `.md/SECURITY-REVIEW.md` (se existirem) para saber quais
   tarefas já passaram por QA/DevSecOps e qual o veredito mais recente.
5. Leia `.md/DEPLOY.md` (se existir) para saber se já houve deploy em staging/produção
   deste lote.
6. A partir disso, retome exatamente do que falta — nunca reprocesse tarefa já
   `Concluída` com QA e DevSecOps aprovados, a menos que o usuário peça explicitamente.

## 2. As 3 trilhas paralelas (Backend / Frontend / Mobile)

Para cada trilha com tarefa elegível no lote (sem dependência pendente, conforme Seção
4 do `TASK.md`):

1. **Anuncie** em uma frase quais trilhas vão rodar nesta rodada e qual tarefa cada uma
   vai processar.
2. **Dispare os agentes das trilhas elegíveis em paralelo**, todos na mesma mensagem de
   ferramenta (`Agent`, `subagent_type` = `backend`/`frontend`/`mobile`,
   `run_in_background: true` — as trilhas não dependem umas das outras). Dentro de uma
   mesma trilha, nunca dispare a próxima tarefa antes da atual terminar todo o ciclo
   (implementação → revisão → QA) — só o paralelismo *entre* trilhas é real.
3. O agente da trilha implementa em ciclo TDD via sua própria skill
   `automated-testing` — isso é mecânica interna do dispatch, não um passo separado
   aqui.
4. Quando um dispatch de trilha retornar, dispare a camada de revisão
   (spec-compliance contra o critério de aceite da tarefa + qualidade de código,
   usando `git diff` do que mudou). Achado de revisão: corrige e revisa de novo
   (fix-loop) — **sem pausar**.
5. Marque a tarefa `Concluída` na Seção 3 do `TASK.md` e **imediatamente** dispare a
   validação do QA para essa tarefa (não espere as outras trilhas).
6. **Dependência de contrato de API** (Frontend/Mobile ↔ Backend): não é orquestrada
   aqui — o próprio agente resolve (mock via `API-CONTRACT.yaml` se o endpoint já está
   publicado, aguarda se não está). Uma tarefa `Em andamento` com nota de mock ainda
   não está de fato pronta — não a conte como concluída.

## 3. QA — contínuo, por tarefa

Conforme já definido em `qa.md`:

- Não redispare `test-strategy-planning` — já roda desde o Gate 3.
- Assim que uma tarefa é marcada `Concluída` por qualquer trilha (passo 2.5 acima),
  dispare o `qa` para validá-la contra seu critério de aceite. Nunca acumule tarefas
  para validar em lote.
- **Aprovado / Aprovado com ressalvas**: registre em `QA-REPORT.md`, sem pausa, siga
  processando o lote.
- **Reprovado**: **pause obrigatoriamente**. Explique o motivo, volte a tarefa para
  `Em andamento` na trilha responsável, e só retome essa trilha quando o usuário
  validar a correção.

## 4. DevSecOps — dois ritmos

Conforme já definido em `devsecops.md`:

- No início desta execução (uma vez por lote, não por tarefa), dispare
  `static-security-analysis` em background, em paralelo às trilhas — roda contínuo,
  não espera nada pronto.
- **Achado de severidade alta/crítica, a qualquer momento**: **pause obrigatoriamente**,
  explique o achado, escale para a trilha responsável (campo "Escala para" de
  `devsecops.md`), e retome a trilha original só após a correção.
- Quando o QA tiver aprovado (Aprovado ou Aprovado com ressalvas) **todas** as tarefas
  do lote corrente, dispare a auditoria completa (as outras 5 skills do DevSecOps).
- Achado que bloqueia deploy nessa auditoria: pause, explique, escale, retome após a
  correção.

## 5. DevOps — prepara desde o início, deploya só no fim

Conforme já definido em `devops.md`:

- No início desta execução (uma vez, não por tarefa), dispare
  `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration` em background,
  em paralelo às trilhas, sem pausa — o `SDD.md` já está aprovado desde o
  planejamento.
- O deploy em si só dispara com **dupla aprovação do mesmo build**: `QA-REPORT.md`
  (Aprovado ou Aprovado com ressalvas) **e** `SECURITY-REVIEW.md` (Aprovado ou
  Aprovado com débito registrado).
- **Deploy em staging**: dispare sem pausa assim que a dupla aprovação sair.
- **Deploy em produção**: **pause obrigatoriamente sempre**, mesmo com tudo limpo —
  apresente o que vai para produção e aguarde a validação explícita do usuário antes
  de disparar o `devops` para o deploy final.

## 6. Bloqueio silencioso

Ao reportar qualquer tarefa travada (dependência não resolvida, endpoint que não
existe, achado ainda não corrigido), calcule e informe **há quanto tempo está parada**
a partir da data já registrada na entrada correspondente de `BLOCKERS.md` — nunca
reporte um bloqueio sem esse tempo.

## 7. Regras de pausa — resumo

**Pausa obrigatória** (pare a resposta, aguarde validação do usuário antes de
continuar):
- Qualquer reprovação do QA numa tarefa.
- Qualquer achado de severidade alta/crítica do DevSecOps, a qualquer momento.
- Sempre antes do deploy em produção.
- Tarefa bloqueada por dependência não resolvida (reporte com tempo parado, seção 6).

**Progride sem pausa** (continue para o próximo passo na mesma resposta ou na próxima
rodada de dispatch):
- Execução paralela normal das 3 trilhas.
- Preparação de infraestrutura e pipeline do DevOps.
- Aprovações limpas do QA e do DevSecOps.
- Fix-loop interno de revisão pós-implementação (spec-compliance + qualidade).
- Deploy em staging.

## 8. Como reagir à resposta do usuário após uma pausa

- **Aprovação/correção validada**: retome exatamente a trilha ou o passo que gerou a
  pausa (nunca reinicie o lote inteiro).
- **Pedido de ajuste**: redisparar o agente responsável pelo ponto pausado, com o
  feedback do usuário incluído no prompt de dispatch.
- **Bloqueio entre pares sem dono claro**: escale para o `cto`, conforme
  `PIPELINE-CONVENTIONS.md` seção 4.

## 9. Encerramento (Gate 4)

Depois do deploy em produção validado pelo usuário (seção 5):

1. Confirme que o `devops` registrou o resultado em `DEPLOY.md` (sucesso, rollback ou
   incidente).
2. Dispare o `cto` para fechar o ciclo em `CTO-REVIEW.md` (Gate 4 — só registro, sem
   poder de veto aqui, o deploy já aconteceu).
3. Apresente a lista consolidada de tudo que foi implementado, testado, auditado e
   deployado neste lote — cada tarefa com status final (trilha, QA, DevSecOps) e o
   resultado do deploy — e informe que o lote de execução está fechado.
