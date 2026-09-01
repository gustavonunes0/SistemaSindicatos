import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { EstadoCarregando } from './components/ui/EstadoCarregando';
import { RequireRole } from './features/auth/components/guards';
import { HomePage } from './pages/HomePage';

const SobrePage = lazy(() =>
  import('./pages/SobrePage').then((m) => ({ default: m.SobrePage })),
);
const DiretoriaPage = lazy(() =>
  import('./pages/DiretoriaPage').then((m) => ({ default: m.DiretoriaPage })),
);
const ContatoPage = lazy(() =>
  import('./pages/ContatoPage').then((m) => ({ default: m.ContatoPage })),
);
const ConveniosPublicPage = lazy(() =>
  import('./pages/ConveniosPublicPage').then((m) => ({ default: m.ConveniosPublicPage })),
);
const ConvenioPublicoDetalhePage = lazy(() =>
  import('./features/convenios/components/ConvenioPublicoDetalhePage').then((m) => ({
    default: m.ConvenioPublicoDetalhePage,
  })),
);
const ValidarDeclaracaoPage = lazy(() =>
  import('./pages/ValidarDeclaracaoPage').then((m) => ({ default: m.ValidarDeclaracaoPage })),
);
const NoticiasPage = lazy(() =>
  import('./features/noticias/components/NoticiasPage').then((m) => ({
    default: m.NoticiasPage,
  })),
);
const NoticiaDetalhePage = lazy(() =>
  import('./features/noticias/components/NoticiaDetalhePage').then((m) => ({
    default: m.NoticiaDetalhePage,
  })),
);
const LoginPage = lazy(() =>
  import('./features/auth/components/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const CadastroAfiliadoPage = lazy(() =>
  import('./features/afiliado/components/CadastroAfiliadoPage').then((m) => ({
    default: m.CadastroAfiliadoPage,
  })),
);
const EsqueciSenhaPage = lazy(() =>
  import('./features/auth/components/EsqueciSenhaPage').then((m) => ({
    default: m.EsqueciSenhaPage,
  })),
);
const RedefinirSenhaPage = lazy(() =>
  import('./features/auth/components/RedefinirSenhaPage').then((m) => ({
    default: m.RedefinirSenhaPage,
  })),
);
const AdminDashboardPage = lazy(() =>
  import('./features/admin/components/AdminDashboardPage').then((m) => ({
    default: m.AdminDashboardPage,
  })),
);
const TutoriaisAdminPage = lazy(() =>
  import('./features/admin/components/TutoriaisAdminPage').then((m) => ({
    default: m.TutoriaisAdminPage,
  })),
);
const AfiliadosAdminPage = lazy(() =>
  import('./features/afiliado/components/admin/AfiliadosAdminPage').then((m) => ({
    default: m.AfiliadosAdminPage,
  })),
);
const FinanceiroHubPage = lazy(() =>
  import('./features/financeiro/components/admin/FinanceiroHubPage').then((m) => ({
    default: m.FinanceiroHubPage,
  })),
);
const BalancetesAdminPage = lazy(() =>
  import('./features/balancetes/components/admin/BalancetesAdminPage').then((m) => ({
    default: m.BalancetesAdminPage,
  })),
);
const BalanceteDetalheAdminPage = lazy(() =>
  import('./features/balancetes/components/admin/BalanceteDetalheAdminPage').then((m) => ({
    default: m.BalanceteDetalheAdminPage,
  })),
);
const D8AdminPage = lazy(() =>
  import('./features/d8/components/admin/D8AdminPage').then((m) => ({ default: m.D8AdminPage })),
);
const D8DetalheAdminPage = lazy(() =>
  import('./features/d8/components/admin/D8DetalheAdminPage').then((m) => ({
    default: m.D8DetalheAdminPage,
  })),
);
const NoticiasAdminPage = lazy(() =>
  import('./features/noticias/components/admin/NoticiasAdminPage').then((m) => ({
    default: m.NoticiasAdminPage,
  })),
);
const AlertasAdminPage = lazy(() =>
  import('./features/alertas/components/admin/AlertasAdminPage').then((m) => ({
    default: m.AlertasAdminPage,
  })),
);
const DeclaracoesAdminPage = lazy(() =>
  import('./features/declaracoes/components/admin/DeclaracoesAdminPage').then((m) => ({
    default: m.DeclaracoesAdminPage,
  })),
);
const MinhasDeclaracoesPage = lazy(() =>
  import('./features/declaracoes/components/MinhasDeclaracoesPage').then((m) => ({
    default: m.MinhasDeclaracoesPage,
  })),
);
const FormulariosAdminPage = lazy(() =>
  import('./features/formularios/components/admin/FormulariosAdminPage').then((m) => ({
    default: m.FormulariosAdminPage,
  })),
);
const FormularioBuilderPage = lazy(() =>
  import('./features/formularios/components/admin/FormularioBuilderPage').then((m) => ({
    default: m.FormularioBuilderPage,
  })),
);
const FormularioRespostasPage = lazy(() =>
  import('./features/formularios/components/admin/FormularioRespostasPage').then((m) => ({
    default: m.FormularioRespostasPage,
  })),
);
const FormularioPublicoPage = lazy(() =>
  import('./features/formularios/components/FormularioPublicoPage').then((m) => ({
    default: m.FormularioPublicoPage,
  })),
);
const MeusFormulariosPage = lazy(() =>
  import('./features/formularios/components/MeusFormulariosPage').then((m) => ({
    default: m.MeusFormulariosPage,
  })),
);
const JuridicoPage = lazy(() =>
  import('./features/juridico/components/JuridicoPage').then((m) => ({
    default: m.JuridicoPage,
  })),
);
const ConveniosAdminPage = lazy(() =>
  import('./features/convenios/components/admin/ConveniosAdminPage').then((m) => ({
    default: m.ConveniosAdminPage,
  })),
);
const EleicoesAdminPage = lazy(() =>
  import('./features/eleicao/components/admin/EleicoesAdminPage').then((m) => ({
    default: m.EleicoesAdminPage,
  })),
);
const EleicaoDetalheAdminPage = lazy(() =>
  import('./features/eleicao/components/admin/EleicaoDetalheAdminPage').then((m) => ({
    default: m.EleicaoDetalheAdminPage,
  })),
);
const ImoveisAdminPage = lazy(() =>
  import('./features/imoveis/components/admin/ImoveisAdminPage').then((m) => ({
    default: m.ImoveisAdminPage,
  })),
);
const SolicitacaoDetalhePage = lazy(() =>
  import('./features/solicitacoes/components/SolicitacaoDetalhePage').then((m) => ({
    default: m.SolicitacaoDetalhePage,
  })),
);
const AfiliadoDashboardPage = lazy(() =>
  import('./features/afiliado/components/AfiliadoDashboardPage').then((m) => ({
    default: m.AfiliadoDashboardPage,
  })),
);
const ConveniosPage = lazy(() =>
  import('./features/convenios/components/ConveniosPage').then((m) => ({
    default: m.ConveniosPage,
  })),
);
const ConvenioDetalhePage = lazy(() =>
  import('./features/convenios/components/ConvenioDetalhePage').then((m) => ({
    default: m.ConvenioDetalhePage,
  })),
);
const ImoveisPage = lazy(() =>
  import('./features/imoveis/components/ImoveisPage').then((m) => ({ default: m.ImoveisPage })),
);
const ImovelDetalhePage = lazy(() =>
  import('./features/imoveis/components/ImovelDetalhePage').then((m) => ({
    default: m.ImovelDetalhePage,
  })),
);
const EleicoesPage = lazy(() =>
  import('./features/eleicao/components/EleicoesPage').then((m) => ({ default: m.EleicoesPage })),
);
const EleicaoVotacaoPage = lazy(() =>
  import('./features/eleicao/components/EleicaoVotacaoPage').then((m) => ({
    default: m.EleicaoVotacaoPage,
  })),
);
const EleicaoResultadoPage = lazy(() =>
  import('./features/eleicao/components/EleicaoResultadoPage').then((m) => ({
    default: m.EleicaoResultadoPage,
  })),
);

function comSuspense(element: React.ReactNode) {
  return <Suspense fallback={<EstadoCarregando mensagem="Carregando…" />}>{element}</Suspense>;
}

function protegidaAdmin(element: React.ReactNode) {
  return comSuspense(<RequireRole role="ADMIN">{element}</RequireRole>);
}

function protegidaAfiliado(element: React.ReactNode) {
  return comSuspense(<RequireRole role="AFILIADO">{element}</RequireRole>);
}

function RedirecionarBalanceteDetalhe() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/admin/financeiro/balancetes/${id ?? ''}`} replace />;
}

function RedirecionarD8Detalhe() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/admin/financeiro/d8/${id ?? ''}`} replace />;
}

