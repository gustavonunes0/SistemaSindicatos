import { createBrowserRouter } from 'react-router-dom';
import { AfiliadoDashboardPage } from './features/afiliado/components/AfiliadoDashboardPage';
import { AdminDashboardPage } from './features/admin/components/AdminDashboardPage';
import { EsqueciSenhaPage } from './features/auth/components/EsqueciSenhaPage';
import { RedirectHome, RequireRole } from './features/auth/components/guards';
import { LoginPage } from './features/auth/components/LoginPage';
import { RedefinirSenhaPage } from './features/auth/components/RedefinirSenhaPage';

export const router = createBrowserRouter([
  { path: '/', element: <RedirectHome /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/esqueci-senha', element: <EsqueciSenhaPage /> },
  { path: '/redefinir-senha', element: <RedefinirSenhaPage /> },
  {
    path: '/admin',
    element: (
      <RequireRole role="ADMIN">
        <AdminDashboardPage />
      </RequireRole>
    ),
  },
  {
    path: '/afiliado',
    element: (
      <RequireRole role="AFILIADO">
        <AfiliadoDashboardPage />
      </RequireRole>
    ),
  },
]);
