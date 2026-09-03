import { BrowserRouter, useRoutes } from 'react-router-dom'
import { appRoutes } from './routes'

function AppRoutes() {
  return useRoutes(appRoutes)
}

/**
 * App shell com roteamento real (FE-05 — ver `routes.tsx` para a definição
 * de rotas e o racional da escolha de `react-router-dom`).
 *
 * `BrandTokensProvider` é aplicado uma única vez, em `main.tsx` (raiz da
 * aplicação) — não duplicado aqui. O `App.tsx` anterior (demo estrutural de
 * FE-02, provando a composição de Header/Navigation/Footer/ConfirmationModal/
 * MessageBanner) foi substituído pela primeira tela real do produto
 * (`LandingPage`, TL-01); a cobertura de teste daquela composição já existe
 * de forma independente em cada componente (`Header.test.tsx`,
 * `Navigation.test.tsx`, `Footer.test.tsx`, `ConfirmationModal.test.tsx`,
 * `MessageBanner.test.tsx`, todos de FE-02), não é perdida por esta troca.
 */
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
