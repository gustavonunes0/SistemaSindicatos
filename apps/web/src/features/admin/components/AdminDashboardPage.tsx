import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
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
      {isLoading && <p className="estado-carregando">Carregando…</p>}
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
