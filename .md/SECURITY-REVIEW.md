# SECURITY-REVIEW.md — Portal de Resultados de Exames

**Dono**: DevSecOps
**Convenção**: `PIPELINE-CONVENTIONS.md` — achados por severidade, status
(bloqueia deploy / débito com prazo), requisitos de segurança operacional para
o DevOps. Este arquivo é atualizado lote a lote (mesmo espírito de
`QA-REPORT.md`), nunca reescrito do zero — cada novo lote acrescenta uma seção
própria.

**Ponto de sincronização**: `static-security-analysis` (SAST/dependências/
secret-scan) roda continuamente desde o início do projeto
(`.github/workflows/security-scan.yml`, configurado pelo DevOps, dono
DevSecOps) e não é reconfigurado aqui. As demais 5 skills (auditoria completa)
só rodam sobre um lote depois que o QA aprovar (Aprovado / Aprovado com
ressalvas) — nunca antes.

---

## Lote 1 — Fundação de Infraestrutura e Design System

**Tarefas no escopo** (`TASK.md` §4.1.1): BE-01, BE-02, BE-05, BE-08
(Backend) + FE-01, FE-02, FE-03, FE-04 (Frontend). **Fora de escopo desta
auditoria, por instrução explícita**: BE-03/BE-04 (multi-tenancy — Lote 3,
ainda não processado pelo fluxo de lote; não revalidados aqui mesmo já tendo
código e histórico de QA).

**Gatilho de validação**: `QA-REPORT.md` Seção 4, veredito "Aprovado com
ressalvas" para o Lote 1 (2026-09-03) — todas as 8 tarefas `Concluído` em
`TASK.md`, nenhum bug alto/crítico em aberto segundo QA.

**Referências de arquitetura usadas nesta auditoria**: `SDD.md` §7 (Requisitos
de Segurança e Compliance) — §7.1 (autenticação/sessão), §7.3 (criptografia),
§7.4 (isolamento multi-tenant), §7.5 (superfície de exposição), §7.6 (LGPD);
ADR-006 (PostgreSQL/`pgcrypto`), ADR-007 (sessão server-side via Redis, nunca
JWT), ADR-010 (residência de dados no Brasil), ADR-011 (campos de contraste em
`BRANDING_CONFIG`), ADR-012 (resolução de `tenant_id` via AE Title);
`GUARDRAILS.md` (todas as 39 regras, com foco nas Seções D, E, F e I para este
lote — A/B/C não se aplicam plenamente ainda, já que BE-03/BE-04/BE-14 estão
fora de escopo); `CTO-REVIEW.md` Gate 2 (`risk-and-compliance-check`) e Gate 3
(governança de `GUARDRAILS.md`).

**Código revisado**: `backend/src/redis/`, `backend/src/queue/`,
`backend/src/object-storage/`, `backend/migrations/` (15 arquivos),
`backend/src/database/domain-tables.ts`/`schema.ts`, `backend/.env.example`,
`backend/Dockerfile`, `frontend/src/design-system/` (tokens, branding,
componentes estruturais/formulário/responsivos), `.github/workflows/
security-scan.yml`, `.gitleaks.toml`, `.semgrep.yml`, e — como contexto de
requisito operacional para o DevOps, não como parte das 8 tarefas do lote —
`infra/modules/{object-storage,cache,database,network,secrets}/main.tf` e
`infra/environments/{staging,production}/main.tf`.

---

### 1. `static-security-analysis` (revisão pontual do scanning contínuo)

Não reconfigurado — já em vigor desde o início do repositório
(`.github/workflows/security-scan.yml`, `.gitleaks.toml`, `.semgrep.yml`),
conforme nota de handoff registrada no próprio `.gitleaks.toml`. Revisão desta
rodada:

- **Config confirmada correta e proporcional ao lote**: `secret-scan`
  (gitleaks, todo o repo, regras específicas do projeto — credencial de
  serviço interno, string de conexão DB/Redis, segredo TOTP), `sast`
  (semgrep, rulesets `p/owasp-top-ten`, `p/nodejsscan`, `p/typescript`,
  `p/react`, `p/secrets`, `p/security-audit`, `p/sql-injection`),
  `dependency-scan-backend`/`dependency-scan-frontend` (npm audit +
  OSV Scanner). Os dois jobs de dependência deixam de rodar em no-op **a
  partir deste lote**: `backend/package-lock.json` e
  `frontend/package-lock.json` já existem (publicados por BE-01/FE-01) —
  confirmado que o gatilho condicional dos dois jobs (`if: steps.check.
  outputs.exists == 'true'`) já resolve para `true` neste estado do
  repositório.
- **Verificação substituta nesta rodada** (gitleaks/semgrep não disponíveis
  no ambiente local desta auditoria — CI é a fonte de verdade real):
  `npm audit --audit-level=high` reexecutado localmente em `backend/` e
  `frontend/` — **0 vulnerabilidades em ambos**. Varredura manual por padrão
  perigoso (`eval(`, `child_process`, `new Function(`, `dangerouslySetInnerHTML`,
  `document.write`, `execSync`) em `backend/src/` e `frontend/src/` — **nenhuma
  ocorrência**. Varredura manual por log de segredo (`console.*`/`logger.*`
  em `backend/src/`) — **nenhuma ocorrência** nos módulos deste lote (nenhum
  logging implementado ainda em `redis/`, `queue/`, `object-storage/`,
  `database/`).
- **Recomendação/ação**: confirmar diretamente no GitHub Actions (fora do
  alcance desta sessão local) que as execuções reais de `secret-scan`/`sast`/
  `dependency-scan-*` para os commits deste lote estão verdes — não é um
  achado bloqueante (a config está correta e a verificação substituta local
  não encontrou nada), mas é uma checagem que só o ambiente de CI real pode
  confirmar com autoridade total sobre gitleaks/semgrep. **Débito de
  verificação, severidade Baixa, dono DevSecOps, prazo: antes do fechamento
  do próximo lote** (`SEC-DEBT-001`).

### 2. `security-requirement-validation`

| Requisito | Fonte | Verificação | Resultado |
|---|---|---|---|
| `pgcrypto` habilitado, CPF criptografado + hash de lookup | ADR-006, GUARDRAILS D.17 | `1788336000000_enable-pgcrypto-extension.ts` (primeira migration); `users.cpf_criptografado` (bytea, `pgp_sym_encrypt`) + `users.cpf_hash` (sha-256, `create-users-table.ts`) | **Atendido** |
| `tenant_id` não nulo em toda tabela de domínio | GUARDRAILS A.1 | 13 tabelas de domínio, `tenant_id uuid NOT NULL` + FK, confirmado por leitura direta (não só pelo relato de QA) | **Atendido** (guard de aplicação/RLS são BE-03/BE-04, fora de escopo) |
| Campos de `BRANDING_CONFIG` (ADR-011) | ADR-011 | `branding_configs`, `status_validacao_contraste` com `CHECK` de enum, default `pendente` | **Atendido** |
| UIDs DICOM nullable + `dicom_remote_ae_title` UNIQUE global (ADR-012) | ADR-012, GUARDRAILS A.5 | `exam_files`/`integration_endpoint_configs`, índice único parcial global | **Atendido** — mesma leitura já formalizada por CTO no Log de Alterações de `GUARDRAILS.md` (2026-09-02); `QA-DEBT-006` segue como débito de **processo** (não de segurança), prazo "antes de BE-38", sem violação hoje |
| Sessão server-side via Redis, nunca JWT stateless (ADR-007, GUARDRAILS B.6) | ADR-007 | `backend/package.json` sem `jsonwebtoken`/`passport-jwt`/equivalente; `backend/src/redis/session-key.ts` só define a *convenção* de chave (`{prefixo}:session:{tenantId}:{sessionId}`), sem nenhuma lógica de criação/validação de sessão implementada — TTL deslizante, geração de `sessionId` opaco e logout continuam 100% deferidos a BE-14 | **Atendido, sem desvio** — confirmado que BE-05 não implementou nada em desacordo à espera de BE-14, exatamente como a tarefa pede |
| Região Brasil obrigatória para banco/Redis/Object Storage (ADR-010, GUARDRAILS E.24) | ADR-010 | `object-storage-config.ts` rejeita qualquer região fora de `KNOWN_BRAZIL_REGIONS = ['sa-east-1']`, inclusive quando `OBJECT_STORAGE_ENDPOINT` tenta contornar (bloqueado em `production`/`staging` via `assertEndpointOverrideAllowed`); infra (`infra/modules/database`, `infra/environments/*/backend.tf`) usa `sa-east-1`/`region = "sa-east-1"` de forma consistente — o único uso de `us-east-1` (`production/versions.tf`) é o provider auxiliar exigido pela AWS para CloudFront/ACM/WAF (metadado de borda, não dado de saúde) | **Atendido** |
| URL assinada de curta duração, nunca pública permanente (GUARDRAILS E.23) | ADR-010/GUARDRAILS | `ObjectStorageService.getReadSignedUrl` é o único caminho de leitura; teto `MAX_SIGNED_URL_TTL_SECONDS = 900s` não configurável por env, aplicado a default e a qualquer override antes de chamar o SDK; teste e2e contra LocalStack confirma que a URL sem assinatura falha (`>= 400`) | **Atendido** (ver ressalva sobre expiração real na Seção 4) |
| Bucket sem acesso público, SSE-KMS (GUARDRAILS E.16/E.23) | GUARDRAILS | `infra/modules/object-storage/main.tf`: `aws_s3_bucket_public_access_block` com as 4 flags `true`; `aws_s3_bucket_server_side_encryption_configuration` com `aws:kms` + KMS dedicada (`enable_key_rotation = true`); bucket policy nega `PutObject` sem SSE-KMS e nega qualquer tráfego sem TLS (`aws:SecureTransport = false`); `ObjectStorageService.putObject` reforça `ServerSideEncryption: 'aws:kms'` em runtime como defesa em profundidade adicional | **Atendido** |
| TLS 1.2 piso obrigatório em toda borda externa (GUARDRAILS E.21) | CTO Gate 2 | ALB só aceita 443 (`aws_security_group.alb`); RDS com `rds.force_ssl = 1`; Redis com `transit_encryption_enabled = true`; bucket S3 nega tráfego sem TLS | **Atendido** — nível de infraestrutura confirmado; TLS efetivo do listener HTTPS do ALB (versão/cifra exata) é detalhe de `infra/modules/edge`, não revisado a fundo nesta rodada (fora das 8 tarefas do lote, sem achado que o justifique) |
| Secrets nunca hardcoded, gestão via secret manager | GUARDRAILS (lacuna registrada no cabeçalho de `GUARDRAILS.md` para acompanhamento tático do DevSecOps) | `.env.example` só contém defaults de dev claramente documentados como tal; `.gitignore` (`backend/`) ignora `.env`/`.env.*`; nenhum secret literal em `backend/src/`; `infra/modules/secrets/main.tf` usa `aws_secretsmanager_secret` com `kms_key_id`, senhas geradas via `random_password` (nunca literal em `.tf`/`.tfvars`); produção injeta segredos via `secrets`/ARN no ECS (`value_from`), nunca como `environment` literal | **Atendido em código/infra-como-código** — ver ressalva de wiring na Seção 4 (achado novo desta auditoria) |

### 3. `compliance-validation` (LGPD, nível de implementação)

Este lote é fundação pura — nenhum tratamento de dado de saúde real ainda
(nenhuma tela/endpoint de exame, laudo ou imagem está implementado). Escopo de
compliance aplicável, portanto, é estritamente **CPF (dado cadastral
sensível)** e a base para dado de saúde futuro:

- **CPF criptografado em repouso (`pgcrypto`) desde a primeira migration** —
  atende RNF-02/ADR-006/GUARDRAILS D.17 no nível de schema. Duas colunas
  (`cpf_criptografado` + `cpf_hash`) são uma decisão de detalhe correta e
  documentada (permite lookup/unicidade sem armazenar CPF em texto plano nem
  depender de descriptografar todo o universo de registros para checar
  duplicidade).
