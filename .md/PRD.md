# PRD.md — Portal de Resultados de Exames (Aplicação White Label para Hospitais)

**Dono**: PM
**Data**: 2026-09-02
**Status**: Pronto para o Business Analyst (checklist de Critérios de Pronto ao final
deste documento — todos os itens verificados)
**Input**: `CTO-REVIEW.md` — Gate 1 (Pré-descoberta), veredito **Aprovado com
ressalvas**, 2026-09-02 + Briefing de negócio original do stakeholder ("Requisitos
Iniciais – Portal de Resultados de Exames")

> Este é o primeiro `PRD.md` do repositório. As 4 ressalvas do Gate 1 são endereçadas
> explicitamente ao longo das 7 seções abaixo e referenciadas por número (R1-R4) onde
> tratadas diretamente.

---

## 1. Problema e Contexto

### 1.1 Problema de negócio (hipótese de trabalho — R1)

O briefing original descreve a solução com bastante detalhe, mas não declara a dor de
negócio por trás dela nem o modelo comercial. Como o CTO registrou no Gate 1, isso é
lacuna que o PM precisa preencher — não presumir tecnicamente, mas formular como
**hipótese explícita, verificável junto ao hospital piloto**, não como fato validado:

- **Hoje**, hospitais de médio/grande porte tipicamente entregam resultados de exames
  por um ou mais destes caminhos: (a) retirada presencial/impressa na recepção, (b)
  portal genérico do fornecedor de LIS/PACS, sem identidade visual do hospital e
  frequentemente fragmentado por tipo de exame (um portal para laboratório, outro para
  imagem), ou (c) portal de terceiro licenciado, com custo alto e pouco controle de
  marca/experiência para o hospital.
- Isso gera três dores distintas, cada uma para um perfil diferente: **paciente**
  (atraso/fricção para obter resultado, precisa retornar ao hospital ou ligar),
  **hospital/marca** (perde controle de experiência digital com o paciente, sem
  diferenciação visual/institucional) e **TI do hospital** (múltiplos sistemas
  legados heterogêneos sem um canal único e seguro de entrega ao paciente).
- **Hipótese de problema central**: hospitais não têm hoje uma forma de oferecer, sob
  a própria marca, um canal digital único, seguro e auditável de entrega de resultados
  de exames ao paciente, que também sirva de camada de conformidade com a LGPD sobre
  dado de saúde.

Esta hipótese **precisa ser validada com um hospital piloto real** antes de o
Business Analyst aprofundar requisitos — ver Premissa **P1** (Seção 6).

### 1.2 Modelo de monetização (hipótese — R1)

Modelo de negócio confirmado no Gate 1 como **B2B2C**: o hospital é o cliente
contratante, o paciente é o usuário final. Hipótese de monetização a validar:

- **SaaS B2B por hospital**, com (a) fee de implementação/onboarding não recorrente
  (cobre custo de integração com LIS/PACS/RIS/HIS daquele hospital, que varia por
  heterogeneidade do parque legado) + (b) assinatura recorrente (mensal/anual),
  possivelmente escalonada por volume de pacientes ativos ou volume de exames
  processados no portal.
- Alternativa a descartar ou confirmar com o piloto: cobrança por exame
  disponibilizado (modelo transacional) em vez de assinatura fixa.

### 1.3 Hospital piloto (R1)

**Nenhum hospital piloto está identificado no briefing original.** Isso é bloqueio
para o Business Analyst detalhar requisitos de integração (Seção 3.3 do briefing —
qual LIS/PACS/RIS/HIS específico) e para o Software Architect avaliar viabilidade
técnica real de integração. Registrado como Premissa **P1** (Seção 6), dono e prazo
de validação lá definidos.

### 1.4 Hipótese de orçamento/prazo (R1, em resposta direta à ressalva do Gate 1)

O CTO sinalizou que o escopo das Seções 3-6 do briefing, se implementado por inteiro,
é de porte enterprise multi-trimestre. O PM não decide orçamento real (isso é
decisão de negócio/CTO), mas registra aqui uma **hipótese de baliza** para o corte de
MVP feito na Seção 4 e para o CTO/Software Architect confrontarem contra viabilidade
real:

- **Hipótese de prazo**: 16-20 semanas (~4-5 meses) para a primeira entrega (MVP,
  escopo definido na Seção 4), com um único hospital piloto e uma única integração
  LIS/PACS/RIS/HIS.
- **Hipótese de porte de squad**: equipe enxuta de execução (ordem de grandeza:
  1 tech lead, 2 desenvolvedores backend, 1-2 frontend, 1 QA, suporte parcial de
  DevSecOps/DevOps) — não uma squad de porte enterprise full-stack completa.
- Esta hipótese **não é compromisso de prazo real** — é a baliza que orientou o corte
  de escopo da Seção 4. Precisa ser confrontada pelo CTO/Software Architect
  (Gate 2/Gate 3) contra orçamento e capacidade real. Ver Premissa **P3** (Seção 6).

---

## 2. Público-Alvo

Nomeado especificamente, não como "todos os usuários":

- **Cliente contratante (buyer)**: diretoria de TI e diretoria administrativa de
  **hospitais privados de médio/grande porte no Brasil**, que já possuem sistemas de
  informação digitalizados (LIS/PACS/RIS/HIS) e hoje entregam resultado por canal
  presencial, portal genérico de fornecedor ou terceiro caro (ver Seção 1.1).
  Hospital piloto específico ainda não identificado (Premissa P1).
- **Usuário final (paciente)**: pacientes desses hospitais, **maiores de 18 anos**,
  com acesso próprio a e-mail e/ou celular para autenticação e recuperação de senha.
  Atendimento a menores de idade/pacientes sem capacidade de autoatendimento digital
  (acesso por responsável legal/cuidador) está **fora desta release** — ver Seção 4 e
  Premissa P7.
- **Usuário operacional interno do hospital**: equipe técnica de TI do hospital,
  responsável por configurar/manter a integração com os sistemas internos
  (LIS/PACS/RIS/HIS), e um administrador operacional do hospital responsável por
  gerenciar usuários e parâmetros básicos do portal (não necessariamente
  self-service completo de identidade visual nesta release — ver Seção 4).

---

## 3. Objetivo de Sucesso

Sem baseline histórico disponível (produto novo, sem piloto ainda definido) — metas
abaixo serão confirmadas com baseline real do hospital piloto assim que a Premissa P1
for resolvida, mas já são declaradas como métrica mensurável com meta-alvo, não como
objetivo vago:

| # | Métrica | Baseline | Meta | Prazo de medição |
|---|---|---|---|---|
| 1 (Norte) | Taxa de adoção: % de pacientes elegíveis do hospital piloto que acessam o portal e consultam ao menos 1 resultado | Sem baseline — primeira medição | ≥ 40% dos pacientes elegíveis | 90 dias após go-live no piloto |
| 2 (Valor operacional) | Redução no volume de solicitações presenciais/telefônicas de resultados no hospital piloto | A levantar com o hospital piloto antes do go-live (pré-condição de P1) | Redução ≥ 30% frente ao baseline levantado | 6 meses após go-live |
| 3 (Validação de negócio) | Conversão do piloto em contrato pago recorrente | N/A (é o primeiro piloto) | Contrato assinado (sim/não) | Até 3 meses após fim do período de piloto |

A métrica 3 é o critério que valida — ou invalida — a hipótese de monetização da
Seção 1.2. Se não houver conversão, o modelo de monetização precisa ser revisto antes
de investir em Release 2.

---

## 4. Escopo desta Release (dentro / fora)

### 4.1 Corte de MVP — resposta direta à ressalva do Gate 1 (R2)

O Gate 1 exigiu que o corte de MVP fosse aplicado **dentro das Seções 3-6 do
briefing** (autenticação, área do paciente, área administrativa, requisitos
técnicos/operacionais/UX), não apenas reaproveitando a Seção 7 do briefing ("fora do
escopo imediato") como único filtro. A tabela da Seção 5 faz esse corte item a item.
Resumo executivo do corte:

**Dentro do MVP (Release 1 — 1 hospital piloto)**:
- Autenticação usuário/senha, recuperação por e-mail, MFA (elevado de "opcional" para
  obrigatório — ver R3 abaixo), sessão com expiração automática.
- Lista de exames por data/tipo/categoria, exibição de laudo em PDF/HTML, exibição de
  imagem de exame em JPEG/PNG convertido, download, compartilhamento por **link
  temporário com expiração** (não anexo por e-mail — decisão de produto por risco
  LGPD, ver R3), histórico de acessos/downloads (auditoria).
- Identidade visual do hospital piloto aplicada (mas configurada pela equipe interna,
  não via painel self-service), textos institucionais (termos, política de
  privacidade) obrigatórios desde o dia 1, gestão básica de usuários, **uma**
  integração LIS/PACS/RIS/HIS (a do hospital piloto), regras de segurança de
  compartilhamento com padrão seguro pré-configurado.
- Web responsiva, criptografia em trânsito/repouso, RBAC, logs de auditoria
  completos, conformidade LGPD (consentimento explícito, finalidade clara), WCAG 2.1
  AA, monitoramento básico de erros/desempenho, manual de uso e suporte técnico ao
  hospital piloto.

**Fora do MVP, mas no roadmap (Release 2 — pós-validação do piloto)**:
- Recuperação de senha via SMS, filtros avançados de categoria, visualizador DICOM
  nativo (zoom/pan/window-level), painel self-service de identidade visual/textos
  para o hospital se auto-configurar, motor de integração genérico multi-LIS/PACS
  (necessário só ao escalar para hospital #2+), CDN, SLA formal de 99,5%,
  escalabilidade horizontal multi-hospital, hot deploy.

**Fora do horizonte atual (preservado da Seção 7 do briefing original — corte já
correto, PM endossa sem alteração)**:
- Chat seguro com equipe médica, notificações push, integração com prontuário
  eletrônico, aplicativo mobile nativo.

Justificativa central do corte: o MVP existe para **validar o problema de negócio e
o modelo de monetização (Seção 1) com um único hospital piloto**, não para entregar a
plataforma white-label multi-hospital completa de uma vez. Self-service de
white-label, motor de integração genérico e escala horizontal só geram valor quando
existe hospital #2 — antes disso, são custo antecipado sem validação.

### 4.2 Nota de arquitetura — sinalização ao Software Architect (R4, não é decisão do PM)

Ainda que o escopo funcional do MVP mire um único hospital piloto, o Gate 1 já
registrou que os três pontos abaixo precisam de tratamento explícito no `SDD.md`,
com `build-vs-buy-analysis` quando aplicável — o PM não decide isso, apenas garante
que a sinalização chega ao Software Architect via este PRD e via Premissas P9/P10
(Seção 6):

1. Integração com LIS/PACS/RIS/HIS heterogêneos entre hospitais (via HL7/FHIR/API
   proprietária) — mesmo que o MVP integre só 1 sistema, a decisão de construir do
   zero vs. usar motor de integração de mercado afeta diretamente a hipótese de
   prazo da Seção 1.4.
2. Visualização de imagens médicas em DICOM — MVP corta para JPEG/PNG convertido;
   decisão de biblioteca/serviço de mercado para o visualizador nativo (Release 2)
   deve ser avaliada com antecedência para não ficar decisão de última hora.
3. Arquitetura de multi-tenancy/white-label e isolamento de dados entre hospitais —
   decisão de desenhar já multi-tenant-ready desde o MVP (mesmo com 1 hospital) vs.
   single-tenant com migração futura é trade-off de custo/retrabalho que cabe ao
   Software Architect avaliar formalmente, não ao PM.

---

## 5. Requisitos de Alto Nível Priorizados

**Framework aplicado**: MoSCoW (Must/Should/Could/Won't) para o corte de release,
com racional qualitativo inspirado em RICE (Reach, Impact, Confidence, Effort) para
desempate dentro de cada categoria — `product-roadmap-prioritization` foi consultado
dado o volume de itens (mais de 20 requisitos de alto nível vindos das Seções 3-6 do
briefing, acima do limiar de ~5 que justifica o framework). RICE quantitativo
(scores numéricos) não foi aplicado porque `Reach`/`Impact` reais dependem de dados
do hospital piloto, ainda não identificado (Premissa P1) — poderá ser refeito quando
houver piloto confirmado e dados de uso.

| Requisito | Origem (briefing) | Prioridade | Justificativa (RICE qualitativo) |
|---|---|---|---|
| Login usuário/senha + sessão com expiração | 3.1 | Must | Reach/Impact altos (bloqueia todo o resto), Effort baixo |
| Recuperação de senha por e-mail | 3.1 | Must | Impact alto em suporte/atrito, Effort baixo |
| MFA | 3.1 (era "opcional") | **Must** (elevado — ver R3) | Impact alto em risco LGPD/dado sensível, Confidence alta de que é exigido; Effort médio, mas risco de não ter é maior que o custo |
| Recuperação de senha por SMS | 3.1 | Should (Release 2) | Impact incremental baixo sobre e-mail, Effort médio (vendor SMS) |
| Lista de exames por data/tipo | 3.2 | Must | Reach/Impact altos, é o núcleo de valor |
| Filtros por categoria | 3.2 | Must | Effort baixo, Impact de usabilidade relevante |
| Laudo em PDF/HTML | 3.2 | Must | Núcleo de valor, Effort baixo-médio |
| Imagem convertida JPEG/PNG | 3.2 | Must | Cobre a maior parte do valor de imagem com Effort muito menor que DICOM nativo |
| Visualizador DICOM nativo (zoom/pan/window-level) | 3.2/4.1 | Should (Release 2) | Impact alto só para casos de uso radiológicos avançados; Effort alto, candidato a build-vs-buy (Architect) |
| Download de laudo/imagem | 3.2 | Must | Reach/Impact altos, Effort baixo |
| Compartilhamento por link temporário com expiração | 3.2/3.3 | Must | Impact alto (diferencial de segurança), Effort médio |
| Compartilhamento por anexo direto de e-mail | 3.2 | **Won't** | Risco LGPD alto (dado sensível trafegando sem controle de acesso pós-envio) supera o Impact de conveniência |
| Histórico de acessos/downloads (auditoria) | 3.2 | Must | Exigência de rigor LGPD (R3), Effort médio |
| Identidade visual aplicada (não self-service) | 3.3 | Must | Necessário para validar a proposta white-label com o piloto; Effort baixo se configurado internamente |
| Painel self-service de identidade visual/textos | 3.3 | Could (Release 2+) | Só gera valor com hospital #2+; Effort alto para Reach de 1 hospital |
| Textos institucionais (termos, privacidade) | 3.3 | Must | Exigência legal/LGPD, Effort baixo |
| Gestão básica de usuários | 3.3 | Must | Operação mínima viável, Effort baixo-médio |
| Integração com 1 LIS/PACS/RIS/HIS (piloto) | 3.3/4.1 | Must | Sem dado de exame não há produto; Effort alto mas inegociável |
| Motor de integração genérico multi-hospital | 3.3/4.1 | Could (Release 2+) | Só necessário ao escalar; Effort alto sem Reach imediato |
| Regras de segurança de compartilhamento (expiração, permissão por tipo) | 3.3/4.2 | Must | Exigência de rigor LGPD (R3), Effort médio |
| Self-service de regras de segurança por hospital admin | 3.3 | Could (Release 2+) | Padrão seguro fixo já cobre o piloto |
| Web responsiva | 4.1 | Must | Reach alto, Effort baixo-médio |
| Criptografia em trânsito/repouso, RBAC, auditoria completa, conformidade LGPD | 4.2 | Must | Inegociável dado dado de saúde sensível (R3) |
| CDN | 4.3 | Could (Release 2+) | Benefício de performance só relevante em escala multi-hospital |
| SLA formal 99,5% | 4.3 | Should (Release 2) | Pilotos toleram manutenção programada; formalizar SLA é pré-requisito comercial de escala, não de validação |
| Escalabilidade horizontal multi-hospital (funcional) | 4.3 | Won't (MVP funcional) | Sem Reach de hospital #2 ainda; arquitetura deve ser *desenhada* extensível (nota R4), mas não é requisito funcional do MVP |
| Manual de uso, suporte técnico ao piloto | 5 | Must | Necessário para go-live do piloto, Effort baixo |
| Monitoramento contínuo de erros/desempenho (básico) | 5 | Must | Dado de saúde eleva custo de erro não detectado |
| Hot deploy | 5 | Could (Release 2+) | Engenharia desejável, não bloqueia validação do piloto |
| Interface simples/navegação clara | 6 | Must | Núcleo de UX, Effort médio |
| WCAG 2.1 AA | 6 | Must | Público inclui pacientes idosos/com deficiência; mantido apesar da pressão de prazo do MVP |
| Customização visual completa (full white-label) | 6 | Could (Release 2+) | Sobreposto pelo item de painel self-service acima |
| Chat, push, prontuário eletrônico, app nativo | 7 | Won't (fora do horizonte atual) | Corte já correto no briefing original — PM endossa sem alteração |

---

## 6. Premissas e Riscos de Produto

Toda premissa/risco abaixo tem dono e prazo de validação, conforme Critérios de
Pronto deste agente.

| # | Premissa/Risco | Dono | Prazo de validação |
|---|---|---|---|
| P1 | Hospital piloto ainda não identificado — bloqueia detalhamento de integração pelo BA e avaliação técnica pelo Architect | Stakeholder/Sponsor de negócio (com apoio do PM) | Antes do Business Analyst iniciar levantamento detalhado de integração (Seção 3.3 do briefing) |
| P2 | Modelo de monetização (Seção 1.2) é hipótese não validada com hospital real | PM + Sponsor comercial | Antes do Gate 3 (viabilidade de prazo/squad); idealmente já na assinatura do piloto |
| P3 | Hipótese de orçamento/prazo (Seção 1.4) não confrontada contra orçamento real aprovado | CTO + Sponsor financeiro | Antes do Software Architect consolidar o `SDD.md` (Gate 2) |
| P4 | MFA elevado a Must-have (R3) aumenta esforço de autenticação e pode pressionar a hipótese de prazo (P3) | PM (registra) + Software Architect (avalia viabilidade) + CTO (decide trade-off final) | Antes do Business Analyst detalhar requisito de autenticação |
| P5 | Complexidade real de integração com o parque legado do hospital piloto (LIS/PACS/RIS/HIS) só será conhecida após P1 ser resolvida; risco de estourar P3 se o sistema do piloto for muito proprietário/sem API documentada | Software Architect (`build-vs-buy-analysis`) + Equipe Técnica do hospital piloto | Descoberta técnica antes do Gate 2 |
| P6 | Rigor de LGPD para dado de saúde sensível (R3) pode exigir controles não totalmente mapeados neste PRD (ex.: DPIA, termo de consentimento específico, envolvimento de DPO do hospital) | CTO (`risk-and-compliance-check`, Gate 2) + DevSecOps (`compliance-validation`, tático) | Antes do Gate 2 |
| P7 | Política para pacientes menores de idade/sem capacidade de autoatendimento digital (acesso por responsável legal) não definida; ficou fora desta release (Seção 4) mas é risco de exclusão de parte da base de pacientes do hospital piloto | PM + Hospital piloto (regra de negócio) | Antes do Business Analyst detalhar regras de autenticação/RBAC |
| P8 | Adiar visualizador DICOM nativo para Release 2 pode reduzir valor percebido se o hospital piloto tiver alto volume de exames de imagem/radiologia como caso de uso principal | PM (validar com hospital piloto assim que definido) | Junto com P1 |
| P9 | Arquitetura de multi-tenancy/white-label (isolamento de dados entre hospitais) ainda não desenhada — decisão de já construir multi-tenant-ready desde o MVP vs. single-tenant com migração futura é trade-off de custo/retrabalho (R4) | Software Architect (`architecture-decision-review` + `build-vs-buy-analysis`, Gate 2) | Antes do `SDD.md` |
| P10 | Escolha entre construir integração HL7/FHIR e visualização DICOM do zero vs. usar biblioteca/serviço de mercado ainda não avaliada; impacta diretamente a hipótese de prazo (P3) (R4) | Software Architect | Antes do `SDD.md` / Gate 2 |

---

## 7. Perguntas em Aberto para o Business Analyst

1. Qual é o hospital piloto e quais sistemas LIS/PACS/RIS/HIS ele usa hoje (protocolo,
   versão, existência de API documentada)? [depende de P1]
2. Existe política de acesso para pacientes menores de idade/responsáveis
   legais/cuidadores? Como isso deve ser tratado em regras de autenticação e RBAC?
   [depende de P7]
3. Qual é o SLA de suporte esperado durante a fase de piloto (não o SLA formal de
   99,5% do briefing original, que fica para a fase de escala — ver Seção 4)?
4. O hospital piloto exige envolvimento de DPO próprio no fluxo de consentimento, ou
   a plataforma deve prover o mecanismo de consentimento de forma independente?
   [depende de P6]
5. Quais tipos de exame (sangue, anatomopatológico, imagem) representam o maior
   volume/valor para o hospital piloto? Necessário para validar se o corte de
   imagem em JPEG/PNG (sem DICOM nativo) é aceitável para o MVP ou é bloqueador de
   adoção. [depende de P8]
6. Quais idiomas/localidades a plataforma precisa suportar já no MVP? (o briefing
   original não menciona internacionalização)
7. Existe base de pacientes/histórico de exames já digitalizado a migrar, ou o
   piloto começa do zero (sem dados históricos pré-lançamento)?

---

## Checklist de Critérios de Pronto (`stakeholder-alignment-check`)

- [x] Problema declarado em termos verificáveis (Seção 1.1), não vago — registrado
      explicitamente como hipótese a validar, não como fato assumido
- [x] Público-alvo nomeado especificamente (Seção 2) — hospitais privados de
      médio/grande porte no Brasil já digitalizados, pacientes maiores de 18 anos;
      não "todos os usuários"
- [x] Objetivo de sucesso é métrica mensurável, com baseline (ou plano explícito de
      levantamento) e meta (Seção 3)
- [x] Escopo tem "dentro" e "fora" explícitos, todo corte com justificativa
      (Seção 4 e tabela da Seção 5)
- [x] Toda funcionalidade de alto nível tem prioridade justificada com framework
      aplicado (MoSCoW + racional RICE qualitativo, Seção 5) — não lista arbitrária
- [x] Toda premissa/risco de produto tem dono e prazo de validação (Seção 6)
- [x] Nenhuma das 7 seções está vazia ou com placeholder
- [x] `stakeholder-alignment-check` executado: as 4 ressalvas do Gate 1
      (`CTO-REVIEW.md`) foram confrontadas contra este PRD — R1 (Seção 1), R2
      (Seção 4.1 e tabela da Seção 5), R3 (tratado como requisito Must em toda a
      Seção 5, não como detalhe técnico posterior), R4 (Seção 4.2 + Premissas
      P9/P10). **Nenhum conflito não resolvido identificado** entre o escopo deste
      PRD e o alinhamento estratégico validado no Gate 1 — não há necessidade de
      escalar para o CTO neste momento.

**Veredito do PM**: PRD pronto. Liberado para o Business Analyst.
