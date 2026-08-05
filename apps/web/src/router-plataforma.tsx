import { createBrowserRouter, Navigate } from 'react-router-dom';
import { EsqueciSenhaPage } from './features/auth/components/EsqueciSenhaPage';
import { LoginPage } from './features/auth/components/LoginPage';
import { RedefinirSenhaPage } from './features/auth/components/RedefinirSenhaPage';
import {
  PlataformaGate,
  PlataformaLoginRedirect,
} from './features/plataforma/PlataformaHomePage';

/** Rotas exclusivas do host da plataforma (SindiGest / SUPERADMIN). */
export const platformRouter = createBrowserRouter([
  { path: '/', element: <PlataformaLoginRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/esqueci-senha', element: <EsqueciSenhaPage /> },
  { path: '/redefinir-senha', element: <RedefinirSenhaPage /> },
  { path: '/plataforma', element: <PlataformaGate /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
