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
