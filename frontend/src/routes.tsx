import type { RouteObject } from 'react-router-dom'
import { CadastroBloqueioMenorIdadePage } from './pages/CadastroBloqueioMenorIdadePage/CadastroBloqueioMenorIdadePage'
import { CadastroConfirmacaoPage } from './pages/CadastroConfirmacaoPage/CadastroConfirmacaoPage'
import { CadastroCpfNaoLocalizadoPage } from './pages/CadastroCpfNaoLocalizadoPage/CadastroCpfNaoLocalizadoPage'
import { CadastroDadosPessoaisPage } from './pages/CadastroDadosPessoaisPage/CadastroDadosPessoaisPage'
import { CadastroDefinirSenhaPage } from './pages/CadastroDefinirSenhaPage/CadastroDefinirSenhaPage'
import { CadastroTermosConsentimentoPage } from './pages/CadastroTermosConsentimentoPage/CadastroTermosConsentimentoPage'
import { LandingPage } from './pages/LandingPage/LandingPage'
import { PlaceholderPage } from './pages/PlaceholderPage/PlaceholderPage'

/**
 * Definição de rotas da aplicação — **primeira introdução de roteamento no
 * projeto** (`TASK.md` FE-05, decisão de detalhe documentada no relatório da
 * tarefa: `react-router-dom` v7, dentro da autoridade do Frontend Developer,
 * já que nenhum artefato de arquitetura/UX-SPEC/TASK.md fixava biblioteca).
 *
 * Extraída de `App.tsx` para ser reutilizável tanto pelo `BrowserRouter` real
 * (produção) quanto por `MemoryRouter` em teste (`App.test.tsx`), sem
 * duplicar a lista de rotas em dois lugares.
 *
 * `/entrar` continua rota placeholder (`PlaceholderPage.tsx`) até FE-08
 * (login real, TL-08) substituir pela tela real.
 *
 * `/criar-conta` (FE-06, TL-02) e seus dois desfechos de bloqueio —
 * `/criar-conta/bloqueio-idade` (TL-03, RN-01) e
 * `/criar-conta/cpf-nao-localizado` (TL-04, RF-15) — já são as telas reais.
 *
 * `/criar-conta/termos` (TL-05, FE-07), `/criar-conta/senha` (TL-06, FE-07) e
 * `/criar-conta/sucesso` (TL-07, FE-07) completam o fluxo de cadastro
 * (`UX-SPEC.md` §1.1) — `/criar-conta/termos` deixa de ser placeholder nesta
 * tarefa; `/criar-conta/senha` e `/criar-conta/sucesso` são rotas novas
 * (antes inexistentes, já que TL-06/TL-07 não tinham nenhum destino de
 * navegação até FE-07 existir). Dados coletados em TL-02 são repassados por
 * `location.state` de tela em tela (ver `cadastroPersonalData.ts`), sem
 * introduzir uma store global.
 */
export const appRoutes: RouteObject[] = [
  { path: '/', element: <LandingPage /> },
  { path: '/entrar', element: <PlaceholderPage title="Entrar" /> },
  { path: '/criar-conta', element: <CadastroDadosPessoaisPage /> },
  { path: '/criar-conta/bloqueio-idade', element: <CadastroBloqueioMenorIdadePage /> },
  { path: '/criar-conta/cpf-nao-localizado', element: <CadastroCpfNaoLocalizadoPage /> },
  { path: '/criar-conta/termos', element: <CadastroTermosConsentimentoPage /> },
  { path: '/criar-conta/senha', element: <CadastroDefinirSenhaPage /> },
  { path: '/criar-conta/sucesso', element: <CadastroConfirmacaoPage /> },
]
