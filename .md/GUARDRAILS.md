# GUARDRAILS.md — Portal de Resultados de Exames (Aplicação White Label para Hospitais)

**Dono**: Tech Lead (propõe) + CTO (aprova, `PIPELINE-CONVENTIONS.md` §5)
**Data**: 2026-09-02
**Status**: **Aprovado com ressalvas pelo CTO no Gate 3 (2026-09-02) — em vigor a
partir desta data.** Todas as 39 regras abaixo (Seções A a J) estão em vigor como
input padrão obrigatório para todos os agentes (`cto`, `pm`, `business-analyst`,
`software-architect`, `ux-ui`, `tech-lead`, `backend`, `frontend`, `mobile`, `qa`,
`devsecops`, `devops`). Duas lacunas menores (gestão de segredos/credenciais;
mitigação de CSRF para o modelo de sessão via cookie, ADR-007) foram registradas
como acompanhamento não bloqueante — ver `CTO-REVIEW.md`, Gate 3, Seção 3.2 — a
serem propostas como adendo (nova linha no Log de Alterações) assim que o
DevSecOps confirmar taticamente o padrão de mitigação. Ver `CTO-REVIEW.md`, Gate
3, para o veredito completo e as demais condições de acompanhamento.
**Input**: `CTO-REVIEW.md` (Gate 1 e Gate 2, condições e diretrizes explícitas) +
`SDD.md` (final, com ADR-011 e ADR-012 pós-gate) + 12 ADRs em `.md/adr/` +
`TASK.md` (rascunho, submetido no mesmo Gate 3) + `BLOCKERS.md` (Bloqueio 002,
resolvido via ADR-012 antes desta submissão)

> Regras inegociáveis do projeto — não é um resumo do `SDD.md`, é a tradução das
> decisões já tomadas em regra prática, verificável em code review/CI. Qualquer
> exceção pontual a uma regra abaixo exige aprovação do CTO, registrada no "Log
> de Alterações" ao final deste documento, nunca decidida unilateralmente por
> quem está implementando.

---

## A. Isolamento Multi-Tenant (a regra de maior severidade deste projeto)

> **Condição explícita do Gate 2 do CTO** (`CTO-REVIEW.md`, veredito, item 1):
> "o primeiro `GUARDRAILS.md` produzido deve incluir, explicitamente, a regra de
> teste automatizado obrigatório de vazamento cruzado entre tenants... antes de
> qualquer PR de acesso a dado ser mergeado."

1. Toda entidade de domínio (todas exceto `TENANT`) carrega `tenant_id` não nulo
   desde a primeira migration — sem exceção, sem "adiciono depois".
2. Toda query de leitura/escrita a dado de domínio **deve** passar por um guard
   de aplicação que injeta o `tenant_id` do contexto autenticado. **PROIBIDO**
   escrever query manual (raw SQL, query builder direto) que não passe por esse
   guard.
3. Row-Level Security (RLS) habilitado em toda tabela de domínio como **segunda**
   camada de defesa — nunca a única. Configurar RLS sem o guard de aplicação (ou
   vice-versa) é considerado violação desta regra, não uma opção equivalente.
4. **Nenhum Pull Request que toque a camada de acesso a dado (query, repositório,
   guard, migration de tabela de domínio) é aprovado ou mergeado sem a suíte
   automatizada de teste de vazamento cruzado entre tenants passando no CI.**
   Esta suíte cria 2+ tenants com dados equivalentes e comprova, para toda
   entidade de domínio, que uma sessão do tenant A nunca retorna dado do tenant
   B — inclusive via manipulação direta de identificador (ID guessing). Tarefa
   correspondente: `TASK.md` BE-04.
