# CTO-REVIEW.md

Log datado por gate de governança do CTO / Head de Tecnologia. Cada seção abaixo
corresponde a um gate do pipeline (ver `.claude/PIPELINE-CONVENTIONS.md`), com data,
achados e veredito (Aprovado / Aprovado com ressalvas / Reprovado). Este é o primeiro
registro do projeto — nenhum artefato de pipeline existia em `.md/` antes deste gate.

---

## Gate 1 — Pré-descoberta — 2026-09-02

**Skill aplicada**: `tech-strategy-review`
**Input avaliado**: Briefing de negócio recebido do stakeholder — "Requisitos
Iniciais – Portal de Resultados de Exames (Aplicação White Label para Hospitais)".
Nenhum `VISAO-PRODUTO.md`/`PRD.md` existe ainda; é o próprio briefing bruto que está
sendo avaliado.

### Objetivo de negócio

Em uma frase: **permitir que hospitais ofereçam aos seus pacientes um portal
white-label seguro para consulta, download e compartilhamento de resultados de
exames (laboratoriais, anatomopatológicos e de imagem), integrado aos sistemas
internos do hospital (LIS/PACS/RIS/HIS), com administração de identidade visual e
parâmetros operacionais por hospital cliente.**

O objetivo é verificável e concreto — não é "fazer um app". Modelo de negócio é
B2B2C: o hospital é o cliente (contrata/licencia a plataforma), o paciente é o
usuário final. Isso passa no critério de aceite da skill.

Ressalva: o briefing descreve **requisitos de solução já bastante detalhados**
(funcionalidades, perfis, requisitos técnicos e de UX), mas não declara o problema de
negócio por trás — não há indicação de: (a) qual dor atual do hospital/paciente está
sendo resolvida (ex.: hospital hoje entrega resultado em papel/portal de terceiro
caro?), (b) modelo de monetização (licença por hospital? por exame? SaaS
recorrente?), (c) hospital(is) piloto identificado(s), (d) tamanho do mercado-alvo.
Isso é aceitável para liberar o Gate 1 (o objetivo funcional é claro o suficiente),
mas **é lacuna que o PM precisa preencher no `PRD.md`** (Seção 1 — Problema e
Contexto), não algo que o CTO pode presumir por conta própria.

### Alinhamento com roadmap

Não aplicável em sentido estrito: este é o **primeiro projeto registrado neste
repositório** — não existe roadmap/portfólio anterior documentado para comparar
reforço/neutralidade/conflito. Classificação: **Neutro (sem roadmap prévio para
confrontar)**. Registrar este fato explicitamente para que o Gate 1 de projetos
futuros no mesmo portfólio possa comparar contra este.

### Plausibilidade de orçamento/prazo

**Nenhum orçamento ou prazo foi mencionado no briefing.** Sem esse dado não é
possível avaliar incompatibilidade diretamente (isso seria estimativa detalhada, fora
do escopo desta skill), mas o silêncio em si é um sinal de alerta que deve ser
resolvido antes do PM aprofundar o levantamento:

- O escopo descrito nas Seções 3-6 do briefing é de **plataforma multi-tenant white
  label enterprise**, não de um MVP: identidade visual configurável por hospital,
  integrações com sistemas legados heterogêneos (LIS, PACS, RIS/HIS via HL7/FHIR/API
  proprietária), visualizador de imagens médicas (DICOM), MFA, RBAC, auditoria
  completa, SLA de 99,5%, CDN, hot deploy, WCAG 2.1 AA. Isso é tipicamente um esforço
  de múltiplos trimestres para a primeira versão robusta, não um projeto de poucas
  semanas.
- O próprio briefing já demonstra maturidade ao separar "Requisitos de Evolução"
  (Seção 7: chat, push, prontuário eletrônico, app nativo) do escopo imediato — isso é
  positivo e deve ser preservado, mas as Seções 3-6 ainda não fazem a mesma
  separação MVP vs. versão completa dentro de si mesmas (ex.: DICOM completo,
  white-label total e integração com todos os sistemas hospitalares de uma vez é
  ambicioso para uma primeira entrega).
- **Ressalva formal**: o PM deve levantar orçamento/prazo/hospital(is) piloto
  explicitamente no início da descoberta e usar `scope-prioritization` para propor um
  corte de MVP dentro das Seções 3-6 (não só da Seção 7) antes de consolidar o
  `PRD.md`. Sem essa baliza, o risco é o PRD herdar escopo enterprise completo sem
  ninguém ter validado que cabe no orçamento/prazo real do cliente.

### Gap de roster

Revisado o roster de 12 agentes (`cto`, `pm`, `business-analyst`,
`software-architect`, `ux-ui`, `tech-lead`, `backend`, `frontend`, `mobile`, `qa`,
`devsecops`, `devops`) contra o escopo do briefing:

- **Sem gap de papel/agente ausente.** O app mobile nativo já está corretamente
  classificado pelo próprio briefing como fora do escopo imediato (Seção 7), então
  não é necessário acionar `mobile` agora. Compliance/LGPD é coberto em dois níveis
  já existentes no roster — `cto` (`risk-and-compliance-check`, estratégico) e
  `devsecops` (`compliance-validation`, tático) — não requer um papel de
  DPO/Compliance Officer dedicado no roster atual.
- **Gap de especialização declarada, não de papel**: nem `backend.md` nem
  `frontend.md` nem `software-architect.md` declaram hoje conhecimento explícito de
  (a) interoperabilidade em saúde (HL7/FHIR e integração com LIS/PACS/RIS/HIS
  legados, historicamente heterogêneos e proprietários por fornecedor de hospital) ou
  (b) renderização de imagens médicas (DICOM). Isso **não bloqueia o Gate 1** — a
  arquitetura ainda não existe — mas fica registrado como ponto de atenção
  obrigatório para o Software Architect endereçar explicitamente no `SDD.md`
  (provável candidato a `build-vs-buy-analysis` no Gate 2: usar biblioteca/serviço de
  visualização DICOM e/ou motor de integração HL7/FHIR de mercado em vez de construir
  do zero, e definir como o pipeline lida com a heterogeneidade de LIS/PACS/RIS/HIS
  entre hospitais diferentes).
- Multi-tenancy com white-label completo (identidade visual, textos institucionais,
  regras de compartilhamento por hospital) é, em si, uma decisão arquitetural de alto
  impacto (isolamento de dados entre hospitais, custo de manutenção por tenant) — a
  ser tratada formalmente em `architecture-decision-review` no Gate 2, não uma
  responsabilidade nova de roster.

### Veredito

**Aprovado com ressalvas.**

O objetivo de negócio é explícito e verificável o suficiente para liberar o PM a
iniciar o levantamento — não há bloqueio de "objetivo vago". As ressalvas abaixo não
travam o início do trabalho do PM, mas são condições que devem estar refletidas no
`PRD.md` antes de ele ser considerado pronto para o Business Analyst (checadas por
`stakeholder-alignment-check`, que compara o PRD final contra este Gate 1):

1. PM deve levantar e documentar explicitamente no `PRD.md`: problema/dor de negócio
   por trás do pedido, modelo de monetização, hospital(is) piloto (se houver) e
   orçamento/prazo-alvo — nenhum desses está no briefing original.
2. PM deve aplicar `scope-prioritization` para definir um corte de MVP dentro das
   Seções 3-6 do briefing (autenticação, área do paciente, área administrativa,
   requisitos técnicos), não só reaproveitar a Seção 7 do briefing como único filtro
   de "fora do escopo imediato" — o escopo das Seções 3-6, se implementado por
   inteiro de uma vez, é de porte enterprise multi-trimestre.
3. Dado de saúde é dado sensível sob a LGPD (Art. 5º, XI e Art. 11) — o `PRD.md` e,
   depois, o `PRD-TECNICO.md` devem tratar consentimento, finalidade e base legal com
   rigor acima do padrão de um projeto sem dado sensível; será reavaliado em
   profundidade estratégica no Gate 2 (`risk-and-compliance-check`) e taticamente
   pelo `devsecops` mais adiante — registrado aqui para que ninguém a jusante trate
   como requisito genérico.
4. Software Architect deve endereçar explicitamente no `SDD.md`, com
   `build-vs-buy-analysis` quando aplicável: (a) integração com LIS/PACS/RIS/HIS
   heterogêneos entre hospitais, (b) visualização de imagens DICOM, (c) arquitetura
   de multi-tenancy/white-label e isolamento de dados entre hospitais — os três serão
   auditados no Gate 2.

Nenhuma dessas ressalvas justifica reprovação neste ponto — são lacunas normais de um
briefing pré-descoberta, não incoerências. **PM está liberado para iniciar o
levantamento e produzir o `PRD.md`.**

---

## Gate 2 — Pós-SDD — 2026-09-02

