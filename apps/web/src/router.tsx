import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { AfiliadoDashboardPage } from './features/afiliado/components/AfiliadoDashboardPage';
import { CadastroAfiliadoPage } from './features/afiliado/components/CadastroAfiliadoPage';
import { AfiliadosAdminPage } from './features/afiliado/components/admin/AfiliadosAdminPage';
import { AdminDashboardPage } from './features/admin/components/AdminDashboardPage';
import { EsqueciSenhaPage } from './features/auth/components/EsqueciSenhaPage';
import { RequireRole } from './features/auth/components/guards';
import { LoginPage } from './features/auth/components/LoginPage';
import { RedefinirSenhaPage } from './features/auth/components/RedefinirSenhaPage';
import { ConvenioDetalhePage } from './features/convenios/components/ConvenioDetalhePage';
import { ConveniosAdminPage } from './features/convenios/components/admin/ConveniosAdminPage';
import { ConveniosPage } from './features/convenios/components/ConveniosPage';
import { EleicaoDetalheAdminPage } from './features/eleicao/components/admin/EleicaoDetalheAdminPage';
import { EleicoesAdminPage } from './features/eleicao/components/admin/EleicoesAdminPage';
import { EleicaoResultadoPage } from './features/eleicao/components/EleicaoResultadoPage';
import { EleicaoVotacaoPage } from './features/eleicao/components/EleicaoVotacaoPage';
import { EleicoesPage } from './features/eleicao/components/EleicoesPage';
import { NoticiasAdminPage } from './features/noticias/components/admin/NoticiasAdminPage';
import { NoticiaDetalhePage } from './features/noticias/components/NoticiaDetalhePage';
import { NoticiasPage } from './features/noticias/components/NoticiasPage';
import { ImoveisAdminPage } from './features/imoveis/components/admin/ImoveisAdminPage';
import { ImovelDetalhePage } from './features/imoveis/components/ImovelDetalhePage';
import { ImoveisPage } from './features/imoveis/components/ImoveisPage';
import { MinhasSolicitacoesPage } from './features/solicitacoes/components/MinhasSolicitacoesPage';
import { SolicitacaoDetalhePage } from './features/solicitacoes/components/SolicitacaoDetalhePage';
import { SolicitacoesAdminPage } from './features/solicitacoes/components/admin/SolicitacoesAdminPage';
import { ContatoPage } from './pages/ContatoPage';
import { DiretoriaPage } from './pages/DiretoriaPage';
import { HomePage } from './pages/HomePage';
import { SobrePage } from './pages/SobrePage';

function protegidaAdmin(element: React.ReactNode) {
  return <RequireRole role="ADMIN">{element}</RequireRole>;
}

function protegidaAfiliado(element: React.ReactNode) {
  return <RequireRole role="AFILIADO">{element}</RequireRole>;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/sobre', element: <SobrePage /> },
      { path: '/diretoria', element: <DiretoriaPage /> },
      { path: '/contato', element: <ContatoPage /> },
      { path: '/noticias', element: <NoticiasPage /> },
      { path: '/noticias/:slug', element: <NoticiaDetalhePage /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/cadastro', element: <CadastroAfiliadoPage /> },
  { path: '/esqueci-senha', element: <EsqueciSenhaPage /> },
  { path: '/redefinir-senha', element: <RedefinirSenhaPage /> },
  { path: '/admin', element: protegidaAdmin(<AdminDashboardPage />) },
  { path: '/admin/afiliados', element: protegidaAdmin(<AfiliadosAdminPage />) },
  { path: '/admin/noticias', element: protegidaAdmin(<NoticiasAdminPage />) },
  { path: '/admin/noticias/nova', element: <Navigate to="/admin/noticias" replace /> },
  { path: '/admin/noticias/:id/editar', element: <Navigate to="/admin/noticias" replace /> },
  { path: '/admin/convenios', element: protegidaAdmin(<ConveniosAdminPage />) },
  { path: '/admin/convenios/novo', element: <Navigate to="/admin/convenios" replace /> },
  { path: '/admin/convenios/:id/editar', element: <Navigate to="/admin/convenios" replace /> },
  { path: '/admin/eleicoes', element: protegidaAdmin(<EleicoesAdminPage />) },
  { path: '/admin/eleicoes/:id', element: protegidaAdmin(<EleicaoDetalheAdminPage />) },
  { path: '/admin/imoveis', element: protegidaAdmin(<ImoveisAdminPage />) },
  { path: '/admin/imoveis/novo', element: <Navigate to="/admin/imoveis" replace /> },
  { path: '/admin/imoveis/:id/editar', element: <Navigate to="/admin/imoveis" replace /> },
  { path: '/admin/solicitacoes', element: protegidaAdmin(<SolicitacoesAdminPage />) },
  {
    path: '/admin/solicitacoes/:id',
    element: protegidaAdmin(<SolicitacaoDetalhePage visao="admin" />),
  },
  { path: '/afiliado', element: protegidaAfiliado(<AfiliadoDashboardPage />) },
  { path: '/afiliado/convenios', element: protegidaAfiliado(<ConveniosPage />) },
  { path: '/afiliado/convenios/:id', element: protegidaAfiliado(<ConvenioDetalhePage />) },
  { path: '/afiliado/imoveis', element: protegidaAfiliado(<ImoveisPage />) },
  { path: '/afiliado/imoveis/:id', element: protegidaAfiliado(<ImovelDetalhePage />) },
  { path: '/afiliado/eleicoes', element: protegidaAfiliado(<EleicoesPage />) },
  { path: '/afiliado/eleicoes/:id', element: protegidaAfiliado(<EleicaoVotacaoPage />) },
  {
    path: '/afiliado/eleicoes/:id/resultado',
    element: protegidaAfiliado(<EleicaoResultadoPage />),
  },
  { path: '/afiliado/solicitacoes', element: protegidaAfiliado(<MinhasSolicitacoesPage />) },
  {
    path: '/afiliado/solicitacoes/:id',
    element: protegidaAfiliado(<SolicitacaoDetalhePage visao="afiliado" />),
  },
]);
