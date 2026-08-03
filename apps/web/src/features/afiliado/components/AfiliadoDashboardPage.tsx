import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMe } from '../../auth/hooks';
import { marca } from '../../../lib/marca';

const descricaoStatus = {
  PENDENTE: 'Sua afiliação está em análise. Você receberá acesso aos benefícios após a aprovação.',
  APROVADO: 'Sua afiliação está ativa. Acesse os convênios e benefícios disponíveis.',
  INATIVO: 'Sua afiliação está inativa. Entre em contato com o sindicato para regularizar.',
} as const;

const rotuloStatus = {
  PENDENTE: 'Em análise',
  APROVADO: 'Ativa',
  INATIVO: 'Inativa',
} as const;

const beneficios = [
  {
    to: '/afiliado/convenios',
    titulo: 'Convênios',
    descricao: 'Descontos e parcerias exclusivas para afiliados.',
  },
  {
    to: '/afiliado/imoveis',
    titulo: 'Apartamentos',
    descricao: 'Reserve imóveis de lazer pelo sistema oficial do sindicato.',
  },
  {
    to: '/afiliado/eleicoes',
    titulo: 'Eleições',
    descricao: 'Vote na diretoria e presidência do sindicato.',
  },
] as const;

export function AfiliadoDashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useMe();
  const afiliado = data?.afiliado;
  const aprovado = afiliado?.status === 'APROVADO';

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Minha área"
      descricao="Acompanhe sua afiliação e acesse os benefícios disponíveis."
    >
      {isLoading && <EstadoCarregando />}
      {isError && (
        <p className="erro">
          Erro ao carregar seus dados.
          {isAxiosError(error) && error.response?.status
            ? ` (código ${error.response.status})`
            : ''}{' '}
          <button type="button" className="botao-link-acao" onClick={() => void refetch()}>
            Tentar de novo
          </button>
        </p>
      )}

      {!isLoading && !isError && !afiliado && (
        <div className="estado-vazio">
          <p>Não encontramos o perfil de afiliado vinculado a esta conta.</p>
          <p>
            <Link to="/cadastro">Como se filiar</Link>
          </p>
        </div>
      )}

      {afiliado && (
        <>
          <section className="painel-boas-vindas">
            <p className="painel-saudacao">Olá, {afiliado.nome.split(' ')[0]}</p>
            <div className="painel-status-linha">
              <span className="painel-status-rotulo">Situação da afiliação</span>
              <span className={`badge badge-${afiliado.status.toLowerCase()}`}>
                {rotuloStatus[afiliado.status]}
              </span>
            </div>
            <p className="painel-descricao">{descricaoStatus[afiliado.status]}</p>
            {afiliado.status === 'PENDENTE' && (
              <button
                type="button"
                className="botao-secundario"
                disabled={isFetching}
                onClick={() => void refetch()}
              >
                {isFetching ? 'Verificando…' : 'Verificar aprovação'}
              </button>
            )}
          </section>

          <section className="painel-secao">
            <h2 className="painel-secao-titulo">Benefícios</h2>
            <nav className="painel-atalhos">
              {beneficios.map((item) =>
                aprovado ? (
                  <Link key={item.to} to={item.to} className="painel-atalho">
                    <span className="painel-atalho-titulo">{item.titulo}</span>
                    <span className="painel-atalho-desc">{item.descricao}</span>
                  </Link>
                ) : (
                  <div
                    key={item.to}
                    className="painel-atalho painel-atalho--bloqueado"
                    aria-disabled="true"
                  >
                    <span className="painel-atalho-titulo">
                      {item.titulo}
                      <span className="painel-atalho-selo">Após aprovação</span>
                    </span>
                    <span className="painel-atalho-desc">{item.descricao}</span>
                  </div>
                ),
              )}
            </nav>
          </section>

          {afiliado.status === 'PENDENTE' && (
            <aside className="painel-aviso">
              <p>
                Assim que sua afiliação for aprovada, convênios e apartamentos liberam
                automaticamente — use o botão acima ou o menu lateral para conferir.
              </p>
            </aside>
          )}

          {afiliado.status === 'INATIVO' && (
            <aside className="painel-aviso painel-aviso-erro">
              <p>
                Fale com o sindicato pela página de <Link to="/contato">contato</Link> ou pelos
                telefones {marca.contato.telefones.join(' / ')}.
              </p>
            </aside>
          )}
        </>
      )}
    </AreaLayout>
  );
}
