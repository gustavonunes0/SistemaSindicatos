import { Link } from 'react-router-dom';
import type { EleicaoResumo } from '@sindprf/types';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { AguardandoAprovacao } from '../../afiliado/components/AguardandoAprovacao';
import { useMe } from '../../auth/hooks';
import { formatarDataHora } from '../../../lib/datas';
import { useEleicoes } from '../hooks';
import { rotuloStatusEleicao } from '../rotulos';

const chamadaPorStatus = {
  AGENDADA: 'Conferir chapas',
  ABERTA: 'Votar agora',
  ENCERRADA: 'Acompanhar apuração',
  APURADA: 'Ver resultado',
} as const;

export function EleicoesPage() {
  const { data: me, isLoading: carregandoMe } = useMe();
  const aprovado = me?.afiliado?.status === 'APROVADO';
  const { data: eleicoes, isLoading, isError } = useEleicoes();

  const abertas = eleicoes?.filter((eleicao) => eleicao.status === 'ABERTA') ?? [];
  const outras = eleicoes?.filter((eleicao) => eleicao.status !== 'ABERTA') ?? [];

  return (
    <AreaLayout
      tipo="afiliado"
      titulo="Eleições"
      descricao="Vote na diretoria do sindicato e acompanhe o resultado das eleições anteriores."
    >
      {carregandoMe && <EstadoCarregando mensagem="Carregando…" />}
      {!carregandoMe && !aprovado && <AguardandoAprovacao recurso="As eleições" />}

      {!carregandoMe && aprovado && (
        <>
          {isLoading && <EstadoCarregando mensagem="Carregando eleições…" />}
          {isError && <p className="erro">Não foi possível carregar as eleições.</p>}

          {eleicoes && eleicoes.length === 0 && (
            <div className="estado-vazio">
              <p>Nenhuma eleição em andamento. Quando houver, ela aparece aqui.</p>
            </div>
          )}

          {abertas.length > 0 && (
            <section className="eleicoes-secao">
              <h2 className="eleicoes-secao-titulo">Urna aberta</h2>
              <div className="eleicoes-grid">
                {abertas.map((eleicao) => (
                  <CardEleicao key={eleicao.id} eleicao={eleicao} destaque />
                ))}
              </div>
            </section>
          )}

          {outras.length > 0 && (
            <section className="eleicoes-secao">
              {abertas.length > 0 && <h2 className="eleicoes-secao-titulo">Demais eleições</h2>}
              <div className="eleicoes-grid">
                {outras.map((eleicao) => (
                  <CardEleicao key={eleicao.id} eleicao={eleicao} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AreaLayout>
  );
}

function CardEleicao({ eleicao, destaque }: { eleicao: EleicaoResumo; destaque?: boolean }) {
  const destino =
    eleicao.status === 'APURADA'
      ? `/afiliado/eleicoes/${eleicao.id}/resultado`
      : `/afiliado/eleicoes/${eleicao.id}`;

  return (
    <Link to={destino} className={`eleicao-card ${destaque ? 'eleicao-card--destaque' : ''}`}>
      <div className="eleicao-card-cabecalho">
        <strong className="eleicao-card-titulo">{eleicao.titulo}</strong>
        <span className={`badge badge-eleicao-${eleicao.status.toLowerCase()}`}>
          {eleicao.resolvidaPorAclamacao ? 'Aclamação' : rotuloStatusEleicao[eleicao.status]}
        </span>
      </div>

      {eleicao.descricao && <p className="eleicao-card-descricao">{eleicao.descricao}</p>}

      <dl className="eleicao-card-periodo">
        <div>
          <dt>Início</dt>
          <dd>{formatarDataHora(eleicao.inicio)}</dd>
        </div>
        <div>
          <dt>Fim</dt>
          <dd>{formatarDataHora(eleicao.fim)}</dd>
        </div>
      </dl>

      <span className="eleicao-card-cta">{chamadaPorStatus[eleicao.status]}</span>
    </Link>
  );
}
