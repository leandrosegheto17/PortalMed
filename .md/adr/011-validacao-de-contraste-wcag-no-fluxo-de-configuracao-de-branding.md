# ADR-011: Validação de Contraste (WCAG 2.1 AA) como Gate Obrigatório no Fluxo de Configuração de BRANDING_CONFIG

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect (resolução de bloqueio, não requer novo Gate 2 —
  ver `.claude/agents/software-architect.md`, seção "Recebe reabertura de")
- **Tags**: architecture, accessibility, security-baseline, process-gate, branding

> **Origem**: `BLOCKERS.md`, Bloqueio 001 (2026-09-02) — reportado por `ux-ui`,
> escalado a `software-architect`. Este ADR resolve o ponto pontual sinalizado;
> não reabre nem substitui nenhuma outra decisão já aceita no `SDD.md`.

## Contexto e Problema

RF-11/RN-10 estabelecem que a identidade visual do hospital (`logo_url`,
`paleta_cores` em `BRANDING_CONFIG`, ver `SDD.md` §5) é aplicada via
configuração feita pela equipe interna do projeto, sem painel self-service
nesta release. RNF-06 (WCAG 2.1 AA) é Must-have inegociável. O `UX-SPEC.md`
(Seção 3.3) já garante, no nível de **componente**, que todo texto renderizado
sobre `--color-brand-primary` tem contraste ≥ 4.5:1 calculado dinamicamente —
mas essa regra não cobre um cenário fora do controle do componente: um logo
fornecido pelo hospital que já contém texto de baixo contraste **embutido na
própria imagem**. Não havia, até esta decisão, nenhuma etapa formal no
processo de configuração de `BRANDING_CONFIG` que capturasse esse risco antes
do go-live de um hospital.

## Decision Drivers

- RNF-06 é Must-have inegociável — nenhuma configuração de hospital pode ir a
  produção violando WCAG 2.1 AA, independentemente da causa (componente ou
  ativo fornecido pelo hospital).
- O contraste de uma cor sólida (`paleta_cores`) contra os tokens fixos do
  sistema (Camada 2, `UX-SPEC.md` §3.3) é **determinístico e computável** pela
  fórmula de contraste do WCAG — barato de automatizar.
- O conteúdo de um logo (`logo_url`) é uma imagem arbitrária fornecida pelo
  hospital — validar texto embutido nela exigiria análise de imagem/OCR, custo
  de engenharia desproporcional para o volume do MVP (1 hospital piloto,
  RN-10 sem self-service).
- `BRANDING_CONFIG` já é configurado manualmente pela equipe interna (não há
  fluxo self-service do hospital) — ponto natural para inserir um gate de
  validação sem tocar em nenhuma superfície pública.

## Considered Options

1. **Checklist manual apenas** — equipe interna revisa visualmente logo e
   paleta antes de ativar a configuração, sem ferramenta.
2. **Ferramenta automatizada apenas** — checagem de contraste programática
   sobre `paleta_cores` e melhor esforço sobre `logo_url`.
3. **Híbrido**: checagem automatizada obrigatória sobre `paleta_cores` (gate
   bloqueante, cálculo determinístico) **+** checklist manual obrigatório de
   revisão visual do `logo_url` (julgamento humano, já que é imagem
   arbitrária), ambos registrados como dado em `BRANDING_CONFIG` antes da
   configuração poder ser marcada `ativo`.
4. **Nenhuma validação nova** (status quo) — rejeitada, deixa RNF-06 exposto
   exatamente no cenário identificado pelo Bloqueio 001.

## Decision Outcome

Opção escolhida: **"Híbrido" (Opção 3)**, porque cobre integralmente a lacuna
identificada sem introduzir engenharia desproporcional ao volume do MVP: a
parte determinística (paleta) é barata de automatizar e vira um gate rígido;
a parte não-determinística (logo) permanece um julgamento humano — mas deixa
de ser opcional, tornando-se pré-requisito formal de aceite da configuração.

### Mudanças de arquitetura decorrentes

- **`BRANDING_CONFIG` (SDD.md §5)** ganha os campos:
  - `status_validacao_contraste` (`pendente` | `aprovado` | `reprovado`)
  - `metodo_validacao` (`automatizado` | `manual` | `ambos`)
  - `validado_por` (referência a `ACCOUNT` da equipe interna)
  - `validado_em` (datetime)
  - `observacoes_validacao` (texto, opcional — ex.: motivo de reprovação)
- **Gate de ativação**: a aplicação core não permite que a configuração de um
  tenant seja considerada pronta para go-live enquanto
  `status_validacao_contraste != 'aprovado'` — regra de negócio da aplicação
  (módulo Config de Tenant/Branding, SDD.md §2.1), não apenas processo
  operacional informal.
- **Checagem automatizada de paleta**: utilitário leve (script/CLI interno,
  não um serviço novo exposto) aplica a fórmula de contraste do WCAG 2.1 sobre
  `paleta_cores` vs. os tokens fixos do sistema (Camada 2, `UX-SPEC.md` §3.3),
  executado no momento da configuração pela equipe interna. Reprovação
  automática bloqueia o avanço do fluxo.
- **Checklist manual de logo**: revisão visual obrigatória do `logo_url` por
  um membro da equipe interna (ex.: presença de texto embutido de baixo
  contraste), com resultado registrado nos campos acima antes da aprovação.

### Positive Consequences

- Fecha integralmente a lacuna do Bloqueio 001 — cobre tanto paleta
  (automatizável) quanto logo (não automatizável de forma confiável no MVP).
- Reaproveita o processo de configuração manual já existente (RN-10), sem
  introduzir serviço/infraestrutura nova de alto custo.
- Rastreável e auditável (quem validou, quando, com qual método) — reforça a
  evidência de conformidade a RNF-06 exigível em auditoria futura.

### Negative Consequences

- Introduz uma dependência de processo humano (checklist de logo) que pode
  atrasar o onboarding de um hospital se não houver SLA operacional definido
  para essa revisão — definição desse SLA é operacional, fora do escopo deste
  ADR.
- A checagem automatizada cobre apenas cor sólida contra token fixo; não
  substitui uma revisão visual completa (ex.: paleta usada em combinação não
  prevista) — mitigado pela etapa manual permanecer obrigatória mesmo com
  automação aprovada.

## Pros and Cons of the Options

### Híbrido (automatizado + manual) ✅ Chosen

- ✅ Cobre 100% do cenário identificado no Bloqueio 001 (paleta e logo)
- ✅ Custo de engenharia proporcional ao volume do MVP (1 hospital piloto)
- ✅ Rastreável via dado estruturado em `BRANDING_CONFIG`
- ❌ Depende de disciplina operacional da equipe interna na etapa manual

### Checklist manual apenas

- ✅ Nenhum esforço de engenharia adicional
- ❌ Sujeito a erro humano mesmo na parte determinística (contraste de cor),
  que poderia ser garantida por cálculo

### Ferramenta automatizada apenas

- ✅ Reduz esforço manual da equipe interna
- ❌ Não cobre de forma confiável texto embutido em imagem arbitrária —
  deixaria exatamente o cenário do Bloqueio 001 sem cobertura real

## Links

- `SDD.md`, Seção 5 (`BRANDING_CONFIG`) e Seção 7.7 (nova)
- `BLOCKERS.md`, Bloqueio 001
- `UX-SPEC.md`, Seção 3.3 (regra de contraste dinâmico de componente) e Seção
  7.2 (ponto sinalizado)
- `PRD-TECNICO.md`, RNF-06, RF-11, RN-10
