import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMe } from '../../auth/hooks';
import { useConveniosAdmin } from '../../convenios/hooks';
import { useImoveisAdmin } from '../../imoveis/hooks';
import { useNoticiasAdmin } from '../../noticias/hooks';
import { useSolicitacoesAdmin } from '../../solicitacoes/hooks';

type ModuloAdmin = {
  to: string;
  titulo: string;
  descricao: string;
  acao: string;
  destaque?: boolean;
};

const modulos: ModuloAdmin[] = [
  {
    to: '/admin/tutoriais',
    titulo: 'Tutoriais',
    descricao: 'Passo a passo para cadastrar e operar cada módulo do sistema.',
    acao: 'Ver tutoriais',
    destaque: true,
  },
  {
    to: '/admin/afiliados',
    titulo: 'Afiliados',
    descricao: 'Aprove cadastros e gerencie o status da afiliação.',
    acao: 'Abrir afiliados',
    destaque: true,
  },
  {
    to: '/admin/financeiro',
    titulo: 'Financeiro',
    descricao: 'Balancetes Fortes e importação D8 (SIAPE) em um módulo só.',
    acao: 'Abrir financeiro',
  },
  {
    to: '/admin/solicitacoes',
    titulo: 'Solicitações de locação',
    descricao: 'Acompanhe e responda as conversas abertas pelos afiliados.',
    acao: 'Abrir fila',
  },
  {
    to: '/admin/eleicoes',
    titulo: 'Eleições',
    descricao: 'Chapas, homologação, votação eletrônica e apuração da diretoria.',
    acao: 'Gerenciar eleições',
  },
  {
    to: '/admin/noticias',
    titulo: 'Notícias',
    descricao: 'Publique comunicados e atualize o site público.',
    acao: 'Gerenciar notícias',
  },
  {
    to: '/admin/convenios',
    titulo: 'Convênios',
    descricao: 'Cadastre parceiros e benefícios para a categoria.',
    acao: 'Gerenciar convênios',
  },
  {
    to: '/admin/imoveis',
    titulo: 'Apartamentos',
    descricao: 'Controle imóveis, fotos e períodos de disponibilidade.',
    acao: 'Gerenciar imóveis',
  },
];

function formatarDataPainel(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(data);
}