- **Gestão da chave simétrica de `pgp_sym_encrypt` ainda não existe em
  código de aplicação** — as duas únicas ocorrências de chave literal
  (`'chave-de-teste'`, `'k'`) estão em specs de teste (`schema.e2e-spec.ts`,
  `tenant-cross-leak-exhaustive.e2e-spec.ts`), nunca em código de produção.
  Isto é esperado e correto para o escopo de BE-02 (só schema) — **não é um
  achado desta tarefa**, mas fica registrado como ponto de atenção explícito
  para a primeira tarefa futura que escrever/ler `cpf_criptografado` em
  runtime (fora deste lote): a chave de criptografia de coluna **deve** vir
  do secret manager/KMS (nunca de variável de ambiente literal em texto
  plano, e nunca fixa em código), com rotação documentada. **Requisito
  antecipado para o Backend, não débito deste lote.**
- **`CONSENT_RECORD`/dado de saúde**: schema existe (`consent_records`,
  migration BE-02) mas nenhuma lógica de negócio de consentimento roda
  ainda — consistente com o escopo do lote. `SDD.md` §7.6/GUARDRAILS F.25/
  F.28 (consentimento separado, append-only) permanecem requisitos válidos
  para a tarefa que implementar o fluxo real (fora deste lote) — nada a
  aprovar/reprovar aqui.
- **Nenhuma coleta/exposição de dado além do necessário identificada** nos
  componentes de formulário do Frontend (`CpfField` usa `autoComplete="off"`,
  não persiste em `localStorage`/`sessionStorage`, não loga o valor digitado).
- **Retenção de log de auditoria (RNF-04)**: não aplicável a este lote —
  `AUDIT_EVENT` (tabela) só é criada por BE-02; nenhuma lógica de escrita/
  purga existe ainda. Diretriz do CTO (Gate 2: nenhuma purga automatizada sem
  confirmação jurídica) permanece válida e não é violada por nada neste lote.

**Veredito de compliance para o Lote 1**: nenhum achado de compliance
obrigatório (LGPD) pendente de resolução — o único ponto de atenção (gestão
de chave de `pgcrypto`) é um requisito antecipado para trabalho futuro, não
uma lacuna do que já foi implementado.

### 4. `sensitive-data-exposure-check`

