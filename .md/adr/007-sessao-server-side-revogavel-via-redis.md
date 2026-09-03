# ADR-007: Usar Sessão Server-Side Revogável (Redis) em vez de JWT Stateless

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect
- **Tags**: architecture, security, session

## Contexto e Problema

Vários critérios de aceite do `PRD-TECNICO.md` exigem **revogação imediata**
de sessão: RF-02 ("nova senha definida... invalidar todas as sessões ativas
anteriores"), RF-04 ("encerra a sessão automaticamente"/"sair" invalida token
imediatamente), RF-13 ("conta desativada... encerrar imediatamente qualquer
sessão ativa"). Um token JWT stateless clássico (sem estado no servidor) não
suporta revogação antes da expiração natural sem infraestrutura adicional
(blocklist) — o que efetivamente recria estado no servidor de qualquer forma.

## Decision Drivers

- RF-02/RF-04/RF-13 exigem revogação de sessão sob demanda, não só expiração
  por tempo — requisito direto de arquitetura de sessão, não um detalhe de
  implementação posterior.
- RF-04 exige expiração por inatividade (15 min, valor sugerido a confirmar) —
  mais fácil de implementar com sessão server-side (janela deslizante) do que
  com JWT stateless (que exigiria refresh token com lógica equivalente de
  qualquer forma).
- RN-03 (MFA obrigatório sem exceção) e RNF-03 (RBAC) exigem que o estado de
  "segundo fator já validado" e o papel do usuário sejam auditáveis e
  revogáveis a qualquer momento pelo administrador (RF-13).

## Considered Options

- **JWT stateless** (token assinado, sem estado no servidor, validade fixa)
- **JWT com blocklist de revogação** (JWT + registro de tokens revogados em
  Redis, consultado a cada requisição)
- **Sessão server-side clássica**, com identificador opaco de sessão
  armazenado no cliente (cookie `HttpOnly`/`Secure`) e estado da sessão
  mantido em Redis, revogável instantaneamente por remoção da chave

## Decision Outcome

Opção escolhida: **"Sessão server-side clássica com Redis"**, porque os
requisitos de revogação imediata (RF-02, RF-04, RF-13) já eliminam a vantagem
central do JWT stateless (evitar consulta de estado a cada requisição) — a
alternativa de JWT + blocklist acaba pagando o mesmo custo de consulta de
estado a cada requisição, mas com a complexidade adicional de gerenciar dois
mecanismos (assinatura + blocklist) em vez de um. Sessão server-side com Redis
resolve revogação, expiração por inatividade (janela deslizante) e desativação
administrativa de conta com uma única primitiva simples: remover a chave de
sessão no Redis.

### Positive Consequences

- Revogação de sessão (RF-02, RF-04, RF-13) é uma operação trivial (remover
  chave no Redis), sem necessidade de blocklist paralela.
- Expiração por inatividade (RF-04) é natural com TTL deslizante no Redis, sem
  lógica adicional de refresh token.
- Estado de sessão centralizado facilita auditoria (RF-10) de sessões ativas
  por conta, útil para o painel administrativo (RF-13).

### Negative Consequences

- Introduz dependência forte do Redis para toda operação autenticada — Redis
  indisponível bloqueia login e validação de sessão de toda a base (ver Seção
  6 do `SDD.md`, risco de ponto único de falha, mitigado por Redis gerenciado
  com replicação).
- Não escala horizontalmente "de graça" como JWT stateless puro — cada
  instância da aplicação precisa de acesso à mesma instância/cluster Redis
  (aceitável no MVP com 1 hospital; revisitar se volume multi-hospital exigir
  Redis distribuído/cluster mode).

## Pros and Cons of the Options

### Sessão server-side com Redis ✅ Chosen

- ✅ Revogação trivial, atende RF-02/RF-04/RF-13 diretamente
- ✅ Expiração por inatividade natural (TTL deslizante)
- ❌ Dependência forte de disponibilidade do Redis

### JWT stateless

- ✅ Sem consulta de estado a cada requisição, escala horizontalmente sem
  estado compartilhado
- ❌ Não suporta revogação imediata sem infraestrutura adicional — incompatível
  diretamente com RF-02/RF-04/RF-13 como estão especificados

### JWT com blocklist de revogação

- ✅ Resolve revogação mantendo assinatura JWT
- ❌ Paga o mesmo custo de consulta de estado a cada requisição que a sessão
  server-side, mas com complexidade adicional de dois mecanismos coexistindo

## Links

- `SDD.md`, Seções 3, 6 e 7
- `PRD-TECNICO.md`, RF-02, RF-04, RF-13
