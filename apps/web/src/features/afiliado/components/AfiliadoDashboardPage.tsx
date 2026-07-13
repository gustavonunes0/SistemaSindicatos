import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { useMe } from '../../auth/hooks';

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

export function AfiliadoDashboardPage() {
  const { data, isLoading, isError } = useMe();
  const afiliado = data?.afiliado;
  const aprovado = afiliado?.status === 'APROVADO';

  return (
    <AreaLayout tipo="afiliado" titulo="Minha área">
      {isLoading && <EstadoCarregando />}
      {isError && <p className="erro">Erro ao carregar seus dados.</p>}

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
          </section>

          {aprovado && (
            <section className="painel-secao">
              <h2 className="painel-secao-titulo">Benefícios</h2>
              <nav className="painel-atalhos">
                <Link to="/afiliado/convenios" className="painel-atalho">
                  <span className="painel-atalho-titulo">Convênios</span>
                  <span className="painel-atalho-desc">
                    Descontos e parcerias exclusivas para afiliados.
                  </span>
                </Link>
                <Link to="/afiliado/imoveis" className="painel-atalho">
                  <span className="painel-atalho-titulo">Apartamentos</span>
                  <span className="painel-atalho-desc">
                    Imóveis para locação — fotos e calendário de disponibilidade.
                  </span>
                </Link>
                <Link to="/afiliado/solicitacoes" className="painel-atalho">
                  <span className="painel-atalho-titulo">Solicitações</span>
                  <span className="painel-atalho-desc">
                    Acompanhe suas conversas com o sindicato sobre locação.
                  </span>
                </Link>
              </nav>
            </section>
          )}

          {afiliado.status === 'PENDENTE' && (
            <aside className="painel-aviso">
              <p>
                Assim que sua afiliação for aprovada, os convênios aparecerão aqui automaticamente.
              </p>
            </aside>
          )}

          {afiliado.status === 'INATIVO' && (
            <aside className="painel-aviso painel-aviso-erro">
              <p>
                Fale com o sindicato pela página de{' '}
                <Link to="/contato">contato</Link> ou pelo telefone (85) 3000-0000.
              </p>
            </aside>
          )}
        </>
      )}
    </AreaLayout>
  );
}
