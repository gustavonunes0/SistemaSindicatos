import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { AfiliadoDashboardPage } from './features/afiliado/components/AfiliadoDashboardPage';
import { AdminDashboardPage } from './features/admin/components/AdminDashboardPage';
import { EsqueciSenhaPage } from './features/auth/components/EsqueciSenhaPage';
import { RequireRole } from './features/auth/components/guards';
import { LoginPage } from './features/auth/components/LoginPage';
import { RedefinirSenhaPage } from './features/auth/components/RedefinirSenhaPage';
import { NoticiaFormPage } from './features/noticias/components/admin/NoticiaFormPage';
import { NoticiasAdminPage } from './features/noticias/components/admin/NoticiasAdminPage';
import { NoticiaDetalhePage } from './features/noticias/components/NoticiaDetalhePage';
import { NoticiasPage } from './features/noticias/components/NoticiasPage';
import { ContatoPage } from './pages/ContatoPage';
import { HomePage } from './pages/HomePage';
import { SobrePage } from './pages/SobrePage';

function protegidaAdmin(element: React.ReactNode) {
  return <RequireRole role="ADMIN">{element}</RequireRole>;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/sobre', element: <SobrePage /> },
      { path: '/contato', element: <ContatoPage /> },
      { path: '/noticias', element: <NoticiasPage /> },
      { path: '/noticias/:slug', element: <NoticiaDetalhePage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/esqueci-senha', element: <EsqueciSenhaPage /> },
  { path: '/redefinir-senha', element: <RedefinirSenhaPage /> },
  { path: '/admin', element: protegidaAdmin(<AdminDashboardPage />) },
  { path: '/admin/noticias', element: protegidaAdmin(<NoticiasAdminPage />) },
  { path: '/admin/noticias/nova', element: protegidaAdmin(<NoticiaFormPage />) },
  { path: '/admin/noticias/:id/editar', element: protegidaAdmin(<NoticiaFormPage />) },
  {
    path: '/afiliado',
    element: (
      <RequireRole role="AFILIADO">
        <AfiliadoDashboardPage />
      </RequireRole>
    ),
  },
]);
