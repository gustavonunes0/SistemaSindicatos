import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../../components/ui/EstadoCarregando';
import { formatarDataHora } from '../../../../lib/datas';
import { useEleicoesAdmin } from '../../hooks';
import { EleicaoFormModal } from './EleicaoFormModal';

const rotuloStatus = {
  AGENDADA: 'Agendada',
  ABERTA: 'Aberta',
  ENCERRADA: 'Encerrada',
  APURADA: 'Apurada',
} as const;

const ajudaStatus = {
  AGENDADA: 'Preparação — chapas, homologação e elegíveis',
  ABERTA: 'Votação em andamento',
  ENCERRADA: 'Urnas fechadas — aguardando apuração',
  APURADA: 'Resultado eletrônico disponível',
} as const;

export function EleicoesAdminPage() {
  const { data: eleicoes, isLoading, isError } = useEleicoesAdmin();
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <AreaLayout
      tipo="admin"
      titulo="Eleições"
      descricao="Gerencie o processo eleitoral: chapas, homologação, votação eletrônica e apuração."
      acoes={
        <button type="button" className="botao-primario" onClick={() => setModalAberto(true)}>
          Nova eleição
        </button>
      }
    >
      {isLoading && <EstadoCarregando mensagem="Carregando eleições…" />}
      {isError && <p className="erro">Não foi possível carregar as eleições. Tente novamente.</p>}

      {eleicoes && eleicoes.length === 0 && (
        <div className="estado-vazio">
          <p>Nenhuma eleição cadastrada ainda.</p>
          <button type="button" className="botao-primario" onClick={() => setModalAberto(true)}>
            Criar a primeira
          </button>
        </div>
      )}

      {eleicoes && eleicoes.length > 0 && (
        <ul className="eleicao-admin-lista">
          {eleicoes.map((eleicao) => (
            <li key={eleicao.id}>
              <Link className="eleicao-admin-item" to={`/admin/eleicoes/${eleicao.id}`}>
                <div className="eleicao-admin-item-topo">
                  <h2 className="eleicao-admin-item-titulo">{eleicao.titulo}</h2>
                  <span className={`badge badge-eleicao-${eleicao.status.toLowerCase()}`}>
                    {rotuloStatus[eleicao.status]}
                    {eleicao.resolvidaPorAclamacao ? ' · aclamação' : ''}
                  </span>
                </div>
                <p className="eleicao-admin-item-ajuda">{ajudaStatus[eleicao.status]}</p>
                <dl className="eleicao-admin-item-meta">
                  <div>
                    <dt>Início</dt>
                    <dd>{formatarDataHora(eleicao.inicio)}</dd>
                  </div>
                  <div>
                    <dt>Fim</dt>
                    <dd>{formatarDataHora(eleicao.fim)}</dd>
                  </div>
                </dl>
                <span className="eleicao-admin-item-cta">Gerenciar →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <EleicaoFormModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </AreaLayout>
  );
}