5. **PROIBIDO** atribuir `tenant_id` de forma implícita/hardcoded a qualquer
   evento vindo de serviço de borda (Integration Gateway, Imaging Gateway) —
   é exatamente o risco que `BLOCKERS.md` Bloqueio 002 identificou e que
   ADR-012 fechou formalmente. Regra concreta para o Imaging Gateway (Orthanc,
   ADR-003/ADR-012): a Aplicação Core resolve `tenant_id` **exclusivamente**
   casando o `RemoteAET` recebido na notificação do Orthanc contra
   `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title` — nunca por "tenant
   único ativo" fixo em código, nem por qualquer outra heurística implícita.
   `dicom_remote_ae_title` tem constraint `UNIQUE` por tenant. `RemoteAET`
   recebido que não corresponda a nenhum `dicom_remote_ae_title` cadastrado
   **deve** ser roteado para a fila de exceção/alerta — **PROIBIDO** atribuir
   esse evento a um tenant por best-effort/palpite. Regra equivalente vale
   para qualquer novo serviço de borda futuro (ex.: Release 2, RF-C02): a
   solução de atribuição de tenant é sempre explícita e auditável, nunca
   assumida por padrão implícito, mesmo com um único tenant ativo no MVP.
   Tarefa correspondente: `TASK.md` BE-38.

## B. Autenticação, Sessão e MFA

6. Sessão de usuário final via cookie `HttpOnly`/`Secure` + estado em Redis
   (ADR-007). **PROIBIDO** implementar ou reintroduzir JWT stateless para
   autenticação de usuário final — a decisão já pesou esse trade-off e rejeitou
   essa opção por incompatibilidade com revogação imediata (RF-02/RF-04/RF-13).
7. MFA obrigatório, sem exceção, para todo perfil (paciente, administrador
   operacional, TI do hospital, suporte do piloto) — **PROIBIDO** implementar
   qualquer caminho de "pular MFA" ou login que conceda acesso sem segundo
   fator validado (RN-03).
8. MFA via TOTP (RFC 6238, biblioteca padrão como `otplib`/`speakeasy`) como
   método primário + OTP por e-mail como fallback (ADR-008). **PROIBIDO**
   introduzir dependência de provedor de SMS nesta release — RF-S01 (SMS) é
   Release 2, fora deste escopo.
9. Bloqueio de conta após tentativas malsucedidas consecutivas (RN-04) aplicado
   de forma unificada entre falha de senha (RF-01) e falha de código MFA
   (RF-03) — **PROIBIDO** ter dois contadores/limites independentes que
   permitam contornar o bloqueio combinando os dois vetores.
10. RBAC (RNF-03) sempre validado no backend via guards — **PROIBIDO** confiar
    em validação de papel apenas no frontend. Ownership (paciente só acessa
    dado da própria conta) aplicado em toda query, independente do papel.

## C. Integração com Sistemas do Hospital (HL7/FHIR/DICOM)

11. **PROIBIDO** construir parser HL7 v2.x/FHIR R4 próprio dentro do monolito
    core (ADR-002). Toda integração passa pelo motor de mercado (NextGen
    Connect/Mirth Connect, self-hosted, open-source) com Anti-Corruption Layer
    normalizando para formato canônico (JSON) antes de entrar no domínio. A
    aplicação core **nunca** lida com HL7/FHIR bruto diretamente.
12. **PROIBIDO** construir parser/renderizador DICOM próprio (ADR-003). Usar
    Orthanc como gateway de imagem médica; o core só lida com a URL/referência
    da imagem já convertida (JPEG/PNG), nunca com o arquivo DICOM bruto
    diretamente.
13. Integration Gateway e Imaging Gateway rodam **fora do processo** do
    monolito core (ADR-001), nunca embutidos como módulo interno; comunicação
    com o core via API interna/eventos normalizados, autenticada por
    credencial de serviço dedicada — **PROIBIDO** esses serviços de borda
    acessarem o banco de dados do core diretamente.
14. Integration Gateway e Imaging Gateway **nunca** expostos publicamente à
    internet (§7.5 do `SDD.md`) — acesso mediado pela aplicação core ou canal
    dedicado/VPN por hospital.
15. **Orthanc permanece um produto de mercado genérico, sem customização/plugin
    para ganhar conceito de tenant (ADR-003/ADR-012)** — **PROIBIDO** modificar
    o Orthanc para conhecer `tenant_id`, operar múltiplos AE Titles locais
    simultâneos, ou qualquer outra customização de produto para resolver
    multi-tenancy. Toda resolução de `tenant_id` para dado vindo do Imaging
    Gateway acontece na Aplicação Core, nunca no Orthanc (ver regra A.5).

## D. Persistência e Auditoria

