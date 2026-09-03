---
description: Relatório de status do projeto por lote de execução — lote atual, lotes concluídos e lotes pendentes. Somente leitura, não dispara agente nem avança o fluxo.
argument-hint: ""
---

# Relatório de Status por Lote

Você está respondendo a uma **consulta de status, não uma etapa de orquestração**.
Este comando é puramente informativo: lê o estado atual do projeto e apresenta um
relatório — não dispara nenhum agente, não avança nenhuma tarefa ou lote, não pausa
esperando validação do usuário. A lógica de agrupamento em lote e os artefatos lidos
são exatamente os mesmos que `.claude/commands/executar.md` usa no seu passo de
retomada — leia `.claude/EXECUTION-FLOW.md` agora, se ainda não o tiver em contexto,
para a definição de lote e dos estados possíveis.

## 1. Pré-requisito mínimo

Confirme que `.md/TASK.md` existe. Se não existir, informe que a fase de
planejamento ainda não produziu o `TASK.md` (rode `/planejar` primeiro) e pare —
não há nada mais a reportar.

## 2. Ler os lotes definidos

Leia a Seção 4 do `TASK.md`, subseção **"Lotes de Entrega"** — cada lote nomeado,
as tarefas (por ID) que o compõem, e a dependência entre lotes quando existir, na
ordem de execução prevista.

**Caso de guarda**: se essa subseção não existir (formato de `TASK.md` anterior à
convenção de lote), informe explicitamente que este projeto ainda não tem lotes
definidos e que o `tech-lead` precisa ser re-acionado para agrupar as tarefas já
decompostas antes deste relatório fazer sentido. Pare aqui — não infira agrupamento
por conta própria.

## 3. Determinar o status de cada lote

Para cada lote de "Lotes de Entrega", cruze:

- Seção 3 do `TASK.md` — status de cada tarefa que compõe o lote (`A Fazer` /
  `Em andamento` / `Bloqueada` / `Concluída`).
- `.md/LOTE-LOG.md` (se existir) — uma entrada aqui significa que o lote já teve
  aprovação do Tech Lead registrada (ver `tech-lead.md`).
- `.md/QA-REPORT.md` e `.md/SECURITY-REVIEW.md` (se existirem) — vereditos de QA/
  DevSecOps sobre um lote que ainda não tem entrada em `LOTE-LOG.md` (aprovação
  parcial, Tech Lead pendente).
- `.md/BLOCKERS.md` (se existir) — entradas `Aberto` que afetem alguma tarefa do
  lote.

Classifique cada lote em um destes estados — nunca presuma, sinalize incerteza
explicitamente (ver o estado "Indeterminado" abaixo) em vez de adivinhar:

- **Concluído**: tem entrada em `LOTE-LOG.md` (Tech Lead já aprovou o lote).
- **Bloqueado**: tem entrada `Aberto` em `BLOCKERS.md` afetando alguma tarefa dele
  — reporte junto com o estado de progresso real (um lote pode estar "em
  andamento, bloqueado"), não como substituto do detalhe de tarefas.
- **Em andamento**: ao menos uma tarefa `Concluída` ou `Em andamento`, mas ainda
  sem entrada em `LOTE-LOG.md` — inclui o caso em que todas as tarefas já estão
  `Concluída` e QA/DevSecOps já aprovaram, faltando só a aprovação do Tech Lead.
- **Não iniciado**: todas as tarefas do lote estão `A Fazer`, sem bloqueio.
- **Indeterminado**: a informação disponível é insuficiente ou inconsistente para
  classificar com confiança (ex.: uma entrada de `LOTE-LOG.md`/`QA-REPORT.md`
  referencia um lote ou tarefa que não bate com "Lotes de Entrega" do `TASK.md`).
  Reporte o motivo específico, nunca escolha um dos outros quatro estados por
  aproximação.

**Lote atual**: o primeiro lote **em andamento**, na ordem de "Lotes de Entrega";
se nenhum estiver em andamento, o primeiro **não iniciado** cujas dependências de
outros lotes já estão satisfeitas (todos os lotes dos quais ele depende estão
`Concluído`).

## 4. Apresentar o relatório

Monte a resposta exatamente nesta estrutura (adapte os valores, mantenha a forma).
Use `⚠` só nos dois casos de alerta (bloqueio ativo, lote indeterminado) — sem
outros emojis:

```
Status do projeto — [N] de [M] lotes concluídos

## Lote atual — <Nome do Lote> (Em andamento | Próximo a começar)
[⚠ Bloqueado — ver abaixo, se aplicável]

| Tarefa | Trilha | Status |
|---|---|---|
| <ID> | Backend/Frontend/Mobile | <status> |
...

[Se houver bloqueio ativo:]
Bloqueio ativo: <descrição curta> — parado há <tempo>, calculado a partir da data
da entrada correspondente em BLOCKERS.md.

[Se todas as tarefas estão Concluída mas o lote ainda não tem entrada em LOTE-LOG.md:]
QA: <veredito> · DevSecOps: <veredito> · Tech Lead: pendente

## Lotes concluídos (<N>)
- <Nome do Lote> — <veredito do Tech Lead> · deploy: <status resumido de staging/produção>
...

## Lotes pendentes (<M - N - (1 se houver lote atual não iniciado)>), na ordem de execução
- <Nome do Lote> — depende de: <lote(s) do qual depende, ou "sem dependência declarada">
...

[Se algum lote ficou Indeterminado:]
⚠ Não foi possível determinar o status de <Nome do Lote> com confiança: <motivo>
```

Regras de conteúdo:

- **Lote atual**: mostre o detalhamento tarefa a tarefa (única seção com esse
  nível de detalhe).
- **Lotes concluídos**: uma linha cada, sem reabrir detalhe de tarefa — puxe o
  veredito e o resultado de deploy diretamente da entrada correspondente em
  `.md/LOTE-LOG.md` (o resumo compacto que o `/executar` já produziu ao fechar
  aquele lote), não relea relatórios de QA/DevSecOps/dispatch daquele lote para
  reconstruir o que já está resumido.
- **Lotes pendentes**: uma linha cada, na ordem de "Lotes de Entrega", com a
  dependência declarada quando existir.
- Se não houver nenhum lote concluído ainda, ou nenhum lote pendente (projeto no
  último lote), omita a seção correspondente em vez de mostrá-la vazia.

## 5. Encerramento

Termine a resposta no relatório acima. **Não faça pergunta de acompanhamento,
não ofereça avançar o fluxo, não pause esperando validação** — se o usuário quiser
agir sobre o que foi mostrado, ele aciona `/executar` separadamente.
