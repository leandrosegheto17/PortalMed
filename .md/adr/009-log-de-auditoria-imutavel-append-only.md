# ADR-009: Implementar Log de Auditoria Imutável como Tabela Append-Only com Privilégios de Banco Restritos e Hash Chain

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect
- **Tags**: architecture, security, compliance, audit

## Contexto e Problema

RF-10/RN-08 exigem que todo evento de visualização, download, geração/acesso/
revogação de link seja registrado de forma **imutável, append-only**, sem
edição ou exclusão possível por qualquer perfil, incluindo administradores —
exigência direta de rigor LGPD (R3) para servir de evidência em fiscalização.
RNF-04 mantém o prazo de retenção como "a confirmar", mas a garantia de
imutabilidade em si já é confirmada e não pode depender só de convenção de
código (uma aplicação com bug ou um administrador de banco mal-intencionado
não pode conseguir alterar o log).

## Decision Drivers

- RN-08: "impedir sua edição ou exclusão por qualquer usuário, incluindo
  administradores" — a garantia precisa existir também no nível de banco, não
  só na camada de aplicação (que pode ter bug ou ser contornada por acesso
  direto ao banco).
- RF-10: evento de auditoria precisa incluir identificador do exame, tipo de
  evento, data/hora e ator — estrutura relativamente simples, sem necessidade
  de um sistema de log distribuído completo para o volume do MVP (1 hospital).
- Valor probatório em fiscalização LGPD exige não só "não foi editado", mas
  idealmente uma forma de **provar** que não foi editado (tamper-evidence).

## Considered Options

- **Tabela relacional append-only convencional**, com regra de negócio na
  aplicação impedindo UPDATE/DELETE (sem reforço no banco)
- **Tabela relacional append-only com privilégio de banco restrito** (role de
  aplicação sem `GRANT UPDATE/DELETE` na tabela de auditoria) **+ hash chain**
  (cada evento armazena o hash do evento anterior, permitindo detectar
  adulteração se alguém contornar a restrição de privilégio via acesso
  administrativo direto)
- **Serviço de log externo dedicado** (ex.: armazenamento WORM em object
  storage com object lock, ou plataforma de log imutável de terceiro)

## Decision Outcome

Opção escolhida: **"Tabela append-only com privilégio de banco restrito + hash
chain"**, porque atende RN-08 com defesa em profundidade sem introduzir mais
um componente de infraestrutura externo (que teria custo/complexidade
desproporcional para o volume de 1 hospital piloto). A role de banco usada
pela aplicação não recebe `GRANT UPDATE`/`GRANT DELETE` na tabela de eventos
de auditoria — apenas `INSERT`/`SELECT`. Cada linha armazena o hash
criptográfico do conteúdo do evento anterior (hash chain simples), permitindo
detectar retroativamente qualquer adulteração feita por acesso administrativo
direto ao banco (fora da aplicação) — cenário que a restrição de privilégio
sozinha não cobre.

### Positive Consequences

- Garantia de imutabilidade reforçada em duas camadas: privilégio de banco
  (impede a aplicação/usuário comum de editar) e hash chain (detecta
  adulteração por acesso administrativo direto).
- Sem custo de operar um serviço de log externo dedicado no MVP — usa a mesma
  instância PostgreSQL já decidida (ADR-006).
- Estrutura simples o suficiente para o volume de 1 hospital piloto, sem
  engenharia excessiva de um sistema de log distribuído que só se justificaria
  em escala multi-hospital.

### Negative Consequences

- Alterar retroativamente o schema da tabela de auditoria (ex.: adicionar
  coluna) é operação sensível — precisa de plano de migração cuidadoso para
  não quebrar a cadeia de hash já gravada (mitigação: versionar o formato do
  evento dentro do próprio payload, não alterar estrutura da cadeia já
  fechada).
- Hash chain só detecta adulteração — não a impede fisicamente se alguém tiver
  acesso administrativo total ao banco (superusuário). Mitigação adicional
  (backup/replicação externa, WORM em object storage) é candidata a decisão
  futura se o volume/criticidade justificar — registrada como possível
  revisão em Seção 6 do `SDD.md`, não implementada no MVP.
- Retenção de longo prazo (RNF-04, prazo ainda "a confirmar") pode exigir
  arquivamento externo eventualmente — esta decisão cobre a garantia de
  imutabilidade, não a política de retenção, que segue pendente de definição
  legal (CTO, Gate 2).

## Pros and Cons of the Options

### Tabela append-only + privilégio restrito + hash chain ✅ Chosen

- ✅ Defesa em profundidade (privilégio + tamper-evidence)
- ✅ Sem custo de infraestrutura externa adicional no MVP
- ❌ Hash chain detecta mas não impede adulteração por superusuário
- ❌ Migração de schema exige cuidado adicional

### Append-only só por convenção de aplicação

- ✅ Simples de implementar
- ❌ Não resiste a bug de aplicação nem a acesso direto ao banco — não atende
  o nível de garantia que RN-08 exige para evidência de fiscalização

### Serviço de log externo dedicado (WORM/object lock)

- ✅ Garantia de imutabilidade mais forte, nível de infraestrutura
- ❌ Custo/complexidade desproporcional para o volume do MVP (1 hospital) —
  candidato a revisão se o volume/criticidade de auditoria crescer

## Links

- Relacionado: ADR-006 (PostgreSQL)
- `SDD.md`, Seções 5, 6 e 7
- `PRD-TECNICO.md`, RF-10, RN-08, RNF-04
