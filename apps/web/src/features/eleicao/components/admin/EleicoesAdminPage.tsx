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
        <div className="tabela-wrapper">
          <table className="tabela">
            <thead>
              <tr>
                <th>Título</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Status</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {eleicoes.map((eleicao) => (
                <tr key={eleicao.id}>
                  <td>{eleicao.titulo}</td>
                  <td>{formatarDataHora(eleicao.inicio)}</td>
                  <td>{formatarDataHora(eleicao.fim)}</td>
                  <td>
                    <span className={`badge badge-eleicao-${eleicao.status.toLowerCase()}`}>
                      {rotuloStatus[eleicao.status]}
                      {eleicao.resolvidaPorAclamacao ? ' (aclamação)' : ''}
                    </span>
                  </td>
                  <td className="tabela-acoes">
                    <Link className="botao-link-acao" to={`/admin/eleicoes/${eleicao.id}`}>
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EleicaoFormModal aberto={modalAberto} onFechar={() => setModalAberto(false)} />
    </AreaLayout>
  );
}
