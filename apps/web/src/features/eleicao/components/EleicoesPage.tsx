import { Link } from 'react-router-dom';
import { AreaLayout } from '../../../components/layout/AreaLayout';
import { EstadoCarregando } from '../../../components/ui/EstadoCarregando';
import { AguardandoAprovacao } from '../../afiliado/components/AguardandoAprovacao';
import { useMe } from '../../auth/hooks';
import { formatarDataHora } from '../../../lib/datas';
import { useEleicoes } from '../hooks';

const rotuloStatus = {
  AGENDADA: 'Agendada',
  ABERTA: 'Votação aberta',
  ENCERRADA: 'Votação encerrada',
  APURADA: 'Resultado apurado',
} as const;

export function EleicoesPage() {
  const { data: me, isLoading: carregandoMe } = useMe();
  const aprovado = me?.afiliado?.status === 'APROVADO';
  const { data: eleicoes, isLoading, isError } = useEleicoes();

  return (
    <AreaLayout tipo="afiliado" titulo="Eleições">
      <p className="area-subtitulo">Vote na diretoria e presidência do sindicato.</p>

      {carregandoMe && <EstadoCarregando mensagem="Carregando…" />}
      {!carregandoMe && !aprovado && <AguardandoAprovacao recurso="As eleições" />}

      {!carregandoMe && aprovado && (
        <>
          {isLoading && <EstadoCarregando mensagem="Carregando eleições…" />}
          {isError && <p className="erro">Não foi possível carregar as eleições.</p>}

          {eleicoes && eleicoes.length === 0 && (
            <div className="estado-vazio">
              <p>Nenhuma eleição em andamento no momento.</p>
            </div>
          )}

          {eleicoes && eleicoes.length > 0 && (
            <div className="eleicoes-grid">
              {eleicoes.map((eleicao) => (
                <Link
                  key={eleicao.id}
                  to={
                    eleicao.status === 'APURADA'
                      ? `/afiliado/eleicoes/${eleicao.id}/resultado`
                      : `/afiliado/eleicoes/${eleicao.id}`
                  }
                  className="eleicao-card"
                >
                  <div className="eleicao-card-cabecalho">
                    <strong>{eleicao.titulo}</strong>
                    <span className={`badge badge-eleicao-${eleicao.status.toLowerCase()}`}>
                      {eleicao.resolvidaPorAclamacao ? 'Aclamação' : rotuloStatus[eleicao.status]}
                    </span>
                  </div>
                  {eleicao.descricao && <p>{eleicao.descricao}</p>}
                  <p className="dash-secao-ajuda">
                    {formatarDataHora(eleicao.inicio)} até {formatarDataHora(eleicao.fim)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </AreaLayout>
  );
}