16. PostgreSQL é o único banco de dados primário permitido (ADR-006).
    **PROIBIDO** armazenar BLOB de laudo/imagem diretamente no banco relacional
    — sempre Object Storage, referenciado por chave.
17. `pgcrypto` obrigatório para CPF e demais identificadores de paciente
    classificados como sensíveis durante a implementação.
18. Tabela `AUDIT_EVENT` é append-only: a role de banco usada pela aplicação
    **nunca** recebe `GRANT UPDATE`/`GRANT DELETE` nessa tabela — apenas
    `INSERT`/`SELECT` (ADR-009). Cada evento armazena o hash do evento
    anterior (hash chain) — nenhuma edição/exclusão é possível por nenhum
    perfil, incluindo administradores.
19. **PROIBIDO** implementar job de purga/arquivamento automatizado do log de
    auditoria sem confirmação jurídica formal explícita do CTO (RNF-04
    permanece "a confirmar" — diretriz registrada em `CTO-REVIEW.md`, Gate 2).
20. Toda ação sensível (visualização de laudo/imagem, download, geração/
    acesso/revogação de link de compartilhamento, ação administrativa sobre
    conta) **deve** publicar um evento em `AUDIT_EVENT` — omitir o registro de
    auditoria de uma ação sensível é tratado como bug de severidade alta, não
    como detalhe de acabamento.

## E. Criptografia e Residência de Dados

21. **TLS 1.2 é piso obrigatório sem exceção** em toda borda externa (SPA ↔
    BFF, hospital ↔ Integration Gateway/Imaging Gateway, aplicação core ↔
    provedor de e-mail) — diretriz explícita do CTO no Gate 2, substitui a
    redação "recomendado" do rascunho original do `SDD.md` §7.3. TLS 1.3
    preferencial onde suportado.
22. Dado de saúde criptografado em repouso em duas camadas: criptografia de
    disco gerenciada pelo provedor de nuvem + `pgcrypto` para identificadores
    sensíveis (regra D.17 acima).
23. Acesso a arquivo de laudo/imagem **exclusivamente** via URL assinada de
    curta duração — **PROIBIDO** URL pública permanente, em qualquer fluxo
    (download RF-08 ou compartilhamento RF-09).
24. Toda infraestrutura com dado de saúde (banco, Redis, Object Storage) deve
    estar em região de nuvem localizada no Brasil (ADR-010) — **PROIBIDO**
    provisionar qualquer componente com dado sensível fora do Brasil sem nova
    decisão explícita do CTO.

## F. LGPD e Consentimento

25. Consentimento de dado de saúde (RN-02, LGPD Art. 11, I) é campo/registro
    **separado** do aceite geral dos Termos de Uso — **PROIBIDO** implementar
    como checkbox único combinado, em qualquer tela ou versão futura.
