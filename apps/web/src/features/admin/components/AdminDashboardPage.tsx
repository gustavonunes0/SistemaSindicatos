import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMe } from '../../auth/hooks';

const atalhos = [
  {
    to: '/admin/noticias',
    titulo: 'Notícias',
    descricao: 'Criar, editar e publicar notícias do site.',
  },
  {
    to: '/admin/convenios',
    titulo: 'Convênios',
    descricao: 'Cadastrar parceiros e benefícios para afiliados.',
  },
  {
    to: '/admin/imoveis',
    titulo: 'Apartamentos',
    descricao: 'Cadastrar imóveis, fotos e disponibilidade.',
  },
  {
    to: '/admin/solicitacoes',
    titulo: 'Solicitações',
    descricao: 'Conversas de locação abertas pelos afiliados.',
  },
  {
    to: '/',
    titulo: 'Site público',
    descricao: 'Ver o site como os visitantes.',
    externo: false,
  },
] as const;

export function AdminDashboardPage() {
  const { data, isLoading, isError } = useMe();

  return (
    <AreaLayout tipo="admin" titulo="Painel">
      {isLoading && <EstadoCarregando />}
      {isError && <p className="erro">Erro ao carregar seus dados.</p>}

      {data && (
        <>
          <section className="painel-boas-vindas">
            <p className="painel-saudacao">Bem-vindo de volta</p>
            <p className="painel-identificacao">{data.user.email}</p>
            <p className="painel-descricao">
              Gerencie o conteúdo do sindicato e os benefícios disponíveis para os afiliados.
            </p>
          </section>

          <section className="painel-secao">
            <h2 className="painel-secao-titulo">Atalhos</h2>
            <nav className="painel-atalhos">
              {atalhos.map((atalho) => (
                <Link key={atalho.to} to={atalho.to} className="painel-atalho">
                  <span className="painel-atalho-titulo">{atalho.titulo}</span>
                  <span className="painel-atalho-desc">{atalho.descricao}</span>
                </Link>
              ))}
            </nav>
          </section>
        </>
      )}
    </AreaLayout>
  );
}