**Skills aplicadas**: `architecture-decision-review` (documento inteiro),
`build-vs-buy-analysis` (ADR-002, ADR-003), `risk-and-compliance-check` (ADR-010 +
Seção 7 do SDD.md)
**Input avaliado**: `SDD.md` (rascunho, 2026-09-02) + 10 ADRs em `.md/adr/` + `PRD.md`
(PM, Aprovado) + `PRD-TECNICO.md` (Business Analyst, Aprovado) + `CTO-REVIEW.md`
(Gate 1, Aprovado com ressalvas)

> O Software Architect marcou explicitamente ADR-002, ADR-003 e ADR-004 para revisão
> obrigatória neste gate (exigência do Gate 1, ressalva 4, e do `PRD.md` Premissas
> P9/P10) e ADR-010 para `risk-and-compliance-check` (exigência de RNF-15). Os demais
> ADRs (001, 005-009) foram classificados pelo Software Architect como "escolhas de
> rotina, dentro da sua autoridade" — revisados abaixo em nível mais leve, já que
> `architecture-decision-review` cobre "toda decisão estrutural relevante do SDD.md",
> não só as marcadas, mas sem exigir o rigor de `build-vs-buy-analysis` onde não há
> vendor envolvido.

### Riscos

| # | Risco | Componente/ADR | Severidade | Evidência |
|---|---|---|---|---|
| R1 | Prazo de retenção do log de auditoria (RNF-04) permanece indefinido; sem definição legal, o job de purga não pode ser implementado nem o volume de dado sensível acumulado tem teto conhecido | Auditoria, ADR-009 | Média (compliance) | SDD.md §6.2 ("Sem arquivamento/purga automatizado do log de auditoria... implementar assim que o CTO/DevSecOps confirmar o prazo"); ADR-009, Negative Consequences |
| R2 | Ausência de DPIA/RIPD formal e de acordo de tratamento de dados (controlador/operador) entre plataforma e hospital piloto | Compliance, todo o SDD | Média | SDD.md §7.6 ("Aprofundamento formal de DPIA... permanece pendente do `risk-and-compliance-check` do CTO") |
| R3 | Redis como ponto único de falha de sessão — indisponibilidade torna todo o produto inacessível | Sessão, ADR-007 | Alta (já identificada e com mitigação proposta pelo próprio SDD) | SDD.md §6.1, linha "Redis indisponível impede validação/criação de sessão para toda a base" |
| R4 | Integration Gateway como ponto único de falha da ingestão, mitigado parcialmente por RF-14 (exame já sincronizado permanece disponível) | Integration Gateway, ADR-002 | Média (já identificada e com mitigação proposta) | SDD.md §6.1 |
| R5 | Protocolo real do hospital piloto (P1) ainda não confirmado — risco residual de que o motor de integração escolhido não cubra trivialmente o protocolo real | ADR-002 | Média (residual, já reconhecido pelo próprio ADR) | ADR-002, "Negative Consequences" |
| R6 | Esforço incremental de multi-tenancy lógica (toda query com guard de tenant + teste de vazamento cruzado) ainda não formalizado como regra obrigatória em `GUARDRAILS.md` (documento não existe ainda) | Multi-tenancy, ADR-004 | Média até virar regra formal | SDD.md §6.1 e §7.4, "a ser formalizado como regra em `GUARDRAILS.md` pelo Tech Lead" |
| R7 | TLS mínimo declarado como "recomendado" (1.2), não como piso obrigatório sem exceção, para dado de saúde sensível | Criptografia em trânsito, §7.3 | Baixa-Média | SDD.md §7.3 ("versão mínima recomendada TLS 1.2... a confirmar com DevSecOps") |

Nenhum risco de severidade Alta está sem mitigação proposta (R3 já tem plano —
Redis gerenciado com failover — condicionado a validação do DevOps antes do
go-live). R1 e R2 são as únicas pendências de decisão que cabem a este gate
resolver ou direcionar (não podem ser adiadas para DevSecOps, porque são
estratégicas, não táticas) — tratadas abaixo em "Risco e Compliance".

### Alternativas Consideradas

Todas as decisões marcadas (ADR-002, ADR-003, ADR-004, ADR-010) já registram, no
próprio ADR, as alternativas descartadas com justificativa (construir do zero /
SaaS de terceiro para ADR-002/003; single-tenant e multi-tenant físico para
ADR-004; região fora do Brasil para ADR-010) — nenhuma delas é uma "escolha sem
concorrente considerado". Não há alternativa óbvia que o Software Architect tenha
deixado de considerar em nenhuma das quatro. Para os ADRs de rotina (001, 005-009):
todos também registram ao menos duas alternativas com prós/contras — nenhum é uma
decisão apresentada sem concorrente. Nenhum gap de "alternativa faltando" foi
identificado neste SDD.md, o que é incomum e positivo, mas não dispensa o
escrutínio de mérito abaixo (forma não substitui justificativa, conforme o próprio
guardrail desta skill).

### Build vs. Buy — ADR-002 (Motor de Integração HL7/FHIR)

| | Construir (parser próprio, Node/TS) | Comprar/Integrar (NextGen Connect / Mirth Connect, open-source, self-hosted) |
|---|---|---|
| Controle | Total sobre o comportamento exato | Preservado sobre o *domínio* (ACL isola formato canônico); limitado sobre o motor de canal em si, mas é open-source (pode ser bifurcado/customizado se necessário) |
| Tempo até funcionar | Lento — HL7 v2.x tem variação de segmento por fabricante, notoriamente inconsistente na prática; squad sem especialização declarada (Gate 1) | Mais rápido — motor maduro já resolve casos de borda comuns do protocolo |
| Custo | Tempo de engenharia especializada que o squad não tem hoje (custo real não quantificável sem orçamento aprovado — P2/P3 ainda em validação) | Sem licença (open-source) + custo de operação de infraestrutura (self-hosted) + curva de configuração de canal — qualificado como "menor" pelo ADR, número exato também não quantificável neste ponto |
| Lock-in | Nenhum, mas custo afundado alto no próprio código, e é o tipo de código que mais provavelmente ficaria mal mantido dado o gap de especialização | Baixo — projeto open-source, mensagens em padrão aberto (HL7 v2.x/FHIR R4), sem contrato de licença SaaS; troca de motor é reconfiguração de canal, não reescrita de domínio (mérito direto da ACL) |

**Reversibilidade**: Alta. Como a ACL normaliza para JSON canônico antes de entrar
no domínio core, trocar o motor de mercado por outro produto (ou por uma solução
própria, no limite) não exige redesenho do monolito — é troca de adaptador na
borda. Custo de reversão: médio (reconfigurar canal, revalidar com o hospital),
não catastrófico.

**Lock-in**: Baixo, pelas razões acima — não há dependência de vendor comercial
fechado nem formato de dado proprietário.

**Fator decisivo**: tempo/risco de prazo (Premissa P3, 16-20 semanas) combinado com
ausência de especialização declarada do squad em interoperabilidade em saúde — não é
custo de licença (é gratuito) nem controle (a ACL preserva o controle do domínio de
negócio).

**Recomendação**: aprovar a opção "comprar/integrar" (motor de mercado open-source
com ACL). A recomendação mudaria se, ao resolver a Premissa P1 (hospital piloto
real), o protocolo/fabricante específico exigir um adapter fora do alcance trivial
do motor escolhido — nesse caso, a decisão deve ser revisitada **antes** de
configurar o canal real, não depois (o próprio ADR-002 já registra essa condição
como risco residual — correto, mantenho).

### Build vs. Buy — ADR-003 (Pipeline de Imagens DICOM)

| | Construir (parser/renderizador DICOM do zero) | Comprar/Integrar (Orthanc, servidor DICOM open-source, self-hosted, com DICOMweb/WADO-RS nativo) |
|---|---|---|
| Controle | Total, mas sobre um formato ainda mais complexo que HL7 (múltiplos transfer syntaxes, metadados de estudo/série/instância) | Preservado sobre a URL/referência de imagem consumida pelo core; o parsing DICOM em si fica delegado ao produto maduro |
| Tempo até funcionar | Lento — risco de subestimar esforço é alto, squad sem especialização declarada (Gate 1) | Mais rápido — Orthanc já resolve conversão e expõe endpoint padrão (WADO-RS) sem esforço de parsing custom |
| Custo | Tempo de engenharia especializada que o squad não tem; risco de retrabalho se RF-S02 (visualizador nativo, Release 2) exigir reconstrução da camada | Sem licença (open-source) + custo de operar mais um componente de infraestrutura + custo de storage antecipado (DICOM original mantido desde o MVP) — números não quantificáveis com precisão neste ponto |
| Lock-in | Nenhum, mas maior risco de dívida técnica sobre um dos formatos mais complexos do domínio | Baixo — Orthanc é open-source, expõe DICOMweb (padrão aberto), qualquer visualizador de mercado compatível (ex.: OHIF Viewer) pode consumir; troca de gateway não perde o DICOM original armazenado |

**Reversibilidade**: Alta. Orthanc mantém o DICOM original — trocar o gateway por
outro produto no futuro não descarta dado, só exige reapontar o pipeline de
conversão/consumo.