function RedirecionarSolicitacaoAdmin() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/admin/imoveis/solicitacoes/${id ?? ''}`} replace />;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/noticias', element: comSuspense(<NoticiasPage />) },
      { path: '/noticias/:slug', element: comSuspense(<NoticiaDetalhePage />) },
      { path: '/convenios', element: comSuspense(<ConveniosPublicPage />) },
      { path: '/convenios/:id', element: comSuspense(<ConvenioPublicoDetalhePage />) },
      { path: '/formularios/:slug', element: comSuspense(<FormularioPublicoPage />) },
      { path: '/sobre', element: comSuspense(<SobrePage />) },
      { path: '/diretoria', element: comSuspense(<DiretoriaPage />) },
      { path: '/contato', element: comSuspense(<ContatoPage />) },
    ],
  },
  { path: '/validar-declaracao/:codigo', element: comSuspense(<ValidarDeclaracaoPage />) },
  { path: '/login', element: comSuspense(<LoginPage />) },
  { path: '/cadastro', element: comSuspense(<CadastroAfiliadoPage />) },
  { path: '/esqueci-senha', element: comSuspense(<EsqueciSenhaPage />) },
  { path: '/redefinir-senha', element: comSuspense(<RedefinirSenhaPage />) },
  { path: '/admin', element: protegidaAdmin(<AdminDashboardPage />) },
  { path: '/admin/tutoriais', element: protegidaAdmin(<TutoriaisAdminPage />) },
  { path: '/admin/afiliados', element: protegidaAdmin(<AfiliadosAdminPage />) },
  { path: '/admin/financeiro', element: protegidaAdmin(<FinanceiroHubPage />) },
  {
    path: '/admin/financeiro/balancetes',
    element: protegidaAdmin(<BalancetesAdminPage />),
  },
  {
    path: '/admin/financeiro/balancetes/:id',
    element: protegidaAdmin(<BalanceteDetalheAdminPage />),
  },
  { path: '/admin/financeiro/d8', element: protegidaAdmin(<D8AdminPage />) },
  { path: '/admin/financeiro/d8/:id', element: protegidaAdmin(<D8DetalheAdminPage />) },
  { path: '/admin/balancetes', element: <Navigate to="/admin/financeiro/balancetes" replace /> },
  { path: '/admin/balancetes/:id', element: <RedirecionarBalanceteDetalhe /> },
  { path: '/admin/d8', element: <Navigate to="/admin/financeiro/d8" replace /> },
  { path: '/admin/d8/:id', element: <RedirecionarD8Detalhe /> },
  { path: '/admin/noticias', element: protegidaAdmin(<NoticiasAdminPage />) },
  { path: '/admin/noticias/nova', element: <Navigate to="/admin/noticias" replace /> },
  { path: '/admin/noticias/:id/editar', element: <Navigate to="/admin/noticias" replace /> },
  { path: '/admin/alertas', element: protegidaAdmin(<AlertasAdminPage />) },
  { path: '/admin/declaracoes', element: protegidaAdmin(<DeclaracoesAdminPage />) },
  { path: '/admin/juridico', element: protegidaAdmin(<JuridicoPage tipo="admin" />) },
  { path: '/admin/formularios', element: protegidaAdmin(<FormulariosAdminPage />) },
  { path: '/admin/formularios/novo', element: protegidaAdmin(<FormularioBuilderPage />) },
  { path: '/admin/formularios/:id', element: protegidaAdmin(<FormularioBuilderPage />) },
  {
    path: '/admin/formularios/:id/respostas',
    element: protegidaAdmin(<FormularioRespostasPage />),
  },
  { path: '/admin/convenios', element: protegidaAdmin(<ConveniosAdminPage />) },
  { path: '/admin/convenios/novo', element: <Navigate to="/admin/convenios" replace /> },
  { path: '/admin/convenios/:id/editar', element: <Navigate to="/admin/convenios" replace /> },
  { path: '/admin/eleicoes', element: protegidaAdmin(<EleicoesAdminPage />) },
  { path: '/admin/eleicoes/:id', element: protegidaAdmin(<EleicaoDetalheAdminPage />) },
  { path: '/admin/imoveis', element: protegidaAdmin(<ImoveisAdminPage />) },
  {
    path: '/admin/imoveis/solicitacoes',
    element: protegidaAdmin(<ImoveisAdminPage aba="solicitacoes" />),
  },
  {
    path: '/admin/imoveis/solicitacoes/:id',
    element: protegidaAdmin(<SolicitacaoDetalhePage visao="admin" />),
  },
  { path: '/admin/imoveis/novo', element: <Navigate to="/admin/imoveis" replace /> },
  { path: '/admin/imoveis/:id/editar', element: <Navigate to="/admin/imoveis" replace /> },
  { path: '/admin/solicitacoes', element: <Navigate to="/admin/imoveis/solicitacoes" replace /> },
  { path: '/admin/solicitacoes/:id', element: <RedirecionarSolicitacaoAdmin /> },
  { path: '/afiliado', element: protegidaAfiliado(<AfiliadoDashboardPage />) },
  { path: '/afiliado/convenios', element: protegidaAfiliado(<ConveniosPage />) },
  { path: '/afiliado/convenios/:id', element: protegidaAfiliado(<ConvenioDetalhePage />) },
  { path: '/afiliado/declaracoes', element: protegidaAfiliado(<MinhasDeclaracoesPage />) },
  { path: '/afiliado/formularios', element: protegidaAfiliado(<MeusFormulariosPage />) },
  { path: '/afiliado/juridico', element: protegidaAfiliado(<JuridicoPage tipo="afiliado" />) },
  { path: '/afiliado/imoveis', element: protegidaAfiliado(<ImoveisPage />) },
  { path: '/afiliado/imoveis/:id', element: protegidaAfiliado(<ImovelDetalhePage />) },
  { path: '/afiliado/eleicoes', element: protegidaAfiliado(<EleicoesPage />) },
  { path: '/afiliado/eleicoes/:id', element: protegidaAfiliado(<EleicaoVotacaoPage />) },
  {
    path: '/afiliado/eleicoes/:id/resultado',
    element: protegidaAfiliado(<EleicaoResultadoPage />),
  },
  { path: '/afiliado/solicitacoes', element: <Navigate to="/afiliado/imoveis" replace /> },
  {
    path: '/afiliado/solicitacoes/:id',
    element: <Navigate to="/afiliado/imoveis" replace />,
  },
]);