26. **PROIBIDO** qualquer funcionalidade de anexar laudo/imagem diretamente a
    e-mail enviado pelo sistema (RN-05/Won't, risco LGPD já decidido) — único
    canal de compartilhamento suportado é o link temporário com expiração e
    escopo restrito ao(s) exame(s) selecionado(s) (RF-09/RN-06/RN-07).
27. Payload de e-mail transacional (recuperação de senha RF-02, OTP MFA RF-03)
    carrega **apenas** código/link — **PROIBIDO** incluir dado de saúde ou
    dado cadastral sensível no corpo do e-mail (diretriz do CTO para o
    DevSecOps validar taticamente, `CTO-REVIEW.md` Gate 2).
28. `CONSENT_RECORD` e o log de auditoria são registros append-only por design
    — **PROIBIDO** qualquer endpoint ou operação de UPDATE/DELETE sobre
    consentimento já registrado (correção é sempre novo registro versionado,
    nunca sobrescrita).

## G. Validação de Contraste WCAG no Branding (ADR-011)

29. **Nenhuma configuração de `BRANDING_CONFIG` pode ser marcada pronta para
    go-live** com `status_validacao_contraste != 'aprovado'` — regra de negócio
    da aplicação (módulo Config de Tenant/Branding), não processo operacional
    informal.
30. Checagem automatizada de contraste sobre `paleta_cores` é gate bloqueante
    determinístico — reprovação automática impede avanço do fluxo, sem
    possibilidade de override manual da checagem automatizada em si.
31. Checklist manual de revisão visual do `logo_url` é **obrigatório mesmo
    quando a checagem automática de paleta passa** — não é etapa opcional nem
    substituível por automação nesta release.

## H. Acessibilidade (WCAG 2.1 AA)

32. WCAG 2.1 AA é critério de aceite **por tela**, não revisão posterior
    (RNF-06, Must-have inegociável) — nenhuma tarefa de Frontend é considerada
    pronta sem passar pelas regras transversais de `UX-SPEC.md` §5.1: contraste
    mínimo 4.5:1 (texto normal), navegação por teclado completa, estado nunca
    comunicado só por cor, rótulos de formulário programáticos, mensagens de
    erro anunciadas (`aria-live`), alvo de toque adequado, texto redimensionável
    até 200% sem quebra de layout.
33. **PROIBIDO** hardcodar no texto fixo de UI qualquer valor de parâmetro
    ainda "a confirmar" (timeout de sessão, prazo de link, tentativas de login,
    janela de código MFA) — sempre consumido de configuração.

## I. Arquitetura e Stack

34. Backend: Node.js LTS + TypeScript + NestJS obrigatório (ADR-005). Módulos
    NestJS mapeados 1:1 aos bounded contexts do `SDD.md` §2.1 — **PROIBIDO**
    import direto entre módulos fora da interface pública do módulo (enforced
    por lint de arquitetura).
35. Frontend: React + TypeScript obrigatório.
36. Padrão arquitetural geral: monolito modular com serviços de borda
    especializados (ADR-001) — **PROIBIDO** extrair um módulo do monolito core
    como serviço independente sem decisão explícita do Software Architect
    (novo ADR), mesmo que pareça tecnicamente simples de fazer.

## J. Governança deste Documento

37. Só o Tech Lead propõe mudança estrutural a este documento; só o CTO aprova
    (`PIPELINE-CONVENTIONS.md` §5). Qualquer agente pode ler livremente.
38. Uma exceção pontual a qualquer regra acima (ex.: "esta sprint pode pular a
    regra X por causa de Y") só entra em vigor registrada no Log de Alterações
    abaixo, com coluna `Validade` — ao expirar, a regra original volta a valer
    sem nova aprovação.
39. Toda inconsistência entre este documento e o `SDD.md`/ADRs é reportada via
    `BLOCKERS.md` (nunca resolvida unilateralmente por quem a encontrar) —
    escalada a `tech-lead` (regra deste documento) ou `software-architect`
    (decisão arquitetural de origem), conforme a natureza do conflito.

---

## Log de Alterações

| Data | Proposto por | Aprovado por | Mudança | Motivo | Validade |
|---|---|---|---|---|---|
| 2026-09-02 | tech-lead | cto | Versão inicial deste documento (regras A a J, itens 1-39, incluindo a regra A.5/C.15 sobre resolução de `tenant_id` no Imaging Gateway via `RemoteAET`/`dicom_remote_ae_title`, derivada de ADR-012) | Primeira proposta de `GUARDRAILS.md` do projeto, extraída de `CTO-REVIEW.md` (Gate 1 e Gate 2), `SDD.md` e os 12 ADRs (incluindo ADR-012, que resolveu `BLOCKERS.md` Bloqueio 002 antes desta submissão), conforme `guardrails-drafting` — submetida junto com `TASK.md` ao Gate 3 (`capacity-and-timeline-validation`). **Aprovado com ressalvas no Gate 3 (2026-09-02)** — ver `CTO-REVIEW.md`, Gate 3, Seção 3, para a análise de cobertura por seção e as duas lacunas menores (secret management, CSRF) registradas como acompanhamento não bloqueante | Permanente |

**Todas as 39 regras deste documento estão em vigor a partir de 2026-09-02**
(aprovação do CTO no Gate 3, registrada na linha acima e detalhada em
`CTO-REVIEW.md`). Alterações estruturais futuras ou exceções pontuais seguem o
mesmo processo: proposta do Tech Lead, nova linha nesta tabela, aprovação do CTO
antes de entrar em vigor (regras 37-38 acima).