**Lock-in**: Baixo, mesma lógica do ADR-002 — padrão aberto, sem contrato de SaaS
comercial.

**Fator decisivo**: preparo para RF-S02 (Release 2, visualizador DICOM nativo) sem
retrabalho, combinado com o mesmo gap de especialização do squad já registrado no
Gate 1. Note-se que este é o único dos dois build-vs-buy em que a decisão de hoje
paga um custo antecipado explícito (armazenar DICOM original desde já, mesmo sem
uso funcional imediato no MVP) — o ADR-003 já reconhece isso corretamente como
"investimento consciente", não dívida técnica; concordo com essa classificação,
mas registro como condição de revisão explícita (ver "Recomendação").

**Recomendação**: aprovar a opção "comprar/integrar" (Orthanc). Condição de
revisão: se a Premissa P8 (`PRD.md`) for respondida negativamente — ou seja, se o
hospital piloto real tiver **baixo** volume de exames de imagem como caso de uso —
o custo de storage antecipado do DICOM original deixa de se pagar tão rápido
quanto o ADR pressupõe; isso não invalida a escolha (Orthanc continua sendo a opção
correta mesmo com baixo volume, só muda o tempo de retorno do investimento
antecipado), mas deve ser revisitado quando P1/P8 forem resolvidas, como o próprio
`PRD.md` já previa.

### Architecture Decision Review — ADR-004 (Multi-Tenancy Lógica desde o MVP)