export function AdminDashboardPage() {
  const { data: me, isLoading: carregandoMe, isError: erroMe } = useMe();
  const { data: noticias, isLoading: carregandoNoticias } = useNoticiasAdmin();
  const { data: convenios, isLoading: carregandoConvenios } = useConveniosAdmin();
  const { data: imoveis, isLoading: carregandoImoveis } = useImoveisAdmin();
  const { data: solicitacoes, isLoading: carregandoSolicitacoes } = useSolicitacoesAdmin({});

  const carregandoMetricas =
    carregandoNoticias || carregandoConvenios || carregandoImoveis || carregandoSolicitacoes;

  const noticiasPublicadas =
    noticias?.filter((noticia) => noticia.status === 'PUBLICADO').length ?? 0;
  const totalNoticias = noticias?.length ?? 0;
  const totalConvenios = convenios?.length ?? 0;
  const totalImoveis = imoveis?.length ?? 0;
  const solicitacoesAbertas =
    solicitacoes?.filter(
      (solicitacao) =>
        solicitacao.status === 'ABERTA' || solicitacao.status === 'EM_ANDAMENTO',
    ).length ?? 0;
  const totalSolicitacoes = solicitacoes?.length ?? 0;

  return (
    <AreaLayout
      tipo="admin"
      titulo="Painel"
      descricao="Visão geral da operação e acesso rápido aos módulos do sindicato."
    >
      {carregandoMe && <EstadoCarregando />}
      {erroMe && <p className="erro">Erro ao carregar seus dados.</p>}

      {me && (
        <>
          <section className="dash-hero">
            <div className="dash-hero-texto">
              <p className="dash-hero-data">{formatarDataPainel(new Date())}</p>
              <h2 className="dash-hero-titulo">Bem-vindo de volta</h2>
              <p className="dash-hero-email">{me.user.email}</p>
              <p className="dash-hero-desc">
                Use os indicadores abaixo para priorizar o que precisa de atenção e navegar pelos
                módulos administrativos.
              </p>
            </div>
            <div className="dash-hero-acoes">
              <Link to="/admin/noticias" className="botao-primario">
                Gerenciar notícias
              </Link>
              <Link to="/" className="dash-link-secundario">
                Ver site público
              </Link>
            </div>
          </section>

          <section className="dash-metricas" aria-label="Indicadores">
            {carregandoMetricas ? (
              <EstadoCarregando mensagem="Carregando indicadores…" />
            ) : (
              <>
                <article className="dash-metrica dash-metrica--alerta">
                  <p className="dash-metrica-rotulo">Solicitações em andamento</p>
                  <p className="dash-metrica-valor">{solicitacoesAbertas}</p>
                  <p className="dash-metrica-detalhe">
                    {totalSolicitacoes === 0
                      ? 'Nenhuma solicitação registrada'
                      : `${totalSolicitacoes} no total`}
                  </p>
                  <Link to="/admin/solicitacoes" className="dash-metrica-link">
                    Ver solicitações
                  </Link>
                </article>

                <article className="dash-metrica">
                  <p className="dash-metrica-rotulo">Notícias</p>
                  <p className="dash-metrica-valor">{totalNoticias}</p>
                  <p className="dash-metrica-detalhe">
                    {noticiasPublicadas} publicadas
                    {totalNoticias - noticiasPublicadas > 0
                      ? ` · ${totalNoticias - noticiasPublicadas} rascunho${totalNoticias - noticiasPublicadas > 1 ? 's' : ''}`
                      : ''}
                  </p>
                  <Link to="/admin/noticias" className="dash-metrica-link">
                    Gerenciar
                  </Link>
                </article>

                <article className="dash-metrica">
                  <p className="dash-metrica-rotulo">Convênios</p>
                  <p className="dash-metrica-valor">{totalConvenios}</p>
                  <p className="dash-metrica-detalhe">Parceiros cadastrados</p>
                  <Link to="/admin/convenios" className="dash-metrica-link">
                    Gerenciar
                  </Link>
                </article>

                <article className="dash-metrica">
                  <p className="dash-metrica-rotulo">Apartamentos</p>
                  <p className="dash-metrica-valor">{totalImoveis}</p>
                  <p className="dash-metrica-detalhe">Imóveis no catálogo</p>
                  <Link to="/admin/imoveis" className="dash-metrica-link">
                    Gerenciar
                  </Link>
                </article>
              </>
            )}
          </section>

          {solicitacoesAbertas > 0 && (
            <aside className="dash-alerta">
              <div>
                <p className="dash-alerta-titulo">Atenção na fila de locação</p>
                <p className="dash-alerta-texto">
                  {solicitacoesAbertas === 1
                    ? 'Há 1 solicitação aberta ou em andamento aguardando retorno.'
                    : `Há ${solicitacoesAbertas} solicitações abertas ou em andamento aguardando retorno.`}
                </p>
              </div>
              <Link to="/admin/solicitacoes" className="botao-primario">
                Ir para solicitações
              </Link>
            </aside>
          )}

          <section className="painel-secao">
            <div className="dash-secao-cabecalho">
              <h2 className="painel-secao-titulo">Módulos</h2>
              <p className="dash-secao-ajuda">Acesso direto às áreas de gestão</p>
            </div>
            <nav className="dash-modulos">
              {modulos.map((modulo) => (
                <Link
                  key={modulo.to}
                  to={modulo.to}
                  className={
                    modulo.destaque ? 'dash-modulo dash-modulo--destaque' : 'dash-modulo'
                  }
                >
                  <span className="dash-modulo-titulo">{modulo.titulo}</span>
                  <span className="dash-modulo-desc">{modulo.descricao}</span>
                  <span className="dash-modulo-acao">{modulo.acao}</span>
                </Link>
              ))}
            </nav>
          </section>
        </>
      )}
    </AreaLayout>
  );
}