- **Nenhuma credencial hardcoded** em `redis/`, `queue/`, `object-storage/`,
  `database/` — confirmado por leitura linha a linha dos 20 arquivos de
  código-fonte (não teste) desses quatro diretórios. Toda credencial vem de
  env, com defaults de desenvolvimento claramente documentados como
  provisórios (`.env.example`, comentado explicitamente "produção vem do
  secret manager").
- **Nenhum log de dado sensível** — nenhum dos módulos revisados usa
  `console.*`/`Logger`; nenhuma superfície de logging existe ainda para
  auditar payload de erro.
- **Object Storage — URL assinada expira de fato?** Reavaliação do
  `QA-DEBT-016` (severidade Baixa, registrado por QA): teste e2e contra
  LocalStack não afirma "GET após expirar falha" por limitação conhecida e
  documentada do próprio LocalStack (`X-Amz-Expires` não enforced —
  `localstack/localstack#7840`/`#9538`/`#2493`/`#1685`, citadas em
  `backend/docs/object-storage.md`). **Concordância com a classificação de
  QA**: severidade **Baixa**, não Média/Alta. Razões, avaliadas
  independentemente por este agente:
  1. A geração/verificação de assinatura é 100% delegada a
     `@aws-sdk/s3-request-presigner` — biblioteca oficial da AWS, a mesma
     usada contra o S3 real em produção. Não há reimplementação própria de
     SigV4 no projeto que pudesse conter um bug de expiração.
  2. Teto de 900s não configurável por env (`MAX_SIGNED_URL_TTL_SECONDS`),
     aplicado tanto ao default quanto a qualquer override, antes de qualquer
     chamada ao SDK — mesmo que a expiração real falhasse silenciosamente, o
     blast radius está estruturalmente limitado a 15 minutos, nunca a uma
     URL "praticamente permanente".
  3. Nenhum consumidor real desta funcionalidade existe ainda neste lote
     (RF-06/07/08/09 ainda não implementados) — o risco só se materializa
     quando houver laudo/imagem real por trás da URL.
  **Ação, mantida com prazo explícito** (mesma recomendação de QA,
  formalizada aqui como requisito de DevSecOps, não apenas nota de QA):
  validação manual pontual de expiração contra o bucket real de `staging`
  (gerar uma URL com TTL curto, aguardar expirar, confirmar `403`/`404` real
  da AWS) **antes do primeiro tráfego real de laudo/imagem** — dono:
  DevSecOps + Backend, prazo: antes do fechamento do Lote 5 (primeiro lote
  com consumidor real de `getReadSignedUrl`). Mantido como `QA-DEBT-016`
  (não duplicado com novo ID).
- **Achado novo desta auditoria — descompasso entre secret wiring de infra e
  variáveis de ambiente que o código de aplicação realmente lê** (severidade
  **Média**, não bloqueante para o Lote 1, requisito operacional para
  DevOps antes do primeiro deploy real): `infra/environments/production/
  main.tf` injeta os segredos de produção como blobs JSON opacos
  (`DATABASE_CREDENTIALS`, `REDIS_AUTH`) via Secrets Manager ARN — mas
  `backend/src/redis/redis-config.ts` e o carregamento de `DATABASE_URL`/
  `APP_DATABASE_URL` (BE-02/BE-03) esperam variáveis de ambiente **planas**
  (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `DATABASE_URL`,
  `APP_DATABASE_URL`), não um JSON único. Nenhuma das duas pontas está
  "errada" isoladamente (a prática de guardar credencial como JSON único no
  Secrets Manager é razoável; o app ler variáveis planas também é razoável),
  mas **hoje elas não se encaixam** — se não resolvido antes do primeiro
  deploy real, o caminho de menor resistência sob pressão de prazo é alguém
  "destravar" isso escrevendo a senha em texto plano diretamente como
  variável de ambiente do ECS, exatamente o anti-padrão que o secret manager
  existe para evitar. **Não é um achado que bloqueia o Lote 1** (nenhum ambiente real
  está recebendo tráfego ainda; BE-05/BE-08 não estão sequer importados em
  `AppModule`) — é um requisito de segurança operacional a resolver **antes**
  do primeiro deploy de um ambiente com Redis/Postgres/Object Storage reais
  conectados à aplicação. **Dono: DevOps** (decompor o JSON do Secrets
  Manager nas variáveis de ambiente esperadas pelo código, via
  `valueFrom` com JSON key reference do ECS ou uma etapa de entrypoint que
  faça o parse) **+ DevSecOps acompanha**. Prazo: antes do primeiro deploy
  real em `staging` (`DEPLOY.md`). Registrado como `SEC-DEBT-002`.

### 5. `finding-severity-classification` — consolidação

| ID | Achado | Severidade | Bloqueia deploy? | Dono | Prazo |
|---|---|---|---|---|---|
| `QA-DEBT-006` (herdado, já classificado por QA/CTO) | Constraint `UNIQUE` de `dicom_remote_ae_title` implementada correta tecnicamente, mas fora do processo formal de exceção — já formalizado no Log de Alterações de `GUARDRAILS.md` | Média (processo, não segurança) | Não | Tech Lead | Antes de BE-38 (Lote 5) |
| `QA-DEBT-016` (herdado, reclassificação confirmada) | Expiração real de URL assinada nunca observada empiricamente (limitação do LocalStack) | Baixa | Não | DevSecOps + Backend | Antes do fechamento do Lote 5 |
| `SEC-DEBT-001` (novo) | Confirmação formal, no GitHub Actions real, de que `secret-scan`/`sast`/`dependency-scan-*` rodaram verdes para os commits deste lote (verificação local substituta já feita, sem achado) | Baixa | Não | DevSecOps | Antes do fechamento do próximo lote |
| `SEC-DEBT-002` (novo) | Secrets de produção (Secrets Manager) empacotados como JSON único; código de aplicação espera variáveis de ambiente planas — descompasso de wiring, risco de contorno inseguro sob pressão de prazo | Média | **Não** para o Lote 1 (nenhum deploy real ainda); **sim** para qualquer deploy real de ambiente com estes segredos antes de resolvido | DevOps (implementa) + DevSecOps (acompanha) | Antes do primeiro deploy real em staging |
| Gestão de chave de `pgp_sym_encrypt` em runtime | Requisito antecipado (não é achado sobre código já escrito) — a chave de criptografia de coluna deve vir do secret manager/KMS quando a primeira tarefa de runtime escrever CPF | — (requisito, não achado) | — | Backend (na tarefa que implementar) | Antes da primeira tarefa que persistir CPF via aplicação (fora deste lote) |

**Nenhum achado de severidade Alta/Crítica identificado neste lote.**

### 6. Requisitos de segurança operacional para o DevOps (Lote 1)

1. Resolver `SEC-DEBT-002` (decompor `DATABASE_CREDENTIALS`/`REDIS_AUTH` do
   Secrets Manager nas variáveis de ambiente planas que `redis-config.ts`/
   `DatabaseModule` esperam) antes do primeiro deploy real de `staging`.
2. Confirmar, no primeiro deploy real que conectar `ObjectStorageService` a
   um bucket de verdade, o comportamento de expiração de URL assinada
   (`QA-DEBT-016`) — checagem manual pontual, não precisa de automação nova.
3. Manter a disciplina já observada nesta auditoria (nenhuma regressão
   esperada, só reforço): nenhuma credencial literal em `environment` de
   task definition do ECS — sempre via `secrets`/`valueFrom`; bucket sempre
   com as 4 flags de `public_access_block`; RDS/Redis sempre
   `publicly_accessible = false`/em subnet de dados sem rota de saída à
   internet.
4. Confirmar (fora do alcance desta sessão local) que os jobs
   `dependency-scan-backend`/`dependency-scan-frontend` de
   `security-scan.yml` estão de fato rodando (não mais em no-op) e verdes
   para os commits deste lote — `SEC-DEBT-001`.

### 7. Sinalização ao CTO (registro, não pré-requisito do veredito abaixo)

Nenhum achado deste lote tem relevância estratégica que exija decisão de
negócio — todos são técnicos/operacionais, dentro da autoridade de resolução
do Backend/DevOps/Tech Lead conforme já atribuído na tabela da Seção 5.
Sinalizo ao CTO, apenas como registro informativo (nenhuma decisão pendente
dele para este lote):

- `SEC-DEBT-002` é meramente um lembrete de que o "acompanhamento não
  bloqueante" de gestão de segredos, registrado no cabeçalho de
  `GUARDRAILS.md` desde o Gate 3, já tem primeira evidência concreta
  (positiva na maior parte — Secrets Manager, KMS, `random_password`, nunca
  literal em `.tf` — com um ponto de wiring a fechar) — não é um novo risco
  de compliance, é a validação tática que `GUARDRAILS.md` já esperava do
  DevSecOps.
- A gestão de chave de criptografia de coluna para `pgcrypto` (CPF, e
  futuramente qualquer outro identificador sensível) precisará de uma
  decisão formal de KMS/rotação antes da primeira tarefa de runtime que
  escrever CPF de verdade — não é urgente agora (fora do escopo deste lote),
  mas registro a expectativa de que apareça como requisito explícito de
  arquitetura/`GUARDRAILS.md` antes de BE-XX (cadastro real).

### 8. Veredito do Lote 1

**Aprovado com débito registrado.**

- Nenhum achado de severidade Alta/Crítica em aberto.
- Nenhum achado de compliance obrigatório (LGPD) pendente de resolução —
  tudo o que existe hoje (CPF via `pgcrypto`) está corretamente implementado
  no nível de schema; os pontos de atenção de compliance identificados são
  requisitos antecipados para tarefas futuras, não lacunas do que já foi
  entregue.
- 4 débitos de severidade Baixa/Média registrados (Seção 5), todos com dono e
  prazo, nenhum com prazo vencido nesta data, nenhum reclassificado para
  Alta/Crítica.
- Requisito de maior severidade deste lote — nenhuma URL pública permanente
  de Object Storage, nenhuma região fora do Brasil, nenhum segredo hardcoded,
  nenhuma implementação prematura de sessão via JWT — confirmado sem exceção.

**Liberação**: do ponto de vista de DevSecOps, nenhum bloqueio de deploy
originado nesta auditoria para o Lote 1. Lotes 2 e 3, que dependem do Lote 1,
seguem liberados (mesma leitura já registrada por QA em `QA-REPORT.md`
Seção 4.8) — a auditoria de segurança completa (5 skills, não apenas o
scanning contínuo) do Lote 3 (quando fechar) deve dar atenção reforçada a
`SEC-DEBT-002` caso BE-03/BE-04/BE-14 já conectem a aplicação a um ambiente
real de Redis/Postgres antes desse débito ser resolvido pelo DevOps.

---

## Lote 3 — Segurança de Multi-tenancy (Guard de Aplicação + RLS + Teste de Vazamento)

**Tarefas no escopo** (`TASK.md` §4.1.1): BE-03 (Guard de aplicação
obrigatório de `tenant_id` + políticas RLS por tabela), BE-04 (Teste
automatizado de vazamento cruzado entre tenants — condição do Gate 2 do CTO).
Sem tarefas de Frontend neste lote.

**Gatilho de validação**: `QA-REPORT.md` Seção 5.6, veredito **Aprovado**
(2026-09-03) para o Lote 3 — as 2 tarefas confirmadas `Concluído` em
`TASK.md`, nenhum bug de severidade Alta/Crítica em aberto (os dois únicos
encontrados no histórico da tarefa, `QA-BUG-001` e `QA-BUG-002`, corrigidos e
revalidados empiricamente em 3 rodadas — Seções 1.6-1.6.2 — e reconfirmados
sem regressão no fechamento por lote — Seções 5.2-5.4), nenhum débito de
severidade Baixa/Média em aberto (`QA-DEBT-012` fechado com cobertura de
regressão permanente).

**Referências de arquitetura usadas nesta auditoria**: `SDD.md` §7.4
(isolamento multi-tenant); ADR-004 (multi-tenancy); ADR-006 (PostgreSQL/RLS —
risco nomeado explicitamente, "RLS mal configurado gera falso senso de
segurança — nunca a única camada"); ADR-009 (log de auditoria imutável,
privilégio de banco restrito + hash chain, RN-08/rigor LGPD); `GUARDRAILS.md`
Seção A completa (itens 1-5, "a regra de maior severidade deste projeto",
aplicável pela primeira vez de forma plena — a auditoria do Lote 1 declarou
Seções A/B/C "não se aplicam plenamente ainda" por BE-03/BE-04 estarem fora
de escopo), item 16-18 (Seção D — PostgreSQL/`pgcrypto`/`AUDIT_EVENT`
append-only), item 28 (Seção F — `CONSENT_RECORD` e log de auditoria
append-only por design), itens 37-39 (Seção J — governança de exceção a
regra); `CTO-REVIEW.md` Gate 2 (`risk-and-compliance-check`, condição não
negociável do teste de vazamento cruzado); `QA-REPORT.md` Seções 1.6, 1.6.1,
1.6.2, 1.11 e 5 (histórico completo de `QA-BUG-001`/`QA-BUG-002` e do
fechamento por lote).

**Código revisado**: `backend/src/database/` (`tenant-scoped.repository.ts`,
`tenant-context.ts`, `database.module.ts`, `kysely-connection.ts`,
`provide-tenant-scoped-repository.ts`, `index.ts`, `domain-tables.ts`),
`backend/src/tooling/eslint-rules/` (`no-raw-kysely-outside-database-rule.js`,
`no-kysely-connection-token-outside-database-rule.js`),
`backend/eslint.config.mjs`, `backend/migrations/1788336900000_create-app-
database-role.ts`, `backend/migrations/1788336960000_enable-row-level-
security.ts`, `backend/migrations/1788336660000_create-audit-events-
table.ts`, `backend/migrations/1788336360000_create-consent-records-
table.ts`, `backend/test/database/tenant-guard-and-rls.e2e-spec.ts`,
`backend/test/database/tenant-cross-leak-exhaustive.e2e-spec.ts`,
`backend/docs/tenant-guard-and-rls.md`, `.github/workflows/backend-ci.yml`
(job `tenant-isolation-test`), `backend/.env.example`, e — como contexto de
requisito operacional para o DevOps — `infra/modules/secrets/`
(`main.tf`/`outputs.tf`) e `infra/environments/{staging,production}/main.tf`
(wiring de `APP_DATABASE_URL`, resolução de `SEC-DEBT-002` para o componente
de banco).

### 1. `static-security-analysis` (revisão pontual, escopo deste lote)

Não reconfigurado — em vigor desde o início do repositório, conforme já
registrado na auditoria do Lote 1. Verificação substituta desta rodada,
restrita aos diretórios deste lote:

- Varredura manual por padrão perigoso (`eval(`, `child_process`, `new
  Function(`, execução de SQL não parametrizado fora de `runOnTable`) em
  `backend/src/database/` — **nenhuma ocorrência**. Toda montagem de query
  usa o query builder do Kysely (`sql` tagged template só para
  `set_config`, com bind parameter, nunca concatenação de string).
- Varredura manual por log de dado sensível (`console.*`/`Logger`) em
  `backend/src/database/` — **nenhuma ocorrência** (nenhuma superfície de
  logging implementada ainda nesta camada).
- Nenhuma credencial hardcoded nas duas novas migrations de role/RLS —
  `APP_DB_ROLE_PASSWORD` lido de `process.env`, com default de
  desenvolvimento explicitamente documentado como tal
  (`portalmed_app_dev_only_change_me`), mesmo padrão já aceito na auditoria
  do Lote 1.
- **Confirmação de `SEC-DEBT-002` (Lote 1) para o componente de banco**:
  `infra/modules/secrets/main.tf` agora expõe `app_database_url` (connection
  string completa pronta, role `portalmed_app`) e `app_db_role_password`
  como segredos dedicados no Secrets Manager (KMS, `random_password`, nunca
  literal em `.tf`), e `infra/environments/production/main.tf` (linha 225)
  referencia `module.secrets.app_database_url_arn` via `value_from` na task
  definition do ECS — exatamente a variável de ambiente plana
  (`APP_DATABASE_URL`) que `DatabaseModule` espera. **Débito resolvido em
  código para o componente de banco** — reduz o escopo aberto de
  `SEC-DEBT-002` (o componente Redis segue conforme já registrado no Lote 1).
- Recomendação já registrada no Lote 1 mantida: confirmar diretamente no
  GitHub Actions (fora do alcance desta sessão local) que `secret-scan`/
  `sast` estão verdes para os commits deste lote — não é um novo achado,
  segue coberto por `SEC-DEBT-001`.

### 2. `security-requirement-validation`

| Requisito | Fonte | Verificação | Resultado |
|---|---|---|---|
| Toda tabela de domínio com `tenant_id NOT NULL` desde a primeira migration | GUARDRAILS A.1 | Já confirmado na auditoria do Lote 1 (BE-02); reconfirmado nesta rodada por leitura de `domain-tables.ts` sem alteração desde então | **Atendido** |
| Guard de aplicação estrutural — nenhuma query de repositório sem `tenant_id` do contexto, sem exceção | GUARDRAILS A.2 | `tenant-scoped.repository.ts` lido linha a linha: `#db`/`#runOnTable` são campos/métodos privados **nativos** do JavaScript (não `private` do TypeScript, correção de `QA-BUG-001`); construtor recebe a conexão como `unknown`, nunca via `@Inject(KYSELY_CONNECTION)` (correção de `QA-BUG-002`); `KYSELY_CONNECTION` não é reexportado por `index.ts` (barrel público) — confirmado por leitura direta, não exportado entre os símbolos públicos; único ponto de resolução do token é `provide-tenant-scoped-repository.ts`, inteiramente dentro de `src/database/`. Tentei, de forma independente das três rodadas de QA, identificar um **quarto** vetor de bypass além dos dois já fechados e do vetor residual de deep-import (já classificado por QA como `QA-DEBT-012`, defesa CI-only aceita) — não encontrei nenhum: o construtor não expõe `Kysely` como tipo (`connection: unknown`), a regra `no-raw-kysely-outside-database` bloqueia import de `kysely`/`pg` fora de `src/database/`, e a regra `no-kysely-connection-token-outside-database` cobre import direto, renomeado e deep-import do token. Nenhum outro arquivo do projeto cria uma segunda instância de `pg.Pool`/`Kysely` (`createKyselyConnection` só é chamada por `database.module.ts`, confirmado por grep) | **Atendido** — nenhum novo vetor de bypass estrutural encontrado nesta auditoria, além do vetor residual já conhecido e aceito (`QA-DEBT-012`, defesa em CI, não estrutural, mesmo padrão já validado para os outros dois vetores de import direto) |
| RLS como segunda camada, independente, habilitado em toda tabela de domínio | GUARDRAILS A.3 | `1788336960000_enable-row-level-security.ts`: `ENABLE`/`FORCE ROW LEVEL SECURITY` + política `USING`/`WITH CHECK` restrita à role `portalmed_app` (não `PUBLIC`), expressão `tenant_id = current_setting('app.tenant_id', true)::uuid` — `missing_ok=true` faz a ausência da variável de sessão resultar em `NULL`, e `tenant_id = NULL` nunca é verdadeiro (falha fechada). `1788336900000_create-app-database-role.ts` cria `portalmed_app` sem `bypassrls`/superusuário (confirmado por leitura; `node-pg-migrate` não expõe a flag, omitir já resulta em `NOBYPASSRLS`, comentário explícito no código evita reintrodução futura). Não repeti neste ciclo o ataque manual via `psql` contra um Postgres avulso — já realizado e documentado de forma independente por QA em 3 rodadas distintas (Seções 1.6, 1.6.1, 5.1), com resultado idêntico a cada rodada e nenhuma migration de RLS alterada desde então (`git log` confirmado por QA na Seção 5.2); esta auditoria se apoia nessa evidência empírica repetida somada à leitura direta e confirmada do código atual da migration, registrando essa escolha por transparência | **Atendido** |
| Suíte automatizada de vazamento cruzado bloqueante no CI, condição do Gate 2 do CTO | GUARDRAILS A.4 | `.github/workflows/backend-ci.yml`: job `tenant-isolation-test` roda `npm run test:tenant-isolation` (aponta exatamente para `tenant-cross-leak-exhaustive.e2e-spec.ts`), `needs: lint-and-test`, é pré-requisito de `build-and-push` — confirmado por leitura direta nesta rodada, sem alteração desde a validação de QA (Seção 5.3). Mesma ressalva de QA registrada, não específica deste lote: se o check está configurado como *required status check* nas regras de proteção de branch do GitHub não é verificável a partir do filesystem desta sessão | **Atendido** (com a mesma ressalva de verificação de branch protection já registrada por QA, não específica de segurança de código) |
| `AUDIT_EVENT` append-only — role de banco da aplicação nunca recebe `GRANT UPDATE`/`GRANT DELETE`, apenas `INSERT`/`SELECT` | GUARDRAILS D.18, ADR-009 | **Ver achado de severidade Alta abaixo (`SEC-BUG-001`)** | **NÃO Atendido** |
| `CONSENT_RECORD` append-only — nenhuma operação de `UPDATE`/`DELETE` possível sobre consentimento já registrado | GUARDRAILS F.28 | **Mesmo achado — ver `SEC-BUG-001` abaixo, a mesma causa raiz atinge as duas tabelas** | **NÃO Atendido** |
| RBAC/ownership validado no backend (não só frontend) | GUARDRAILS B.10 | Fora do escopo funcional deste lote — nenhuma sessão/RBAC real ainda (BE-14/BE-16, `A Fazer`). Mesma leitura já validada por QA como decisão de escopo aceitável ("guard existe e é testado" não é "sessão popula o guard") — não gera achado | Não aplicável ainda (requisito antecipado para BE-14/BE-16, não lacuna deste lote) |

#### Achado de severidade Alta (`SEC-BUG-001`) — role de runtime com privilégio excessivo em `audit_events` e `consent_records`, violando GUARDRAILS.md D.18/F.28 (ADR-009, RN-08/RN-02 — LGPD)

**O que a documentação afirma** (`backend/docs/tenant-guard-and-rls.md`,
linhas 177-183): que o privilégio de `portalmed_app` é "`SELECT`/`INSERT`/
`UPDATE`/`DELETE` em toda tabela de `DOMAIN_TABLES` — **exceto** a restrição
de `audit_events` (nunca `GRANT UPDATE/DELETE`, ADR-009/GUARDRAILS.md item
18)". A redação afirma a exceção como se já estivesse em vigor.

**O que este agente verificou, por leitura direta e literal da migration que
efetivamente concede o privilégio** (`backend/migrations/1788336900000_
create-app-database-role.ts`, linhas 64-68):

```ts
pgm.grantOnTables({
  tables: [...DOMAIN_TABLES],
  privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  roles: APP_ROLE,
});
```

`DOMAIN_TABLES` (`domain-tables.ts`) inclui `audit_events` **e**
`consent_records` sem nenhuma exclusão — não há, em nenhum ponto desta
migration nem em nenhuma outra do repositório, uma chamada
`revokeOnTables`/`REVOKE` restringindo `UPDATE`/`DELETE` nessas duas tabelas
especificamente (confirmado por `grep` de `audit_events`/`revoke`/`REVOKE`
em todo `backend/migrations/`, único resultado é a chamada genérica de
`down()` que apenas desfaz o `grantOnTables` de cima, simetricamente). **A
afirmação da documentação de que a exceção de `audit_events` já está em
vigor é factualmente incorreta** para o estado atual do código — o mesmo
padrão de "documentação descreve uma garantia que o código não cumpre" que
motivou `QA-BUG-001`/`QA-BUG-002` a severidade Alta, agora em uma camada de
defesa diferente (privilégio de banco, não guard de aplicação/RLS).

O comentário da própria migration (linhas 58-63) e das migrations que criam
as duas tabelas (`1788336660000_create-audit-events-table.ts`, linhas 16-18;
`1788336360000_create-consent-records-table.ts`, linhas 8-11) **reconhecem
explicitamente** que a restrição é exigida por `GUARDRAILS.md` itens 18/28
(ADR-009) e **deferem** a correção, respectivamente, para BE-29 (auditoria/
hash chain) e BE-19 (persistência de consentimento) — nenhuma das duas
tarefas está `Concluído` em `TASK.md`. Esse deferimento:

1. **Não segue o processo de governança que `GUARDRAILS.md` regras 37-39
   exigem** para qualquer divergência entre o código e uma regra da Seção D/F
   — nenhuma entrada em `BLOCKERS.md` foi aberta, nenhuma exceção temporária
   com `Validade` foi aprovada pelo CTO no "Log de Alterações" de
   `GUARDRAILS.md` (confirmado por leitura direta — a única entrada existente
   é a de `QA-DEBT-006`/Bloqueio 003, sobre a regra A.5, não relacionada).
   É exatamente o mesmo tipo de lacuna de processo que o próprio CTO já
   sinalizou como "lembrete... para qualquer implementação futura que colida
   com uma regra de maior severidade" ao resolver o Bloqueio 003 — aqui
   reincidente, em regras de severidade equivalente (D.18/F.28 não estão na
   Seção A, mas ambas são regras não-negociáveis do documento, com
   fundamento direto em LGPD via RN-08/RN-02).
2. **Não tem nenhuma camada compensatória hoje.** Diferente de
   `QA-BUG-001`/`QA-BUG-002` (onde a RLS conteve o impacto real do bypass do
   guard, porque a query executada não tinha `app.tenant_id` válido), aqui a
   política RLS (`tenant_isolation_policy`) **não protege contra este risco
   especificamente**: a expressão `USING`/`WITH CHECK` só restringe **quais
   linhas** são visíveis/alteráveis por tenant — nunca restringe **o tipo de
   operação** (`UPDATE`/`DELETE` continuam permitidos pela política, desde
   que dentro do tenant correto). Um `UPDATE`/`DELETE` sobre uma linha de
   `audit_events`/`consent_records` do próprio tenant, dentro de um
   `TenantContext.run()` legítimo, passaria livremente pela RLS — a única
   camada que poderia impedir a operação em si (privilégio de banco) é
   exatamente a que está ausente. O hash chain (a segunda mitigação prevista
   por ADR-009 para detectar adulteração por acesso administrativo direto)
   também não existe ainda (`hash_evento_anterior` é uma coluna reservada,
   sem lógica de preenchimento, conforme o próprio comentário da migration de
   `audit_events`). **Hoje, nenhuma das duas camadas de defesa que ADR-009
   nomeia para a garantia de imutabilidade existe** — não é um vetor
   "contido por outra camada", é uma garantia genuinamente ausente.
3. **Nenhum teste cobre esta restrição.** `tenant-guard-and-rls.e2e-spec.ts`
   e `tenant-cross-leak-exhaustive.e2e-spec.ts` testam isolamento entre
   tenants (que uma sessão do tenant A não acesse dado do tenant B) — não
   testam se a role `portalmed_app` tem ou não privilégio de `UPDATE`/
   `DELETE` sobre uma tabela específica, independente de tenant. Confirmado
   por leitura dos dois arquivos: nenhuma consulta a `information_schema.
   role_table_grants`/`has_table_privilege` existe em nenhum dos dois specs.
4. **Compliance obrigatório, não requisito antecipado.** Diferente do caso
   de gestão de chave de `pgcrypto` (Lote 1, tratado corretamente como
   "requisito antecipado para tarefa futura", porque nada havia sido
   configurado incorretamente ainda), aqui **algo já foi configurado, e
   configurado em desacordo com a regra** — a migration que concede o
   privilégio (`1788336900000_create-app-database-role.ts`) é entregável do
   próprio BE-03, dentro do escopo deste lote. `GUARDRAILS.md` item 28 liga
   `CONSENT_RECORD` diretamente a RN-02 (consentimento específico de dado de
   saúde, Art. 11, I, LGPD) e item 18/ADR-009 liga `AUDIT_EVENT` a RN-08
   ("exigência direta de rigor LGPD (R3)... para servir de evidência em
   fiscalização"). Por guardrail deste agente, achado de compliance
   obrigatório não vira débito registrado — precisa estar resolvido antes da
   aprovação do lote.

**Por que severidade Alta, não Média**: (a) violação direta de duas regras
não-negociáveis do `GUARDRAILS.md`, sem exceção aprovada pelo CTO; (b)
fundamento de compliance obrigatório (LGPD, RN-02/RN-08), não apenas
hardening técnico; (c) nenhuma camada compensatória ativa hoje (diferente de
`QA-BUG-001`/`QA-BUG-002`, onde a RLS efetivamente conteve o risco real —
aqui não há contenção alguma); (d) documentação do próprio projeto afirma
uma garantia que não existe, o mesmo padrão de "falso senso de segurança"
que ADR-006 nomeia e que já justificou severidade Alta duas vezes no
histórico deste mesmo lote; (e) a correção é pequena e não depende da lógica
de negócio completa de BE-19/BE-29 (hash chain, fluxo de consentimento) —
é uma restrição de privilégio de banco, isolada e imediata.

**Correção recomendada ao Backend** (não prescritiva sobre a forma exata):
em `1788336900000_create-app-database-role.ts`, excluir `audit_events` e
`consent_records` do `grantOnTables` genérico de `UPDATE`/`DELETE` — conceder
`SELECT`/`INSERT` a essas duas tabelas separadamente, e `SELECT`/`INSERT`/
`UPDATE`/`DELETE` apenas às 11 tabelas de domínio restantes; ou manter o
`grantOnTables` genérico e adicionar um `revokeOnTables` subsequente restrito
a `['UPDATE', 'DELETE']` para as duas tabelas. Nenhuma das duas formas exige
esperar por BE-19/BE-29 — a lógica de hash chain/versionamento de
consentimento continua sendo escopo dessas tarefas futuras, só a restrição de
privilégio (já prevista e exigida desde a criação das duas tabelas, BE-02)
precisa acompanhar a migration que efetivamente concede privilégio à role
(BE-03). Recomenda-se também um teste de regressão permanente (mesmo padrão
de rigor de `QA-DEBT-012`) verificando `has_table_privilege('portalmed_app',
'audit_events', 'UPDATE')`/`'DELETE'` = `false` (e o mesmo para
`consent_records`), incorporado a `tenant-guard-and-rls.e2e-spec.ts` — para
que uma futura reescrita desta migration (por BE-19/BE-29) não reintroduza o
privilégio por descuido. Corrigir também a redação de
`backend/docs/tenant-guard-and-rls.md` (linhas 177-183) para não afirmar uma
exceção que ainda não existe no código.

### 3. `compliance-validation` (LGPD, nível de implementação)

- **`AUDIT_EVENT` (RN-08) e `CONSENT_RECORD` (RN-02)**: ver `SEC-BUG-001`
  acima — achado de compliance obrigatório, não resolvido, não pode virar
  débito registrado por guardrail deste agente. Ambas as entidades têm
  fundamento direto em LGPD (evidência para fiscalização e consentimento
  específico de dado de saúde, respectivamente) nomeado explicitamente em
  ADR-009/`GUARDRAILS.md`.
- **Isolamento multi-tenant como garantia de confidencialidade entre
  hospitais (controladores de dados distintos)**: embora não seja um
  requisito LGPD nomeado explicitamente como tal em `SDD.md`/ADR-004, a
  segregação de dado entre tenants é a garantia estrutural que impede um
  hospital de acessar dado pessoal/de saúde de paciente de outro hospital —
  validada de forma exaustiva por BE-04 (não amostral, 13 tabelas × 4
  operações × 3 camadas) e reconfirmada sem regressão nesta auditoria (ver
  Seção 2 acima). Nenhum achado de compliance pendente nesta frente.
- **Nenhuma coleta/exposição de novo dado pessoal neste lote** — BE-03/BE-04
  são infraestrutura de acesso a dado (guard, RLS, teste), não introduzem
  novo campo/fluxo de coleta.

**Veredito de compliance para o Lote 3**: **1 achado de compliance
obrigatório pendente de resolução** (`SEC-BUG-001`, RN-02/RN-08) — impede
veredito de aprovação incondicional do lote, conforme guardrail deste
agente ("nunca aprova um build com achado de compliance obrigatório não
resolvido").

### 4. `sensitive-data-exposure-check`

- **Nenhuma credencial hardcoded** nas migrations/módulo de banco deste
  lote — confirmado por leitura linha a linha (mesma conclusão da Seção 1).
- **Nenhum log de dado sensível** — nenhuma superfície de logging existe
  ainda em `src/database/`.
- **`SEC-BUG-001` não é, em si, um achado de exposição de dado** — é um
  achado de integridade/controle de acesso (privilégio excessivo permite
  alteração/exclusão indevida, não leitura indevida) — por isso classificado
  em `security-requirement-validation`/`compliance-validation` acima, e
  apenas referenciado aqui por completude, sem duplicar a análise.
- **Nenhuma nova superfície de payload de API neste lote** (BE-03/BE-04 não
  expõem endpoint HTTP) — nada a verificar contra `API-CONTRACT.yaml` nesta
  rodada; `API-CONTRACT.yaml` segue não publicado no repositório
  (confirmado, mesma leitura já registrada por QA em validações anteriores),
  sem impacto neste lote especificamente por não haver payload de API a
  auditar aqui.

### 5. `finding-severity-classification` — consolidação

| ID | Achado | Severidade | Bloqueia deploy? | Dono | Prazo |
|---|---|---|---|---|---|
| `SEC-BUG-001` (novo) | Role de runtime `portalmed_app` recebe `GRANT UPDATE`/`GRANT DELETE` em `audit_events` e `consent_records` (`create-app-database-role.ts`), violando `GUARDRAILS.md` D.18/F.28 (ADR-009, RN-08/RN-02 — LGPD); nenhuma camada compensatória ativa hoje (RLS não restringe tipo de operação; hash chain de ADR-009 não implementado); documentação (`tenant-guard-and-rls.md`) afirma incorretamente que a exceção de `audit_events` já está em vigor; nenhum teste cobre a restrição; deferimento a BE-19/BE-29 feito sem seguir o processo de exceção de `GUARDRAILS.md` regras 37-39 | **Alta** | **Sim** | Backend (corrige a migration de privilégio + doc) | Antes do próximo deploy deste lote; correção é isolada (privilégio de banco), não depende de BE-19/BE-29 completas |

**Nenhum achado de severidade Baixa/Média novo identificado neste lote** —
todos os demais pontos verificados (guard de aplicação, RLS, CI bloqueante,
wiring de secrets) confirmados corretos, sem débito a registrar.

### 6. Requisitos de segurança operacional para o DevOps (Lote 3)

1. **Não aplicar deploy deste lote a nenhum ambiente com tráfego real
   enquanto `SEC-BUG-001` estiver aberto** — o privilégio excessivo já existe
   no schema a partir do momento em que a migration `1788336900000_create-
   app-database-role.ts` roda contra qualquer ambiente (dev/staging/
   produção); não é uma questão de código de aplicação não usar o
   privilégio — o privilégio em si já é a lacuna.
2. Confirmado nesta auditoria: `SEC-DEBT-002` (Lote 1) está resolvido em
   código para o componente de banco — `APP_DATABASE_URL` chega ao ECS via
   `value_from` apontando para um secret dedicado do Secrets Manager (KMS,
   `random_password`), nunca como variável de ambiente literal. Nenhuma ação
   adicional do DevOps necessária para este ponto específico.
3. Quando `SEC-BUG-001` for corrigido, a migration de correção (`REVOKE`/
   `grantOnTables` ajustado) precisa rodar em qualquer ambiente onde a
   migration original já tenha sido aplicada — não é uma migration nova
   independente, é uma correção que deve ser aplicada em sequência (o
   próprio Backend define o mecanismo exato, mas o DevOps deve estar ciente
   de que o pipeline de migration precisa rodar novamente após a correção,
   não apenas o deploy da aplicação).
4. Sem novo requisito de rede/firewall/hardening de infraestrutura
   introduzido por este lote — BE-03/BE-04 são inteiramente internos ao
   monolito core (guard de aplicação + RLS no mesmo Postgres já provisionado
   pelo Lote 1), sem novo componente de infraestrutura.

### 7. Sinalização ao CTO (registro, em paralelo — não pré-requisito do bloqueio já aplicado por este agente)

- **`SEC-BUG-001` já bloqueia o deploy deste lote por decisão deste agente**
  (achado de severidade Alta, dentro da autoridade de bloqueio do DevSecOps)
  — esta sinalização ao CTO é registro, não uma solicitação de confirmação
  prévia.
- **Relevância estratégica para o CTO avaliar** (decisão de processo, não
  só técnica): esta é a **segunda vez** neste projeto que uma implementação
  diverge de uma regra não-negociável de `GUARDRAILS.md` sem passar pelo
  processo de exceção das regras 37-39 antes de avançar — a primeira foi
  `QA-DEBT-006`/Bloqueio 003 (regra A.5, resolvida retroativamente pelo CTO,
  tecnicamente correta apesar do processo pulado). Neste caso (`SEC-BUG-001`)
  a situação é distinta e mais severa: não é uma correção técnica melhor que
  a leitura literal (como foi o caso de A.5) — é uma lacuna real, sem
  cobertura compensatória, sobre uma garantia com fundamento direto em LGPD
  (RN-02/RN-08). Registra-se ao CTO como um segundo ponto de dado sobre o
  mesmo padrão de processo (deferimento unilateral de exceção a regra da
  Seção D/F sem `BLOCKERS.md`), para avaliação de se algum reforço de
  processo (ex.: checklist explícito de "toda migration que concede
  privilégio de role revisa as exceções de D.18/F.28 antes de rodar") é
  necessário — decisão de processo do CTO/Tech Lead, não deste agente.
- Nenhuma outra questão de relevância estratégica identificada neste lote —
  os demais itens verificados (guard estrutural, RLS, CI bloqueante,
  wiring de secrets) estão tecnicamente corretos, dentro da autoridade de
  resolução usual de Backend/DevOps.

### 8. Veredito do Lote 3

**Reprovado — bloqueado por 1 achado de severidade Alta (`SEC-BUG-001`).**

- **1 achado de severidade Alta em aberto** — role de runtime com privilégio
  de `UPDATE`/`DELETE` em `audit_events`/`consent_records`, violando
  `GUARDRAILS.md` D.18/F.28 (ADR-009, fundamento LGPD RN-08/RN-02), sem
  camada compensatória ativa, sem exceção aprovada pelo CTO. Bloqueia deploy
  por decisão deste agente, dentro da autoridade de bloqueio do DevSecOps —
  não depende de confirmação prévia do CTO (sinalizado a ele em paralelo,
  Seção 7).
- **Todos os demais itens auditados estão corretos**: o guard de aplicação
  de `tenant_id` é genuinamente estrutural contra todo vetor de bypass
  razoável verificado nesta auditoria (nenhum vetor novo encontrado além do
  já conhecido e aceito `QA-DEBT-012`); a RLS está configurada corretamente
  como segunda camada independente (falha fechada, `WITH CHECK`, role sem
  `bypassrls`/superusuário); a suíte de vazamento cruzado (BE-04) é
  exaustiva (não amostral) e bloqueante no CI; nenhum segredo exposto
  incorretamente (`SEC-DEBT-002` resolvido em código para o componente de
  banco).
- **Nenhum débito de severidade Baixa/Média novo a registrar** — o único
  achado desta auditoria é bloqueante, não um débito.
- Requisito de maior severidade deste projeto (isolamento multi-tenant,
  `GUARDRAILS.md` Seção A) — a parte auditada explicitamente nesta rodada
  (guard + RLS + teste de vazamento) está confirmada sem exceção; o achado
  que reprova este lote é de uma regra diferente (D.18/F.28, imutabilidade
  de log de auditoria/consentimento), não de isolamento entre tenants.

**Liberação**: **bloqueada** para o componente de banco deste lote até
`SEC-BUG-001` ser corrigido pelo Backend e revalidado por este agente — a
correção é isolada e rápida (ajuste de privilégio em uma migration já
existente, sem dependência de BE-19/BE-29 completas), não deve represar o
cronograma do lote. Escalado ao Backend via `BLOCKERS.md` (Bloqueio 004).
Nenhuma tarefa de módulo de domínio (BE-10+) que grave em `audit_events`/
`consent_records` deve ser considerada seguramente pronta para produção
enquanto este achado estiver aberto — tarefas de domínio que não tocam essas
duas tabelas especificamente não são impactadas pela parte técnica deste
achado (o guard/RLS geral segue confirmado correto), mas o veredito de lote
como um todo permanece Reprovado até a correção.

### 9. Revalidação de `SEC-BUG-001` (devsecops, 2026-09-04)

Revalidação pontual e independente da correção aplicada pelo Backend
(nota de correção pós-implementação de BE-03/BE-04, `TASK.md`, 2026-09-03),
não uma reauditoria completa do lote — as demais 4 skills já haviam sido
executadas na auditoria original (Seções 1-8 acima) e não encontraram
outro achado além deste.

**Verificação por leitura direta de código** (não apenas o relato do
Backend):

1. `backend/migrations/1788336900000_create-app-database-role.ts` lido
   linha a linha: `DOMAIN_TABLES` (13 tabelas) agora é particionada em
   `APPEND_ONLY_TABLES` (`audit_events`, `consent_records`) e
   `FULL_PRIVILEGE_DOMAIN_TABLES` (as 11 restantes, via `.filter()` sobre
   a mesma fonte única de verdade). `up()` concede `['SELECT', 'INSERT']`
   às duas tabelas append-only e `['SELECT', 'INSERT', 'UPDATE', 'DELETE']`
   às 11 demais; `down()` reverte simetricamente, na ordem inversa correta.
   Nenhuma regressão de escopo oposto (as 11 tabelas não perderam
   privilégio).
2. `backend/docs/tenant-guard-and-rls.md` (linhas ~163-195): redação
   corrigida — não afirma mais uma exceção que não existia; documenta
   `SEC-BUG-001`, a correção aplicada e referencia o teste de regressão
   permanente.
3. `backend/test/database/tenant-guard-and-rls.e2e-spec.ts`, bloco
   `[SEC-BUG-001]` (linhas 523-681) lido por completo: `has_table_privilege`
   confirma `SELECT`/`INSERT` = `true` e `UPDATE`/`DELETE` = `false` para as
   2 tabelas append-only, e privilégio completo mantido para as 11 demais
   (nenhuma regressão de escopo oposto, verificado também por teste, não só
   pela migration). Tentativa real de `UPDATE`/`DELETE`/`INSERT`/`SELECT`
   via `pg.Client` cru como `portalmed_app` sobre linhas reais de
   `audit_events`/`consent_records`: `SELECT`/`INSERT` funcionam,
   `UPDATE`/`DELETE` são rejeitados com `rejects.toThrow(/permission
   denied/i)` — o erro vem do próprio Postgres (checagem de `GRANT`), não de
   RLS nem de validação de aplicação.
4. `backend/test/database/tenant-cross-leak-exhaustive.e2e-spec.ts`:
   reparticionamento em `MUTATION_CAPABLE_TABLES` (11 tabelas, mantém a
   asserção original "operação roda mas afeta 0 linhas", contenção via RLS)
   e `APPEND_ONLY_TABLES` (2 tabelas, nova asserção
   `rejects.toThrow(/permission denied/i)`) confirmado nas 3 Camadas onde
   aplicável (Camada 1 — guard+RLS via `portalmed_app`; Camada 3 — RLS
   sozinha via `pg.Client` cru como `portalmed_app`). **Camada 2 (conexão
   do superusuário do container) permanece com `it.each(DOMAIN_TABLES)`
   sem alteração** — correto: superusuário sempre ignora verificação de
   `GRANT`, do mesmo jeito que já ignora RLS, então não haveria erro de
   permissão a esperar ali.
5. Grep por `audit_events`/`consent_records` em `backend/migrations/` e
   `backend/src/database/`: nenhum outro ponto do repositório concede
   privilégio de banco a essas tabelas por outro caminho — os únicos
   arquivos de migration que as referenciam são as próprias migrations de
   criação das tabelas (`1788336660000_create-audit-events-table.ts`,
   `1788336360000_create-consent-records-table.ts`, que não fazem
   `GRANT`/`REVOKE`) e a migration de role já revisada no item 1;
   `backend/src/database/` não contém nenhum `GRANT`/privilege management
   (a camada de acesso a dado ali é só Kysely/repositório, sem DDL/DCL).

**Reexecução independente da suíte (não apenas leitura)** — ambiente
suporta Docker/testcontainers, então rodei as suítes eu mesmo em vez de só
confiar no relato do Backend:

- `npx vitest run --config ./vitest.config.e2e.ts test/database/tenant-guard-and-rls.e2e-spec.ts`
  → **48 testes, todos passando** (inclui o bloco `[SEC-BUG-001]` completo).
- `npm run test:tenant-isolation` (`tenant-cross-leak-exhaustive.e2e-spec.ts`)
  → **158 testes, todos passando** (mesma contagem reportada pelo Backend,
  confirmando que o reparticionamento preservou a cobertura total).
- `npm run test:e2e` (suíte completa) → **268 testes, todos passando**
  (o Backend reportou 264; a diferença de 4 não afeta a conclusão desta
  revalidação — todos os testes relacionados a `SEC-BUG-001` estão entre os
  268 e passam; a suíte completa está verde sem nenhuma falha, então a
  contagem residual não é um sinal de regressão de segurança).

**Nenhum achado residual.** A correção elimina o privilégio de `UPDATE`/
`DELETE` no nível de banco (não apenas de aplicação), com teste de
regressão permanente em duas suítes independentes, sem regressão de escopo
nas 11 tabelas restantes e sem efeito colateral na Camada 2 da suíte de
BE-04.

**Veredito final do Lote 3: Aprovado.**

- Nenhum achado de severidade Alta/Crítica em aberto — `SEC-BUG-001` está
  corrigido e revalidado por leitura de código e reexecução independente da
  suíte.
- Nenhum achado de compliance obrigatório (LGPD, RN-02/RN-08) pendente —
  a restrição append-only de `AUDIT_EVENT`/`CONSENT_RECORD` está em vigor
  no nível de banco, não apenas de aplicação.
- Nenhum débito de severidade Baixa/Média novo a registrar nesta
  revalidação.
- Requisitos de segurança operacional para o DevOps permanecem os já
  registrados nas Seções 1-6 acima (gestão de `APP_DB_ROLE_PASSWORD` via
  secret manager, `SEC-DEBT-002`, etc.) — nenhum requisito novo introduzido
  por esta correção.
- `BLOCKERS.md` Bloqueio 004 atualizado para `Resolvido` nesta mesma data.

---

## Lote 2 — Integração com Sistemas do Hospital (Motor HL7/FHIR e Imaging Gateway)

**Tarefas no escopo** (`TASK.md` §4.1.1): BE-06 (Setup Integration Engine —
NextGen Connect/Mirth Connect, canal HL7 v2.x MLLP real, ACL), BE-07 (Setup
Imaging Gateway — Orthanc, C-STORE real, conversão JPEG/PNG assíncrona via
BullMQ, integração com Object Storage), BE-09 (`ServiceApiKeyGuard`,
credencial de serviço dedicada nos 4 endpoints internos). Sem tarefas de
Frontend neste lote.

**Gatilho de validação**: `QA-REPORT.md` Seção 6, veredito **Aprovado com
ressalvas** (2026-09-04) — as 3 tarefas confirmadas `Concluído` em
`TASK.md` (incluindo o histórico completo de correção pós-implementação de
BE-07, duplicação de leitura de `RedisConfig`, e de BE-09, nome de variável
`INTERNAL_SERVICE_API_KEY`), nenhum bug de severidade Alta/Crítica em
aberto, 1 débito novo de severidade Média (`QA-DEBT-017`, BE-07 — ausência
de `attempts`/`backoff` na fila `imaging-conversion`).

**Referências de arquitetura usadas nesta auditoria**: `SDD.md` ADR-002
(Integration Engine, build-vs-buy), ADR-003 (Orthanc/Imaging Gateway,
build-vs-buy), ADR-012 (rastreabilidade DICOM + resolução de `tenant_id`
via AE Title — BE-38 ainda não implementada), §7.4 (isolamento
multi-tenant), §7.5 (superfície de exposição — Integration/Imaging Gateway
em rede privada); `GUARDRAILS.md` Seção C completa (itens 11-15 —
proibição de parser HL7/DICOM próprio, serviços de borda fora do processo
do core sem acesso direto ao banco, credencial de serviço dedicada, nunca
exposição pública, Orthanc sem customização de tenant), regra A.5
(proibição de atribuição implícita/hardcoded de `tenant_id`), item 22
(dado de saúde criptografado em repouso em duas camadas); `CTO-REVIEW.md`
Gate 2 (`risk-and-compliance-check`); `QA-REPORT.md` Seção 6 completa
(6.1-6.7, incluindo a bateria adversarial própria do QA e o achado ancilar
de IAM sinalizado na Seção 6.6).

**Código revisado**: `backend/src/integration-engine/` (10 arquivos,
inclusive specs), `backend/src/imaging-gateway/` (10 arquivos, inclusive
specs), `backend/src/security/` (guard, config, module, tokens),
`backend/integration-engine/` (canal XML + `deploy-channel.mjs`),
`backend/imaging-gateway/on-stable-study.lua`, `backend/src/main.ts`,
`backend/docs/{integration-engine,imaging-gateway,service-api-key-auth}.md`,
e — como contexto de requisito operacional para o DevOps —
`infra/modules/network/main.tf`, `infra/modules/ecs-service/main.tf`,
`infra/environments/{staging,production}/main.tf` (serviços
`integration_gateway_service`/`imaging_gateway_service`/`core_service`).

### 1. `static-security-analysis` (revisão pontual, escopo deste lote)

Não reconfigurado — em vigor desde o início do repositório. Verificação
substituta desta rodada, restrita aos diretórios deste lote:

- Varredura manual por padrão perigoso (`eval(`, `child_process`, `new
  Function(`, execução de comando externo fora do já conhecido `docker run`
  de teste) em `backend/src/integration-engine/`,
  `backend/src/imaging-gateway/`, `backend/src/security/` — **nenhuma
  ocorrência** em código de produção (o único `child_process`/`docker run`
  do repositório está em `backend/test/imaging-gateway/dicom-test-fixture.ts`,
  fixture de teste, não código de runtime).
- Nenhuma credencial hardcoded em nenhum dos três diretórios — confirmado
  por leitura linha a linha; `INTERNAL_SERVICE_API_KEY` sempre lida de
  `env`, default de desenvolvimento explicitamente documentado como
  provisório (mesmo padrão já aceito para `APP_DB_ROLE_PASSWORD`), nunca
  literal fora de `.env.example`/specs.
- **Achado desta rodada, tratado em detalhe na Seção 4 abaixo**: log de
  dado sensível (`console`/`Logger`) — ao contrário das auditorias
  anteriores (Lote 1/Lote 3, onde nenhuma superfície de logging existia
  ainda), este lote introduz a primeira ocorrência real do projeto de
  `Logger.log` sobre um payload que carrega dado de saúde identificável.
  Não é um padrão de código perigoso genérico (não é injeção/execução) —
  por isso classificado como achado de `sensitive-data-exposure-check`/
  `compliance-validation`, não de SAST puro.
- Recomendação já registrada nos lotes anteriores mantida: confirmar
  diretamente no GitHub Actions que `secret-scan`/`sast` estão verdes para
  os commits deste lote — segue coberto por `SEC-DEBT-001` (Lote 1, ainda
  em aberto, sem prazo vencido).

### 2. `security-requirement-validation`

| Requisito | Fonte | Verificação | Resultado |
|---|---|---|---|
| Credencial de serviço dedicada nos 4 endpoints internos, nunca credencial de usuário final | GUARDRAILS item 13 | `ServiceApiKeyGuard` (`service-api-key.guard.ts`) aplicado via `@UseGuards` a nível de **classe** nos 4 controllers (`IntegrationEngineController`, `CoreIngestPlaceholderController`, `ImagingGatewayController`, `CoreImagingIngestPlaceholderController`) — nenhuma rota escapa do guard dentro de cada controller (confirmado por leitura direta, não há `@Get`/rota adicional sem o decorator de classe). Comparação via hash SHA-256 + `crypto.timingSafeEqual` (não `===`, não `timingSafeEqual` direto sobre buffers de tamanho variável) — elimina vazamento de conteúdo e de tamanho da chave esperada; falha sempre retorna mensagem genérica (401), sem distinguir motivo. Nenhum mecanismo de bypass encontrado: o guard não tem modo de desenvolvimento que pule a checagem, não há rota alternativa para os mesmos 4 recursos, e os 3 emissores reais (canal NextGen Connect real, script Lua do Orthanc real, ACLs do core) enviam o header corretamente — confirmado tanto por leitura de código quanto pela suíte e2e reexecutada (Seção 4 abaixo) | **Atendido, sem bypass encontrado** |
| Canal de rede não exposto publicamente (`SDD.md` §7.5, GUARDRAILS item 14) | SDD.md §7.5, GUARDRAILS 14 | `infra/modules/network/main.tf`: `aws_security_group.integration` só aceita entrada nas portas 6661 (MLLP)/4242 (DICOM C-STORE) via `dynamic ingress` condicionado a `enable_hospital_channel == true` **e** CIDR explícito (`hospital_vpn_cidr`/`dicom_source_cidr`) — nunca `0.0.0.0/0` (confirmado por leitura direta, linhas 237-256); restante do tráfego de entrada vem exclusivamente de `aws_security_group.app` (linha 209). `infra/environments/{staging,production}/main.tf`: `integration_gateway_service`/`imaging_gateway_service` não recebem `load_balancer`/`target_group_arn` (só `core_service` tem); usam `service_discovery_registry_arn` (Service Connect interno), não ALB público. Nenhuma das 3 tarefas deste lote altera arquivo `.tf` (confirmado por `git log`/notas de status) | **Atendido** |
| Serviços de borda nunca acessam o banco do core diretamente (GUARDRAILS item 13) | GUARDRAILS 13 | Nenhuma importação de `kysely`/`pg`/`DatabaseModule` em `src/integration-engine/`, `src/imaging-gateway/`, `src/security/` (confirmado por grep) — toda comunicação com o core é via HTTP real para `/internal/ingest`/`/internal/imaging-ingest`, nunca acesso direto a dado | **Atendido** |
| Orthanc permanece produto de mercado genérico, sem customização de tenant (GUARDRAILS item 15) | GUARDRAILS 15 | `on-stable-study.lua` só lê `RemoteAET` nativo via API REST do Orthanc e propaga o valor bruto — nenhuma lógica de resolução de tenant, nenhum plugin custom, nenhuma configuração de múltiplos AE Titles locais simultâneos no Orthanc. Confirmado por leitura completa do script | **Atendido** |
| Nenhuma atribuição implícita/hardcoded de `tenant_id` introduzida por BE-06/BE-07 (GUARDRAILS regra A.5, ADR-012) | GUARDRAILS A.5, ADR-012 | Grep por `tenant`/`tenant_id` em `src/integration-engine/` — **nenhuma ocorrência** (o módulo nem menciona o conceito, correto — BE-06 não lida com dado já multi-tenant, a Integration Engine de hoje serve um único canal HL7 do hospital piloto). Grep em `src/imaging-gateway/` — as únicas ocorrências são comentários **explícitos** documentando que a resolução de tenant é **fora de escopo** desta tarefa (`orthanc-stable-instance-notification.ts` linhas 17-21, `core-imaging-ingest-placeholder.controller.ts` linhas 10-11, `imaging-gateway-config.ts` linha 32) — nenhuma variável de ambiente do tipo `DEFAULT_TENANT_ID`/`SINGLE_TENANT_ID`, nenhum valor fixo de tenant em nenhum ponto do payload canônico (`CanonicalImagingNotificationMessage` carrega `remoteAet` + UIDs, nunca um `tenant_id` calculado). A decomposição de tarefa já prevista (BE-38 resolve `tenant_id` casando `remoteAet` contra `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`) permanece intacta — nenhuma suposição de "tenant único" precisaria ser desfeita quando BE-38 chegar, ao contrário do que a nota histórica de `TASK.md` já registrou ter sido cogitado e descartado antes desta submissão (ver `TASK.md` §4.4, linha ~795) | **Atendido — nenhuma atribuição implícita encontrada** |
| Toda infraestrutura com dado de saúde em região Brasil (GUARDRAILS item 24, ADR-010) | GUARDRAILS 24 | Este lote não introduz novo componente de dado em repouso (Integration/Imaging Gateway são serviços de tradução/borda, sem banco próprio) — infraestrutura de rede/ECS já herdada da região `sa-east-1` confirmada no Lote 1. Nenhuma nova região introduzida | **Atendido (sem novo componente a validar)** |

### 3. `compliance-validation` (LGPD, nível de implementação)

Este é o **primeiro lote do projeto que efetivamente transporta dado de
saúde real** (resultado de exame via HL7, referência a imagem DICOM) entre
sistemas externos do hospital e o core — diferente de Lote 1 (fundação,
sem dado de saúde) e Lote 3 (infraestrutura de acesso a dado, sem novo
fluxo de dado).

- **Resultado de exame (BE-06) — `CanonicalExamResultMessage`**: carrega
  `patient.identifier`/`patient.name` (identificação direta do titular) +
  `exam.code`/`exam.name`/`result.value`/`result.unit` (dado de saúde,
  LGPD Art. 5º, II — categoria sensível, Art. 11). **Ver achado de
  compliance obrigatório não resolvido, `SEC-BUG-002`, Seção 4 abaixo** —
  este payload completo é gravado em log de aplicação em texto plano no
  placeholder `CoreIngestPlaceholderController`, sem necessidade
  demonstrada para a finalidade de observabilidade da própria tarefa.
- **Notificação de imagem (BE-07) — `CanonicalImagingNotificationMessage`**:
  carrega `remoteAet` + 3 UIDs DICOM + chave do Object Storage — **não**
  contém nome/identificador do paciente (confirmado por leitura da
  interface, `canonical-imaging-notification-message.ts`); UIDs DICOM são
  identificadores técnicos do estudo/série/instância, não dado cadastral
  do titular por si só (mesma leitura já aceita por QA/DevSecOps para
  `exam_files.dicom_sop_instance_uid` em BE-02, armazenado sem
  criptografia de coluna). O log correspondente
  (`CoreImagingIngestPlaceholderController`, linha 37) também faz
  `JSON.stringify(body)`, mas como o conteúdo não inclui dado pessoal
  identificável, **não gera achado de compliance** — só um ponto de
  atenção de estilo (ver Seção 6, requisito operacional).
- **Consistência com a garantia futura de `pgcrypto`/RLS (BE-02/BE-03/BE-04)**:
  nenhuma das duas ACLs deste lote persiste dado em banco (BE-24/BE-38 o
  farão) — nada aqui compromete a garantia já validada de que CPF/dado
  cadastral sensível será criptografado em repouso quando a persistência
  real acontecer. O achado de log (`SEC-BUG-002`) é ortogonal a essa
  garantia (a fuga de dado acontece antes/fora do banco, no log de
  aplicação) — **por isso não é mitigado** pelo trabalho já validado de
  `pgcrypto`/RLS, precisa de correção própria.
- **`GUARDRAILS.md` item 27** (proibição de dado de saúde em corpo de
  e-mail transacional) não se aplica a este lote (nenhum e-mail é
  disparado por BE-06/07/09) — citado aqui só para registrar que o
  princípio de "canal sem proteção adequada para dado de saúde" que
  fundamenta aquela regra é o mesmo princípio que fundamenta `SEC-BUG-002`
  abaixo, aplicado a um canal diferente (log de aplicação, não e-mail).

**Veredito de compliance para o Lote 2**: **1 achado de compliance
relevante pendente de resolução** (`SEC-BUG-002` — dado de saúde
identificável logado em texto plano, sem necessidade demonstrada,
violação do princípio de minimização de dado da LGPD, Art. 6º, III,
aplicado à categoria de dado mais sensível prevista em lei, Art. 11) —
impede veredito de aprovação incondicional do lote, conforme guardrail
deste agente.

### 4. `sensitive-data-exposure-check`

#### Achado de severidade Alta (`SEC-BUG-002`) — dado de saúde identificável logado em texto plano em `CoreIngestPlaceholderController` (BE-06), sem camada de proteção equivalente à do banco

**O que o código faz** (`backend/src/integration-engine/core-ingest-placeholder.controller.ts`, linha 43-45):

```ts
this.logger.log(
  `[BE-06 placeholder — lógica real de negócio é BE-24] Mensagem canônica recebida em /internal/ingest: ${JSON.stringify(body)}`,
);
```

`body` é o `CanonicalExamResultMessage` inteiro — `patient.identifier`,
`patient.name` (identificação direta do titular), `exam.code`/`exam.name`,
`result.value`/`result.unit` (resultado clínico, dado de saúde, LGPD Art.
11). Este `Logger.log` (nível `log`, não `debug`) roda em **todo** request
real a este endpoint — confirmado por leitura direta do fluxo completo:
`IntegrationEngineController.receiveEngineNormalizedMessage` →
`IntegrationEngineAclService.publishToCore` (HTTP real) →
`CoreIngestPlaceholderController.receive` (este log). O teste e2e contra a
engine real (`hl7v2-channel.e2e-spec.ts`) exercita exatamente este
caminho com uma mensagem HL7 ORU^R01 sintética — ou seja, o comportamento
já é exercitado de ponta a ponta pela própria suíte do projeto, não é uma
hipótese teórica.

**Por que isto é um achado, não uma decisão de detalhe aceitável**:

1. **Nenhuma necessidade demonstrada para o nível de detalhe logado.** O
   próprio módulo já demonstra a disciplina correta em três outros
   pontos: `ImagingGatewayController` loga só `sopInstanceUid`/`remoteAet`
   (identificadores técnicos, nunca dado do paciente);
   `ImagingConversionProcessor` loga só `sopInstanceUid`/`objectStorageKey`;
   `IntegrationEngineController` loga só `messageControlId` (não o
   payload). O placeholder de BE-06 é o único ponto do lote que faz
   `JSON.stringify` do payload inteiro — inconsistente com o padrão que o
   restante do próprio código já estabelece, e sem justificativa registrada
   em comentário para essa exceção.
2. **Nenhuma camada compensatória equivalente à do banco.** `pgcrypto`
   (coluna) e RLS (linha/tenant) protegem CPF/dado de domínio em
   PostgreSQL — nada equivalente protege este log: `infra/modules/
   ecs-service/main.tf` (linha 13-16) cria o `aws_cloudwatch_log_group`
   sem `kms_key_id` (só criptografia gerenciada padrão da AWS, não a
   mesma disciplina de KMS dedicado já aplicada a RDS/S3/Secrets Manager
   nos Lotes 1/3), com `retention_in_days` default de 30 dias
   (`variables.tf` linha 91-94) — nenhum controle de acesso equivalente ao
   escopo restrito da role de banco `portalmed_app` (acesso a CloudWatch
   Logs tipicamente é mais amplo entre a equipe de engenharia/operação do
   que acesso à role de aplicação do banco).
3. **Compliance obrigatório, não requisito antecipado.** Diferente de um
   caso onde nada foi implementado ainda, aqui o log **já executa** sobre
   dado de saúde real a cada mensagem processada — viola o princípio de
   minimização de dado (LGPD Art. 6º, III, "adequação... limitado ao
   mínimo necessário") aplicado à categoria de dado que a própria LGPD
   trata com rigor reforçado (Art. 11, dado sensível de saúde). Por
   guardrail deste agente, achado de compliance obrigatório não vira
   débito registrado — precisa estar resolvido antes da aprovação do
   lote.
4. **Nenhum teste cobre/impede este comportamento.** Busca textual em
   `backend/test/` não encontrou nenhuma asserção sobre o conteúdo do log
   deste endpoint (os testes verificam o `response.body`/status HTTP, não
   o que é escrito no logger) — nada impediria uma regressão futura na
   direção oposta (ex.: alguém "melhorar observabilidade" adicionando
   ainda mais campos ao log).

**Por que severidade Alta, não Média**: (a) exposição ativa e recorrente
de dado de saúde identificável (nome + identificador do titular + valor
clínico), não uma lacuna teórica — o caminho já é exercitado por HL7 real
em todo request; (b) fundamento de compliance obrigatório (LGPD, dado
sensível de saúde), mesma categoria de fundamento que já justificou
severidade Alta no Lote 3 (`SEC-BUG-001`); (c) nenhuma camada
compensatória ativa (log sem KMS dedicado, sem controle de acesso restrito
equivalente ao de banco, retenção de 30 dias); (d) o próprio código do
lote demonstra que a disciplina correta (logar só identificador técnico,
nunca dado do paciente) já é conhecida e aplicada em três outros pontos —
não é uma lacuna de conhecimento, é uma inconsistência isolada e
facilmente corrigível; (e) a correção é pequena, isolada e não depende de
BE-24 (substituir o `JSON.stringify(body)` por um log que cite só
`messageControlId`/`sourceSystem`/`schemaVersion`, mesmo padrão já usado
pelo próprio `IntegrationEngineController`).

**Correção recomendada ao Backend** (não prescritiva sobre a forma exata):
em `core-ingest-placeholder.controller.ts`, trocar o log de
`JSON.stringify(body)` por um log que cite apenas campos não-identificáveis
(`schemaVersion`, `sourceSystem`, `messageType`, `messageControlId`) — mesmo
nível de detalhe já usado por `IntegrationEngineController` para o mesmo
fluxo. Se observabilidade do conteúdo completo for genuinamente necessária
para depuração, considerar nível `debug` (não `log`) **e** mascaramento de
`patient.identifier`/`patient.name` (nunca o valor pleno), com decisão
registrada explicitamente — não prescritivo, decisão de detalhe do
Backend. Recomenda-se também um teste de regressão (spy no logger,
assertando que `patient`/`result` não aparecem na mensagem logada) para
que uma futura tarefa (BE-24, ao substituir este controller) não
reintroduza o mesmo padrão.

#### Achado de severidade Média (`SEC-DEBT-003`) — excesso de privilégio IAM em `imaging_gateway_service` (`s3:PutObject`), fora do escopo direto de BE-06/07/09 mas confirmado nesta auditoria

Achado originalmente sinalizado pelo QA (`QA-REPORT.md` Seção 6.6) como
"fora do escopo de BE-06/07/09" — confirmado por leitura direta desta
auditoria, com avaliação de severidade própria do DevSecOps:

- `infra/environments/{staging,production}/main.tf`, módulo
  `imaging_gateway_service` (`task_policy_json`, linha ~295-302 em
  staging): concede `s3:PutObject` no bucket de Object Storage ao
  container do Orthanc, com o comentário "Orthanc precisa gravar o
  JPEG/PNG convertido no Object Storage" — **factualmente incorreto**
  contra a implementação real de BE-07: quem grava no Object Storage é o
  processo `ImagingConversionProcessor`, rodando dentro de `core_service`
  (que já tem a permissão equivalente, `s3:GetObject`+`s3:PutObject`,
  linha ~222-227) — o Orthanc nunca chama a API do S3 diretamente
  (confirmado por leitura completa de `on-stable-study.lua` e de todo
  `backend/src/imaging-gateway/`, nenhuma chamada AWS SDK/S3 existe fora
  de `ImagingConversionProcessor`/`ObjectStorageService`, ambos parte do
  core).
- **Avaliação de severidade deste agente**: **Média**, não Alta/Crítica.
  Razões: (a) não é uma vulnerabilidade explorável diretamente por si só
  — exige um segundo evento (comprometimento do container Orthanc, ex.:
  via um arquivo DICOM malicioso explorando uma falha de parsing/GDCM,
  vetor de ataque plausível e historicamente documentado para
  implementações DICOM, mas não uma falha já demonstrada neste projeto);
  (b) o Orthanc é exposto a uma superfície de ataque real (DICOM C-STORE
  vindo da rede do hospital, ainda que privada/VPN) — a violação do
  princípio de menor privilégio aqui tem uma cadeia de exploração
  concreta e não meramente teórica, o que justifica não tratar como Baixa;
  (c) o bucket de Object Storage é compartilhado entre tenants (isolamento
  de tenant nesse recurso é por prefixo de chave/aplicação, não por
  bucket físico) — se o container Orthanc fosse comprometido e a
  permissão abusada, o *blast radius* potencial (escrever/sobrescrever
  objeto no bucket) não fica contido a um único tenant/hospital.
- Não bloqueia o deploy deste lote — o Terraform afetado não foi tocado
  por nenhuma das 3 tarefas deste lote (confirmado por `git log`/notas de
  status), e a exploração depende de um evento de comprometimento adicional
  que não tem evidência de ter ocorrido. Registrado como débito com dono e
  prazo.

### 5. `finding-severity-classification` — consolidação

| ID | Achado | Severidade | Bloqueia deploy? | Dono | Prazo |
|---|---|---|---|---|---|
| `SEC-BUG-002` (novo) | `CoreIngestPlaceholderController` (BE-06) loga `JSON.stringify` do `CanonicalExamResultMessage` inteiro (nome + identificador do paciente + resultado clínico) em nível `log`, em todo request real — violação do princípio de minimização de dado da LGPD (Art. 6º, III) sobre dado sensível de saúde (Art. 11), sem camada compensatória (log sem KMS dedicado, sem controle de acesso restrito, retenção 30 dias), sem teste que impeça regressão | **Alta** | **Sim** | Backend (corrige o log do controller) | Antes do próximo deploy deste lote; correção isolada, não depende de BE-24 |
| `SEC-DEBT-003` (novo) | `imaging_gateway_service` (Terraform pré-existente, não introduzido por este lote) recebe `s3:PutObject` desnecessário — Orthanc nunca grava no Object Storage na implementação real de BE-07; comentário do Terraform desatualizado/incorreto; bucket compartilhado entre tenants amplia o *blast radius* potencial de um comprometimento do container | Média | Não | DevOps (remove a permissão/corrige o comentário) | Antes do primeiro deploy real em `staging` com tráfego de DICOM do hospital piloto |
| `QA-DEBT-017` (herdado, classificação de QA confirmada por este agente) | Fila `imaging-conversion` sem `attempts`/`backoff` — falha transitória única marca job como `failed` permanentemente | Média | Não | Backend | Antes do primeiro deploy em staging com tráfego real de imagem (mesmo marco de `QA-DEBT-016`) |

**Nenhum outro achado de severidade Baixa/Média novo identificado neste
lote** — os demais itens verificados (guard de serviço nos 4 endpoints
sem bypass, isolamento de rede, ausência de atribuição implícita de
`tenant_id`, ausência de acesso direto ao banco pelos serviços de borda,
Orthanc sem customização de tenant) confirmados corretos, sem débito a
registrar.

### 6. Requisitos de segurança operacional para o DevOps (Lote 2)

1. **Não aplicar deploy deste lote a nenhum ambiente com tráfego real de
   HL7 do hospital enquanto `SEC-BUG-002` estiver aberto** — o log de
   dado de saúde identificável acontece a cada mensagem processada pelo
   endpoint `/internal/ingest`, independente de qual ambiente recebe o
   tráfego.
2. Resolver `SEC-DEBT-003` (remover `s3:PutObject` de
   `imaging_gateway_service` em `infra/environments/{staging,production}/main.tf`,
   corrigir o comentário que atribui incorretamente a gravação no Object
   Storage ao Orthanc) antes do primeiro deploy real com tráfego DICOM do
   hospital piloto — não bloqueante para este lote, mas prioritário por
   tocar a superfície de ataque mais exposta a input externo do projeto
   (DICOM C-STORE).
3. Confirmar, quando `INTERNAL_SERVICE_API_KEY` for rotacionada pela
   primeira vez em produção, que os 3 serviços ECS (core,
   integration-gateway, imaging-gateway) recebem o novo valor
   simultaneamente — a credencial é única e compartilhada entre os 3
   emissores/1 validador (decisão de detalhe já documentada pelo Backend,
   `TASK.md` linha ~279); uma rotação parcial quebraria a autenticação de
   um dos gateways silenciosamente até o próximo deploy.
4. Nenhum requisito novo de rede/firewall além do já confirmado correto
   nesta auditoria (Seção 2) — `enable_hospital_channel`/CIDR explícito
   por hospital já é o mecanismo correto para o piloto; ao integrar o
   hospital #2 (fora deste lote, `SDD.md` "Negative Consequences"),
   reavaliar se o modelo de CIDR único por variável ainda serve ou
   precisa generalizar para lista.
5. Considerar (não bloqueante, reforço de defesa em profundidade dado que
   o Orthanc recebe input binário não confiável de fora do perímetro do
   core via C-STORE): confirmar que o `imaging_gateway_service` roda com
   `read_only_root_filesystem`/least-privilege de SO equivalente ao já
   aplicado a `core_service`, se essa prática já existir — fora do
   escopo desta auditoria confirmar (não avaliado, `ecs-service/main.tf`
   não expõe essa opção nesta leitura), registrado só como sugestão de
   hardening a avaliar pelo DevOps.

### 7. Sinalização ao CTO (registro, em paralelo — não pré-requisito do bloqueio já aplicado por este agente)

- **`SEC-BUG-002` já bloqueia o deploy deste lote por decisão deste
  agente** (achado de severidade Alta, compliance obrigatório de LGPD,
  dentro da autoridade de bloqueio do DevSecOps) — esta sinalização ao
  CTO é registro, não uma solicitação de confirmação prévia.
- **Relevância estratégica para o CTO avaliar** (decisão de processo, não
  só técnica): esta é a **primeira vez** que o projeto efetivamente
  transporta dado de saúde real entre sistemas (BE-06/BE-07), e a
  primeira vez que um achado de exposição de dado sensível aparece em
  log de aplicação — diferente de `SEC-BUG-001` (Lote 3, privilégio de
  banco), aqui o canal violado (log/CloudWatch) é operado inteiramente
  pelo DevOps/observabilidade, não pelo Backend em runtime de banco.
  Sugestão para avaliação do CTO/Tech Lead (não decisão deste agente):
  formalizar em `GUARDRAILS.md` uma regra explícita equivalente ao item
  27 (proibição de dado de saúde em e-mail) para logs de aplicação — hoje
  a Seção C (itens 11-15) cobre exposição de rede/protocolo, mas nenhuma
  regra nomeada cobre logging, e este é o primeiro lote onde a lacuna se
  materializou em código real. Não é urgente resolver antes deste lote
  (a correção pontual de `SEC-BUG-002` já resolve a instância concreta),
  mas fica como sugestão de reforço de processo para lotes futuros que
  também lidem com dado de saúde (BE-18, BE-24, BE-38, BE-29).
- Nenhuma outra questão de relevância estratégica identificada neste
  lote — `SEC-DEBT-003` (IAM) e `QA-DEBT-017` (retry) são técnicos/
  operacionais, dentro da autoridade de resolução usual de DevOps/Backend.

### 8. Veredito do Lote 2

**Reprovado — bloqueado por 1 achado de severidade Alta (`SEC-BUG-002`).**

- **1 achado de severidade Alta em aberto** — dado de saúde identificável
  (nome + identificador do paciente + resultado clínico) logado em texto
  plano em todo request real ao endpoint `/internal/ingest`
  (`CoreIngestPlaceholderController`, BE-06), violando o princípio de
  minimização de dado da LGPD (Art. 6º, III) sobre a categoria de dado
  sensível de saúde (Art. 11), sem camada compensatória ativa. Bloqueia
  deploy por decisão deste agente, dentro da autoridade de bloqueio do
  DevSecOps — não depende de confirmação prévia do CTO (sinalizado a ele
  em paralelo, Seção 7).
- **Todos os demais itens auditados estão corretos**: credencial de
  serviço dedicada aplicada aos 4 endpoints internos sem bypass
  encontrado (BE-09); canal de rede não exposto publicamente, confirmado
  por leitura direta do Terraform (§7.5/GUARDRAILS 14); nenhum acesso
  direto ao banco pelos serviços de borda (GUARDRAILS 13); Orthanc
  permanece produto de mercado genérico sem customização de tenant
  (GUARDRAILS 15); nenhuma atribuição implícita/hardcoded de `tenant_id`
  introduzida por BE-06/BE-07 (regra A.5, ADR-012) — a resolução de fato
  segue corretamente deferida a BE-38, sem nenhuma suposição de "tenant
  único" a desfazer depois.
- **2 débitos de severidade Média registrados** (`SEC-DEBT-003` — IAM
  excessivo em componente pré-existente, não deste lote; `QA-DEBT-017`,
  herdado do QA, classificação confirmada), ambos com dono e prazo, nenhum
  bloqueante.
- Requisito de maior severidade deste lote (credencial de serviço
  dedicada + isolamento de rede, `GUARDRAILS.md` Seção C) — confirmado
  sem exceção; o achado que reprova este lote é de uma frente diferente
  (exposição de dado sensível em log, não de rede/credencial).

**Liberação**: **bloqueada** até `SEC-BUG-002` ser corrigido pelo Backend
e revalidado por este agente — a correção é isolada e rápida (trocar o
conteúdo de um log em um único controller, mesmo padrão de restrição já
usado em três outros pontos do próprio lote), não deve represar o
cronograma. Escalado ao Backend via `BLOCKERS.md` (Bloqueio 005). Nenhuma
tarefa futura que dependa deste lote (BE-18, BE-24 de BE-06; BE-38 de
BE-07) deve ser considerada segura para produção enquanto `SEC-BUG-002`
estiver aberto — o guard de credencial de serviço e o isolamento de rede
(a parte técnica majoritária deste lote) seguem confirmados corretos e
não impedem o trabalho de decomposição/design dessas tarefas futuras
continuar, apenas o deploy com tráfego real permanece bloqueado.

### 9. Revalidação de `SEC-BUG-002` (devsecops, 2026-09-05)

Revalidação pontual e independente da correção aplicada pelo Backend (nota
de correção pós-implementação de BE-06/BE-07, `TASK.md` §3, 2026-09-05),
não uma reauditoria completa do lote — as demais 3 skills já haviam sido
executadas na auditoria original (Seções 1-8 acima) e só encontraram este
achado bloqueante, mais os débitos não bloqueantes já registrados
(`SEC-DEBT-003`, `QA-DEBT-017`), que continuam válidos e não foram
reavaliados aqui.

**Verificação por leitura direta de código** (não apenas o relato do
Backend):

1. `backend/src/integration-engine/core-ingest-placeholder.controller.ts`
   lido linha a linha: `receive()` não chama mais `JSON.stringify(body)`;
   o único `this.logger.log(...)` (linhas 59-62) cita apenas
   `schemaVersion`, `sourceSystem`, `messageType` e `messageControlId` —
   nenhum dos quatro é PII nem dado clínico, são metadados técnicos de
   protocolo (versão de schema, sistema de origem, tipo de mensagem HL7,
   ID de controle da mensagem). `patient`/`exam`/`result` não aparecem em
   nenhum ponto do método fora da atribuição a `lastReceivedMessage`.
2. `backend/src/imaging-gateway/core-imaging-ingest-placeholder.controller.ts`
   lido linha a linha: mesmo padrão — o único `this.logger.log(...)`
   (linhas 53-56) cita `schemaVersion`, `remoteAet`,
   `dicom?.sopInstanceUid`, `convertedFile?.contentType`, `convertedAt`.
   Nenhum é PII; `remoteAet`/UID DICOM/tipo de conteúdo/timestamp são
   metadados técnicos de integração, consistente com o que a auditoria
   original já havia confirmado sobre `CanonicalImagingNotificationMessage`
   não carregar identificação de paciente.
3. Grep por `Logger.log(JSON.stringify` e `console.*(JSON.stringify` em
   todo `backend/src/`: **nenhuma ocorrência** — confirma que não sobrou
   nenhum outro ponto com o mesmo anti-padrão fora dos dois já corrigidos
   (e o segundo, BE-07, nunca foi achado de compliance, só de estilo,
   conforme já registrado na Seção 4).
4. `lastReceivedMessage`/`getLastReceivedMessage()`: grep por
   `getLastReceivedMessage` em todo `backend/` mostra uso só dentro dos
   dois controllers (declaração) e dos arquivos de teste e2e
   (`integration-engine.e2e-spec.ts`, `imaging-gateway.e2e-spec.ts`,
   `orthanc-imaging-gateway.e2e-spec.ts`, `hl7v2-channel.e2e-spec.ts`),
   que obtêm a instância do controller diretamente do módulo Nest de
   teste (`app.get(...)`), não via HTTP. Nenhum `@Get` (ou qualquer outro
   método HTTP) expõe esse estado em nenhum dos dois controllers — a
   classe só declara `@Post()`. Não há endpoint de debug que devolva o
   estado interno; achado potencial descartado.
5. Os dois testes de regressão `[SEC-BUG-002]` lidos por completo
   (`integration-engine.e2e-spec.ts` linhas 108-145;
   `imaging-gateway.e2e-spec.ts` linhas 186-237): ambos espionam
   `Logger.prototype.log` com `vi.spyOn`, disparam uma request HTTP real
   contra o endpoint (não uma chamada direta ao método), e afirmam
   explicitamente a ausência de `patientIdentifier`/`patientName`/
   `resultValue`/`examName` (BE-06) e de `"dicom"`/`"convertedFile"`
   serializados (BE-07) em toda mensagem logada pelo placeholder, além de
   confirmar a presença do metadado técnico esperado
   (`messageControlId=`/`sopInstanceUid=`/`remoteAet=`). Um regresso ao
   `JSON.stringify(body)` inteiro faria as duas asserções de ausência
   falharem — não são testes que passariam de qualquer forma.

**Reexecução independente da suíte** (ambiente com Docker disponível, não
apenas leitura de código nem confiança no relato do Backend):

- `npx vitest run --config ./vitest.config.e2e.ts
  test/integration-engine/integration-engine.e2e-spec.ts
  test/imaging-gateway/imaging-gateway.e2e-spec.ts` → **25 testes, todos
  passando**, incluindo os dois blocos `[SEC-BUG-002]`.

**Nenhum achado residual.** A correção elimina a serialização do payload
sensível em ambos os controllers, com teste de regressão permanente e
funcional em duas suítes, sem introduzir exposição indireta via estado
interno em memória.

**Veredito final do Lote 2: Aprovado com débito registrado.**

- Nenhum achado de severidade Alta/Crítica em aberto — `SEC-BUG-002` está
  corrigido e revalidado por leitura de código e reexecução independente
  da suíte.
- Nenhum achado de compliance obrigatório (LGPD Art. 6º/11) pendente — a
  minimização de dado sensível de saúde em log está em vigor nos dois
  controllers afetados, não apenas no que motivou o achado original.
- 2 débitos de severidade Média permanecem registrados, sem alteração
  desta revalidação: `SEC-DEBT-003` (IAM excessivo em componente
  pré-existente) e `QA-DEBT-017` (herdado do QA) — ambos com dono e prazo
  já definidos nas Seções 5-6 acima, nenhum bloqueante.
- Requisitos de segurança operacional para o DevOps permanecem os já
  registrados na Seção 6 acima (rotação de `AWS_CLOUDWATCH_LOG_GROUP`
  sem `kms_key_id` dedicado, etc.) — nenhum requisito novo introduzido
  por esta correção.
- Sugestão de reforço de processo (`GUARDRAILS.md`, regra de log de dado
  de saúde) registrada na Seção 7 acima permanece como sinalização ao CTO,
  não como bloqueio — correção pontual de `SEC-BUG-002` já resolve a
  instância concreta.
- `BLOCKERS.md` Bloqueio 005 atualizado para `Resolvido` nesta mesma data.