Nenhum vendor está envolvido nesta decisão (é um padrão arquitetural — `tenant_id`
+ RLS —, não um produto a comprar), então `build-vs-buy-analysis` não se aplica
diretamente aqui, como a própria marcação do ADR já antecipa ("considerar... se
aplicável"); não há produto de isolamento multi-tenant gerenciado que faça sentido
comprar neste porte de projeto, e o ADR não propôs nenhum. Aplico os cinco critérios
de `architecture-decision-review`:

1. **Trade-off declarado**: sim, de forma completa. O ADR-004 nomeia as três opções
   (single-tenant com migração futura, multi-tenant lógico, multi-tenant físico),
   com prós/contras de cada uma, e justifica a escolha citando o motivo central —
   RNF-11/RN-09 é regra de negócio já confirmada (não hipótese), e migrar dado de
   saúde sensível em produção depois do go-live é operação de alto risco
   incompatível com o rigor de LGPD elevado desde o Gate 1 (ressalva 3).
2. **Escalabilidade**: a decisão aguenta o crescimento esperado. O modelo de dados
   (Seção 5 do SDD.md) já carrega `tenant_id` em toda entidade relevante; a extensão
   para hospital #2+ (Release 2, RF-C01/RF-C02) é inserir novo tenant, não redesenho
   de schema. Isso é coerente com a exigência explícita do `PRD.md` (R4) de não gerar
   retrabalho estrutural ao escalar — o Software Architect endereçou corretamente o
   ponto que o Gate 1 abriu.
3. **Custo**: custo incremental no MVP é reconhecido explicitamente pelo próprio
   ADR ("parte desse investimento não gera valor imediato — é custo antecipado
   consciente") — não é um custo escondido. É proporcional: a alternativa (migração
   de dado de saúde em produção) teria custo/risco maior, não menor, então o
   trade-off está corretamente direcionado.
4. **Dívida técnica**: nenhuma dívida inconsciente aqui — é o oposto, um
   investimento consciente para *evitar* dívida técnica futura (a alternativa
   single-tenant é que geraria a dívida). Concordo com essa framing.
5. **Vendor lock-in**: não aplicável — é uma decisão de padrão de dados
   (PostgreSQL + RLS, já coberto por ADR-006), não de vendor externo.

**Risco residual real, não do ADR em si, mas de execução**: o próprio SDD.md (§6.1,
§7.4) já identifica que "erro de implementação (query sem filtro de tenant) causa
vazamento de dado entre hospitais" como risco de severidade **Alta**, e delega a
formalização da mitigação (teste automatizado obrigatório de vazamento cruzado) ao
Tech Lead via `GUARDRAILS.md`. Como `GUARDRAILS.md` ainda não existe (é produzido na
etapa 6, após este gate), esta mitigação está corretamente **planejada, mas não
ainda formalizada** — não é motivo de reprovação do SDD.md agora, mas é uma condição
que amarro ao veredito: o Tech Lead não pode considerar `GUARDRAILS.md` pronto sem
essa regra explícita, e este CTO vai cobrá-la no próximo ponto de contato ad hoc
(governança de `GUARDRAILS.md`).

**Recomendação**: aprovar ADR-004 como está — é a decisão estruturalmente correta
para o modelo de negócio B2B2C multi-hospital já validado desde o Gate 1, com
trade-off de custo incremental proporcional e sem lock-in. Condição de
acompanhamento (não bloqueia este gate): exigir a regra de teste de vazamento
cruzado entre tenants explicitamente no primeiro `GUARDRAILS.md` que o Tech Lead
produzir.

### Revisão leve — ADR-001, 005-009 (decisões de rotina)

- **ADR-001 (monolito modular + serviços de borda)**: trade-off declarado e
  coerente com squad pequena (P3) e prazo apertado; escalabilidade tratada como
  dívida técnica consciente (escala por módulo só após extração futura), registrada
  corretamente na Seção 6.2 do SDD.md, não escondida. Sem lock-in (padrão
  arquitetural, não vendor). Concordo com a classificação de "rotina, dentro da
  autoridade do Software Architect" — não hesito em aprovar sem tratamento mais
  extenso, mas é a decisão estrutural que mais amarra as demais (002-004), então sua
  correção é indiretamente auditada pela aprovação delas acima.
- **ADR-005 (Node.js/TypeScript/NestJS)**: trade-off e alternativa (Java/Spring,
  Python) registrados na Seção 3 do SDD.md, com racional de prazo/squad. Escolha de
  stack de rotina, sem vendor lock-in relevante (linguagem/framework open-source).
  Sem objeção.
- **ADR-006 (PostgreSQL + RLS)**: decisão de rotina, mas com peso adicional por
  sustentar tanto o isolamento multi-tenant (ADR-004) quanto a criptografia de
  coluna (`pgcrypto`) — coerente e sem lock-in crítico (Postgres é padrão aberto,
  portável entre provedores gerenciados). Sem objeção.
- **ADR-007 (sessão server-side via Redis)**: trade-off justificado por exigência
  de revogação imediata (troca de senha, logout, desativação — RF-02/04/13); risco
  de Redis como ponto único de falha já identificado como severidade Alta no
  próprio SDD.md (§6.1), com mitigação proposta (Redis gerenciado com
  replicação/failover) condicionada a validação do DevOps antes do go-live — aceito
  como adequado neste estágio, mas registro esta condição explicitamente no
  veredito abaixo, para não virar um risco "esquecido" entre o Gate 2 e a fase de
  infraestrutura real.
- **ADR-008 (MFA TOTP + OTP e-mail, sem SMS)**: atende RN-03 (Must elevado desde o
  Gate 1, ressalva 3) sem custo recorrente de SMS; trade-off de fricção de
  onboarding é aceitável e documentado. Sem objeção.
- **ADR-009 (log de auditoria append-only + hash chain)**: defesa em profundidade
  adequada para RN-08 (nenhuma edição/exclusão, nem por administrador); trade-off
  correto ao não introduzir infraestrutura de log externo desproporcional para o
  volume de 1 hospital piloto. A pendência de retenção (RNF-04) é tratada na seção
  de Risco e Compliance abaixo — é a única lacuna real deste ADR, e já era esperada
  (o próprio ADR-009 já a nomeia como pendente deste gate).

### Risco e Compliance (`risk-and-compliance-check`)

| Item do checklist | Evidência (SDD.md/PRD.md/PRD-TECNICO.md) | Severidade | Observação |
|---|---|---|---|
| **Dado pessoal/sensível** | Sistema coleta e processa dado cadastral (CPF, nome, data de nascimento) e dado de saúde (laudo, imagem, resultado de exame) — dado sensível sob LGPD Art. 5º, XI. Base legal declarada: consentimento específico e destacado (RF-12, RN-02, Art. 11, I), com registro auditável em `CONSENT_RECORD` (SDD.md §5, §7.6) | — | Base legal correta e evidenciada; nenhuma coleta sem finalidade declarada |
| **Minimização** | `SHARE_LINK` restringe acesso ao(s) exame(s) especificamente vinculado(s) (RN-07); link de compartilhamento nunca expõe a conta completa (SDD.md §2.3, §7.2); e-mail transacional carrega apenas código/link, não conteúdo de exame (RF-02/03) | — | Atende ao princípio de necessidade (LGPD Art. 6º, III); nenhuma coleta "por via das dúvidas" identificada |
| **Retenção e descarte** | RNF-04 e ADR-009 mantêm o prazo de retenção do log de auditoria como "a confirmar"; SDD.md §6.2 já reconhece que a purga só pode ser implementada "após definição legal (CTO, Gate 2)" | **Média** | Ver diretriz abaixo — não bloqueia este gate, mas não pode ficar indefinida além dele |
| **Localização/jurisdição** | ADR-010 — hospedagem em região de nuvem no Brasil (`sa-east-1`/equivalente), evitando a complexidade de transferência internacional de dado sensível (LGPD Art. 33+) | Baixa (risco mitigado pela própria decisão) | Ver avaliação específica abaixo |
| **Terceiros com acesso a dado** | (a) LIS/PACS/RIS/HIS do hospital piloto — hospital é controlador, plataforma é operadora (LGPD Art. 39/40); (b) provedor de e-mail transacional — subprocessador da plataforma, recebe apenas código/link, não dado de saúde (RF-02/03); (c) provedor de nuvem (IaaS) — operador de infraestrutura | Média (item a), Baixa (itens b/c) | Ver diretriz abaixo — item (a) precisa de instrumento contratual, não é lacuna de arquitetura |
| **Risco técnico estratégico** | Redis como ponto único de falha (§6.1, Alta); Integration Gateway como ponto único de falha de ingestão, mitigado por RF-14 (§6.1, Média); banco único sem redundância documentada ainda (§6.1, Alta, delegado ao DevOps) | Alta/Média (já mapeados, com mitigação proposta ou delegada) | Nenhum risco estrutural novo identificado além dos já mapeados pelo próprio SDD.md — checagem independente concorda com a autoavaliação do Software Architect |

**Avaliação específica de ADR-010 (residência de dados no Brasil)**: concordo com a
decisão. Reduz diretamente a superfície de risco de compliance do MVP (remove a
necessidade de base legal de transferência internacional, LGPD Art. 33+, num
momento em que não há hospital piloto nem contrato confirmado — P1/P2), e os três
provedores de nuvem majoritários citados (`sa-east-1`, Azure Brazil South,
`southamerica-east1`) têm paridade de serviço suficiente para os componentes já
decididos (PostgreSQL gerenciado, Redis gerenciado, object storage). O único ponto
de atenção nomeado pelo próprio ADR — menor opcionalidade futura de provedor/região
— é aceitável neste estágio: reverter exigiria migração de dado sensível em
produção, mas essa é exatamente a mesma classe de risco que ADR-004 já evita para
multi-tenancy, e não há indicação de que trocar de região seja uma necessidade
plausível no horizonte do MVP. **Sem objeção — ADR-010 aprovado como está.**

**Diretriz do CTO sobre retenção do log de auditoria (RNF-04, resolve a pendência
que o SDD.md/ADR-009 delegaram explicitamente a este gate)**: não é possível
confirmar um número final de retenção sem consulta jurídica formal específica ao
contrato do hospital piloto (que ainda não existe — P1/P2) — inventar um prazo
definitivo aqui violaria o mesmo princípio que o BA já seguiu no `PRD-TECNICO.md`
(não fabricar valor não confirmado). Registro, porém, a diretriz estratégica que
orienta o piso mínimo aceitável, para que o Software Architect/DevSecOps não fiquem
sem baliza até a definição legal final:
- O log de auditoria (rastro de acesso) é evidência do cumprimento de obrigações
  legais/regulatórias sobre o próprio dado de saúde (RN-08) — sua retenção não deve
  ser mais curta que o prazo de prescrição de responsabilidade civil aplicável
  (Código Civil, Art. 206) nem mais curta que o período em que a ANPD pode instaurar
  processo administrativo sobre uma eventual infração (LGPD, Art. 52).
- O laudo/resultado de exame em si (o prontuário/registro médico, distinto do log de
  auditoria) é regido por norma setorial de retenção de registro médico (ex.:
  Resolução CFM 1.821/2007 para prontuário digitalizado) — **essa não é uma decisão
  que a plataforma decide isoladamente**: é regra do hospital como guardião legal do
  prontuário, a ser confirmada contratualmente com o hospital piloto quando P1 for
  resolvida.
- **Condição**: nenhum job de purga automatizada deve ser implementado antes da
  confirmação formal (jurídico/DPO, em conjunto com o hospital piloto) — o SDD.md já
  respeita essa condição por padrão (não implementa purga agora). Isso é
  suficiente para não bloquear este Gate 2, mas fica registrado como item a resolver
  formalmente **antes do go-live do piloto**, não antes do início da implementação.

**Diretriz do CTO sobre DPIA/RIPD e relação controlador-operador**: dado o volume e
sensibilidade do dado tratado (dado de saúde de todos os pacientes elegíveis de um
hospital), recomendo a elaboração de um Relatório de Impacto à Proteção de Dados
Pessoais (RIPD/DPIA) formal antes do go-live do piloto — não é bloqueio deste gate
(a arquitetura já fornece a base técnica necessária para sustentar um DPIA:
isolamento por tenant, criptografia em duas camadas, consentimento auditável,
minimização no compartilhamento), mas é uma condição de negócio/jurídica que a
PM/Sponsor deve coordenar junto ao hospital piloto quando P1/P2 forem resolvidas.
Da mesma forma, o contrato com o hospital piloto deve formalizar a relação
controlador (hospital) / operador (plataforma), conforme LGPD Art. 39/40 — isso é
lacuna de instrumento contratual, não de arquitetura técnica, então não recai sobre
o Software Architect corrigir, mas fica registrado aqui para que ninguém a jusante
presuma que já está coberto.

**Diretriz sobre TLS (Seção 7.3 do SDD.md)**: dado o rigor de LGPD elevado desde o
Gate 1 (ressalva 3) para dado de saúde sensível, TLS 1.2 deve ser tratado como piso
**obrigatório sem exceção** em toda borda externa (não "recomendado, a confirmar")
— TLS 1.3 preferencial onde o protocolo do hospital piloto suportar, mas nunca
abaixo de 1.2. Ajuste de redação a incorporar pelo DevSecOps na validação tática
(`compliance-validation`), não uma reprovação do SDD.md — a intenção do Software
Architect já era essa, só a redação ficou como "recomendado" em vez de "mínimo
obrigatório".

### Seção 7 do SDD.md (Segurança) — checagem de rigor LGPD acima do padrão

Confirmado: a Seção 7 do SDD.md atende ao rigor exigido pela ressalva 3 do Gate 1.
Evidências específicas — MFA obrigatório sem exceção para todo perfil, sem
possibilidade de bypass (§7.1, RN-03); RBAC com ownership aplicado em toda query,
não só no frontend (§7.2); criptografia em duas camadas (disco gerenciado +
`pgcrypto` para CPF, §7.3); acesso a arquivo exclusivamente via URL assinada de
curta duração, nunca pública (§7.3); isolamento multi-tenant lógico com defesa em
profundidade (aplicação + RLS, §7.4); consentimento específico e destacado, campo
separado do aceite geral, nunca um booleano combinado (§7.6, atende Art. 11, I
literalmente). Isso é padrão de rigor claramente acima do que este agente exigiria
de um projeto sem dado sensível — nenhuma lacuna de conteúdo na Seção 7, só os dois
ajustes de redação/diretriz acima (TLS como piso obrigatório; retenção com diretriz
de piso mínimo, não número final).

### Proporcionalidade de risco/custo frente à Premissa P3 (16-20 semanas, squad enxuta)

Avaliação direta do pedido: a arquitetura **não introduz** risco/custo
desproporcional à hipótese de prazo/squad do `PRD.md` (Seção 1.4). Evidências:
- As duas decisões de maior risco de esforço (interoperabilidade HL7/FHIR e
  DICOM) foram deliberadamente resolvidas via "buy" com ACL/gateway de mercado
  exatamente para proteger a Premissa P3 — é o oposto de introduzir custo
  desproporcional, é uma mitigação direta do risco de estouro de prazo que o
  próprio Gate 1 já havia sinalizado.
- Multi-tenancy lógica (ADR-004) adiciona esforço incremental reconhecido, mas é
  esforço de disciplina de engenharia (guard de tenant + RLS), não de
  infraestrutura nova — não é da mesma ordem de grandeza de custo que multi-tenant
  físico (N bancos) teria sido, opção corretamente descartada por isso.
- Itens de alto custo/baixo valor imediato (CDN, SLA formal 99,5%, escalabilidade
  horizontal multi-hospital, hot deploy, motor de integração genérico multi-hospital)
  foram corretamente mantidos fora do MVP como dívida técnica consciente (SDD.md
  §6.2), espelhando exatamente o corte que o `PRD.md` já havia feito na Seção 4.
- Nenhum vendor SaaS comercial fechado foi introduzido (todos os componentes de
  borda são open-source self-hosted) — isso remove risco de custo recorrente não
  orçado, relevante dado que P2 (monetização) e o orçamento real (P3) ainda não
  estão validados.

**Ressalva de proporcionalidade, não bloqueante**: a arquitetura agora exige operar
simultaneamente 4 componentes de infraestrutura com estado (PostgreSQL, Redis,
Orthanc, motor de integração) além do object storage e da aplicação core — mais
superfície operacional do que um MVP de "1 hospital, sem visão de futuro"
exigiria. Isso é a consequência direta e correta de atender à exigência do Gate 1/
PRD.md (R4) de não gerar retrabalho ao escalar, não um excesso não solicitado — mas
a validação **quantitativa** de que isso cabe dentro de 16-20 semanas com a squad
enxuta (1 tech lead, 2 backend, 1-2 frontend, 1 QA) é responsabilidade formal do
Gate 3 (`capacity-and-timeline-validation`, sobre o `TASK.md` do Tech Lead), não
deste gate — registro aqui a expectativa explícita de que o Tech Lead trate o setup
e a operação inicial desses 4 componentes como itens de esforço visíveis e
dimensionados no `TASK.md`, não como "infraestrutura implícita" sem tarefa e sem
dono.

### Recomendação

**Aprovar o `SDD.md` e os 10 ADRs como estão**, sem exigir nenhuma reescrita de
arquitetura. As quatro decisões marcadas (ADR-002, ADR-003, ADR-004, ADR-010) estão
bem fundamentadas, com alternativas descartadas justificadas, sem vendor lock-in
crítico sem plano de saída, e proporcionais à Premissa P3. As ressalvas abaixo são
diretrizes e condições de acompanhamento — nenhuma delas exige um novo ciclo de
revisão do SDD.md antes de liberar UX/UI e Tech Lead.

### Veredito

**Aprovado com ressalvas.**

O `SDD.md` torna-se final a partir deste registro. UX/UI e Tech Lead estão
liberados para iniciar (nesta orquestração serializada: UX/UI primeiro). Ressalvas
a carregar adiante:

1. **Tech Lead** — o primeiro `GUARDRAILS.md` produzido deve incluir, explicitamente,
   a regra de teste automatizado obrigatório de vazamento cruzado entre tenants
   (decorrente de ADR-004/RNF-11) antes de qualquer PR de acesso a dado ser
   mergeado. Este CTO vai cobrar essa regra especificamente na primeira aprovação
   de `GUARDRAILS.md` (governança ad hoc).
2. **DevSecOps** (`compliance-validation`, tático, mais adiante no pipeline) —
   herda dois ajustes de redação/diretriz deste gate: (a) TLS 1.2 é piso
   obrigatório sem exceção para toda borda externa, não "recomendado"; (b) validar
   que nenhum payload de e-mail transacional (RF-02/RF-03) carregue dado de saúde,
   só código/link (minimização já é a intenção do SDD.md, checagem tática
   confirmará na implementação).
3. **PM/Sponsor** (não bloqueia o SDD.md, é condição de negócio/jurídica) —
   coordenar, junto ao hospital piloto quando P1/P2 forem resolvidas: (a) DPIA/RIPD
   formal antes do go-live; (b) instrumento contratual formalizando a relação
   controlador (hospital) / operador (plataforma), LGPD Art. 39/40; (c) definição
   jurídica final do prazo de retenção do log de auditoria (RNF-04), respeitando o
   piso mínimo indicado por este gate (prazo de prescrição civil/administrativo
   aplicável) até lá — nenhum job de purga deve ser implementado antes dessa
   definição.
4. **Tech Lead** (Gate 3, formal) — tratar o setup/operação inicial de PostgreSQL,
   Redis, Orthanc e o motor de integração HL7/FHIR como itens de esforço explícitos
   e dimensionados no `TASK.md`, não implícitos — a proporcionalidade frente à
   Premissa P3 foi validada nesta análise qualitativa de arquitetura, mas a
   validação quantitativa de capacidade/prazo é responsabilidade do Gate 3
   (`capacity-and-timeline-validation`).
5. **DevOps** (mais adiante) — validar antes do go-live: Redis gerenciado com
   replicação/failover automático (condição de disponibilidade já identificada
   como severidade Alta pelo próprio SDD.md, §6.1) e redundância mínima do motor
   de integração (health check + restart automático).

Nenhuma dessas ressalvas é motivo de reprovação — são condições de acompanhamento
com dono e momento de resolução claros, nenhuma delas trava UX/UI ou Tech Lead
agora. **SDD.md e os 10 ADRs em `.md/adr/` são considerados finais a partir deste
registro.**

---

## Gate 3 — Pré-TASK.md — 2026-09-02

**Skills aplicadas**: `capacity-and-timeline-validation` (`TASK.md` inteiro),
`guardrails-governance` (`GUARDRAILS.md`, primeira aprovação)
**Input avaliado**: `TASK.md` (rascunho do Tech Lead, 2026-09-02, revisado pós-
ADR-012 — 38 tarefas Backend, 22 Frontend, 7 spikes) + `GUARDRAILS.md` (rascunho
do Tech Lead, 2026-09-02, 39 regras, A a J) + `SDD.md` (final) + 12 ADRs em
`.md/adr/` + `PRD.md` (Premissas P1-P10, em especial P3) + `CTO-REVIEW.md` (Gate 1
e Gate 2) + `BLOCKERS.md` (Bloqueios 001 e 002, ambos com status `Resolvido`)

> Este é o último gate com poder de veto vinculante antes da fase de execução. Uma
> aprovação (mesmo com ressalvas) libera `TASK.md` e `GUARDRAILS.md` como
> artefatos finais de planejamento — o Gate 4 (fechamento pós-`DEPLOY.md`) é só
> registro, sem veto.

### 0. Confirmação de consistência dos bloqueios já resolvidos

Verificação direta, não uma reabertura de mérito: `BLOCKERS.md` Bloqueio 001
(contraste WCAG em `BRANDING_CONFIG`, resolvido via ADR-011) e Bloqueio 002
(rastreabilidade DICOM/`tenant_id` no Imaging Gateway, resolvido via ADR-012)
estão de fato refletidos, de forma consistente, nos três artefatos que os
consomem:

- ADR-011/012 existem em `.md/adr/` (confirmado, 12 ADRs no total).
- `TASK.md` reflete ambos: BE-32 a BE-34 implementam o gate de contraste
  (ADR-011); BE-02 (campos de schema), BE-07 (notificação com `RemoteAET`+UIDs)
  e BE-38 (nova tarefa, resolução de `tenant_id` + persistência de UIDs)
  implementam ADR-012, com BE-07/BE-22 reestimadas de forma consistente com a
  redução de incerteza declarada.
- `GUARDRAILS.md` reflete ambos: regra G.29-31 (contraste, ADR-011) e regra
  A.5/C.15 (resolução de `tenant_id` via `RemoteAET`, ADR-012).

**Sem inconsistência identificada.** Ambos os bloqueios podem permanecer
`Resolvido` em `BLOCKERS.md` sem nenhuma ação adicional deste gate.

### 1. Validação de capacidade e prazo (`capacity-and-timeline-validation`)

#### 1.1 Recálculo independente da matemática de capacidade

O Tech Lead apresentou a evidência quantitativa na Seção 5 do `TASK.md`; refaço o
cálculo de forma independente antes de aceitar a recomendação, em vez de aprovar a
conta de outro agente sem conferir (pressure-test das premissas, espírito de
`the-fool` aplicado sem necessidade de acionar a skill separadamente, dado que o
`TASK.md` já é rico o suficiente em números para uma auditoria direta):

| Cenário | Capacidade Backend (dp) | Necessário Backend (dp, c/ buffer) | Folga | Capacidade Frontend (dp) | Necessário Frontend (dp, c/ buffer) | Folga |
|---|---|---|---|---|---|---|
| 16 sem., 2 BE / 1 FE | 160 | 175 | **-15 dp (-8,6%, não cabe)** | 80 | 101 | **-21 dp (-26%, não cabe — confirma R1 do Tech Lead)** |
| 18 sem., 2 BE / 1 FE | 180 | 175 | +5 dp (+2,9%, margem mínima) | 90 | 101 | -11 dp (-12%, não cabe) |
| 20 sem., 2 BE / 1 FE | 200 | 175 | +25 dp (+12,5%, margem real) | 100 | 101 | -1 dp (~0%, cabe sem nenhuma folga) |
| 18 sem., 2 BE / 2 FE | 180 | 175 | +5 dp (margem mínima) | 180 | 101 | +79 dp (folga muito larga) |
| 20 sem., 2 BE / 2 FE | 200 | 175 | +25 dp (margem real) | 200 | 101 | +99 dp (folga muito larga) |

**Achado que ajusta a recomendação do Tech Lead, não a invalida**: a matemática
pura de volume **não exige** um 2º Frontend em nenhum cenário — 1 Frontend em 20
semanas já cobre o volume (com folga zero, o que é o problema real, não a
insuficiência de volume). O 2º Frontend recomendado pelo Tech Lead é, na prática,
uma decisão de **redução de risco de calendário**, não de capacidade bruta: (a)
FE-13 depende de SPK-06 (incerteza não resolvida), (b) FE-21 (passe de
acessibilidade transversal) precisa rodar continuamente sem competir com o
desenvolvimento de tela nova, e (c) o Frontend precisa terminar cedo o bastante
para deixar uma janela real de execução ao QA (ver R5 abaixo) — folga zero em
Frontend com 1 dev comprime exatamente essa janela. **Concordo com a
recomendação do Tech Lead, mas pela razão correta**: aprovar o 2º Frontend como
mitigação de risco de calendário/QA, não porque o volume de tarefas decompostas
o exija matematicamente. Isso não muda o veredito, mas evita que a composição de
squad seja lida, adiante, como "o volume obrigava" quando na verdade é uma
decisão de buffer deliberada.

Para o Backend, o quadro é o oposto: **18 semanas com 2 devs deixa margem de
apenas 2,9%**, sem absorver nenhum dos riscos R2/R3/R6 já nomeados pelo próprio
Tech Lead (incerteza de HL7/FHIR/DICOM ainda pós-spike em 25 dp do backlog,
infraestrutura de base consumindo 43 dp/28% de 1 dos 2 devs antes de qualquer
feature de negócio começar). **20 semanas é o piso real para o Backend caber com
alguma folga (12,5%)** — 18 semanas só é defensável como cenário otimista, não
como baseline de comunicação externa.

#### 1.2 Avaliação dos riscos R1-R7 do Tech Lead

| # | Risco do Tech Lead | Concordância do CTO | Ação/condição |
|---|---|---|---|
| R1 (capacidade Frontend) | Concordo com o diagnóstico; discordo parcialmente da causa (ver 1.1 — é risco de calendário/QA, não só de volume) | Aprovado — 2º Frontend confirmado como condição do Gate 3, não sugestão opcional |
| R2 (Backend no limite) | Concordo integralmente — confirmado no recálculo acima | Aprovado — 20 semanas passa a ser o prazo-baseline para comunicação externa; 18 semanas é piso otimista interno, não compromisso |
| R3 (gap de especialização HL7/FHIR/DICOM) | Concordo — já registrado desde o Gate 1 (gap de especialização declarada) e mitigado arquiteturalmente no Gate 2 (build vs. buy), mas o risco de **esforço**, não de arquitetura, permanece real | Condição: SPK-01/02/03 devem rodar nas 2 primeiras semanas sem exceção, como o próprio Tech Lead recomenda — este CTO reforça que nenhuma comunicação de prazo com o hospital piloto (quando P1 resolver) deve ocorrer antes desses 3 spikes fecharem |
| R4 (protocolo real do piloto, P1) | Concordo — risco já residual desde ADR-002 (Gate 2, R5) | Sem ação nova aqui — tratado na Seção 4 (viabilidade de negócio) abaixo, é mais estrutural que só de prazo |
| R5 (QA com 1 pessoa) | **Concordo e elevo a severidade**: 1 QA para 23 RFs + 35 telas + suíte de vazamento cruzado (condição não negociável, BE-04) + `accessibility-review` em toda tela + fluxo de consentimento LGPD, comprimido nas últimas 6-8 semanas do cronograma (dependente de integração Backend+Frontend concluída), é volume desproporcional mesmo em 20 semanas — pior ainda combinado com folga zero de Frontend em cenário de 1 dev (ver 1.1) | **Condição, não sugestão**: reforço de QA (2ª pessoa, ao menos parcial/compartilhada) confirmado antes do início da Fase 2 (Núcleo de valor) — se essa confirmação não vier, o Tech Lead/PM devem reabrir este gate para reavaliação, não absorver o risco silenciosamente |
| R6 (infra de base, 43 dp) | Concordo — é exatamente a ressalva 4 que este CTO registrou no Gate 2 ("tratar como esforço explícito, não implícito"); o Tech Lead atendeu tornando o esforço visível, mas o risco de quem absorve esse esforço se DevOps não apoiar continua em aberto | **Condição**: nível real de suporte de DevOps na Fase 0/1 deve ser confirmado explicitamente (quantificado — ex.: "X dp de apoio direto", não "suporte parcial" genérico) antes do início da Fase 0; se DevOps não puder confirmar apoio quantificado, os 43 dp recaem inteiramente sobre 1 dos 2 backend devs e o cálculo da Seção 1.1 piora ainda mais |
| R7 (purga de auditoria, RNF-04) | Concordo com a inação deliberada — é a mesma diretriz que este CTO já registrou no Gate 2 (nenhum job de purga antes de definição jurídica formal) | Sem ação nova — mantém-se como condição de negócio/jurídica junto ao PM/Sponsor, já registrada no Gate 2, não deste gate |

### 2. Confirmação da condição do Gate 2 (teste de vazamento cruzado entre tenants)

Verificado diretamente nos três pontos onde a condição deveria aparecer:

- **`TASK.md` BE-04**: existe como tarefa dedicada (5 dp, pós-spike SPK-04),
  critério de aceite explícito ("suíte roda em todo PR que toque camada de
  acesso a dado, bloqueante, não opcional"), e aparece na tabela de dependências
  (Seção 4.3) como pré-condição de "qualquer PR que acesse dado de domínio".
- **`GUARDRAILS.md` regra A.4**: transcreve a condição do Gate 2 quase
  literalmente, referencia `TASK.md` BE-04 explicitamente, e está redigida como
  regra bloqueante de CI, não como recomendação.
- **Consistência cruzada**: a regra A.4 e a tarefa BE-04 se referenciam
  mutuamente pelo nome, sem ambiguidade de qual artefato é a fonte da verdade
  (a regra é o `GUARDRAILS.md`; BE-04 é a implementação).

**Condição do Gate 2 integralmente atendida — sem ressalva neste ponto.**

### 3. Governança do `GUARDRAILS.md` (`guardrails-governance`)

#### 3.1 Cobertura das 39 regras por área

| Área (Seção) | Regras | Cobertura avaliada |
|---|---|---|
| A — Isolamento Multi-Tenant | 1-5 | Completa; inclui o mecanismo concreto de ADR-012 (regra A.5), não só a citação do ADR — atende ao critério de "regra prática, não resumo do SDD" que este documento se propõe a ser |
| B — Autenticação/Sessão/MFA | 6-10 | Completa; cobre ADR-007/008, RN-03/04, RNF-03 |
| C — Integração HL7/FHIR/DICOM | 11-15 | Completa; regra 15 (Orthanc nunca customizado para conceito de tenant) é um acréscimo correto e específico, não estava explícito no Gate 2 |
| D — Persistência e Auditoria | 16-20 | Completa; regra 19 (proibição de job de purga sem confirmação jurídica) traduz corretamente a diretriz deste CTO no Gate 2 |
| E — Criptografia e Residência | 21-24 | Completa; regra 21 corrige a redação "recomendado" do `SDD.md` para "piso obrigatório", exatamente a correção pedida no Gate 2 |
| F — LGPD e Consentimento | 25-28 | Completa; cobre RN-02, RN-05, minimização de e-mail (diretriz do Gate 2 ao DevSecOps) e imutabilidade de `CONSENT_RECORD` |
| G — Contraste WCAG/Branding | 29-31 | Completa; reflete ADR-011/Bloqueio 001 integralmente |
| H — Acessibilidade | 32-33 | Completa para o nível estratégico deste documento; detalhe operacional fica corretamente em `UX-SPEC.md` |
| I — Arquitetura e Stack | 34-36 | Completa; regra 36 (proibição de extrair módulo do monolito sem novo ADR) é uma boa trava contra decisão de arquitetura silenciosa durante a execução |
| J — Governança do documento | 37-39 | Completa; regra 39 fecha o ciclo corretamente (inconsistência entre `GUARDRAILS.md` e `SDD.md`/ADRs vai para `BLOCKERS.md`, nunca decidida por quem encontrar) |

**Nenhuma lacuna óbvia de segurança/LGPD, multi-tenancy ou stack/ADR obrigatório
identificada** — as 39 regras cobrem, de forma rastreável a um ADR ou a uma
decisão de gate anterior, todas as áreas de maior severidade deste projeto.

#### 3.2 Duas lacunas menores identificadas (não bloqueantes)

Pressure-test deliberado antes de aprovar — nenhum documento de 39 regras deveria
ser aprovado sem procurar ativamente o que está faltando, não só validar o que
está presente:

1. **Gestão de segredos/credenciais não tem regra própria.** `TASK.md` §1.7 já
   trata API keys de serviço-a-serviço como decisão de detalhe do Tech Lead, e a
   Seção B (Auth) cobre segredo de MFA criptografado, mas não existe, em
   `GUARDRAILS.md`, uma regra geral e explícita do tipo "PROIBIDO hardcode de
   credencial/API key/segredo em código versionado — sempre variável de
   ambiente/secret manager, nunca commitado". Isso é adjacente ao que o
   `devsecops-engineer` vai varrer taticamente (scanner de segredos), mas uma
   regra estratégica explícita aqui reforça a expectativa antes do primeiro PR
   ser aberto, em vez de depender só da detecção tática posterior.
2. **CSRF não é mencionado**, apesar de o modelo de sessão escolhido (ADR-007,
   cookie `HttpOnly`/`Secure`) ser exatamente o padrão que introduz superfície de
   CSRF se não for explicitamente mitigado (ex.: `SameSite`, token
   anti-CSRF) — a Seção B do `GUARDRAILS.md` cobre bem JWT-vs-cookie, bloqueio de
   força bruta e RBAC, mas não fecha esse ponto específico decorrente da própria
   escolha arquitetural.

**Nenhuma das duas lacunas é motivo de reprovação** — nenhuma delas é uma
omissão de regra já decidida em outro gate (diferente do que seria, por
exemplo, faltar a regra de vazamento cruzado de tenant). São lacunas de detalhe
tático, do tipo que `devsecops-engineer` endereça na validação tática
(`compliance-validation`/SAST) e que, uma vez resolvido taticamente, deve virar
regra formal aqui — devolvo ao Tech Lead como diretriz de acompanhamento: propor
um adendo a `GUARDRAILS.md` (novas linhas nas Seções B/I ou uma nova
subseção) assim que o DevSecOps confirmar o padrão de mitigação de CSRF e a
convenção de secret management, registrado como nova entrada no Log de
Alterações quando isso ocorrer — não uma condição que bloqueia a aprovação
deste rascunho hoje.

#### 3.3 Governança formal (regras 37-39) e processo de aprovação

Regras 37-39 corretamente atribuem a mim (CTO) a aprovação de mudança estrutural
e de toda exceção pontual, com coluna `Validade` para exceções temporárias — isso
está alinhado a `PIPELINE-CONVENTIONS.md` §5 e ao meu próprio guardrail
("NUNCA aprova exceção ou mudança estrutural em `GUARDRAILS.md` sem registrar a
entrada correspondente no Log de Alterações"). A linha única hoje no Log de
Alterações (versão inicial, "aguardando aprovação") é preenchida por este
registro — ver ação abaixo em `GUARDRAILS.md`.

### 4. Viabilidade geral de negócio — confronto com Premissas P1/P2/P3

**P3 (hipótese de prazo/squad) não foi estourada — foi confirmada na sua
extremidade superior já prevista.** O `PRD.md` §1.4 já registrava explicitamente
"16-20 semanas" e "1 tech lead, 2 backend, **1-2** frontend, 1 QA" como
hipótese de baliza, não de compromisso. O cenário validado neste gate — 18-20
semanas, 2 backend + 2 frontend — está **dentro** da faixa de semanas já
hipotetizada (ponta superior, não além dela) e dentro do intervalo de Frontend já
citado ("1-2"). **Isto não é um estouro de escopo/prazo a ser registrado como
risco novo ao Sponsor** — é exatamente o resultado esperado do processo que o
próprio `PRD.md` desenhou: uma hipótese ampla no início (Gate 1), confrontada
com decomposição real no Gate 3, pousando na extremidade mais realista da faixa
já sinalizada. Devo registrar isso com precisão para não gerar alarme
desproporcional ao real desvio.

**O que é, de fato, informação nova não coberta pela hipótese original**:

1. **Reforço de QA (R5)** — a hipótese P3 previa "1 QA" sem faixa (diferente do
   Frontend, que já tinha "1-2"). A necessidade de reforço, mesmo parcial, é
   custo adicional não modelado no `PRD.md` original — deve ser comunicado
   explicitamente ao PM/Sponsor como ajuste à hipótese de squad, não absorvido
   silenciosamente.
2. **P1 (hospital piloto) segue não identificado** neste ponto do pipeline —
   SPK-01 do próprio `TASK.md` confirma que o desenvolvimento segue com
   premissa de trabalho (HL7 v2.x/FHIR R4) e ambiente simulado/fixtures. Isso
   **não bloqueia o início da execução** (a arquitetura foi desenhada
   exatamente para isso no Gate 2 — baixo lock-in, ACL reversível), mas
   significa que o projeto está prestes a comprometer ~276 dp de esforço de
   engenharia (contratação/alocação real de squad por 4-5 meses) **sem** hospital
   piloto confirmado e **sem** validação do modelo de monetização (P2). Isso é
   proporcional ao valor esperado do piloto **se e somente se** o Sponsor está
   ciente de que essa janela de execução está correndo em paralelo à
   negociação comercial do piloto, não depois dela — e aceita o risco de que
   SPK-01 (protocolo real) force reestimativa de BE-06/BE-24 no meio da
   execução, algo já sinalizado desde o Gate 2 (R5) e reforçado aqui.
3. **Não há número de orçamento real confirmado em nenhum artefato até este
   ponto** (P3 nunca teve contraparte de "orçamento aprovado", só a hipótese de
   squad/prazo) — este CTO não tem como confirmar proporcionalidade
   financeira final sem esse dado, que é decisão de negócio fora da autoridade
   deste agente. Registro esta lacuna explicitamente para o PM/Sponsor, como já
   feito no Gate 1 (ressalva 1) e no Gate 2 — ainda não fechada dois gates
   depois.

**Conclusão de proporcionalidade**: a decisão técnica (arquitetura + decomposição
de tarefas) é proporcional e disciplinada — nenhum excesso de engenharia, nenhum
gold-plating, buy-not-build nos dois pontos de maior risco, squad no limite
inferior do que o escopo exige, não superdimensionada. O risco real não é
técnico, é de **sequenciamento comercial**: iniciar execução plena antes de P1/P2
estarem resolvidas é uma escolha de negócio válida (permite usar o tempo de
desenvolvimento em paralelo à negociação comercial), mas só é responsável se o
Sponsor tomar essa decisão conscientemente, não por omissão. **Não bloqueia este
Gate 3** (o próprio Tech Lead já desenhou o trabalho das primeiras fases para não
depender de P1 — ambiente simulado/fixtures), mas é registrado como condição
explícita de negócio abaixo.

### Veredito

**`TASK.md`: Aprovado com ressalvas.**
**`GUARDRAILS.md`: Aprovado com ressalvas — entra em vigor a partir deste
registro** (ver atualização de status e Log de Alterações no próprio arquivo).
**Gate 3: Aprovado com ressalvas.** Este é o encerramento do fluxo de
planejamento — `TASK.md` e `GUARDRAILS.md` tornam-se os artefatos finais que
liberam a fase de execução.

Condições de acompanhamento (nenhuma trava o início da Fase 0, todas têm dono e
momento de verificação explícitos; descumprimento de qualquer uma delas **reabre
este gate**, não é absorvido silenciosamente pelo time de execução):

1. **Tech Lead** — ajustar a baliza de comunicação de prazo/squad do projeto
   para **20 semanas com 2 backend + 2 frontend** como cenário-base (não 16-18
   semanas); 18 semanas permanece um piso otimista interno, nunca comunicado
   externamente como compromisso.
2. **Tech Lead + PM** — confirmar reforço de QA (2ª pessoa, ao menos parcial)
   antes do início da Fase 2 (Núcleo de valor) do cronograma da Seção 4.2 do
   `TASK.md` — se não for possível confirmar, reabrir este gate para reavaliar
   escopo/prazo de QA antes de a Fase 2 começar, não comprimir o teste
   silenciosamente no fim do cronograma.
3. **Tech Lead + DevOps** — confirmar, antes do início da Fase 0, o nível real e
   quantificado de apoio de DevOps ao setup de infraestrutura com estado
   (PostgreSQL, Redis, Orthanc, motor de integração — os 43 dp da Seção 3.1 do
   `TASK.md`) — "suporte parcial" não é uma confirmação suficiente para este
   gate considerar R6 mitigado.
4. **Backend** — rodar SPK-01, SPK-02 e SPK-03 nas duas primeiras semanas da
   Fase 0 sem exceção, antes de qualquer compromisso de prazo com o hospital
   piloto (quando P1 for resolvida) ser comunicado externamente.
5. **Tech Lead** — propor, em um próximo adendo ao `GUARDRAILS.md` (nova linha
   no Log de Alterações, quando ocorrer), regra explícita de gestão de
   segredos/credenciais e a definição de mitigação de CSRF para o modelo de
   sessão via cookie (ADR-007), assim que o DevSecOps confirmar taticamente o
   padrão a adotar — não bloqueia a aprovação de hoje, é acompanhamento para a
   próxima revisão viva deste documento.
6. **PM/Sponsor** — estar formalmente ciente de que a execução plena (~276 dp,
   squad de 4-5 pessoas por 18-20 semanas) está iniciando com P1 (hospital
   piloto) e P2 (modelo de monetização) ainda não validados — decisão de negócio
   aceitável (o desenho técnico já protege essa opção via baixo lock-in/ACL
   reversível), mas deve ser uma escolha consciente do Sponsor, não uma
   inferência silenciosa herdada deste gate técnico. Recomenda-se um checkpoint
   formal ao final da Fase 1 (~semana 6) para reconfirmar P1/P2 antes de a Fase
   2 aprofundar investimento.
7. **CTO (este agente)** — nenhuma ação pendente própria; a próxima interação
   formal deste agente com o pipeline é ad hoc (escalonamento de bloqueio, se
   houver) ou o Gate 4 (registro de fechamento, pós-`DEPLOY.md`, sem veto).

**Backend e Frontend estão liberados para iniciar a Fase 0 do cronograma
(`TASK.md` §4.2) a partir deste registro**, sujeitos às condições 2-4 acima
serem endereçadas nas primeiras semanas, não antes do início.

---

## Gate 3 (reabertura pontual) — Retrabalho Visual "Painel de Saúde" — 2026-09-04

**Skill aplicada**: `capacity-and-timeline-validation`, com escopo restrito ao
que o próprio Tech Lead delimitou (não o `TASK.md` inteiro): risco R1
(composição do squad de Frontend) e R8, novo (Seção 5), e o sequenciamento do
novo Lote 11 (Seção 4.1/4.1.3).
**Input avaliado**: `TASK.md` (revisão de 2026-09-04 — Seção 3.17/Lote 11,
FE-23 a FE-29; Seção 5, risco R8; "Nota pós-Gate 3 (2026-09-04)") +
`UX-SPEC.md` (revisão de 2026-09-04, nota de topo + Seções 3.1/3.1.1/3.3/5/6/
7.4) + `CTO-REVIEW.md` (Gate 3 original, 2026-09-02) + decisão do stakeholder
do produto, comunicada fora deste pipeline formal e refletida em `UX-SPEC.md`/
`TASK.md`.

> Escopo desta reabertura: estritamente pontual, conforme delimitado pelo
> próprio Tech Lead. Backend, escopo geral, arquitetura e as demais condições
> de acompanhamento já registradas no Gate 3 original (2026-09-02) **não são
> reavaliadas** — permanecem exatamente como aprovadas naquela data.

### Fato-base: origem da decisão

O retrabalho visual "Painel de Saúde" e a manutenção da squad em 1
desenvolvedor Frontend, mesmo com o cronograma se estendendo além da janela
de referência, **não são recomendações deste pipeline de agentes** — são
decisões já tomadas pelo stakeholder do produto, autoridade de negócio do
projeto, fora deste fluxo formal, apenas formalizadas nos artefatos técnicos
(`UX-SPEC.md` pela UX/UI, `TASK.md` pelo Tech Lead). Este gate não reavalia o
mérito de "é uma boa ideia redesenhar" nem de "1 dev é suficiente" — isso não
é decisão técnica revisável por este agente. O papel deste registro é
formalizar a mudança de condição de capacidade/prazo que decorre dessa
decisão, dentro da autoridade de veto vinculante deste CTO sobre o Gate 3, e
confirmar que nenhum risco técnico fica silenciosamente absorvido atrás da
decisão de negócio.

### Confirmação quantitativa (R1/R8)

Confirmo o recálculo da Seção 5 do Tech Lead: com o esforço de Frontend
revisado (~132 dp buferizado; 115 dp sem buffer, 88+27), o cenário "1
desenvolvedor Frontend" deixa de caber mesmo no teto de 20 semanas da
Premissa P3 (100 dp de capacidade) — déficit de ~32 dp (~32%), não uma
diferença de arredondamento. Esse número já era o limite de "folga zero" no
Gate 3 original (2026-09-02, Seção 1.1) — o retrabalho consome exatamente a
folga que já era zero.

Diferente do Gate 3 original, porém, esta condição **não é mais uma decisão
de composição de squad em aberto para este gate arbitrar**: o stakeholder do
produto já decidiu explicitamente **manter a squad em 1 desenvolvedor
Frontend** e **aceitar a extensão do cronograma além das 20 semanas de
referência**, em vez de reforçar a squad — não há urgência de prazo declarada
para este projeto. Este CTO não questiona essa decisão de negócio (fora de
sua alçada arbitrar prazo vs. custo de squad quando o dono do orçamento já
decidiu) — o papel deste gate é confirmar que a decisão está registrada, é
internamente consistente com o restante do `TASK.md`, e não deixa risco
técnico/arquitetural sem tratamento por trás da decisão de prazo.

### O que muda na leitura do risco

- **R1/R8 deixam de ser risco em aberto pendente de decisão do Gate 3** e
  passam a ser uma **condição aceita do projeto**: 1 desenvolvedor Frontend,
  cronograma de Frontend estendido além das 20 semanas de referência da
  Premissa P3. A leitura técnica de que 2 devs Frontend seria a composição de
  menor risco de calendário/QA (Gate 3 original, Seção 1.1) não é revogada
  como constatação técnica, mas deixa de ser condição de aprovação — a
  autoridade de negócio que arca com o risco de calendário já decidiu
  conscientemente aceitá-lo.
- A janela de 20 semanas usada como referência no `TASK.md`/`CTO-REVIEW.md`
  (Gate 3 original) **deixa de ser a expectativa vigente de conclusão do
  Frontend** no cenário real de 1 dev — não é mais um teto a comunicar como
  meta para a frente de Frontend. Recalcular a nova baliza formal de prazo
  continua sendo prerrogativa do Tech Lead, não deste gate.
- Nenhum risco de QA (R5), Backend, arquitetura ou compliance é reaberto por
  esta decisão — confirmado que o retrabalho é 100% Frontend/apresentação,
  sem novo campo de schema ou contrato de API (já verificado pelo próprio
  Tech Lead na Seção 6 do `TASK.md`: "nenhuma lacuna estrutural encontrada").
- Ressalva de acompanhamento, não bloqueante: QA/DevSecOps precisarão
  revalidar telas/componentes já aprovados uma vez (Lote 1 inteiro + FE-05/
  06/07) sob a nova direção visual — o próprio R8 do Tech Lead já nomeia essa
  pressão adicional sobre R5 (QA, recurso mais apertado do projeto, Gate 3
  original). Não é reaberto aqui como risco novo, mas fica reforçado: o
  cronograma estendido de Frontend (aceito pelo stakeholder) desloca quando o
  QA recebe telas prontas para validar, e essa comunicação com o QA é do
  Tech Lead, não deste gate.

### Veredito

**Reabertura pontual do Gate 3 (R1/R8 e Seção 4.1/4.1.3 do `TASK.md`):
Aprovada, sem ressalva bloqueante.**

1. Composição de squad de Frontend confirmada: **1 desenvolvedor**, por
   decisão do stakeholder do produto (fora deste pipeline de agentes), não
   por recomendação técnica deste CTO nem do Tech Lead — registrado aqui para
   que nenhum agente downstream leia isso como "o CTO decidiu que 1 dev
   basta". Este CTO mantém o entendimento técnico de que 2 devs seria a
   composição de menor risco de calendário/QA (análise original de
   2026-09-02) — a diferença é que o dono do risco de prazo já decidiu
   conscientemente aceitar o cenário de maior risco, e não há urgência que
   torne essa aceitação desproporcional.
2. O cronograma de referência de 20 semanas **deixa de se aplicar** como
   expectativa de conclusão do Frontend neste projeto — R1/R8 fecham como
   condição aceita do projeto, não como pendência em aberto. Qualquer
   comunicação futura de prazo relativa ao Frontend deve refletir a extensão
   além das 20 semanas, não o teto original.
3. Sequenciamento do Lote 11 (Seção 4.1/4.1.3 do `TASK.md`) confirmado como
   aceitável do ponto de vista de capacidade/calendário, condicionado à mesma
   composição de squad (1 Frontend) — sem objeção adicional.
4. **Escopo desta aprovação é estritamente o delimitado pelo Tech Lead na
   "Nota pós-Gate 3 (2026-09-04)"** — Backend, os demais riscos (R2-R7),
   arquitetura e as condições de acompanhamento 1-7 já registradas no Gate 3
   original (2026-09-02) permanecem inalteradas e não são reabertas por este
   registro.

**Ação devolvida ao Tech Lead** (dono do `TASK.md` — este CTO não edita o
artefato diretamente, conforme guardrail próprio): atualizar, na próxima
revisão de `TASK.md`, o status de R1/R8 (Seção 5) e a "Nota pós-Gate 3
(2026-09-04)" para refletir o fechamento formal registrado aqui — de
"reabertura pontual em aberto, aguardando confirmação do Gate 3" para
"fechada, decisão aceita do projeto (1 dev Frontend, cronograma estendido
além de 20 semanas)", com referência a este registro do `CTO-REVIEW.md`.

**Nenhuma entrada em `BLOCKERS.md` é necessária**: não há conflito entre
agentes a arbitrar (a decisão de negócio já chegou resolvida da autoridade de
produto, não de um agente do pipeline reportando inconsistência) — este
registro em `CTO-REVIEW.md` é o mecanismo de governança correto para o
fechamento de uma reabertura pontual de gate, análogo ao fechamento do
próprio Gate 3 original.
