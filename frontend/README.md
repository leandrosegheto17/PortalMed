# Frontend — Portal de Resultados de Exames

React 19 + TypeScript, Vite. Ver `.md/TASK.md` (Seção 3.10 em diante) para o
backlog de tarefas Frontend e `.md/UX-SPEC.md` para fluxos de tela e sistema
de design.

## Scripts

```
npm install
npm run dev       # servidor de desenvolvimento
npm run build     # typecheck (tsc -b) + build de produção
npm run lint      # oxlint
npx vitest run    # testes (unitários + componente)
npx vitest run --coverage
```

## Design system (`src/design-system/`)

Implementa `TASK.md` FE-01 — tokens visuais em duas camadas
(`UX-SPEC.md` §3.3):

- **Camada 2 — tokens fixos** (`tokens/tokens.css` + `tokens/fixedTokenValues.ts`,
  as duas fontes de verdade mantidas em sincronia por
  `fixedTokenValues.sync.test.ts`): cores/tipografia/espaçamento do sistema,
  independentes de tenant, já verificados WCAG 2.1 AA.
- **Camada 1 — marca dinâmica** (`branding/`): `--color-brand-primary` e
  `--brand-logo-url` aplicados em runtime a partir de `BRANDING_CONFIG`
  (`applyBrandTokens.ts`), nunca hardcoded. Inclui a regra de contraste
  dinâmico (`contrast/contrast.ts`, `pickAccessibleTextColor`): a cor de texto
  sobre `--color-brand-primary` é escolhida automaticamente entre branco e o
  tom escuro fixo do sistema, garantindo >= 4.5:1 (WCAG 2.1 AA) para
  **qualquer** paleta de hospital.

### Status: integração contra mock (não `Concluída`)

`BRANDING_CONFIG` ainda não é um endpoint publicado em
`.md/API-CONTRACT.yaml` — a tarefa correspondente no Backend (`BE-32`) está
mais adiante no backlog. Em vez de bloquear (regra de paralelização,
`TASK.md` §4.1), o consumo de `BRANDING_CONFIG` está implementado contra uma
fixture local que espelha o schema já definido em `SDD.md`/ADR-011
(`branding/brandingConfig.mock.ts`).

Ponto único de troca quando o endpoint real for publicado:
`branding/brandingApi.ts` (`fetchBrandingConfig`) — trocar o corpo pela
chamada HTTP real (client compartilhado de FE-22), mantendo a assinatura
`() => Promise<BrandingConfig>`. Nenhum outro módulo do design system precisa
mudar.

Use `npm run test` (ver acima) para validar o comportamento antes/depois da
troca — os testes de `useBrandingTokens`/`BrandTokensProvider` usam injeção de
dependência (`fetchFn`) exatamente para não precisar mudar quando isso
acontecer.
